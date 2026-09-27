import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import groceryListsRouter from '../groceryLists.js';
import { predictItems } from '../../services/groceryPrediction.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

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
