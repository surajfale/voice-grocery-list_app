import express from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import authRouter from '../auth.js';
import User from '../../models/User.js';
import emailService from '../../services/emailService.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

// Limiters are covered in auth.rateLimit.test.js; here they'd block after 3 requests
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
    accountDeletionLimiter: pass,
    receiptChatIpLimiter: pass,
    receiptChatUserLimiter: pass
  };
});

const CODE = 'grocer-2026-Kx9';

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

const newUser = (extra = {}) => ({
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'Ada@Example.com',
  password: 'Analytical#Engine42',
  ...extra
});

const register = (body) => request(app).post('/api/auth/register').send(body);

describe('POST /api/auth/register sign-up policy', () => {
  let countSpy;
  let findOneSpy;
  let saved;

  beforeEach(() => {
    delete process.env.SIGNUP_OPEN;
    delete process.env.SIGNUP_INVITE_CODE;
    saved = [];
    countSpy = vi.spyOn(User, 'countDocuments').mockResolvedValue(1);
    findOneSpy = vi.spyOn(User, 'findOne').mockResolvedValue(null);
    vi.spyOn(User.prototype, 'save').mockImplementation(async function save() {
      saved.push(this.toObject());
      return this;
    });
    vi.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password');
    vi.spyOn(emailService, 'sendWelcomeEmail').mockResolvedValue(undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.SIGNUP_OPEN;
    delete process.env.SIGNUP_INVITE_CODE;
  });

  const expectRefusedWithoutLookups = (res, code) => {
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ success: false, code });
    expect(countSpy).not.toHaveBeenCalled();
    expect(findOneSpy).not.toHaveBeenCalled();
    expect(saved).toHaveLength(0);
  };

  describe('closed (default)', () => {
    it.each([
      ['nothing set', {}],
      ['SIGNUP_OPEN=false', { SIGNUP_OPEN: 'false' }],
      ['SIGNUP_OPEN empty', { SIGNUP_OPEN: '' }],
      ['blank invite code', { SIGNUP_INVITE_CODE: '   ' }],
    ])('refuses when %s, before any user lookup', async (_label, env) => {
      Object.assign(process.env, env);
      const res = await register(newUser({ inviteCode: CODE }));
      expectRefusedWithoutLookups(res, 'SIGNUP_CLOSED');
      expect(res.body.error).toMatch(/Sign-up is closed/);
    });

    it('refuses even an existing email without revealing it exists', async () => {
      findOneSpy.mockResolvedValue({ _id: 'existing' });
      const res = await register(newUser());
      expectRefusedWithoutLookups(res, 'SIGNUP_CLOSED');
    });
  });

  describe('invite', () => {
    beforeEach(() => {
      process.env.SIGNUP_INVITE_CODE = CODE;
    });

    it('creates the account with the correct code', async () => {
      const res = await register(newUser({ inviteCode: CODE }));
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(saved).toHaveLength(1);
    });

    it('accepts a code with surrounding whitespace', async () => {
      const res = await register(newUser({ inviteCode: `  ${CODE}\t\n` }));
      expect(res.status).toBe(201);
    });

    it.each([
      ['wrong', 'not-the-code'],
      ['partial', CODE.slice(0, 6)],
      ['longer', `${CODE}-extra`],
      ['empty', ''],
      ['whitespace only', '   '],
      ['number', 2026],
      ['array', [CODE]],
      ['object', { code: CODE }],
      ['null', null],
    ])('refuses a %s code before any user lookup', async (_label, inviteCode) => {
      const res = await register(newUser({ inviteCode }));
      expectRefusedWithoutLookups(res, 'INVALID_INVITE_CODE');
      expect(res.body.error).toMatch(/invite code/i);
    });

    it('refuses a missing code', async () => {
      const res = await register(newUser());
      expectRefusedWithoutLookups(res, 'INVALID_INVITE_CODE');
    });

    it('never stores or returns the invite code', async () => {
      const res = await register(newUser({ inviteCode: CODE }));
      expect(res.status).toBe(201);
      expect(saved[0]).not.toHaveProperty('inviteCode');
      expect(JSON.stringify(saved[0])).not.toContain(CODE);
      expect(JSON.stringify(res.body)).not.toContain(CODE);
    });

    it('still enforces the account limit with a valid code', async () => {
      countSpy.mockResolvedValue(10);
      const res = await register(newUser({ inviteCode: CODE }));
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Maximum number of accounts/);
      expect(saved).toHaveLength(0);
    });

    it('still validates fields with a valid code', async () => {
      const res = await register({ inviteCode: CODE, email: 'a@b.co' });
      expect(res.status).toBe(400);
    });
  });

  describe('open', () => {
    beforeEach(() => {
      process.env.SIGNUP_OPEN = 'true';
    });

    it('creates the account without a code', async () => {
      const res = await register(newUser());
      expect(res.status).toBe(201);
      expect(saved[0]).toMatchObject({ email: 'ada@example.com', firstName: 'Ada' });
    });

    it('still enforces the account limit', async () => {
      countSpy.mockResolvedValue(10);
      const res = await register(newUser());
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Maximum number of accounts/);
    });

    it('still rejects an existing email', async () => {
      findOneSpy.mockResolvedValue({ _id: 'existing' });
      const res = await register(newUser());
      expect(res.status).toBe(400);
    });
  });
});

describe('GET /api/auth/signup-mode', () => {
  afterEach(() => {
    delete process.env.SIGNUP_OPEN;
    delete process.env.SIGNUP_INVITE_CODE;
  });

  it.each([
    [{}, 'closed'],
    [{ SIGNUP_INVITE_CODE: CODE }, 'invite'],
    [{ SIGNUP_OPEN: 'true' }, 'open'],
  ])('%j → %s', async (env, mode) => {
    Object.assign(process.env, env);
    const res = await request(app).get('/api/auth/signup-mode');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, mode });
    expect(JSON.stringify(res.body)).not.toContain(CODE);
  });

  it('reflects configuration changes without a restart', async () => {
    expect((await request(app).get('/api/auth/signup-mode')).body.mode).toBe('closed');
    process.env.SIGNUP_INVITE_CODE = CODE;
    expect((await request(app).get('/api/auth/signup-mode')).body.mode).toBe('invite');
  });
});
