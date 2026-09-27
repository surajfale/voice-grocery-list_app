/**
 * Shared receipt helpers for spending charts, the share card, the edit dialog
 * and History badges, so they all agree on categories and data-quality flags.
 */
import groceryIntelligence from '../services/groceryIntelligence.js';
import { CATEGORY_STYLES } from './categoryStyles';

/** Categories a receipt item can be assigned to (grocery aisles + household) */
export const RECEIPT_CATEGORIES = [...Object.keys(CATEGORY_STYLES), 'Other'];

const normalizeName = (name = '') => name.trim().toLowerCase().replace(/\s+/g, ' ');

// Pack sizes printed on receipts: "400G", "10 lb", "1.5L", "12CT", "6 pk"
const SIZE_PATTERN = /(\d{1,5}\.?\d{0,3}) ?(kg|gms?|g|lbs?|oz|fl ?oz|ltrs?|lt|l|ml|gal|ct|pk|pack|count|dz|doz)(?![a-z])/i;
const UNIT_ALIASES = {
  gm: 'g', gms: 'g', lbs: 'lb', floz: 'oz', 'fl oz': 'oz', ltr: 'l', ltrs: 'l', lt: 'l',
  pack: 'pk', count: 'ct', doz: 'dz',
};
const WORD_ALIASES = { org: 'organic', orgnc: 'organic' };

/** Simple English singular: berries→berry, tomatoes→tomato, eggs→egg */
const singular = (word) => {
  if (word.length <= 3) { return word; }
  if (word.endsWith('ies')) { return `${word.slice(0, -3)}y`; }
  if (word.endsWith('oes')) { return word.slice(0, -2); }
  if (word.endsWith('s') && !/(ss|us|is)$/.test(word)) { return word.slice(0, -1); }
  return word;
};

/**
 * Splits a receipt/grocery item name into a matching key and a pack size, so
 * "PANEER 400G", "Paneer" and "paneers" share the key "paneer" while the size
 * ("400g") stays available to avoid comparing different pack sizes.
 * Drops SKU-like numbers ("#1234", "0071234") and punctuation.
 * @param {string} name
 * @returns {{ key: string, size: string | null }}
 */
export const parseItemName = (name = '') => {
  let text = normalizeName(name);
  let size = null;
  const match = text.match(SIZE_PATTERN);
  if (match) {
    const unit = match[2].toLowerCase().replace(/\s+/g, ' ');
    size = `${Number(match[1])}${UNIT_ALIASES[unit] || UNIT_ALIASES[unit.replace(' ', '')] || unit}`;
    text = text.replace(match[0].toLowerCase(), ' ');
  }
  const words = text
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word && !/\d/.test(word)) // SKUs, store codes, stray numbers
    .map((word) => WORD_ALIASES[word] || singular(word));
  const key = words.join(' ') || normalizeName(name);
  return { key, size };
};

/** Two purchases are comparable unless both list a pack size and they differ */
export const sizesCompatible = (a, b) => !a || !b || a === b;

/**
 * Builds a category resolver that applies, in order:
 * 1. the item's own user-assigned category,
 * 2. the category the user last assigned to an item with the same name on any
 *    receipt ("remembered" picks; names matched via parseItemName, so
 *    "PAPER TOWELS 6PK" picks up a pick made on "Paper towel"),
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
          remembered.set(parseItemName(item.name).key, item.category);
        }
      });
    });

  const guess = (name = '') => remembered.get(parseItemName(name).key)
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

const roundCents = (value) => Math.round(value * 100) / 100;

/**
 * Flattens receipts into purchases, oldest first: one entry per item per
 * receipt with its unit price (line prices are line totals, so price ÷
 * quantity; repeated lines of the same item and size are combined). Coupons
 * (negative prices) and unpriced lines are skipped.
 * @returns {Array<{ store: string, storeKey: string, itemKey: string, size: string|null, name: string, unitPrice: number, date: string|null, currency?: string }>}
 */
const collectPurchases = (receipts = []) => {
  const purchases = [];
  [...receipts]
    .filter((receipt) => receipt?.merchant?.trim())
    .sort((a, b) => purchaseKey(a).localeCompare(purchaseKey(b)))
    .forEach((receipt) => {
      const store = receipt.merchant.trim();
      const perReceipt = new Map();
      (receipt.items || []).forEach((item) => {
        if (!item?.name || typeof item.price !== 'number' || item.price <= 0) { return; }
        const { key: itemKey, size } = parseItemName(item.name);
        const key = `${itemKey}|${size || ''}`;
        const entry = perReceipt.get(key) || { itemKey, size, price: 0, quantity: 0, name: item.name.trim() };
        entry.price += item.price;
        entry.quantity += item.quantity > 0 ? item.quantity : 1;
        perReceipt.set(key, entry);
      });
      perReceipt.forEach(({ itemKey, size, price, quantity, name }) => {
        purchases.push({
          store,
          storeKey: normalizeName(store),
          itemKey,
          size,
          name,
          unitPrice: roundCents(price / quantity),
          date: purchaseDay(receipt) || null,
          currency: receipt.currency,
        });
      });
    });
  return purchases;
};

const groupBy = (list, keyOf) => list.reduce((map, entry) => {
  const key = keyOf(entry);
  map.set(key, [...(map.get(key) || []), entry]);
  return map;
}, new Map());

const isNoise = (change, pct) => Math.abs(change) < PRICE_CHANGE_MIN_AMOUNT || Math.abs(pct) < PRICE_CHANGE_MIN_PCT;

/**
 * Without the same known pack size on both sides, a 2× (or bigger) price gap
 * almost always means a different pack (Costco bulk vs a single), not a real
 * price difference, so it isn't reported.
 */
export const UNSIZED_MAX_RATIO = 2;
const likelyDifferentPack = (a, b) => {
  const sameKnownSize = a.size && b.size && a.size === b.size;
  const ratio = Math.max(a.unitPrice, b.unitPrice) / Math.min(a.unitPrice, b.unitPrice);
  return !sameKnownSize && ratio >= UNSIZED_MAX_RATIO;
};

const toTitleCase = (text) => text.toLowerCase().replace(/\b[a-z]/g, (char) => char.toUpperCase());

/**
 * Most readable label among a group's name variants: a mixed-case name typed
 * by the user ("Paneer") beats scanner caps ("PANEER 400G"); otherwise the
 * newest name in title case with the size and codes stripped.
 */
const displayName = (purchases) => {
  const typed = [...purchases].reverse().find((p) => /[a-z]/.test(p.name) && /[A-Z]|^[a-z]/.test(p.name));
  if (typed) { return typed.name; }
  const latest = purchases[purchases.length - 1];
  return toTitleCase(parseItemName(latest.name).key) || latest.name;
};

/**
 * Finds items whose unit price changed between their latest purchase and the
 * previous comparable one (same store, compatible pack size). Names are
 * matched with parseItemName, so "PANEER 400G" and "Paneer" line up.
 * @param {Array} receipts
 * @returns {Array<{ key: string, itemKey: string, name: string, store: string, previous: object, latest: object, change: number, changePct: number, currency?: string }>}
 *   price rises first, then drops, each by size of change; change > 0 = pricier
 */
export const findPriceChanges = (receipts = []) => {
  const changes = [];
  groupBy(collectPurchases(receipts), (p) => `${p.storeKey}|${p.itemKey}`).forEach((list, key) => {
    const latest = list[list.length - 1];
    const previous = [...list.slice(0, -1)].reverse().find((p) => sizesCompatible(p.size, latest.size));
    if (!previous || likelyDifferentPack(previous, latest)) { return; }
    const change = roundCents(latest.unitPrice - previous.unitPrice);
    const changePct = change / previous.unitPrice;
    if (isNoise(change, changePct)) { return; }
    changes.push({
      key,
      itemKey: latest.itemKey,
      name: displayName(list),
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

/** Only prices seen this recently are compared across stores */
export const CHEAPEST_WINDOW_DAYS = 180;

/**
 * For items bought at two or more stores recently, lists each store's latest
 * unit price, cheapest first. Pack sizes must be compatible with the item's
 * most recent purchase, and prices 2× apart without a matching known size are
 * treated as different packs, so a Costco bulk pack isn't compared to a single.
 * @param {Array} receipts
 * @param {Date} [now]
 * @returns {Array<{ itemKey: string, name: string, stores: Array<{ store: string, name: string, unitPrice: number, date: string|null }>, saving: number, savingPct: number, currency?: string }>}
 *   biggest relative saving first
 */
export const findCheapestStores = (receipts = [], now = new Date()) => {
  const since = new Date(now.getTime() - CHEAPEST_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const results = [];

  groupBy(collectPurchases(receipts).filter((p) => !p.date || p.date >= since), (p) => p.itemKey)
    .forEach((list, itemKey) => {
      const reference = list[list.length - 1];
      const latestPerStore = new Map();
      list
        .filter((p) => sizesCompatible(p.size, reference.size))
        .forEach((p) => latestPerStore.set(p.storeKey, p)); // oldest→newest, so the last write wins
      // Drop stores whose price looks like a different pack than the latest purchase
      [...latestPerStore].forEach(([storeKey, p]) => {
        if (p !== reference && likelyDifferentPack(p, reference)) { latestPerStore.delete(storeKey); }
      });
      if (latestPerStore.size < 2) { return; }

      const stores = [...latestPerStore.values()]
        .sort((a, b) => a.unitPrice - b.unitPrice)
        .map((p) => ({ store: p.store, name: p.name, unitPrice: p.unitPrice, date: p.date }));
      const cheapest = stores[0].unitPrice;
      const priciest = stores[stores.length - 1].unitPrice;
      const saving = roundCents(priciest - cheapest);
      const savingPct = saving / priciest;
      if (isNoise(saving, savingPct)) { return; }
      results.push({ itemKey, name: displayName(list), stores, saving, savingPct, currency: reference.currency });
    });

  return results.sort((a, b) => b.savingPct - a.savingPct);
};

/**
 * Per-item price signals for the grocery list, keyed by parseItemName key:
 * the latest price rise (if the last purchase went up) and the cheapest
 * recent store when it isn't where the item was last bought.
 * @returns {Map<string, { rise?: object, cheaper?: { store: string, unitPrice: number }, currency?: string }>}
 */
export const buildPriceSignals = (receipts = [], now = new Date()) => {
  const signals = new Map();
  const signalFor = (key) => signals.get(key) || signals.set(key, {}).get(key);

  // Rises: keep the most recent rise per item across stores
  findPriceChanges(receipts)
    .filter((change) => change.change > 0)
    .forEach((change) => {
      const signal = signalFor(change.itemKey);
      if (!signal.rise || String(change.latest.date) > String(signal.rise.latest.date)) {
        signal.rise = change;
        signal.currency = change.currency;
      }
    });

  const lastStore = new Map();
  collectPurchases(receipts).forEach((p) => lastStore.set(p.itemKey, p.storeKey));
  findCheapestStores(receipts, now).forEach((entry) => {
    const [cheapest] = entry.stores;
    if (normalizeName(cheapest.store) === lastStore.get(entry.itemKey)) { return; }
    const signal = signalFor(entry.itemKey);
    signal.cheaper = { store: cheapest.store, unitPrice: cheapest.unitPrice };
    signal.currency = signal.currency || entry.currency;
  });

  return signals;
};
