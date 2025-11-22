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
  triggerEmbedding
} from '../controllers/receiptController.js';
import { receiptChatIpLimiter, receiptChatUserLimiter } from '../middleware/rateLimiter.js';
import validateChatRequest from '../middleware/validateChatRequest.js';

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

router.post('/', upload.any(), uploadReceipt);
router.get('/user/:userId', listReceipts);
router.post(
  '/chat',
  receiptChatIpLimiter,
  receiptChatUserLimiter,
  validateChatRequest,
  chatAboutReceipts
);
router.post('/embedding/status', checkEmbeddingStatus);
router.post('/embedding/trigger', triggerEmbedding);
router.get('/:receiptId', getReceipt);
router.get('/:receiptId/image', streamReceiptImage);
router.delete('/:receiptId', deleteReceipt);

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

