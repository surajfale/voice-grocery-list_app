import { BaseService, HttpError, nonRetryable } from './BaseService.js';
import ApiService from './ApiService.js';

const TOKEN_STORAGE_KEY = 'groceryListToken';

export class ReceiptService extends BaseService {
  constructor() {
    super('Receipt');

    this.apiService = new ApiService();
    this.apiBaseUrl = this.apiService.apiBaseUrl;
  }

  getImageUrl(receiptId) {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    const params = new globalThis.URLSearchParams(token ? { token } : {});
    const query = params.toString();
    return `${this.apiBaseUrl}/receipts/${receiptId}/image${query ? `?${query}` : ''}`;
  }

  async uploadReceipt(userId, files) {
    const normalizedFiles = Array.isArray(files) ? files : [files].filter(Boolean);

    return this.executeWithRetry(async () => {
      if (!userId) {
        throw nonRetryable('User ID is required');
      }

      if (!normalizedFiles.length) {
        throw nonRetryable('Receipt file is required');
      }

      const formData = new FormData();
      formData.append('userId', userId);
      normalizedFiles.forEach((file) => {
        formData.append('receiptImages', file);
      });

      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      const response = await fetch(`${this.apiBaseUrl}/receipts`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // A rejected upload (bad file type, too large) must not be re-sent
        throw new HttpError(data.error || 'Failed to upload receipt', response.status);
      }
      if (!data.success) {
        throw nonRetryable(data.error || 'Failed to upload receipt');
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

      throw nonRetryable(result.error || 'Failed to load receipts');
    }, { context: { userId } });
  }

  async getReceipt(userId, receiptId) {
    return this.executeWithRetry(async () => {
      const params = new globalThis.URLSearchParams({ userId });
      const result = await this.apiService.makeRequest(`/receipts/${receiptId}?${params.toString()}`);

      if (result.success) {
        return this.createSuccessResponse(result.receipt, 'Receipt loaded');
      }

      throw nonRetryable(result.error || 'Failed to load receipt');
    }, { context: { userId, receiptId } });
  }

  async updateReceipt(userId, receiptId, updates) {
    return this.executeWithRetry(async () => {
      const result = await this.apiService.makeRequest(`/receipts/${receiptId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });

      if (result.success) {
        return this.createSuccessResponse(result.receipt, 'Receipt updated');
      }

      throw nonRetryable(result.error || 'Failed to update receipt');
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

      throw nonRetryable(result.error || 'Failed to delete receipt');
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

      throw nonRetryable(result.error || 'Failed to check embedding status');
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

      throw nonRetryable(result.error || 'Failed to trigger embedding');
    }, { context: { userId, receiptId } });
  }
}

export default ReceiptService;

