import 'dotenv/config';
import { pathToFileURL } from 'url';
import mongoose from 'mongoose';
import ragConfig from '../config/ragConfig.js';
import Receipt from '../models/Receipt.js';
import receiptChunker from '../services/receiptChunker.js';
import { getEmbeddingClient } from '../utils/embeddingClient.js';
import vectorStore from '../utils/vectorStore.js';
import logger from '../utils/logger.js';
import { estimateEmbeddingCost } from '../utils/costEstimator.js';

const embeddingClient = getEmbeddingClient();

const parseArgs = (argv) => {
  // Filter out the "--" separator that pnpm might pass
  const args = argv.slice(2).filter((arg) => arg !== '--');
  const options = {
    batchSize: 50,
    receiptId: null,
    force: false
  };

  const getValue = (flag) => {
    const explicitIndex = args.indexOf(flag);
    if (explicitIndex !== -1 && explicitIndex + 1 < args.length) {
      return args[explicitIndex + 1];
    }
    const prefixedArg = args.find((arg) => arg.startsWith(`${flag}=`));
    if (prefixedArg) {
      return prefixedArg.split('=')[1];
    }
    return null;
  };

  const batchSizeValue = Number(getValue('--batch-size'));
  if (Number.isInteger(batchSizeValue) && batchSizeValue > 0) {
    options.batchSize = batchSizeValue;
  }

  const receiptIdValue = getValue('--receipt-id');
  if (receiptIdValue) {
    options.receiptId = receiptIdValue;
  }

  options.force = args.includes('--force');

  return options;
};

const connectToDatabase = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set. Cannot connect to MongoDB.');
  }

  if (mongoose.connection.readyState !== 1) {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('ingest.db.connected');
  } else {
    console.log('✅ Already connected to MongoDB');
  }
};

const buildReceiptQuery = ({ receiptId, force }) => {
  const query = { status: 'ready' };

  if (receiptId) {
    query._id = receiptId;
  }

  if (!force) {
    query.$or = [
      { embeddingStatus: { $ne: 'synced' } },
      { embeddingsVersion: { $lt: ragConfig.embeddingsVersion } }
    ];
  }

  return query;
};

const processReceipt = async (receiptDoc) => {
  const receipt = receiptDoc.toObject({ depopulate: true });
  receipt._id = receiptDoc._id;
  receipt.userId = receiptDoc.userId;
  const startedAt = Date.now();

  try {
    await Receipt.updateOne({ _id: receipt._id }, { $set: { embeddingStatus: 'pending' } });

    const chunks = receiptChunker.chunkReceipt(receipt);
    if (!chunks.length) {
      throw new Error('No embeddable content extracted from receipt.');
    }

    const embeddingStart = Date.now();
    const embeddingResult = await embeddingClient.embedBatch(chunks.map((chunk) => chunk.text));
    const chunkPayloads = chunks.map((chunk, index) => ({
      ...chunk,
      embedding: embeddingResult.embeddings[index]
    }));
    const embeddingDuration = Date.now() - embeddingStart;

    const upsertStart = Date.now();
    await vectorStore.upsertChunks(chunkPayloads);
    const upsertDuration = Date.now() - upsertStart;

    receiptDoc.embeddingStatus = 'synced';
    receiptDoc.embeddingsVersion = ragConfig.embeddingsVersion;
    receiptDoc.errorMessage = undefined;
    await receiptDoc.save();

    logger.info('ingest.receipt.completed', {
      receiptId: receiptDoc._id.toString(),
      userId: receiptDoc.userId?.toString(),
      chunkCount: chunks.length,
      embeddingDurationMs: embeddingDuration,
      upsertDurationMs: upsertDuration,
      totalDurationMs: Date.now() - startedAt,
      embeddingTokens: embeddingResult.usage?.total_tokens || embeddingResult.usage?.prompt_tokens || null,
      estimatedEmbeddingCostUsd: estimateEmbeddingCost(embeddingResult.model || ragConfig.embeddingsModel, embeddingResult.usage)
    });
    return { success: true, chunkCount: chunks.length };
  } catch (error) {
    await Receipt.updateOne(
      { _id: receiptDoc._id },
      {
        $set: {
          embeddingStatus: 'failed',
          errorMessage: error.message || 'Embedding job failure'
        }
      }
    );
    logger.error('ingest.receipt.failed', {
      receiptId: receiptDoc._id.toString(),
      userId: receiptDoc.userId?.toString(),
      error: error.message || error
    });
    return { success: false, error };
  }
};

const run = async () => {
  try {
    console.log('🚀 Starting receipt embedding job...');
    const options = parseArgs(process.argv);
    logger.info('ingest.run.started', { options });
    console.log(`   Options: batchSize=${options.batchSize}, force=${options.force}, receiptId=${options.receiptId || 'all'}`);

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured. Cannot generate embeddings.');
    }

    await connectToDatabase();
    console.log('✅ Connected to database');

    const query = buildReceiptQuery(options);
    const startTime = Date.now();
    const stats = {
      processed: 0,
      success: 0,
      failed: 0
    };
    const processedReceiptIds = new Set();

    while (true) {
      // Build query excluding already processed receipts in this run
      const currentQuery = { ...query };
      if (processedReceiptIds.size > 0) {
        currentQuery._id = { $nin: Array.from(processedReceiptIds).map((id) => new mongoose.Types.ObjectId(id)) };
      }

      const receipts = await Receipt.find(currentQuery)
        .sort({ updatedAt: 1 })
        .limit(options.batchSize);

      if (receipts.length === 0) {
        if (stats.processed === 0) {
          console.log('ℹ️  No receipts found that need embedding.');
          console.log('   All receipts are already synced or no receipts exist.');
        }
        break;
      }

      console.log(`\n📦 Found ${receipts.length} receipt(s) to process...`);

      for (const receiptDoc of receipts) {
        const receiptId = receiptDoc._id.toString();

        // Skip if already processed in this run
        if (processedReceiptIds.has(receiptId)) {
          continue;
        }

        console.log(`\n   Processing receipt ${receiptId}...`);

        const result = await processReceipt(receiptDoc);
        processedReceiptIds.add(receiptId);
        stats.processed += 1;

        if (result.success) {
          stats.success += 1;
          console.log(`   ✅ Successfully embedded receipt ${receiptId} (${result.chunkCount} chunks)`);
        } else {
          stats.failed += 1;
          console.log(`   ❌ Failed to embed receipt ${receiptId}: ${result.error?.message || 'Unknown error'}`);
        }
      }

      if (options.receiptId) {
        break;
      }
    }

    const duration = Date.now() - startTime;
    logger.info('ingest.run.completed', {
      ...stats,
      durationMs: duration
    });

    console.log('\n📊 Job Summary:');
    console.log(`   Processed: ${stats.processed}`);
    console.log(`   Successful: ${stats.success}`);
    console.log(`   Failed: ${stats.failed}`);
    console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
  } catch (error) {
    console.error('❌ Error in run function:', error.message || error);
    console.error('Stack:', error.stack);
    throw error;
  }
};

const invokedDirectly = (() => {
  if (!process.argv[1]) {
    return false;
  }
  try {
    return import.meta.url === pathToFileURL(process.argv[1]).href;
  } catch (_error) {
    return false;
  }
})();

if (invokedDirectly) {
  run()
    .then(() => {
      logger.info('ingest.run.finished');
      console.log('\n✨ Embedding job completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('ingest.run.failed', { error: error.message || error });
      console.error('\n❌ Embedding job failed:', error.message || error);
      console.error('Stack:', error.stack);
      mongoose.disconnect().finally(() => {
        process.exit(1);
      });
    });
}

