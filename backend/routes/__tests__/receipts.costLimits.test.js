import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { receiptEmbeddingUserLimiter, receiptUploadUserLimiter } from '../../middleware/rateLimiter.js';
import Receipt from '../../models/Receipt.js';
import { triggerEmbedding } from '../../controllers/receiptController.js';

vi.mock('../../services/ReceiptRagService.js', () => ({ __esModule: true, default: { chat: vi.fn() } }));

// Stand-in for authenticate: the user id comes from a test header
const appWith = (limiter) => {
  const app = express();
  app.use((req, _res, next) => { req.userId = req.headers['x-test-user']; next(); });
  app.post('/', limiter, (_req, res) => res.json({ success: true }));
  return app;
};

const hit = async (app, user, times) => {
  const statuses = [];
  for (let i = 0; i < times; i += 1) {
    statuses.push((await request(app).post('/').set('x-test-user', user)).status);
  }
  return statuses;
};

describe('per-user cost limiters', () => {
  afterEach(() => vi.restoreAllMocks());

  it('allows 10 re-embed requests per user per window, counted per user (not per IP)', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const app = appWith(receiptEmbeddingUserLimiter);
    const statuses = await hit(app, 'user-a', 11);
    expect(statuses.slice(0, 10).every((s) => s === 200)).toBe(true);
    expect(statuses[10]).toBe(429);
    // Same IP, different user: own budget
    expect(await hit(app, 'user-b', 1)).toEqual([200]);
  });

  it('caps uploads per user', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const app = appWith(receiptUploadUserLimiter);
    const statuses = await hit(app, 'user-c', 31);
    expect(statuses[29]).toBe(200);
    expect(statuses[30]).toBe(429);
  });
});

describe('triggerEmbedding', () => {
  afterEach(() => vi.restoreAllMocks());

  it('skips an already-synced receipt even when it is named explicitly', async () => {
    const findSpy = vi.spyOn(Receipt, 'find').mockReturnValue({
      limit: () => ({ sort: async () => [] })
    });
    const receiptId = new mongoose.Types.ObjectId().toString();
    const req = { userId: new mongoose.Types.ObjectId().toString(), body: { receiptId } };
    const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };

    await triggerEmbedding(req, res);

    const query = findSpy.mock.calls[0][0];
    expect(query._id).toBe(receiptId);
    expect(query.$or).toEqual([
      { embeddingStatus: { $ne: 'synced' } },
      { embeddingsVersion: { $lt: expect.any(Number) } }
    ]);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ processed: 0 }));
  });
});
