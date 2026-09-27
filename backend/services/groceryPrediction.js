import GroceryList from '../models/GroceryList.js';

/**
 * Stats-based purchase prediction.
 *
 * A completed item on a list is treated as "bought on that list's date".
 * For each item bought at least twice we compute the typical gap between
 * purchases and how far through that gap the user currently is; items that
 * are "due" (and bought regularly) score highest. No AI calls — pure math.
 */

const DAY_MS = 86_400_000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const LOOKBACK_DAYS = 180; // older history is noise: habits change
export const RATE_WINDOW_DAYS = 90; // window for per-week / per-month rates
export const MIN_SCORE = 0.15; // drop the "maybe, I guess" tail
export const MIN_PURCHASES = 2; // one purchase isn't a pattern

// Must match the frontend's duplicate check (lowercase + trim), with
// internal whitespace collapsed so "whole  milk" and "Whole milk" merge.
export const normalizeItemKey = (text = '') =>
  String(text).toLowerCase().replace(/\s+/g, ' ').trim();

export const isValidDateString = (value) =>
  typeof value === 'string' && DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

// Dates are local YYYY-MM-DD strings; parsing both sides as UTC midnight keeps
// day differences whole numbers regardless of the server's timezone.
const toDayTs = (dateString) => Date.parse(`${dateString}T00:00:00Z`);

const median = (nums) => {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * Collapse lists into one history entry per normalized item.
 * Multiple completions of the same item on one list count as a single purchase.
 *
 * @param {Array<{date: string, items: Array}>} lists
 * @returns {Array<{key, text, category, days: string[], avgQty: number}>}
 */
export const buildPurchaseHistory = (lists = []) => {
  const byKey = new Map();

  const sortedLists = [...lists].sort((a, b) => a.date.localeCompare(b.date));
  for (const list of sortedLists) {
    for (const item of list.items || []) {
      if (!item?.completed || !item.text) {continue;}
      const key = normalizeItemKey(item.text);
      if (!key) {continue;}

      let entry = byKey.get(key);
      if (!entry) {
        entry = { key, text: item.text.trim(), category: item.category || 'Other', qtyByDay: new Map() };
        byKey.set(key, entry);
      }
      // Latest purchase wins for display text/category (lists are sorted ascending)
      entry.text = item.text.trim();
      entry.category = item.category || entry.category;
      entry.qtyByDay.set(list.date, (entry.qtyByDay.get(list.date) || 0) + (item.count || 1));
    }
  }

  return [...byKey.values()].map(({ qtyByDay, ...rest }) => {
    const quantities = [...qtyByDay.values()];
    return {
      ...rest,
      days: [...qtyByDay.keys()].sort(),
      avgQty: quantities.reduce((sum, q) => sum + q, 0) / quantities.length
    };
  });
};

/**
 * Score one item's purchase history against a target day.
 *
 * @param {string[]} days - Sorted, unique YYYY-MM-DD purchase dates
 * @param {number} nowTs - Target day as UTC-midnight timestamp
 * @returns {Object|null} Stats and score, or null when there's no pattern yet
 */
export const scoreItem = (days, nowTs) => {
  if (!Array.isArray(days) || days.length < MIN_PURCHASES) {return null;}

  const ts = days.map(toDayTs);
  const gaps = ts.slice(1).map((t, i) => (t - ts[i]) / DAY_MS);
  const typicalGap = Math.max(1, median(gaps));
  const daysSinceLast = Math.max(0, (nowTs - ts.at(-1)) / DAY_MS);
  const dueRatio = daysSinceLast / typicalGap;

  // Regularity: median absolute deviation relative to the median gap (1 = clockwork)
  const mad = median(gaps.map((gap) => Math.abs(gap - typicalGap)));
  const regularity = 1 / (1 + mad / typicalGap);
  // Volume: more purchases = more trust (2 → 0.29, 5 → 0.55, 10 → 0.68)
  const volume = 1 - 1 / Math.sqrt(days.length);
  const confidence = regularity * volume;

  // Rises towards "due" (ratio 1), then fades slowly — at ratio ~4 the user
  // has probably stopped buying it.
  const dueScore = dueRatio < 1
    ? dueRatio ** 2
    : Math.exp(-((dueRatio - 1) ** 2) / 4);

  const windowStart = nowTs - RATE_WINDOW_DAYS * DAY_MS;
  const recentPurchases = ts.filter((t) => t >= windowStart).length;

  return {
    score: Number((dueScore * confidence).toFixed(4)),
    purchases: days.length,
    lastPurchased: days.at(-1),
    typicalGapDays: Math.round(typicalGap),
    daysSinceLast: Math.floor(daysSinceLast),
    dueRatio: Number(dueRatio.toFixed(2)),
    perWeek: Number((recentPurchases / (RATE_WINDOW_DAYS / 7)).toFixed(2)),
    perMonth: Number((recentPurchases / (RATE_WINDOW_DAYS / 30)).toFixed(2)),
    confidence: Number(confidence.toFixed(2))
  };
};

/**
 * Fallback when nothing is "due": the user's most-bought items, so new users
 * (or irregular shoppers) still get useful suggestions. Includes single purchases.
 */
export const rankFrequentItems = (entries, { nowTs, limit = 10 } = {}) => {
  const windowStart = nowTs - RATE_WINDOW_DAYS * DAY_MS;

  return entries
    .map((entry) => {
      const ts = entry.days.map(toDayTs);
      const recentPurchases = ts.filter((t) => t >= windowStart).length;
      return {
        key: entry.key,
        text: entry.text,
        category: entry.category,
        suggestedCount: Math.max(1, Math.round(entry.avgQty)),
        reason: 'frequent',
        purchases: entry.days.length,
        lastPurchased: entry.days.at(-1),
        daysSinceLast: Math.max(0, Math.floor((nowTs - ts.at(-1)) / DAY_MS)),
        perWeek: Number((recentPurchases / (RATE_WINDOW_DAYS / 7)).toFixed(2)),
        perMonth: Number((recentPurchases / (RATE_WINDOW_DAYS / 30)).toFixed(2))
      };
    })
    // Most purchases first; ties go to whatever was bought most recently
    .sort((a, b) => b.purchases - a.purchases || b.lastPurchased.localeCompare(a.lastPurchased))
    .slice(0, limit);
};

/**
 * Rank history entries into predictions (pure; no DB access).
 * Due items (reason "due") win; if none qualify, fall back to frequent items.
 */
export const rankPredictions = (history, { nowTs, excludeKeys = [], limit = 10 } = {}) => {
  const exclude = new Set(excludeKeys.map(normalizeItemKey));
  const candidates = history.filter((entry) => !exclude.has(entry.key));

  const due = candidates
    .map((entry) => {
      const stats = scoreItem(entry.days, nowTs);
      return stats && {
        key: entry.key,
        text: entry.text,
        category: entry.category,
        suggestedCount: Math.max(1, Math.round(entry.avgQty)),
        reason: 'due',
        ...stats
      };
    })
    .filter((prediction) => prediction && prediction.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score || b.purchases - a.purchases)
    .slice(0, limit);

  return due.length > 0 ? due : rankFrequentItems(candidates, { nowTs, limit });
};

/**
 * Predict what a user is likely to need on `date`, using only lists before it.
 *
 * @param {string} userId
 * @param {Object} options
 * @param {string} options.date - Target YYYY-MM-DD (defaults to today, UTC)
 * @param {number} options.limit - Max predictions
 */
export const predictItems = async (userId, { date, limit = 10 } = {}) => {
  const targetDate = isValidDateString(date) ? date : new Date().toISOString().slice(0, 10);
  const nowTs = toDayTs(targetDate);
  const since = new Date(nowTs - LOOKBACK_DAYS * DAY_MS).toISOString().slice(0, 10);

  const [history, targetList] = await Promise.all([
    GroceryList.find(
      { userId, date: { $gte: since, $lt: targetDate } },
      { date: 1, items: 1 }
    ).lean(),
    GroceryList.findOne({ userId, date: targetDate }, { items: 1 }).lean()
  ]);

  // Never suggest something that's already on the target list
  const excludeKeys = (targetList?.items || []).map((item) => item.text);

  return rankPredictions(buildPurchaseHistory(history), { nowTs, excludeKeys, limit });
};

export default { predictItems };
