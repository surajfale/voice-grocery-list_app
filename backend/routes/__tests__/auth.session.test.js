import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import authRouter from '../auth.js';
import { authenticate, generateAuthToken } from '../../middleware/auth.js';
import User from '../../models/User.js';
import GroceryList from '../../models/GroceryList.js';
import emailService from '../../services/emailService.js';
import { deleteAllReceiptDataForUser } from '../../controllers/receiptController.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

vi.mock('../../middleware/rateLimiter.js', () => {
  const pass = (_req, _res, next) => next();
  return {
    __esModule: true,
    passwordResetLimiter: pass,
    tokenValidationLimiter: pass,
    passwordResetCompletionLimiter: pass,
    loginLimiter: pass,
    registrationLimiter: pass,
    signupModeLimiter: pass,
    accountDeletionLimiter: pass
  };
});

vi.mock('../../controllers/receiptController.js', () => ({
  __esModule: true,
  deleteAllReceiptDataForUser: vi.fn()
}));

const userId = new mongoose.Types.ObjectId();

/** findById stub that works both awaited (route) and as .select().lean() (authenticate) */
const stubFindById = (doc) => vi.spyOn(User, 'findById').mockImplementation(() => Object.assign(
  Promise.resolve(doc),
  { select: () => ({ lean: async () => (doc ? { tokenVersion: doc.tokenVersion } : null) }) }
));

const protectedApp = () => {
  const app = express();
  app.get('/private', authenticate, (req, res) => res.json({ userId: req.userId }));
  return app;
};

describe('session tokens (tokenVersion revocation)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('accepts a token whose version matches the user', async () => {
    stubFindById({ tokenVersion: 3 });
    const token = generateAuthToken({ _id: userId, tokenVersion: 3 });
    const res = await request(protectedApp()).get('/private').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(userId.toString());
  });

  it('accepts pre-existing tokens without a version while the user is still at version 0', async () => {
    stubFindById({ tokenVersion: 0 });
    const legacy = jwt.sign({ userId: userId.toString() }, process.env.JWT_SECRET);
    const res = await request(protectedApp()).get('/private').set('Authorization', `Bearer ${legacy}`);
    expect(res.status).toBe(200);
  });

  it('rejects a token issued before the version was bumped', async () => {
    stubFindById({ tokenVersion: 1 });
    const stale = generateAuthToken({ _id: userId, tokenVersion: 0 });
    const res = await request(protectedApp()).get('/private').set('Authorization', `Bearer ${stale}`);
    expect(res.status).toBe(401);
  });

  it('rejects a token for a deleted user', async () => {
    stubFindById(null);
    const token = generateAuthToken({ _id: userId, tokenVersion: 0 });
    const res = await request(protectedApp()).get('/private').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('rejects tokens signed with a different algorithm', async () => {
    stubFindById({ tokenVersion: 0 });
    const other = jwt.sign({ userId: userId.toString(), tv: 0 }, process.env.JWT_SECRET, { algorithm: 'HS512' });
    const res = await request(protectedApp()).get('/private').set('Authorization', `Bearer ${other}`);
    expect(res.status).toBe(401);
  });

  it('does not accept the token from the query string', async () => {
    stubFindById({ tokenVersion: 0 });
    const token = generateAuthToken({ _id: userId, tokenVersion: 0 });
    const res = await request(protectedApp()).get(`/private?token=${token}`);
    expect(res.status).toBe(401);
  });
});

describe('auth routes revoke sessions', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(bcrypt, 'hash').mockResolvedValue('new-hash');
  });
  afterEach(() => vi.restoreAllMocks());

  it('reset-password bumps tokenVersion so existing sessions die', async () => {
    const user = {
      email: 'ada@example.com',
      firstName: 'Ada',
      tokenVersion: 2,
      save: vi.fn().mockResolvedValue(undefined)
    };
    vi.spyOn(User, 'findOne').mockResolvedValue(user);
    vi.spyOn(emailService, 'sendPasswordResetConfirmation').mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'a'.repeat(64), password: 'Analytical#Engine42' });

    expect(res.status).toBe(200);
    expect(user.tokenVersion).toBe(3);
    expect(user.save).toHaveBeenCalled();
  });

  it('account deletion revokes sessions, then removes receipts, lists and the user', async () => {
    const calls = [];
    const user = {
      _id: userId,
      email: 'ada@example.com',
      firstName: 'Ada',
      password: 'hash',
      tokenVersion: 0,
      save: vi.fn(async () => { calls.push(`save:tv=${user.tokenVersion}`); })
    };
    stubFindById(user);
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    deleteAllReceiptDataForUser.mockImplementation(async () => {
      calls.push('receipts');
      return { receipts: 2, chunks: 5, files: 2, fileErrors: 0 };
    });
    vi.spyOn(GroceryList, 'deleteMany').mockImplementation(async () => { calls.push('lists'); return { deletedCount: 1 }; });
    vi.spyOn(emailService, 'sendAccountDeletionConfirmation').mockResolvedValue(undefined);
    vi.spyOn(User, 'findByIdAndDelete').mockImplementation(async () => { calls.push('user'); });

    const token = generateAuthToken({ _id: userId, tokenVersion: 0 });
    const res = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: userId.toString(), password: 'Analytical#Engine42' });

    expect(res.status).toBe(200);
    expect(calls).toEqual(['save:tv=1', 'receipts', 'lists', 'user']);
    expect(deleteAllReceiptDataForUser).toHaveBeenCalledWith(userId);
  });
});

describe('client IP used for audit fields and emails', () => {
  afterEach(() => vi.restoreAllMocks());

  it('ignores a spoofed X-Forwarded-For header without trust proxy', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const user = { email: 'ada@example.com', firstName: 'Ada', save: vi.fn().mockResolvedValue(undefined) };
    vi.spyOn(User, 'findOne').mockResolvedValue(user);
    const sendSpy = vi.spyOn(emailService, 'sendPasswordResetEmail').mockResolvedValue(undefined);

    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);

    await request(app)
      .post('/api/auth/forgot-password')
      .set('X-Forwarded-For', '<a href=//3232235777>Verify</a>.1.2.3')
      .send({ email: 'ada@example.com' })
      .expect(200);

    const requestIP = sendSpy.mock.calls[0][3];
    expect(requestIP).not.toContain('<');
    expect(user.resetRequestIP).toBe(requestIP);
  });
});
