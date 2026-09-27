import { useCallback, useEffect, useMemo, useState } from 'react';
import serviceManager from '../services/ServiceManager.js';
import { buildPriceSignals, parseItemName } from '../utils/receiptInsights';
import logger from '../utils/logger.js';

const receiptService = serviceManager.getService('receipt');

/**
 * Receipt-derived price hints for grocery list items: whether an item's price
 * went up on its last purchase, and whether another store was cheaper.
 * Receipts are (re)loaded whenever `enabled` turns on, e.g. when returning to
 * the list from the Receipts page, so edits made there show up.
 *
 * @param {Object} user - Authenticated user
 * @param {boolean} enabled - Load only while the list view is showing
 * @returns {(text: string) => (object|null)} lookup by grocery item text
 */
export const usePriceSignals = (user, enabled = true) => {
  const [receipts, setReceipts] = useState([]);
  const userId = user?._id;

  useEffect(() => {
    if (!userId || !enabled) {
      return undefined;
    }

    let cancelled = false;
    receiptService.listReceipts(userId)
      .then((result) => {
        if (!cancelled && result.success) {
          setReceipts(result.data || []);
        }
      })
      .catch((error) => {
        // Price hints are a nice-to-have: log, never surface an error
        logger.warn('Failed to load receipts for price hints:', error.message);
      });

    return () => { cancelled = true; };
  }, [userId, enabled]);

  const signals = useMemo(() => buildPriceSignals(receipts), [receipts]);

  return useCallback((text) => signals.get(parseItemName(text).key) || null, [signals]);
};

export default usePriceSignals;
