import { useCallback, useEffect, useMemo, useState } from 'react';
import serviceManager from '../services/ServiceManager.js';
import useErrorHandler from './useErrorHandler.js';
import logger from '../utils/logger.js';

const receiptService = serviceManager.getService('receipt');

export const useReceipts = (user) => {
  const [receipts, setReceipts] = useState([]);
  const [selectedReceiptId, setSelectedReceiptId] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { error, setError, clearError } = useErrorHandler({
    autoClearDelay: 6000
  });

  const userId = user?._id;

  const loadReceipts = useCallback(async () => {
    if (!userId) {
      return;
    }

    setLoading(true);
    try {
      const result = await receiptService.listReceipts(userId);
      if (result.success) {
        setReceipts(result.data);
      } else {
        setError(result.error || 'Failed to load receipts');
      }
    } catch (err) {
      logger.error('Failed to load receipts:', err);
      setError(err.message || 'Failed to load receipts');
    } finally {
      setLoading(false);
    }
  }, [userId, setError]);

  const refreshSelectedReceipt = useCallback(async (receiptId) => {
    if (!userId || !receiptId) {
      setSelectedReceipt(null);
      return;
    }

    try {
      const result = await receiptService.getReceipt(userId, receiptId);
      if (result.success) {
        setSelectedReceipt(result.data);
      } else {
        setError(result.error || 'Failed to load receipt');
      }
    } catch (err) {
      logger.error('Failed to fetch receipt:', err);
      setError(err.message || 'Failed to load receipt');
    }
  }, [userId, setError]);

  const uploadReceipt = useCallback(async (file) => {
    if (!userId) {
      setError('Please sign in to upload receipts');
      return;
    }

    setUploading(true);
    try {
      const result = await receiptService.uploadReceipt(userId, file);
      if (result.success) {
        setReceipts((prev) => [result.data, ...prev]);
        await refreshSelectedReceipt(result.data._id);
      } else {
        setError(result.error || 'Failed to upload receipt');
      }
    } catch (err) {
      logger.error('Receipt upload failed:', err);
      setError(err.message || 'Failed to upload receipt');
    } finally {
      setUploading(false);
    }
  }, [userId, refreshSelectedReceipt, setError]);

  const deleteReceipt = useCallback(async (receiptId) => {
    if (!userId) {
      setError('Please sign in to delete receipts');
      return;
    }

    try {
      const result = await receiptService.deleteReceipt(userId, receiptId);
      if (result.success) {
        setReceipts((prev) => prev.filter((receipt) => receipt._id !== receiptId));
        if (selectedReceiptId === receiptId) {
          setSelectedReceiptId(null);
          setSelectedReceipt(null);
        }
      } else {
        setError(result.error || 'Failed to delete receipt');
      }
    } catch (err) {
      logger.error('Receipt deletion failed:', err);
      setError(err.message || 'Failed to delete receipt');
    }
  }, [userId, selectedReceiptId, setError]);

  const selectReceipt = useCallback(async (receiptId) => {
    setSelectedReceiptId(receiptId);
    if (receiptId) {
      await refreshSelectedReceipt(receiptId);
    } else {
      setSelectedReceipt(null);
    }
  }, [refreshSelectedReceipt]);

  const receiptImageUrl = useCallback((receiptId) => {
    if (!receiptId || !userId) {
      return null;
    }
    return receiptService.getImageUrl(receiptId, userId);
  }, [userId]);

  useEffect(() => {
    setReceipts([]);
    setSelectedReceiptId(null);
    setSelectedReceipt(null);
    if (userId) {
      loadReceipts();
    }
  }, [userId, loadReceipts]);

  useEffect(() => {
    if (selectedReceiptId) {
      refreshSelectedReceipt(selectedReceiptId);
    }
  }, [selectedReceiptId, refreshSelectedReceipt]);

  const latestReceipts = useMemo(() => receipts.slice(0, 20), [receipts]);

  return {
    receipts: latestReceipts,
    selectedReceipt,
    selectedReceiptId,
    loading,
    uploading,
    error,
    clearError,
    uploadReceipt,
    deleteReceipt,
    selectReceipt,
    receiptImageUrl,
    reloadReceipts: loadReceipts
  };
};

export default useReceipts;

