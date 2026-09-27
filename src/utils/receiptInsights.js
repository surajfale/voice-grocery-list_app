/**
 * Shared receipt helpers for spending charts, the share card, the edit dialog
 * and History badges, so they all agree on categories and data-quality flags.
 */
import groceryIntelligence from '../services/groceryIntelligence.js';
import { CATEGORY_STYLES } from './categoryStyles';

/** Categories a receipt item can be assigned to (grocery aisles + household) */
export const RECEIPT_CATEGORIES = [...Object.keys(CATEGORY_STYLES), 'Other'];

const normalizeName = (name = '') => name.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Builds a category resolver that applies, in order:
 * 1. the item's own user-assigned category,
 * 2. the category the user last assigned to an item with the same name on any
 *    receipt ("remembered" picks),
 * 3. the keyword guess from groceryIntelligence.
 * @param {Array} receipts - All of the user's receipts (for remembered picks)
 * @returns {{ resolve: (item) => string, guess: (name) => string }}
 */
export const buildCategoryResolver = (receipts = []) => {
  const remembered = new Map();
  // Oldest first so the most recent pick for a name wins
  [...receipts]
    .sort((a, b) => String(a.updatedAt || a.createdAt || '').localeCompare(String(b.updatedAt || b.createdAt || '')))
    .forEach((receipt) => {
      (receipt.items || []).forEach((item) => {
        if (item?.category && item.name) {
          remembered.set(normalizeName(item.name), item.category);
        }
      });
    });

  const guess = (name = '') => remembered.get(normalizeName(name))
    || groceryIntelligence.categorizeItem(name)
    || 'Other';

  return {
    guess,
    resolve: (item) => item?.category || guess(item?.name),
  };
};

/** Relative gap between line items and total that triggers a "Check total" flag */
export const TOTAL_MISMATCH_THRESHOLD = 0.15;

/**
 * Flags receipts whose priced line items don't add up to the total (usually a
 * misread price or a missed line). Small gaps (tax, bag fees) are ignored.
 * @param {object} receipt
 * @returns {null | { itemsSum: number, total: number, ratio: number }}
 */
export const getTotalMismatch = (receipt) => {
  if (!receipt || typeof receipt.total !== 'number' || receipt.total <= 0) {
    return null;
  }
  const priced = (receipt.items || []).filter((item) => item?.name && typeof item.price === 'number');
  if (!priced.length) {
    return null;
  }
  const itemsSum = Math.round(priced.reduce((sum, item) => sum + item.price, 0) * 100) / 100;
  const ratio = Math.abs(itemsSum - receipt.total) / receipt.total;
  return ratio > TOTAL_MISMATCH_THRESHOLD ? { itemsSum, total: receipt.total, ratio } : null;
};

/**
 * Ignore changes under 3%, or under 2¢ (unit-price rounding, e.g. 3 for $1).
 * Receipt prices are exact to the cent, so a cheap item going $0.19 → $0.23
 * is a real 21% rise and must not be filtered by a large absolute floor.
 */
export const PRICE_CHANGE_MIN_PCT = 0.03;
export const PRICE_CHANGE_MIN_AMOUNT = 0.02;

// Undated receipts fall back to their upload date, so a new scan without a
// readable date still counts as the latest purchase
const purchaseDay = (receipt) => receipt.purchaseDate || receipt.createdAt?.slice(0, 10) || '';
const purchaseKey = (receipt) => `${purchaseDay(receipt)}|${receipt.createdAt || ''}`;

/**
 * Finds items whose unit price changed between their two most recent
 * purchases at the same store. Line prices are line totals, so unit price is
 * price ÷ quantity; repeated lines of one item on a receipt are combined.
 * Coupons (negative prices) and unpriced lines are ignored.
 * @param {Array} receipts
 * @returns {Array<{ key: string, name: string, store: string, previous: object, latest: object, change: number, changePct: number, currency?: string }>}
 *   price rises first, then drops, each by size of change; change > 0 = pricier
 */
export const findPriceChanges = (receipts = []) => {
  // store|item → [{ date, unitPrice, name }], one entry per receipt
  const history = new Map();

  [...receipts]
    .filter((receipt) => receipt?.merchant?.trim())
    .sort((a, b) => purchaseKey(a).localeCompare(purchaseKey(b)))
    .forEach((receipt) => {
      const store = receipt.merchant.trim();
      const perReceipt = new Map();
      (receipt.items || []).forEach((item) => {
        const quantity = item?.quantity > 0 ? item.quantity : 1;
        if (!item?.name || typeof item.price !== 'number' || item.price <= 0) { return; }
        const key = `${normalizeName(store)}|${normalizeName(item.name)}`;
        const entry = perReceipt.get(key) || { price: 0, quantity: 0, name: item.name.trim() };
        entry.price += item.price;
        entry.quantity += quantity;
        perReceipt.set(key, entry);
      });

      perReceipt.forEach(({ price, quantity, name }, key) => {
        const list = history.get(key) || [];
        list.push({
          date: purchaseDay(receipt) || null,
          unitPrice: Math.round((price / quantity) * 100) / 100,
          name,
          store,
          currency: receipt.currency,
        });
        history.set(key, list);
      });
    });

  const changes = [];
  history.forEach((list, key) => {
    if (list.length < 2) { return; }
    const previous = list[list.length - 2];
    const latest = list[list.length - 1];
    const change = Math.round((latest.unitPrice - previous.unitPrice) * 100) / 100;
    const changePct = change / previous.unitPrice;
    if (Math.abs(change) < PRICE_CHANGE_MIN_AMOUNT || Math.abs(changePct) < PRICE_CHANGE_MIN_PCT) { return; }
    changes.push({
      key,
      name: latest.name,
      store: latest.store,
      currency: latest.currency,
      previous: { date: previous.date, unitPrice: previous.unitPrice },
      latest: { date: latest.date, unitPrice: latest.unitPrice },
      change,
      changePct,
    });
  });

  return changes.sort((a, b) => (Number(b.change > 0) - Number(a.change > 0)) || (Math.abs(b.changePct) - Math.abs(a.changePct)));
};
