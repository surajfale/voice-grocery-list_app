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
