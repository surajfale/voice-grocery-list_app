import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import receiptRagClient from '../services/ReceiptRagClient.js';
import useNetworkStatus from './useNetworkStatus.js';
import logger from '../utils/logger.js';

const MAX_HISTORY = 20;
const STAGE_SWITCH_DELAY = 1200;

const sanitizeQuestion = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim();
};

const formatDateRangePayload = (range) => {
  if (!Array.isArray(range)) {
    return undefined;
  }

  const [start, end] = range;
  const payload = {};

  if (dayjs.isDayjs(start) && start.isValid()) {
    payload.start = start.format('YYYY-MM-DD');
  }

  if (dayjs.isDayjs(end) && end.isValid()) {
    payload.end = end.format('YYYY-MM-DD');
  }

  return (payload.start || payload.end) ? payload : undefined;
};

const mapErrorMessage = (error) => {
  const message = error?.message || 'Unable to process your question right now. Please try again.';

  if (/timeout/i.test(message)) {
    return 'This took longer than expected. Please try again in a moment.';
  }

  if (/Too many|429/i.test(message)) {
    return 'You have reached the chat rate limit. Please wait a few minutes and try again.';
  }

  if (/offline|Network error/i.test(message)) {
    return 'You appear to be offline. Check your connection and try again.';
  }

  return message;
};

const formatReceiptLabel = (receipt) => {
  const merchant = receipt.merchant?.trim() || 'Unknown merchant';
  const date = receipt.purchaseDate || 'No date';
  const total = typeof receipt.total === 'number' ? `${receipt.currency || '$'}${receipt.total.toFixed(2)}` : null;
  return total ? `${merchant} • ${date} • ${total}` : `${merchant} • ${date}`;
};

export const useReceiptChat = ({ userId, receipts = [] }) => {
  const [question, setQuestion] = useState('');
  const [status, setStatus] = useState('idle'); // idle | retrieving | generating | error
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [selectedMerchants, setSelectedMerchants] = useState([]);
  const [selectedReceiptIds, setSelectedReceiptIds] = useState([]);
  const [dateRange, setDateRange] = useState([null, null]);
  const [topK, setTopK] = useState(15);
  const [lastRequest, setLastRequest] = useState(null);
  const statusTimerRef = useRef(null);

  const { isOnline, getStatusMessage } = useNetworkStatus();

  const merchantOptions = useMemo(() => {
    const unique = new Set();
    receipts.forEach((receipt) => {
      const merchant = receipt.merchant?.trim();
      if (merchant) {
        unique.add(merchant);
      }
    });

    if (receipts.some((receipt) => !receipt.merchant)) {
      unique.add('Unknown merchant');
    }

    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [receipts]);

  const receiptOptions = useMemo(() => receipts.map((receipt) => ({
    id: receipt._id,
    label: formatReceiptLabel(receipt),
    merchant: receipt.merchant?.trim() || 'Unknown merchant'
  })), [receipts]);

  const selectedReceiptOptions = useMemo(() => {
    const optionMap = new Map(receiptOptions.map((option) => [option.id, option]));
    return selectedReceiptIds
      .map((id) => optionMap.get(id))
      .filter(Boolean);
  }, [selectedReceiptIds, receiptOptions]);

  const hasActiveFilters = useMemo(() => {
    const [start, end] = dateRange;
    return Boolean(
      selectedMerchants.length
      || selectedReceiptIds.length
      || (start && start.isValid())
      || (end && end.isValid())
    );
  }, [dateRange, selectedMerchants, selectedReceiptIds]);

  const activeFilterChips = useMemo(() => {
    const chips = [];
    const [start, end] = dateRange;

    if (start && start.isValid()) {
      chips.push({
        key: 'start',
        label: `From ${start.format('MMM D, YYYY')}`,
        type: 'dateStart',
        value: start
      });
    }

    if (end && end.isValid()) {
      chips.push({
        key: 'end',
        label: `To ${end.format('MMM D, YYYY')}`,
        type: 'dateEnd',
        value: end
      });
    }

    selectedMerchants.forEach((merchant) => {
      chips.push({
        key: `merchant-${merchant}`,
        label: merchant,
        type: 'merchant',
        value: merchant
      });
    });

    selectedReceiptOptions.forEach((option) => {
      chips.push({
        key: `receipt-${option.id}`,
        label: option.label,
        type: 'receipt',
        value: option.id
      });
    });

    return chips;
  }, [dateRange, selectedMerchants, selectedReceiptOptions]);

  const isLoading = status === 'retrieving' || status === 'generating';
  const statusMessage = status === 'retrieving'
    ? 'Searching receipts...'
    : status === 'generating'
      ? 'Generating answer...'
      : '';

  useEffect(() => {
    if (status === 'retrieving') {
      statusTimerRef.current = setTimeout(() => {
        setStatus((prev) => (prev === 'retrieving' ? 'generating' : prev));
      }, STAGE_SWITCH_DELAY);
    }

    return () => {
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current);
        statusTimerRef.current = null;
      }
    };
  }, [status]);

  useEffect(() => {
    setSelectedReceiptIds((prev) => prev.filter((id) => receipts.some((receipt) => receipt._id === id)));
  }, [receipts]);

  useEffect(() => {
    setSelectedMerchants((prev) => prev.filter((merchant) => merchantOptions.includes(merchant)));
  }, [merchantOptions]);

  const buildReceiptIdList = useCallback((overrides = {}) => {
    if (Array.isArray(overrides.receiptIds)) {
      return overrides.receiptIds;
    }

    const ids = new Set(overrides.receiptIds || selectedReceiptIds);
    const merchants = overrides.merchants ?? selectedMerchants;

    if (merchants.length) {
      receipts.forEach((receipt) => {
        const merchant = receipt.merchant?.trim() || 'Unknown merchant';
        if (merchants.includes(merchant) && receipt._id) {
          ids.add(receipt._id);
        }
      });
    }

    return Array.from(ids).filter(Boolean);
  }, [receipts, selectedReceiptIds, selectedMerchants]);

  const clearFilters = useCallback(() => {
    setDateRange([null, null]);
    setSelectedMerchants([]);
    setSelectedReceiptIds([]);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const sendQuestion = useCallback(async (prompt, overrides = {}) => {
    if (!userId) {
      setError('Please sign in to chat about your receipts.');
      return null;
    }

    if (!isOnline) {
      setError('You appear to be offline. Check your connection and try again.');
      return null;
    }

    const trimmedQuestion = sanitizeQuestion(prompt ?? question);
    if (trimmedQuestion.length < 3) {
      setError('Please enter a more detailed question.');
      return null;
    }

    const receiptIds = buildReceiptIdList(overrides);
    const datePayload = overrides.dateRange || formatDateRangePayload(dateRange);
    const topKValue = overrides.topK || topK;

    const payload = {
      userId,
      question: trimmedQuestion,
      receiptIds: receiptIds.length ? receiptIds : undefined,
      dateRange: datePayload,
      topK: topKValue
    };

    setLastRequest({
      question: trimmedQuestion,
      options: {
        receiptIds: payload.receiptIds,
        dateRange: payload.dateRange,
        topK: topKValue
      }
    });

    setStatus('retrieving');
    setError(null);

    try {
      const result = await receiptRagClient.chat(payload);
      if (!result.success) {
        throw new Error(result.error || 'Chat request failed');
      }

      const data = result.data || {};
      const normalizedSources = (data.sources || []).map((source) => ({
        ...source,
        receiptId: typeof source.receiptId === 'object' && source.receiptId !== null
          ? source.receiptId.toString()
          : source.receiptId
      }));

      const normalizedChunks = (data.contextChunks || []).map((chunk) => ({
        ...chunk,
        receiptId: typeof chunk.receiptId === 'object' && chunk.receiptId !== null
          ? chunk.receiptId.toString()
          : chunk.receiptId
      }));

      const historyEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        question: trimmedQuestion,
        answer: data.answer,
        sources: normalizedSources,
        contextChunks: normalizedChunks,
        usage: data.usage || null,
        createdAt: new Date().toISOString(),
        filters: {
          receiptIds: payload.receiptIds,
          merchants: [...selectedMerchants],
          dateRange: payload.dateRange,
          topK: topKValue
        }
      };

      setHistory((prev) => {
        const next = [historyEntry, ...prev];
        return next.slice(0, MAX_HISTORY);
      });

      setQuestion('');
      setStatus('idle');
      return historyEntry;
    } catch (err) {
      logger.error('Receipt chat failed', err);
      setStatus('error');
      setError(mapErrorMessage(err));
      return null;
    }
  }, [buildReceiptIdList, dateRange, isOnline, question, selectedMerchants, topK, userId]);

  const retryLast = useCallback(() => {
    if (!lastRequest) {
      return null;
    }

    return sendQuestion(lastRequest.question, lastRequest.options);
  }, [lastRequest, sendQuestion]);

  const regenerateAnswer = useCallback((entryId) => {
    const entry = history.find((item) => item.id === entryId);
    if (!entry) {
      return null;
    }

    return sendQuestion(entry.question, entry.filters || {});
  }, [history, sendQuestion]);

  return {
    question,
    setQuestion,
    askQuestion: sendQuestion,
    retryLast,
    regenerateAnswer,
    history,
    isLoading,
    status,
    statusMessage,
    error,
    clearError,
    selectedMerchants,
    setSelectedMerchants,
    merchantOptions,
    selectedReceiptIds,
    setSelectedReceiptIds,
    selectedReceiptOptions,
    receiptOptions,
    dateRange,
    setDateRange,
    activeFilterChips,
    clearFilters,
    hasActiveFilters,
    topK,
    setTopK,
    isOnline,
    networkStatusMessage: getStatusMessage()
  };
};

export default useReceiptChat;

