import { BaseService } from './BaseService.js';
import ApiService from './ApiService.js';

const sanitizePayload = (payload) => {
  const sanitized = {};

  if (payload.userId) {
    sanitized.userId = payload.userId;
  }

  if (typeof payload.question === 'string' && payload.question.trim().length > 0) {
    sanitized.question = payload.question.trim();
  }

  if (Array.isArray(payload.receiptIds) && payload.receiptIds.length > 0) {
    sanitized.receiptIds = payload.receiptIds;
  }

  if (payload.dateRange && (payload.dateRange.start || payload.dateRange.end)) {
    sanitized.dateRange = payload.dateRange;
  }

  if (typeof payload.topK === 'number' && Number.isInteger(payload.topK) && payload.topK > 0) {
    sanitized.topK = payload.topK;
  }

  return sanitized;
};

class ReceiptRagClient extends BaseService {
  constructor() {
    super('ReceiptRagClient');
    this.apiService = new ApiService();
  }

  async chat(payload = {}) {
    return this.executeWithRetry(async () => {
      const body = sanitizePayload(payload);

      const response = await this.apiService.makeRequest('/receipts/chat', {
        method: 'POST',
        body: JSON.stringify(body)
      });

      if (!response?.success) {
        throw new Error(response?.error || 'Failed to process chat request');
      }

      return this.createSuccessResponse({
        answer: response.answer,
        sources: response.sources || [],
        contextChunks: response.contextChunks || [],
        usage: response.usage || null,
        question: response.question || body.question
      }, 'Chat response received');
    }, {
      context: {
        userId: payload.userId
      }
    });
  }
}

const receiptRagClient = new ReceiptRagClient();

export default receiptRagClient;

