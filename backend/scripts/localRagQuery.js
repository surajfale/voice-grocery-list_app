import 'dotenv/config';
import { pathToFileURL } from 'url';
import mongoose from 'mongoose';
import { ReceiptRagService } from '../services/ReceiptRagService.js';

const parseArgs = (argv) => {
  const args = argv.slice(2);
  
  const getValue = (flags) => {
    const candidates = Array.isArray(flags) ? flags : [flags];
    for (const flag of candidates) {
      const index = args.indexOf(flag);
      if (index !== -1) {
        return args[index + 1];
      }
      const prefixed = args.find((arg) => arg.startsWith(`${flag}=`));
      if (prefixed) {
        return prefixed.split('=').slice(1).join('=');
      }
    }
    return null;
  };

  const receiptIdsValue = getValue(['--receipt-ids', '--receiptIds']);
  const receiptIds = receiptIdsValue
    ? receiptIdsValue.split(',').map((id) => id.trim()).filter(Boolean)
    : null;

  const topKValue = Number(getValue('--top-k'));
  const topK = Number.isFinite(topKValue) && topKValue > 0 ? topKValue : null;

  const dateStart = getValue(['--date-start', '--start']);
  const dateEnd = getValue(['--date-end', '--end']);
  const dateRange = (dateStart || dateEnd) ? { start: dateStart, end: dateEnd } : null;

  return {
    userId: getValue(['--user', '-u']),
    question: getValue(['--question', '-q']),
    receiptIds,
    dateRange,
    topK
  };
};

const ensureObjectId = (value) => {
  if (value && mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  throw new Error(`Invalid ObjectId: ${value}`);
};

const ensureEnv = (key) => {
  if (!process.env[key]) {
    throw new Error(`${key} is not set. Please configure your environment before running this script.`);
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toISOString().split('T')[0];
  } catch {
    return dateStr;
  }
};

const formatUsage = (usage) => {
  if (!usage) return 'N/A';
  const parts = [];
  if (usage.prompt_tokens) parts.push(`Prompt: ${usage.prompt_tokens}`);
  if (usage.completion_tokens) parts.push(`Completion: ${usage.completion_tokens}`);
  if (usage.total_tokens) parts.push(`Total: ${usage.total_tokens}`);
  return parts.length > 0 ? parts.join(', ') : 'N/A';
};

const logSection = (title) => {
  console.log(`\n=== ${title} ===`);
};

const main = async () => {
  const options = parseArgs(process.argv);

  if (!options.userId) {
    throw new Error('Please provide --user or -u with a valid user ID.');
  }

  if (!options.question) {
    throw new Error('Please provide --question or -q with your question.');
  }

  ensureEnv('MONGODB_URI');
  ensureEnv('OPENAI_API_KEY');

  const userObjectId = ensureObjectId(options.userId);

  await mongoose.connect(process.env.MONGODB_URI);

  try {
    logSection('RAG Query');
    console.log(`User ID: ${userObjectId.toString()}`);
    console.log(`Question: ${options.question}`);
    
    if (options.receiptIds && options.receiptIds.length > 0) {
      console.log(`Receipt IDs: ${options.receiptIds.join(', ')}`);
    }
    
    if (options.dateRange) {
      console.log(`Date Range: ${formatDate(options.dateRange.start)} to ${formatDate(options.dateRange.end)}`);
    }
    
    if (options.topK) {
      console.log(`Top K: ${options.topK}`);
    }

    const ragService = new ReceiptRagService();
    const response = await ragService.chat({
      userId: userObjectId,
      question: options.question,
      receiptIds: options.receiptIds,
      dateRange: options.dateRange,
      topK: options.topK
    });

    logSection('Answer');
    console.log(response.answer);

    if (response.sources && response.sources.length > 0) {
      logSection('Sources');
      response.sources.forEach((source, index) => {
        console.log(`\n${index + 1}. Receipt ID: ${source.receiptId}`);
        console.log(`   Merchant: ${source.merchant || 'Unknown'}`);
        console.log(`   Date: ${formatDate(source.purchaseDate)}`);
        if (source.total !== null && source.total !== undefined) {
          console.log(`   Total: $${source.total.toFixed(2)}`);
        }
        if (source.score !== null && source.score !== undefined) {
          console.log(`   Relevance Score: ${source.score.toFixed(4)}`);
        }
      });
    } else {
      logSection('Sources');
      console.log('No sources found.');
    }

    if (response.usage) {
      logSection('Usage');
      console.log(formatUsage(response.usage));
    }

    if (response.contextChunks && response.contextChunks.length > 0) {
      logSection('Context Chunks');
      console.log(`Retrieved ${response.contextChunks.length} chunk(s) from vector store.`);
    }

    logSection('Done');
  } catch (error) {
    console.error('RAG query failed:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
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
  main().catch((error) => {
    console.error('Local RAG query failed:', error);
    mongoose.disconnect().finally(() => {
      process.exit(1);
    });
  });
}

