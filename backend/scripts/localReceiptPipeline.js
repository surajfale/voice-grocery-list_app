import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import mongoose from 'mongoose';
import ragConfig from '../config/ragConfig.js';
import Receipt from '../models/Receipt.js';
import { uploadBufferToGridFs } from '../utils/gridFs.js';
import { runReceiptOcr } from '../services/receiptOcr.js';
import receiptChunker from '../services/receiptChunker.js';
import { getEmbeddingClient } from '../utils/embeddingClient.js';
import vectorStore from '../utils/vectorStore.js';
import { ReceiptRagService } from '../services/ReceiptRagService.js';
import { prepareReceiptImage } from '../utils/imageStitcher.js';
import { computeSha256 } from '../utils/cryptoUtil.js';

const MIME_LOOKUP = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.heif': 'image/heif'
};

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

  const hasFlag = (flag) => args.includes(flag);

  const collectFilePaths = () => {
    const paths = [];

    args.forEach((arg, index) => {
      if (arg === '--file' || arg === '-f') {
        const next = args[index + 1];
        if (next) {
          paths.push(next);
        }
      } else if (arg.startsWith('--file=')) {
        paths.push(arg.split('=').slice(1).join('='));
      } else if (arg === '--files') {
        const next = args[index + 1];
        if (next) {
          paths.push(...next.split(',').map((entry) => entry.trim()).filter(Boolean));
        }
      } else if (arg.startsWith('--files=')) {
        paths.push(...arg.split('=').slice(1).join('=').split(',').map((entry) => entry.trim()).filter(Boolean));
      }
    });

    const singleFallback = getValue(['--file', '-f']);
    if (!paths.length && singleFallback) {
      paths.push(singleFallback);
    }

    return Array.from(new Set(paths));
  };

  const chunkSizeValue = Number(getValue('--chunk-size'));

  return {
    filePaths: collectFilePaths(),
    userId: getValue(['--user', '-u']),
    question: getValue(['--question', '-q']),
    language: getValue(['--language', '--lang']) || 'eng',
    chunkSize: Number.isFinite(chunkSizeValue) && chunkSizeValue > 0 ? chunkSizeValue : null,
    skipChat: hasFlag('--no-chat')
  };
};

const ensureObjectId = (value) => {
  if (value && mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  return new mongoose.Types.ObjectId();
};

const formatCurrency = (amount, currency) => {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return 'Unknown total';
  }
  return `${(currency || 'USD').toUpperCase()} ${amount.toFixed(2)}`;
};

const logSection = (title) => {
  console.log(`\n=== ${title} ===`);
};

const buildCombinedFilename = (files) => {
  const baseName = files[0]?.originalname
    ? files[0].originalname.replace(/\.[^/.]+$/, '')
    : 'receipt';
  const suffix = files.length > 1 ? '-stitched' : '';
  return `${baseName}${suffix}.png`;
};

const ensureEnv = (key) => {
  if (!process.env[key]) {
    throw new Error(`${key} is not set. Please configure your environment before running this script.`);
  }
};

const buildReceiptPayload = (receiptDoc) => {
  const plain = receiptDoc.toObject({ depopulate: true });
  plain._id = receiptDoc._id;
  plain.id = receiptDoc._id;
  plain.userId = receiptDoc.userId;
  plain.rawText = receiptDoc.rawText || '';
  plain.items = receiptDoc.items || [];
  return plain;
};

const main = async () => {
  const options = parseArgs(process.argv);

  if (!options.filePaths || options.filePaths.length === 0) {
    throw new Error('Please provide at least one file via repeated --file flags or --files path1,path2.');
  }

  ensureEnv('MONGODB_URI');
  ensureEnv('OPENAI_API_KEY');

  const fileEntries = await Promise.all(options.filePaths.map(async (filePath) => {
    const resolvedPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

    const buffer = await fs.readFile(resolvedPath);
    const stats = await fs.stat(resolvedPath);
    const extension = path.extname(resolvedPath).toLowerCase();

    return {
      buffer,
      originalname: path.basename(resolvedPath),
      size: stats.size,
      mimetype: MIME_LOOKUP[extension] || 'application/octet-stream'
    };
  }));

  const userObjectId = ensureObjectId(options.userId);

  await mongoose.connect(process.env.MONGODB_URI);

  const summary = {
    userId: userObjectId.toString(),
    receiptId: null,
    chunkCount: 0,
    pageCount: fileEntries.length
  };

  try {
    logSection('Uploading to GridFS');
    const stitchedImage = await prepareReceiptImage(fileEntries);
    const contentHash = computeSha256(stitchedImage.buffer);
    const duplicateReceipt = await Receipt.findOne({
      userId: userObjectId,
      contentHash
    }).lean();

    if (duplicateReceipt) {
      throw new Error(`Duplicate receipt detected (existing receipt ${duplicateReceipt._id}). Delete the old upload before running this script again.`);
    }

    const combinedFilename = buildCombinedFilename(fileEntries);

    const fileId = await uploadBufferToGridFs(stitchedImage.buffer, {
      filename: combinedFilename,
      contentType: stitchedImage.mimeType,
      metadata: {
        userId: userObjectId.toString(),
        uploadedAt: new Date(),
        pageCount: stitchedImage.pageCount,
        sourceImages: stitchedImage.sourceImages,
        contentHash
      }
    });

    const receiptDoc = await Receipt.create({
      userId: userObjectId,
      originalFilename: combinedFilename,
      mimeType: stitchedImage.mimeType,
      size: stitchedImage.buffer.length,
      fileId,
      pageCount: stitchedImage.pageCount,
      sourceImages: stitchedImage.sourceImages,
      stitchedDimensions: stitchedImage.dimensions,
      contentHash,
      status: 'processing'
    });
    summary.receiptId = receiptDoc._id.toString();

    logSection('Running OCR');
    const ocrLogger = (message) => {
      if (!message) {
        return;
      }
      const status = message.status || 'progress';
      const progress = typeof message.progress === 'number'
        ? `${Math.round(message.progress * 100)}%`
        : '';
      console.log(`[ocr] ${status}${progress ? ` (${progress})` : ''}`);
    };
    const ocrResult = await runReceiptOcr(stitchedImage.buffer, {
      language: options.language,
      logger: ocrLogger
    });

    receiptDoc.rawText = ocrResult.rawText;
    receiptDoc.merchant = ocrResult.merchant;
    receiptDoc.purchaseDate = ocrResult.purchaseDate;
    receiptDoc.total = ocrResult.total;
    receiptDoc.currency = ocrResult.currency;
    receiptDoc.items = ocrResult.items;
    receiptDoc.status = 'ready';
    await receiptDoc.save();

    console.log(`Merchant: ${ocrResult.merchant || 'Unknown'}`);
    console.log(`Purchase Date: ${ocrResult.purchaseDate || 'Unknown'}`);
    console.log(`Total: ${formatCurrency(ocrResult.total, ocrResult.currency)}`);
    console.log(`Detected items: ${ocrResult.items.length}`);
    console.log('Source images:', stitchedImage.sourceImages.map((img, index) => `${index + 1}. ${img.filename || 'image'}`).join(' | '));
    console.log(`Source images combined: ${stitchedImage.pageCount}`);

    logSection('Chunking & Embedding');
    const receiptPayload = buildReceiptPayload(receiptDoc);
    const chunkerOptions = options.chunkSize ? { chunkSize: options.chunkSize } : undefined;
    const chunks = receiptChunker.chunkReceipt(receiptPayload, chunkerOptions);
    if (!chunks.length) {
      throw new Error('No chunks were generated from this receipt. Check OCR output and try again.');
    }
    summary.chunkCount = chunks.length;
    console.log(`Generated ${chunks.length} chunk(s). First chunk preview:\n${chunks[0]?.text?.slice(0, 200)}${chunks[0]?.text?.length > 200 ? '...' : ''}`);

    const embeddingClient = getEmbeddingClient();
    const embeddingResult = await embeddingClient.embedBatch(chunks.map((chunk) => chunk.text));
    const chunkPayloads = chunks.map((chunk, index) => ({
      ...chunk,
      embedding: embeddingResult.embeddings[index]
    }));

    await vectorStore.upsertChunks(chunkPayloads);
    receiptDoc.embeddingStatus = 'synced';
    receiptDoc.embeddingsVersion = ragConfig.embeddingsVersion;
    await receiptDoc.save();

    logSection('RAG Chat');
    if (options.skipChat) {
      console.log('Skipping chat generation (flag --no-chat).');
    } else {
      const question = options.question?.trim() || 'Summarize this receipt for me.';
      const ragService = new ReceiptRagService();
      const response = await ragService.chat({
        userId: userObjectId,
        question,
        receiptIds: [receiptDoc._id]
      });
      console.log(`Question: ${response.question}`);
      console.log(`Answer:\n${response.answer}`);
      console.log('Sources:', response.sources);
    }

    logSection('Done');
    console.log(`Receipt ID: ${summary.receiptId}`);
    console.log(`User ID: ${summary.userId}`);
    console.log(`Pages combined: ${summary.pageCount}`);
    console.log(`Chunks stored: ${summary.chunkCount}`);
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
    console.error('Local receipt pipeline failed:', error);
    mongoose.disconnect().finally(() => {
      process.exit(1);
    });
  });
}


