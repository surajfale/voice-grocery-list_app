import express from 'express';
import request from 'supertest';
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import authRouter from '../auth.js';
import User from '../../models/User.js';

// Uses the real rate limiters: invite codes must not be brute-forceable
describe('sign-up rate limits', () => {
  beforeAll(() => {
    delete process.env.SIGNUP_OPEN;
    process.env.SIGNUP_INVITE_CODE = 'grocer-2026-Kx9';
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterAll(() => {
    delete process.env.SIGNUP_INVITE_CODE;
    vi.restoreAllMocks();
  });

  it('allows only 3 sign-up attempts per hour per IP, counting wrong codes', async () => {
    const countSpy = vi.spyOn(User, 'countDocuments');
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);

    const statuses = [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const res = await request(app).post('/api/auth/register').send({ inviteCode: `guess-${attempt}` });
      statuses.push(res.status);
    }
    expect(statuses).toEqual([403, 403, 403, 429, 429]);
    expect(countSpy).not.toHaveBeenCalled();
  });

  it('rate-limits the public mode endpoint', async () => {
    const app = express();
    app.use('/api/auth', authRouter);
    let last;
    for (let i = 0; i < 61; i += 1) {
      last = await request(app).get('/api/auth/signup-mode');
    }
    expect(last.status).toBe(429);
  });
});
