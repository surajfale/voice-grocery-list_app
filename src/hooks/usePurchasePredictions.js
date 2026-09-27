import { useState, useEffect, useMemo } from 'react';
import apiStorage from '../services/apiStorage.js';
import logger from '../utils/logger.js';

// Fetch a few extra so there are still suggestions after items get added
const FETCH_LIMIT = 15;

// Mirrors the backend's normalizeItemKey so client-side filtering matches
export const normalizeItemKey = (text = '') =>
  String(text).toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Stats-based "you'll probably need" predictions for the selected date.
 * Predictions only depend on history before the date, so they're fetched once
 * per user/date and filtered locally as items are added to the list.
 *
 * @param {Object} user - Authenticated user
 * @param {string} dateString - Selected date (YYYY-MM-DD)
 * @param {Array} currentItems - Items already on the selected list
 * @param {boolean} enabled - Skip fetching (e.g. past dates)
 */
export const usePurchasePredictions = (user, dateString, currentItems, enabled = true) => {
  const [predictions, setPredictions] = useState([]);
  const userId = user?._id;

  useEffect(() => {
    if (!userId || !enabled) {
      setPredictions([]);
      return undefined;
    }

    let cancelled = false; // ignore responses for a date the user already left
    setPredictions([]);

    apiStorage.getPredictions(userId, dateString, FETCH_LIMIT).then((result) => {
      if (cancelled) {return;}
      if (result.success) {
        setPredictions(result.predictions || []);
      } else {
        // Suggestions are a nice-to-have: log, don't surface an error to the user
        logger.warn('Failed to load predictions:', result.error);
      }
    });

    return () => { cancelled = true; };
  }, [userId, dateString, enabled]);

  return useMemo(() => {
    const onList = new Set(currentItems.map((item) => normalizeItemKey(item.text)));
    return predictions.filter((prediction) => !onList.has(prediction.key));
  }, [predictions, currentItems]);
};

/**
 * Human-readable frequency, e.g. "~2×/week" or "~1×/month".
 */
export const formatPredictionFrequency = ({ perWeek = 0, perMonth = 0, typicalGapDays }) => {
  if (perWeek >= 1) {return `~${Math.round(perWeek)}×/week`;}
  if (perMonth >= 1) {return `~${Math.round(perMonth)}×/month`;}
  return `every ~${typicalGapDays} days`;
};

/**
 * Tooltip text explaining why an item was suggested.
 */
export const describePrediction = (prediction) => {
  const { typicalGapDays, daysSinceLast } = prediction;
  const last = daysSinceLast === 0 ? 'today' : `${daysSinceLast} day${daysSinceLast === 1 ? '' : 's'} ago`;
  return `Usually every ~${typicalGapDays} days (${formatPredictionFrequency(prediction)}) · last bought ${last}`;
};

export default usePurchasePredictions;
