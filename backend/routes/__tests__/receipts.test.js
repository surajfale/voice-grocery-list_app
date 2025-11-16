import express from 'express';
import request from 'supertest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import receiptsRouter from '../receipts.js';
import { chatMock } from '../../services/ReceiptRagService.js';
import { limiterState } from '../../middleware/rateLimiter.js';
import mongoose from 'mongoose';

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
      .send({ userId, question: 'hi' })
      .expect(400);

    expect(res.body.error).toMatch(/Question must be at least/);
    expect(chatMock).not.toHaveBeenCalled();
  });

  it('returns 500 when service fails', async () => {
    chatMock.mockRejectedValue(new Error('LLM timeout'));

    const res = await request(app)
      .post('/api/receipts/chat')
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
      .send({ userId, question: 'First question' })
      .expect(200);

    const res = await request(app)
      .post('/api/receipts/chat')
      .send({ userId, question: 'Second question' })
      .expect(429);

    expect(res.body.error).toMatch(/Too many chat requests/);
  });
});


