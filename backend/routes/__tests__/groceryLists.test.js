import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../../models/User.js';
import GroceryList from '../../models/GroceryList.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import groceryListsRouter from '../groceryLists.js';
import { predictItems } from '../../services/groceryPrediction.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

// authenticate() checks the user still exists and the token version matches;
// these tests sign tokens for a user with tokenVersion 0
beforeEach(() => {
  vi.spyOn(User, 'findById').mockReturnValue({
    select: () => ({ lean: async () => ({ tokenVersion: 0 }) })
  });
});

vi.mock('../../services/groceryPrediction.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    predictItems: vi.fn()
  };
});

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/grocery-lists', groceryListsRouter);
  return app;
};

describe('Grocery list predictions route', () => {
  const app = buildApp();
  const userId = new mongoose.Types.ObjectId().toString();
  const authToken = jwt.sign({ userId }, process.env.JWT_SECRET);

  beforeEach(() => {
    predictItems.mockReset();
  });

  it('returns predictions for the requested date', async () => {
    predictItems.mockResolvedValue([{ key: 'milk', text: 'Milk', score: 0.7 }]);

    const res = await request(app)
      .get(`/api/grocery-lists/user/${userId}/predictions?date=2026-09-26&limit=5`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body).toEqual({ success: true, predictions: [{ key: 'milk', text: 'Milk', score: 0.7 }] });
    expect(predictItems).toHaveBeenCalledWith(userId, { date: '2026-09-26', limit: 5 });
  });

  it('clamps the limit', async () => {
    predictItems.mockResolvedValue([]);

    await request(app)
      .get(`/api/grocery-lists/user/${userId}/predictions?limit=500`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(predictItems).toHaveBeenCalledWith(userId, { date: undefined, limit: 25 });
  });

  it('rejects malformed dates', async () => {
    const res = await request(app)
      .get(`/api/grocery-lists/user/${userId}/predictions?date=tomorrow`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(400);

    expect(res.body.error).toMatch(/YYYY-MM-DD/);
    expect(predictItems).not.toHaveBeenCalled();
  });

  it("blocks access to another user's predictions", async () => {
    const otherUserId = new mongoose.Types.ObjectId().toString();

    await request(app)
      .get(`/api/grocery-lists/user/${otherUserId}/predictions`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(403);

    expect(predictItems).not.toHaveBeenCalled();
  });

  it('returns 500 when prediction fails', async () => {
    predictItems.mockRejectedValue(new Error('db down'));

    const res = await request(app)
      .get(`/api/grocery-lists/user/${userId}/predictions`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(500);

    expect(res.body.success).toBe(false);
  });
});

describe('Grocery list input validation', () => {
  const app = buildApp();
  const userId = new mongoose.Types.ObjectId().toString();
  const authToken = jwt.sign({ userId }, process.env.JWT_SECRET);
  const base = `/api/grocery-lists/user/${userId}`;
  let findOneSpy;

  beforeEach(() => {
    findOneSpy = vi.spyOn(GroceryList, 'findOne').mockResolvedValue({
      date: '2099-01-01',
      items: [{ id: 'a', text: 'Milk', category: 'Dairy', completed: false, count: 1 }],
      save: vi.fn().mockResolvedValue(undefined)
    });
    vi.spyOn(GroceryList, 'deleteOne').mockResolvedValue({ deletedCount: 1 });
  });

  const send = (method, url, body) => request(app)[method](url).set('Authorization', `Bearer ${authToken}`).send(body);

  it.each([
    ['get', `${base}/date/2025-13-45`],
    ['get', `${base}/date/not-a-date`],
    ['delete', `${base}/date/2025-1-1`]
  ])('rejects a malformed :date (%s %s) before querying', async (method, url) => {
    const res = await send(method, url);
    expect(res.status).toBe(400);
    expect(findOneSpy).not.toHaveBeenCalled();
  });

  it.each([
    [{ text: { $ne: null } }, 'object text'],
    [{ text: '' }, 'empty text'],
    [{ text: 'x'.repeat(201) }, 'over-long text'],
    [{ text: 'Milk', category: ['Dairy'] }, 'array category'],
    [{ text: 'Milk', category: 'c'.repeat(61) }, 'over-long category']
  ])('rejects an added item with %j (%s)', async (body) => {
    const res = await send('post', `${base}/date/2099-01-01/items`, body);
    expect(res.status).toBe(400);
    expect(findOneSpy).not.toHaveBeenCalled();
  });

  it('accepts and trims a valid item', async () => {
    const res = await send('post', `${base}/date/2099-01-01/items`, { text: '  Eggs ', category: ' Dairy ' });
    expect(res.status).toBe(200);
    expect(res.body.list.items.at(-1)).toMatchObject({ text: 'Eggs', category: 'Dairy', completed: false, count: 1 });
  });

  it.each([
    [{ completed: 'yes' }],
    [{ count: 0 }],
    [{ count: 1.5 }],
    [{ count: 10000 }],
    [{ count: '3' }],
    [{ text: { $gt: '' } }]
  ])('rejects an item update with %j', async (body) => {
    const res = await send('put', `${base}/date/2099-01-01/items/a`, body);
    expect(res.status).toBe(400);
    expect(findOneSpy).not.toHaveBeenCalled();
  });

  it('applies a valid item update', async () => {
    const res = await send('put', `${base}/date/2099-01-01/items/a`, { completed: true, count: 3, text: ' Oat milk ' });
    expect(res.status).toBe(200);
    expect(res.body.list.items[0]).toMatchObject({ text: 'Oat milk', completed: true, count: 3 });
  });

  it.each([
    [{ sourceDates: [{ $ne: null }], targetDate: '2099-01-02' }, 'operator object as a source date'],
    [{ sourceDates: ['2099-01-01'], targetDate: { $gt: '' } }, 'operator object as the target date'],
    [{ sourceDates: Array.from({ length: 61 }, () => '2099-01-01'), targetDate: '2099-01-02' }, 'too many sources']
  ])('rejects a merge with %j (%s)', async (body) => {
    const res = await send('post', `${base}/merge-lists`, body);
    expect(res.status).toBe(400);
    expect(findOneSpy).not.toHaveBeenCalled();
  });
});

