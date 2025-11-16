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
      question: result.question
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

