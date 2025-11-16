import 'dotenv/config';
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
  const args = argv.slice(2);
  const options = {
    batchSize: 50,
    receiptId: null,
    force: false
  };

  const getValue = (flag) => {
    const explicitIndex = args.indexOf(flag);
    if (explicitIndex !== -1) {
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
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('ingest.db.connected');
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
  const options = parseArgs(process.argv);
  logger.info('ingest.run.started', { options });

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured. Cannot generate embeddings.');
  }

  await connectToDatabase();

  const query = buildReceiptQuery(options);
  const startTime = Date.now();
  const stats = {
    processed: 0,
    success: 0,
    failed: 0
  };

  while (true) {
    const receipts = await Receipt.find(query)
      .sort({ updatedAt: 1 })
      .limit(options.batchSize);

    if (receipts.length === 0) {
      break;
    }

    for (const receiptDoc of receipts) {
      const result = await processReceipt(receiptDoc);
      stats.processed += 1;
      if (result.success) {
        stats.success += 1;
      } else {
        stats.failed += 1;
      }
    }

    if (options.receiptId) {
      break;
    }
  }

  logger.info('ingest.run.completed', {
    ...stats,
    durationMs: Date.now() - startTime
  });
  await mongoose.disconnect();
};

if (import.meta.url === `file://${process.argv[1]}`) {
  run()
    .then(() => {
      logger.info('ingest.run.finished');
    })
    .catch((error) => {
      logger.error('ingest.run.failed', { error: error.message || error });
      mongoose.disconnect().finally(() => {
        process.exit(1);
      });
    });
}

