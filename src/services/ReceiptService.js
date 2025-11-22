import { BaseService } from './BaseService.js';
import ApiService from './ApiService.js';

export class ReceiptService extends BaseService {
  constructor() {
    super('Receipt');

    this.apiService = new ApiService();
    this.apiBaseUrl = this.apiService.apiBaseUrl;
  }

  getImageUrl(receiptId, userId) {
    const params = new globalThis.URLSearchParams({ userId });
    return `${this.apiBaseUrl}/receipts/${receiptId}/image?${params.toString()}`;
  }

  async uploadReceipt(userId, files) {
    const normalizedFiles = Array.isArray(files) ? files : [files].filter(Boolean);

    return this.executeWithRetry(async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      if (!normalizedFiles.length) {
        throw new Error('Receipt file is required');
      }

      const formData = new FormData();
      formData.append('userId', userId);
      normalizedFiles.forEach((file) => {
        formData.append('receiptImages', file);
      });

      const response = await fetch(`${this.apiBaseUrl}/receipts`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload receipt');
      }

      return this.createSuccessResponse(data.receipt, data.message || 'Receipt uploaded');
    }, {
      context: {
        userId,
        files: normalizedFiles.map((file) => file.name)
      }
    });
  }

  async listReceipts(userId) {
    return this.executeWithRetry(async () => {
      const result = await this.apiService.makeRequest(`/receipts/user/${userId}`);

      if (result.success) {
        return this.createSuccessResponse(result.receipts, 'Receipts loaded');
      }

      throw new Error(result.error || 'Failed to load receipts');
    }, { context: { userId } });
  }

  async getReceipt(userId, receiptId) {
    return this.executeWithRetry(async () => {
      const params = new globalThis.URLSearchParams({ userId });
      const result = await this.apiService.makeRequest(`/receipts/${receiptId}?${params.toString()}`);

      if (result.success) {
        return this.createSuccessResponse(result.receipt, 'Receipt loaded');
      }

      throw new Error(result.error || 'Failed to load receipt');
    }, { context: { userId, receiptId } });
  }

  async deleteReceipt(userId, receiptId) {
    return this.executeWithRetry(async () => {
      const params = new globalThis.URLSearchParams({ userId });
      const result = await this.apiService.makeRequest(`/receipts/${receiptId}?${params.toString()}`, {
        method: 'DELETE'
      });

      if (result.success) {
        return this.createSuccessResponse(null, 'Receipt deleted');
      }

      throw new Error(result.error || 'Failed to delete receipt');
    }, { context: { userId, receiptId } });
  }

  async checkEmbeddingStatus(userId, receiptIds = null) {
    return this.executeWithRetry(async () => {
      const body = { userId };
      if (receiptIds && Array.isArray(receiptIds) && receiptIds.length > 0) {
        body.receiptIds = receiptIds;
      }

      const result = await this.apiService.makeRequest('/receipts/embedding/status', {
        method: 'POST',
        body: JSON.stringify(body)
      });

      if (result.success) {
        return this.createSuccessResponse({
          total: result.total || 0,
          synced: result.synced || 0,
          pending: result.pending || 0,
          failed: result.failed || 0,
          ready: result.ready || false,
          receipts: result.receipts || []
        }, 'Embedding status checked');
      }

      throw new Error(result.error || 'Failed to check embedding status');
    }, { context: { userId, receiptIds } });
  }

  async triggerEmbedding(userId, receiptId = null) {
    return this.executeWithRetry(async () => {
      const body = { userId };
      if (receiptId) {
        body.receiptId = receiptId;
      }

      const result = await this.apiService.makeRequest('/receipts/embedding/trigger', {
        method: 'POST',
        body: JSON.stringify(body)
      });

      if (result.success) {
        return this.createSuccessResponse({
          processed: result.processed || 0,
          successCount: result.successCount || 0,
          failedCount: result.failedCount || 0
        }, result.message || 'Embedding triggered');
      }

      throw new Error(result.error || 'Failed to trigger embedding');
    }, { context: { userId, receiptId } });
  }
}

export default ReceiptService;

