import { describe, it, expect } from 'vitest';
import {
  normalizeItemKey,
  buildPurchaseHistory,
  scoreItem,
  rankPredictions,
  rankFrequentItems,
  isValidDateString
} from '../groceryPrediction.js';

const DAY_MS = 86_400_000;
const ts = (date) => Date.parse(`${date}T00:00:00Z`);

// Build YYYY-MM-DD dates going backwards from `end` every `gap` days
const everyNDays = (end, gap, count) =>
  Array.from({ length: count }, (_, i) =>
    new Date(ts(end) - (count - 1 - i) * gap * DAY_MS).toISOString().slice(0, 10));

const list = (date, items) => ({
  date,
  items: items.map((item) => (typeof item === 'string' ? { text: item, completed: true } : item))
});

describe('normalizeItemKey', () => {
  it('lowercases, trims and collapses whitespace', () => {
    expect(normalizeItemKey('  Whole   Milk ')).toBe('whole milk');
  });
});

describe('isValidDateString', () => {
  it('accepts YYYY-MM-DD and rejects everything else', () => {
    expect(isValidDateString('2026-09-26')).toBe(true);
    expect(isValidDateString('2026-9-26')).toBe(false);
    expect(isValidDateString('2026-13-45')).toBe(false);
    expect(isValidDateString(undefined)).toBe(false);
  });
});

describe('buildPurchaseHistory', () => {
  it('only counts completed items and merges name variants', () => {
    const history = buildPurchaseHistory([
      list('2026-09-10', ['milk', { text: 'bread', completed: false }]),
      list('2026-09-03', ['Milk ']),
      list('2026-09-17', [{ text: 'MILK', completed: true, count: 2, category: 'Dairy' }])
    ]);

    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      key: 'milk',
      text: 'MILK', // latest purchase wins
      category: 'Dairy',
      days: ['2026-09-03', '2026-09-10', '2026-09-17']
    });
    expect(history[0].avgQty).toBeCloseTo(4 / 3);
  });

  it('counts duplicates on the same list as one purchase', () => {
    const [entry] = buildPurchaseHistory([list('2026-09-10', ['eggs', 'Eggs'])]);
    expect(entry.days).toEqual(['2026-09-10']);
    expect(entry.avgQty).toBe(2);
  });
});

describe('scoreItem', () => {
  it('returns null with fewer than two purchases', () => {
    expect(scoreItem(['2026-09-01'], ts('2026-09-26'))).toBeNull();
  });

  it('computes gap, due ratio and frequency for a weekly item', () => {
    const days = everyNDays('2026-09-19', 7, 8);
    const stats = scoreItem(days, ts('2026-09-26'));

    expect(stats).toMatchObject({
      typicalGapDays: 7,
      daysSinceLast: 7,
      dueRatio: 1,
      purchases: 8,
      lastPurchased: '2026-09-19'
    });
    expect(stats.perWeek).toBeCloseTo(8 / (90 / 7), 1);
    expect(stats.perMonth).toBeCloseTo(8 / 3, 1);
    expect(stats.score).toBeGreaterThan(0.5);
  });

  it('scores a just-bought item lower than a due one', () => {
    const due = scoreItem(everyNDays('2026-09-19', 7, 8), ts('2026-09-26'));
    const justBought = scoreItem(everyNDays('2026-09-25', 7, 8), ts('2026-09-26'));
    expect(justBought.score).toBeLessThan(due.score);
  });

  it('fades items the user has stopped buying', () => {
    const due = scoreItem(everyNDays('2026-09-19', 7, 8), ts('2026-09-26'));
    const abandoned = scoreItem(everyNDays('2026-07-01', 7, 8), ts('2026-09-26'));
    expect(abandoned.score).toBeLessThan(0.01);
    expect(abandoned.score).toBeLessThan(due.score);
  });

  it('trusts regular habits more than erratic ones', () => {
    const regular = scoreItem(['2026-08-01', '2026-08-11', '2026-08-21', '2026-08-31', '2026-09-10'], ts('2026-09-20'));
    const erratic = scoreItem(['2026-08-01', '2026-08-03', '2026-08-21', '2026-08-24', '2026-09-10'], ts('2026-09-20'));
    expect(regular.confidence).toBeGreaterThan(erratic.confidence);
  });

  it('never reports negative days since last purchase', () => {
    const stats = scoreItem(['2026-09-20', '2026-09-27'], ts('2026-09-26'));
    expect(stats.daysSinceLast).toBe(0);
    expect(stats.dueRatio).toBe(0);
  });
});

describe('rankPredictions', () => {
  const nowTs = ts('2026-09-26');
  const history = buildPurchaseHistory([
    ...everyNDays('2026-09-19', 7, 8).map((d) => list(d, ['Milk'])),
    ...everyNDays('2026-09-12', 14, 5).map((d) => list(d, ['Rice'])),
    ...everyNDays('2026-09-25', 7, 8).map((d) => list(d, ['Bananas'])),
    list('2026-09-01', ['Saffron'])
  ]);

  it('orders by score and drops weak or single-purchase items', () => {
    const predictions = rankPredictions(history, { nowTs });
    const keys = predictions.map((p) => p.key);

    expect(keys[0]).toBe('milk');
    expect(keys).toContain('rice');
    expect(keys).not.toContain('bananas'); // bought yesterday
    expect(keys).not.toContain('saffron'); // single purchase
  });

  it('excludes items already on the list, case-insensitively', () => {
    const predictions = rankPredictions(history, { nowTs, excludeKeys: [' MILK'] });
    expect(predictions.map((p) => p.key)).not.toContain('milk');
  });

  it('respects the limit and exposes display fields', () => {
    const [top] = rankPredictions(history, { nowTs, limit: 1 });
    expect(top).toMatchObject({ key: 'milk', text: 'Milk', category: 'Other', suggestedCount: 1, reason: 'due' });
  });

  it('never mixes fallback items in when something is due', () => {
    const predictions = rankPredictions(history, { nowTs });
    expect(predictions.every((p) => p.reason === 'due')).toBe(true);
  });
});

describe('frequent-item fallback', () => {
  const nowTs = ts('2026-09-26');

  it('kicks in when nothing is due, most-bought first', () => {
    // Everything was bought yesterday, so nothing is due yet
    const history = buildPurchaseHistory([
      ...everyNDays('2026-09-25', 7, 4).map((d) => list(d, ['Milk'])),
      ...everyNDays('2026-09-25', 7, 2).map((d) => list(d, ['Eggs'])),
      list('2026-09-25', ['Saffron'])
    ]);

    const predictions = rankPredictions(history, { nowTs });
    expect(predictions.map((p) => p.key)).toEqual(['milk', 'eggs', 'saffron']);
    expect(predictions.every((p) => p.reason === 'frequent')).toBe(true);
    expect(predictions[0]).toMatchObject({ purchases: 4, daysSinceLast: 1, lastPurchased: '2026-09-25' });
  });

  it('helps brand-new users with a single shopping trip', () => {
    const history = buildPurchaseHistory([list('2026-09-20', ['Bread', 'Butter'])]);
    const predictions = rankPredictions(history, { nowTs });
    expect(predictions.map((p) => p.text).sort()).toEqual(['Bread', 'Butter']);
  });

  it('still respects items already on the list and the limit', () => {
    const history = buildPurchaseHistory([list('2026-09-20', ['Bread', 'Butter', 'Jam'])]);
    const predictions = rankPredictions(history, { nowTs, excludeKeys: ['bread'], limit: 1 });
    expect(predictions).toHaveLength(1);
    expect(predictions[0].key).not.toBe('bread');
  });

  it('breaks purchase-count ties by recency', () => {
    const history = buildPurchaseHistory([list('2026-09-01', ['Old']), list('2026-09-20', ['Recent'])]);
    expect(rankFrequentItems(history, { nowTs }).map((p) => p.key)).toEqual(['recent', 'old']);
  });

  it('returns nothing without any history', () => {
    expect(rankPredictions([], { nowTs })).toEqual([]);
  });
});
