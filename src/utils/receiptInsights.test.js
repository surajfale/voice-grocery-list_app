import { describe, it, expect } from 'vitest';
import {
  parseItemName,
  sizesCompatible,
  buildCategoryResolver,
  getTotalMismatch,
  findPriceChanges,
  findCheapestStores,
  buildPriceSignals,
} from './receiptInsights';

const receipt = (id, merchant, purchaseDate, items, extra = {}) => ({
  _id: id,
  merchant,
  purchaseDate,
  createdAt: purchaseDate ? `${purchaseDate}T10:00:00Z` : undefined,
  currency: 'USD',
  items,
  ...extra,
});

describe('parseItemName', () => {
  it.each([
    ['PANEER 400G', { key: 'paneer', size: '400g' }],
    ['Paneer', { key: 'paneer', size: null }],
    ['paneers', { key: 'paneer', size: null }],
    ['Basmati Rice 10lb', { key: 'basmati rice', size: '10lb' }],
    ['BASMATI RICE 10 LBS', { key: 'basmati rice', size: '10lb' }],
    ['Milk 1.5L', { key: 'milk', size: '1.5l' }],
    ['EGGS LARGE 12CT', { key: 'egg large', size: '12ct' }],
    ['Paper Towels 6 pk', { key: 'paper towel', size: '6pk' }],
    ['#004512 STRAWBERRIES', { key: 'strawberry', size: null }],
    ['Tomatoes, Roma', { key: 'tomato roma', size: null }],
    ['ORG SPINACH', { key: 'organic spinach', size: null }],
    ['Hummus', { key: 'hummus', size: null }],
    ['Swiss Cheese', { key: 'swiss cheese', size: null }],
  ])('%s', (name, expected) => {
    expect(parseItemName(name)).toEqual(expected);
  });

  it('falls back to the plain name when nothing is left', () => {
    expect(parseItemName('12345').key).toBe('12345');
  });

  it('treats a missing size as compatible, differing sizes as not', () => {
    expect(sizesCompatible(null, '400g')).toBe(true);
    expect(sizesCompatible('400g', '400g')).toBe(true);
    expect(sizesCompatible('10lb', '20lb')).toBe(false);
  });
});

describe('buildCategoryResolver', () => {
  it('remembers a pick across name variants', () => {
    const resolver = buildCategoryResolver([
      receipt('a', 'Costco', '2026-09-01', [{ name: 'Paper towel', category: 'Household', price: 20 }]),
    ]);
    expect(resolver.guess('PAPER TOWELS 6PK')).toBe('Household');
    expect(resolver.resolve({ name: 'paper towels', category: 'Other' })).toBe('Other');
  });
});

describe('getTotalMismatch', () => {
  it('flags gaps over 15% only', () => {
    expect(getTotalMismatch(receipt('a', 'S', '2026-09-01', [{ name: 'A', price: 50 }], { total: 100 }))).toMatchObject({ itemsSum: 50 });
    expect(getTotalMismatch(receipt('a', 'S', '2026-09-01', [{ name: 'A', price: 92 }], { total: 100 }))).toBeNull();
    expect(getTotalMismatch(receipt('a', 'S', '2026-09-01', [{ name: 'A' }], { total: 100 }))).toBeNull();
  });
});

describe('findPriceChanges', () => {
  it('compares unit prices at the same store, rises first, ignoring noise', () => {
    const changes = findPriceChanges([
      receipt('a', 'Patel Brothers', '2026-08-01', [
        { name: 'Paneer', quantity: 2, price: 10.98 },
        { name: 'Milk', price: 4.29 },
        { name: 'Toor Dal', price: 6.99 },
      ]),
      receipt('b', 'Costco', '2026-08-15', [{ name: 'Paneer', price: 3.99 }]),
      receipt('c', 'patel brothers ', '2026-09-01', [
        { name: 'PANEER 400G', price: 5.99 },
        { name: 'Milk', price: 4.35 },
        { name: 'Toor  Dal', price: 5.99 },
        { name: 'Coupon', price: -1 },
      ]),
    ]);

    expect(changes.map((c) => [c.itemKey, c.previous.unitPrice, c.latest.unitPrice, c.change])).toEqual([
      ['paneer', 5.49, 5.99, 0.5],
      ['toor dal', 6.99, 5.99, -1],
    ]);
  });

  it('keeps real rises on cheap items but drops unit-rounding blips', () => {
    const changes = findPriceChanges([
      receipt('a', 'TJ', '2026-08-01', [{ name: 'Bananas', quantity: 6, price: 1.14 }, { name: 'Limes', quantity: 3, price: 1.0 }]),
      receipt('b', 'TJ', '2026-09-01', [{ name: 'Banana', quantity: 6, price: 1.38 }, { name: 'Limes', quantity: 3, price: 1.01 }]),
    ]);
    expect(changes.map((c) => [c.itemKey, c.previous.unitPrice, c.latest.unitPrice])).toEqual([['banana', 0.19, 0.23]]);
  });

  it('never compares different pack sizes', () => {
    const changes = findPriceChanges([
      receipt('a', 'Patel', '2026-07-01', [{ name: 'Basmati Rice 10lb', price: 16.99 }]),
      receipt('b', 'Patel', '2026-08-01', [{ name: 'Basmati Rice 20lb', price: 29.99 }]),
      receipt('c', 'Patel', '2026-09-01', [{ name: 'BASMATI RICE 10 LBS', price: 18.49 }]),
    ]);
    // 10lb Sep is compared with 10lb Jul, skipping the 20lb bag in between
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ previous: { unitPrice: 16.99 }, latest: { unitPrice: 18.49 } });
  });

  it('combines repeated lines and treats an undated receipt as latest', () => {
    const changes = findPriceChanges([
      receipt('a', 'TJ', '2026-08-01', [{ name: 'Eggs', price: 1.5 }, { name: 'Eggs', price: 1.5 }]),
      { ...receipt('b', 'TJ', null, [{ name: 'Eggs', quantity: 2, price: 3.5 }]), createdAt: '2026-09-20T10:00:00Z' },
    ]);
    expect(changes[0]).toMatchObject({ previous: { unitPrice: 1.5 }, latest: { unitPrice: 1.75, date: '2026-09-20' } });
  });
});

describe('findCheapestStores', () => {
  const now = new Date('2026-09-27T12:00:00Z');

  it('lists stores cheapest first using each store’s latest price', () => {
    const [paneer] = findCheapestStores([
      receipt('a', 'Costco', '2026-08-01', [{ name: 'Paneer', price: 4.49 }]),
      receipt('b', 'Costco', '2026-09-01', [{ name: 'PANEER', price: 3.99 }]),
      receipt('c', 'Patel Brothers', '2026-09-20', [{ name: 'Paneer 400g', price: 5.99 }]),
    ], now);
    expect(paneer.stores.map((s) => [s.store, s.unitPrice])).toEqual([['Costco', 3.99], ['Patel Brothers', 5.99]]);
    expect(paneer.saving).toBe(2);
  });

  it('skips single-store items, stale prices, incompatible sizes and noise', () => {
    expect(findCheapestStores([
      receipt('a', 'Costco', '2026-09-01', [{ name: 'Rice 20lb', price: 29.99 }, { name: 'Milk', price: 4.29 }, { name: 'Eggs', price: 3.99 }]),
      receipt('b', 'Patel', '2026-09-10', [{ name: 'Rice 10lb', price: 16.99 }, { name: 'Milk', price: 4.3 }]),
      receipt('c', 'TJ', '2025-12-01', [{ name: 'Eggs', price: 2.99 }]),
    ], now)).toEqual([]);
  });
});

describe('pack-size and naming safeguards', () => {
  const now = new Date('2026-09-27T12:00:00Z');

  it('treats a 2× gap without a matching size as a different pack', () => {
    const receipts = [
      receipt('a', "Trader Joe's", '2026-08-10', [{ name: 'Olive Oil', price: 9.99 }]),
      receipt('b', 'Costco', '2026-08-20', [{ name: 'OLIVE OIL', price: 24.99 }]),
      receipt('c', 'Costco', '2026-09-20', [{ name: 'OLIVE OIL', price: 11.49 }]),
    ];
    // Costco 24.99 → 11.49 is a different bottle, not a 54% drop
    expect(findPriceChanges(receipts)).toEqual([]);
    // Latest Costco (11.49) vs TJ (9.99) is comparable again
    expect(findCheapestStores(receipts, now).map((c) => c.stores.map((st) => st.unitPrice))).toEqual([[9.99, 11.49]]);
  });

  it('still reports a 2× gap when both sides list the same size', () => {
    const changes = findPriceChanges([
      receipt('a', 'Costco', '2026-08-01', [{ name: 'Olive Oil 2L', price: 10 }]),
      receipt('b', 'Costco', '2026-09-01', [{ name: 'OLIVE OIL 2 L', price: 21 }]),
    ]);
    expect(changes).toHaveLength(1);
  });

  it('prefers a readable name over scanner caps', () => {
    const [change] = findPriceChanges([
      receipt('a', 'Patel', '2026-08-01', [{ name: 'Paneer', price: 5.49 }]),
      receipt('b', 'Patel', '2026-09-01', [{ name: 'PANEER 400G', price: 5.99 }]),
    ]);
    expect(change.name).toBe('Paneer');
    const [allCaps] = findPriceChanges([
      receipt('a', 'Patel', '2026-08-01', [{ name: 'TOOR DAL 4LB', price: 6.99 }]),
      receipt('b', 'Patel', '2026-09-01', [{ name: 'TOOR DAL 4LB', price: 5.99 }]),
    ]);
    expect(allCaps.name).toBe('Toor Dal');
  });
});

describe('buildPriceSignals', () => {
  it('reports the latest rise and a cheaper store elsewhere', () => {
    const signals = buildPriceSignals([
      receipt('a', 'Costco', '2026-08-20', [{ name: 'Paneer', price: 3.99 }]),
      receipt('b', 'Patel Brothers', '2026-08-01', [{ name: 'Paneer', price: 5.49 }]),
      receipt('c', 'Patel Brothers', '2026-09-21', [{ name: 'PANEER 400G', price: 5.99 }, { name: 'Ghee', price: 12.49 }]),
    ], new Date('2026-09-27T12:00:00Z'));

    expect(signals.get('paneer')).toMatchObject({
      rise: { store: 'Patel Brothers', change: 0.5 },
      cheaper: { store: 'Costco', unitPrice: 3.99 },
    });
    expect(signals.has('ghee')).toBe(false);
  });

  it('omits the cheaper hint when the item was last bought at the cheapest store', () => {
    const signals = buildPriceSignals([
      receipt('a', 'Patel', '2026-09-01', [{ name: 'Paneer', price: 5.99 }]),
      receipt('b', 'Costco', '2026-09-10', [{ name: 'Paneer', price: 3.99 }]),
    ], new Date('2026-09-27T12:00:00Z'));
    expect(signals.get('paneer')?.cheaper).toBeUndefined();
  });
});
