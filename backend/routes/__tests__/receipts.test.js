import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import receiptsRouter from '../receipts.js';
import { chatMock } from '../../services/ReceiptRagService.js';
import { limiterState } from '../../middleware/rateLimiter.js';
import mongoose from 'mongoose';
import { validateReceiptUpdate } from '../../controllers/receiptController.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

vi.mock('../../services/ReceiptRagService.js', () => {
  const chatMock = vi.fn();
  return {
    __esModule: true,
    default: { chat: chatMock },
    chatMock
  };
});

vi.mock('../../middleware/rateLimiter.js', () => {
  const state = {
    enabled: false,
    maxCallsBefore429: Infinity,
    callCount: 0
  };

  const ipLimiter = (req, res, next) => {
    state.callCount += 1;
    if (state.enabled && state.callCount > state.maxCallsBefore429) {
      return res.status(429).json({
        success: false,
        error: 'Too many chat requests from this IP. Please slow down.'
      });
    }
    return next();
  };

  const userLimiter = (_req, _res, next) => next();

  return {
    __esModule: true,
    receiptChatIpLimiter: ipLimiter,
    receiptChatUserLimiter: userLimiter,
    limiterState: state
  };
});

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/receipts', receiptsRouter);
  return app;
};

describe('Receipts chat route', () => {
  const app = buildApp();
  const userId = new mongoose.Types.ObjectId().toString();
  const authToken = jwt.sign({ userId }, process.env.JWT_SECRET);

  beforeEach(() => {
    chatMock.mockReset();
    limiterState.enabled = false;
    limiterState.callCount = 0;
    limiterState.maxCallsBefore429 = Infinity;
  });

  it('returns answer payload on success', async () => {
    chatMock.mockResolvedValue({
      answer: 'You spent $42 at Farmer Market.',
      sources: [{ receiptId: '1', merchant: 'Farmer Market', purchaseDate: '2024-10-01' }],
      contextChunks: [],
      question: 'What did I spend?',
      usage: null
    });

    const res = await request(app)
      .post('/api/receipts/chat')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ userId, question: 'What did I spend?' })
      .expect(200);

    expect(res.body).toMatchObject({
      success: true,
      answer: expect.stringContaining('You spent'),
      sources: expect.any(Array)
    });
    expect(chatMock).toHaveBeenCalledWith(expect.objectContaining({
      userId,
      question: 'What did I spend?'
    }));
  });

  it('validates request payload', async () => {
    const res = await request(app)
      .post('/api/receipts/chat')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ userId, question: 'hi' })
      .expect(400);

    expect(res.body.error).toMatch(/Question must be at least/);
    expect(chatMock).not.toHaveBeenCalled();
  });

  it('returns 500 when service fails', async () => {
    chatMock.mockRejectedValue(new Error('LLM timeout'));

    const res = await request(app)
      .post('/api/receipts/chat')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ userId, question: 'Tell me everything' })
      .expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Failed to process chat request/);
  });

  it('enforces rate limiting rules', async () => {
    limiterState.enabled = true;
    limiterState.maxCallsBefore429 = 1;

    chatMock.mockResolvedValue({
      answer: 'First answer',
      sources: [],
      contextChunks: [],
      question: 'First question'
    });

    await request(app)
      .post('/api/receipts/chat')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ userId, question: 'First question' })
      .expect(200);

    const res = await request(app)
      .post('/api/receipts/chat')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ userId, question: 'Second question' })
      .expect(429);

    expect(res.body.error).toMatch(/Too many chat requests/);
  });
});



describe('Receipt update validation', () => {
  const now = new Date('2026-09-27T12:00:00Z');

  it('accepts and normalizes a merchant and date', () => {
    expect(validateReceiptUpdate({ merchant: '  Trader   Joe\'s ', purchaseDate: '2026-09-20' }, now))
      .toEqual({ updates: { merchant: 'Trader Joe\'s', purchaseDate: '2026-09-20' } });
  });

  it('ignores non-editable fields', () => {
    expect(validateReceiptUpdate({ merchant: 'Costco', status: 'error', userId: 'x', embeddingStatus: 'synced' }, now))
      .toEqual({ updates: { merchant: 'Costco' } });
  });

  it.each([
    [{}, /Provide merchant/],
    [{ userId: 'x' }, /Provide merchant/],
    [{ merchant: '   ' }, /non-empty/],
    [{ merchant: 42 }, /non-empty/],
    [{ merchant: 'x'.repeat(121) }, /120 characters/],
    [{ purchaseDate: '09/20/2026' }, /YYYY-MM-DD/],
    [{ purchaseDate: '2025-02-30' }, /valid calendar date/],
    [{ purchaseDate: '2026-10-05' }, /future/]
  ])('rejects %j', (body, message) => {
    expect(validateReceiptUpdate(body, now).error).toMatch(message);
  });

  it('normalizes line items and total, dropping client currency', () => {
    const { updates } = validateReceiptUpdate({
      items: [
        { name: '  Toor   dal ', quantity: 2, price: 6.999, currency: 'EUR' },
        { name: 'Coupon', price: -1.5 },
        { name: 'Bag' }
      ],
      total: 12.345
    }, now);
    expect(updates).toEqual({
      items: [
        { name: 'Toor dal', quantity: 2, price: 7 },
        { name: 'Coupon', quantity: 1, price: -1.5 },
        { name: 'Bag', quantity: 1, price: null }
      ],
      total: 12.35
    });
  });

  it('keeps a trimmed item category and omits a null one', () => {
    expect(validateReceiptUpdate({
      items: [{ name: 'Paper towels', category: ' Household ' }, { name: 'Milk', category: null }]
    }, now).updates.items).toEqual([
      { name: 'Paper towels', quantity: 1, price: null, category: 'Household' },
      { name: 'Milk', quantity: 1, price: null }
    ]);
  });

  it.each([
    [{ items: [{ name: 'Milk', category: 7 }] }],
    [{ items: [{ name: 'Milk', category: '  ' }] }],
    [{ items: [{ name: 'Milk', category: 'x'.repeat(41) }] }]
  ])('rejects bad category %j', (body) => {
    expect(validateReceiptUpdate(body, now).error).toMatch(/category/);
  });

  it('accepts an empty item list', () => {
    expect(validateReceiptUpdate({ items: [] }, now)).toEqual({ updates: { items: [] } });
  });

  it.each([
    [{ items: 'milk' }, /must be an array/],
    [{ items: [null] }, /Item 1 is invalid/],
    [{ items: [{ name: ' ' }] }, /Item 1 needs a name/],
    [{ items: [{ name: 'a' }, { name: 'x'.repeat(121) }] }, /Item 2 name/],
    [{ items: [{ name: 'Milk', quantity: 0 }] }, /quantity/],
    [{ items: [{ name: 'Milk', quantity: '2' }] }, /quantity/],
    [{ items: [{ name: 'Milk', price: 'free' }] }, /price/],
    [{ items: [{ name: 'Milk', price: 1e9 }] }, /price/],
    [{ items: Array.from({ length: 201 }, () => ({ name: 'x' })) }, /at most 200/],
    [{ total: -1 }, /Total/],
    [{ total: '12' }, /Total/],
    [{ total: Number.NaN }, /Total/]
  ])('rejects items/total %j', (body, message) => {
    expect(validateReceiptUpdate(body, now).error).toMatch(message);
  });

  it('allows one day of timezone slack', () => {
    expect(validateReceiptUpdate({ purchaseDate: '2026-09-28' }, now).error).toBeUndefined();
  });
});

describe('PATCH /api/receipts/:receiptId', () => {
  const app = buildApp();
  const userId = new mongoose.Types.ObjectId().toString();
  const authToken = jwt.sign({ userId }, process.env.JWT_SECRET);
  const receiptId = new mongoose.Types.ObjectId().toString();

  it('requires authentication', async () => {
    const res = await request(app).patch(`/api/receipts/${receiptId}`).send({ merchant: 'Costco' });
    expect(res.status).toBe(401);
  });

  it('rejects an invalid receipt id', async () => {
    const res = await request(app)
      .patch('/api/receipts/not-an-id')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ merchant: 'Costco' });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid body before touching the database', async () => {
    const res = await request(app)
      .patch(`/api/receipts/${receiptId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ purchaseDate: 'yesterday' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/YYYY-MM-DD/);
  });
});
