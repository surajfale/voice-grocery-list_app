import express from 'express';
import multer from 'multer';
import {
  uploadReceipt,
  listReceipts,
  getReceipt,
  deleteReceipt,
  streamReceiptImage,
  chatAboutReceipts,
  checkEmbeddingStatus,
  triggerEmbedding,
  checkChunks
} from '../controllers/receiptController.js';
import { receiptChatIpLimiter, receiptChatUserLimiter } from '../middleware/rateLimiter.js';
import validateChatRequest from '../middleware/validateChatRequest.js';
import { authenticate, authenticateFlexible, requireOwnUserId } from '../middleware/auth.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per file
    files: 10
  },
  fileFilter: (_req, file, callback) => {
    const allowedMimeTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'image/heic',
      'image/heif'
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return callback(new Error('Unsupported file type. Please upload an image.'));
    }

    return callback(null, true);
  }
});

router.post('/', authenticate, upload.any(), uploadReceipt);
router.get('/user/:userId', authenticate, requireOwnUserId, listReceipts);
router.post(
  '/chat',
  authenticate,
  receiptChatIpLimiter,
  receiptChatUserLimiter,
  validateChatRequest,
  chatAboutReceipts
);
router.post('/embedding/status', authenticate, checkEmbeddingStatus);
router.post('/embedding/trigger', authenticate, triggerEmbedding);
router.get('/embedding/chunks', authenticate, checkChunks);
router.get('/:receiptId', authenticate, getReceipt);
router.get('/:receiptId/image', authenticateFlexible, streamReceiptImage);
router.delete('/:receiptId', authenticate, deleteReceipt);

router.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      error: error.message || 'Upload failed'
    });
  }

  if (error) {
    return res.status(400).json({
      success: false,
      error: error.message || 'Failed to process request'
    });
  }

  return res.status(500).json({
    success: false,
    error: 'Unknown error'
  });
});

export default router;

