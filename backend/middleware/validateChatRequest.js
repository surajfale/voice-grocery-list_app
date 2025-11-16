import mongoose from 'mongoose';

const MIN_QUESTION_LENGTH = 3;
const MAX_QUESTION_LENGTH = 500;
const MAX_RECEIPT_IDS = 25;

const sanitizeQuestion = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const normalizeReceiptIds = (receiptIds) => {
  if (typeof receiptIds === 'undefined') {
    return undefined;
  }

  if (!Array.isArray(receiptIds)) {
    throw new Error('receiptIds must be an array of ids.');
  }

  if (receiptIds.length > MAX_RECEIPT_IDS) {
    throw new Error(`You can only reference up to ${MAX_RECEIPT_IDS} receipts at once.`);
  }

  const normalized = receiptIds.map((id) => {
    if (!isValidObjectId(id)) {
      throw new Error('receiptIds contains an invalid id.');
    }
    return id;
  });

  return normalized;
};

const normalizeDateRange = (range) => {
  if (!range) {
    return undefined;
  }

  const { start, end } = range;
  const normalized = {};

  if (start) {
    const startDate = new Date(start);
    if (Number.isNaN(startDate.getTime())) {
      throw new Error('dateRange.start must be a valid date string.');
    }
    normalized.start = startDate.toISOString().slice(0, 10);
  }

  if (end) {
    const endDate = new Date(end);
    if (Number.isNaN(endDate.getTime())) {
      throw new Error('dateRange.end must be a valid date string.');
    }
    normalized.end = endDate.toISOString().slice(0, 10);
  }

  if (!normalized.start && !normalized.end) {
    return undefined;
  }

  if (normalized.start && normalized.end && normalized.start > normalized.end) {
    throw new Error('dateRange.start must be before dateRange.end.');
  }

  return normalized;
};

export const validateChatRequest = (req, res, next) => {
  try {
    const {
      userId,
      question,
      receiptIds,
      dateRange,
      topK
    } = req.body || {};

    if (!userId || !isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        error: 'A valid userId is required.'
      });
    }

    const sanitizedQuestion = sanitizeQuestion(question);

    if (!sanitizedQuestion || sanitizedQuestion.length < MIN_QUESTION_LENGTH) {
      return res.status(400).json({
        success: false,
        error: `Question must be at least ${MIN_QUESTION_LENGTH} characters.`
      });
    }

    if (sanitizedQuestion.length > MAX_QUESTION_LENGTH) {
      return res.status(400).json({
        success: false,
        error: `Question must be fewer than ${MAX_QUESTION_LENGTH} characters.`
      });
    }

    const normalizedReceiptIds = normalizeReceiptIds(receiptIds);
    const normalizedDateRange = normalizeDateRange(dateRange);

    let normalizedTopK;
    if (typeof topK !== 'undefined') {
      const parsed = Number(topK);
      if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 25) {
        return res.status(400).json({
          success: false,
          error: 'topK must be a positive integer less than or equal to 25.'
        });
      }
      normalizedTopK = parsed;
    }

    req.chatParams = {
      userId,
      question: sanitizedQuestion,
      receiptIds: normalizedReceiptIds,
      dateRange: normalizedDateRange,
      topK: normalizedTopK
    };

    return next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message || 'Invalid chat request.'
    });
  }
};

export default validateChatRequest;


