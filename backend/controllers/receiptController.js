import mongoose from 'mongoose';
import Receipt from '../models/Receipt.js';
import {
  uploadBufferToGridFs,
  deleteFileFromGridFs,
  getFileStreamFromGridFs
} from '../utils/gridFs.js';
import { runReceiptOcr } from '../services/receiptOcr.js';
import receiptRagService from '../services/ReceiptRagService.js';
import { prepareReceiptImage } from '../utils/imageStitcher.js';
import { computeSha256 } from '../utils/cryptoUtil.js';
import receiptChunker from '../services/receiptChunker.js';
import { getEmbeddingClient } from '../utils/embeddingClient.js';
import vectorStore from '../utils/vectorStore.js';
import ragConfig from '../config/ragConfig.js';
import logger from '../utils/logger.js';
import { estimateEmbeddingCost } from '../utils/costEstimator.js';

const asObject = (receipt) => {
  if (!receipt) {
    return null;
  }

  return typeof receipt.toObject === 'function' ? receipt.toObject() : receipt;
};

const ensureValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const normalizeUserId = (req) => req.body.userId || req.query.userId || req.params.userId;

const RECEIPT_FIELD_NAMES = ['receipt', 'receiptImages', 'receipts'];

const getUploadedReceiptFiles = (req) => {
  if (Array.isArray(req.files) && req.files.length > 0) {
    return req.files.filter((file) => RECEIPT_FIELD_NAMES.includes(file.fieldname));
  }

  if (req.file) {
    return [req.file];
  }

  if (req.files && typeof req.files === 'object') {
    const aggregated = [];
    ['receiptImages', 'receipts', 'receipt'].forEach((key) => {
      if (Array.isArray(req.files[key])) {
        aggregated.push(...req.files[key]);
      }
    });
    return aggregated;
  }

  return [];
};

const buildCombinedFilename = (files) => {
  const baseName = files[0]?.originalname
    ? files[0].originalname.replace(/\.[^/.]+$/, '')
    : 'receipt';
  const suffix = files.length > 1 ? '-stitched' : '';
  return `${baseName}${suffix}.png`;
};

export const uploadReceipt = async (req, res) => {
  try {
    const userId = normalizeUserId(req);
    const files = getUploadedReceiptFiles(req);

    if (!userId || !ensureValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid userId is required'
      });
    }

    const normalizedUserId = new mongoose.Types.ObjectId(userId);

    if (!files.length) {
      return res.status(400).json({
        success: false,
        error: 'At least one receipt image is required'
      });
    }

    if (files.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'You can upload up to 10 images per receipt.'
      });
    }

    let fileId;
    let receipt;

    let uploadPayload;
    try {
      const stitchedImage = await prepareReceiptImage(files);
      const contentHash = computeSha256(stitchedImage.buffer);
      const duplicateReceipt = await Receipt.findOne({
        userId: normalizedUserId,
        contentHash
      }).lean();

      if (duplicateReceipt) {
        return res.status(409).json({
          success: false,
          error: 'Duplicate receipt detected. Delete the existing receipt from your history before uploading it again.',
          duplicateReceiptId: duplicateReceipt._id
        });
      }

      uploadPayload = stitchedImage;

      const combinedFilename = buildCombinedFilename(files);

      fileId = await uploadBufferToGridFs(stitchedImage.buffer, {
        filename: combinedFilename,
        contentType: stitchedImage.mimeType,
        metadata: {
          userId: normalizedUserId.toString(),
          uploadedAt: new Date(),
          pageCount: stitchedImage.pageCount,
          sourceImages: stitchedImage.sourceImages,
          contentHash
        }
      });

      receipt = await Receipt.create({
        userId: normalizedUserId,
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
    } catch (storageError) {
      console.error('Receipt upload failed:', storageError);
      return res.status(500).json({
        success: false,
        error: 'Failed to store receipt image'
      });
    }

    let message = 'Receipt uploaded and processed successfully.';

    try {
      const ocrResult = await runReceiptOcr(uploadPayload.buffer);

      receipt.rawText = ocrResult.rawText;
      receipt.merchant = ocrResult.merchant;
      receipt.purchaseDate = ocrResult.purchaseDate;
      receipt.total = ocrResult.total;
      receipt.currency = ocrResult.currency;
      receipt.items = ocrResult.items;
      receipt.status = 'ready';
      await receipt.save();
    } catch (ocrError) {
      console.error('OCR processing failed:', ocrError);
      receipt.status = 'error';
      receipt.errorMessage = ocrError.message;
      message = 'Receipt uploaded but OCR processing failed.';
      await receipt.save();
    }

    return res.status(201).json({
      success: true,
      message,
      receipt: asObject(receipt)
    });
  } catch (error) {
    console.error('Unexpected upload error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to upload receipt'
    });
  }
};

export const listReceipts = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || !ensureValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid userId is required'
      });
    }

    const receipts = await Receipt.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      receipts
    });
  } catch (error) {
    console.error('Failed to list receipts:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch receipts'
    });
  }
};

export const getReceipt = async (req, res) => {
  try {
    const { receiptId } = req.params;
    const userId = normalizeUserId(req);

    if (!receiptId || !ensureValidObjectId(receiptId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid receiptId is required'
      });
    }

    if (!userId || !ensureValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid userId is required'
      });
    }

    const receipt = await Receipt.findOne({
      _id: receiptId,
      userId
    }).lean();

    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: 'Receipt not found'
      });
    }

    return res.json({
      success: true,
      receipt
    });
  } catch (error) {
    console.error('Failed to get receipt:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch receipt'
    });
  }
};

export const deleteReceipt = async (req, res) => {
  try {
    const { receiptId } = req.params;
    const userId = normalizeUserId(req);

    if (!receiptId || !ensureValidObjectId(receiptId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid receiptId is required'
      });
    }

    if (!userId || !ensureValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid userId is required'
      });
    }

    const receipt = await Receipt.findOne({
      _id: receiptId,
      userId
    });

    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: 'Receipt not found'
      });
    }

    await Receipt.deleteOne({ _id: receiptId });

    try {
      await deleteFileFromGridFs(receipt.fileId);
    } catch (fileError) {
      console.error('Failed to delete receipt file:', fileError);
    }

    return res.json({
      success: true
    });
  } catch (error) {
    console.error('Failed to delete receipt:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete receipt'
    });
  }
};

export const streamReceiptImage = async (req, res) => {
  try {
    const { receiptId } = req.params;
    const userId = normalizeUserId(req);

    if (!receiptId || !ensureValidObjectId(receiptId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid receiptId is required'
      });
    }

    if (!userId || !ensureValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid userId is required'
      });
    }

    const receipt = await Receipt.findOne({
      _id: receiptId,
      userId
    }).lean();

    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: 'Receipt not found'
      });
    }

    const fileStream = getFileStreamFromGridFs(receipt.fileId);

    res.setHeader('Content-Type', receipt.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${receipt.originalFilename || 'receipt'}"`);

    fileStream.on('error', (error) => {
      console.error('Failed to stream receipt image:', error);
      res.status(500).end();
    });

    fileStream.pipe(res);
  } catch (error) {
    console.error('Failed to fetch receipt image:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch receipt image'
    });
  }
};

export const chatAboutReceipts = async (req, res) => {
  try {
    const params = req.chatParams || req.body;
    const result = await receiptRagService.chat(params);

    return res.json({
      success: true,
      answer: result.answer,
      sources: result.sources || [],
      usage: result.usage || null,
      contextChunks: result.contextChunks || [],
      question: result.question,
      diagnostic: result.diagnostic || null
    });
  } catch (error) {
    const isValidationError = /invalid|required|question|userId|receipt/i.test(error?.message || '');
    const statusCode = isValidationError ? 400 : 500;

    console.error('Chat request failed:', error);

    return res.status(statusCode).json({
      success: false,
      error: isValidationError
        ? error.message
        : 'Failed to process chat request. Please try again later.'
    });
  }
};

export const checkEmbeddingStatus = async (req, res) => {
  try {
    const userId = normalizeUserId(req);
    const { receiptIds } = req.body || {};

    if (!userId || !ensureValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid userId is required'
      });
    }

    const status = await receiptRagService.checkEmbeddingStatus({ userId, receiptIds });

    return res.json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('Failed to check embedding status:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check embedding status'
    });
  }
};

export const checkChunks = async (req, res) => {
  try {
    const userId = normalizeUserId(req);
    const { receiptId } = req.query || {};

    if (!userId || !ensureValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid userId is required'
      });
    }

    const normalizedUserId = new mongoose.Types.ObjectId(userId);
    const query = { userId: normalizedUserId };

    if (receiptId && ensureValidObjectId(receiptId)) {
      query.receiptId = new mongoose.Types.ObjectId(receiptId);
    }

    const ReceiptChunk = (await import('../models/ReceiptChunk.js')).default;
    const totalChunks = await ReceiptChunk.countDocuments(query);
    const sampleChunks = await ReceiptChunk.find(query).limit(3).lean();

    return res.json({
      success: true,
      totalChunks,
      sampleChunks: sampleChunks.map((chunk) => ({
        receiptId: chunk.receiptId?.toString(),
        chunkIndex: chunk.chunkIndex,
        hasEmbedding: Array.isArray(chunk.embedding) && chunk.embedding.length > 0,
        embeddingLength: chunk.embedding?.length || 0,
        textPreview: chunk.text?.substring(0, 100) || ''
      }))
    });
  } catch (error) {
    console.error('Failed to check chunks:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check chunks'
    });
  }
};

export const triggerEmbedding = async (req, res) => {
  try {
    const userId = normalizeUserId(req);
    const { receiptId } = req.body || {};

    if (!userId || !ensureValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid userId is required'
      });
    }

    const normalizedUserId = new mongoose.Types.ObjectId(userId);
    const query = { userId: normalizedUserId, status: 'ready' };

    if (receiptId && ensureValidObjectId(receiptId)) {
      query._id = receiptId;
    } else {
      // Only process receipts that aren't synced or need re-embedding
      query.$or = [
        { embeddingStatus: { $ne: 'synced' } },
        { embeddingsVersion: { $lt: ragConfig.embeddingsVersion } }
      ];
    }

    const receipts = await Receipt.find(query).limit(10).sort({ updatedAt: 1 });

    if (receipts.length === 0) {
      return res.json({
        success: true,
        message: 'No receipts need embedding',
        processed: 0,
        successCount: 0,
        failedCount: 0
      });
    }

    const embeddingClient = getEmbeddingClient();
    const stats = {
      processed: 0,
      successCount: 0,
      failedCount: 0
    };

    for (const receiptDoc of receipts) {
      try {
        await Receipt.updateOne({ _id: receiptDoc._id }, { $set: { embeddingStatus: 'pending' } });

        const receipt = receiptDoc.toObject({ depopulate: true });
        receipt._id = receiptDoc._id;
        receipt.userId = receiptDoc.userId;

        const chunks = receiptChunker.chunkReceipt(receipt);
        if (!chunks.length) {
          throw new Error('No embeddable content extracted from receipt.');
        }

        const embeddingResult = await embeddingClient.embedBatch(chunks.map((chunk) => chunk.text));
        const chunkPayloads = chunks.map((chunk, index) => ({
          ...chunk,
          embedding: embeddingResult.embeddings[index]
        }));

        await vectorStore.upsertChunks(chunkPayloads);

        receiptDoc.embeddingStatus = 'synced';
        receiptDoc.embeddingsVersion = ragConfig.embeddingsVersion;
        receiptDoc.errorMessage = undefined;
        await receiptDoc.save();

        stats.processed += 1;
        stats.successCount += 1;

        logger.info('rag.embedding.triggered', {
          receiptId: receiptDoc._id.toString(),
          userId: receiptDoc.userId?.toString(),
          chunkCount: chunks.length
        });
      } catch (error) {
        await Receipt.updateOne(
          { _id: receiptDoc._id },
          {
            $set: {
              embeddingStatus: 'failed',
              errorMessage: error.message || 'Embedding failed'
            }
          }
        );
        stats.processed += 1;
        stats.failedCount += 1;
        logger.error('rag.embedding.failed', {
          receiptId: receiptDoc._id.toString(),
          userId: receiptDoc.userId?.toString(),
          error: error.message || error
        });
      }
    }

    return res.json({
      success: true,
      message: `Processed ${stats.processed} receipt(s)`,
      ...stats
    });
  } catch (error) {
    console.error('Failed to trigger embedding:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to trigger embedding'
    });
  }
};

