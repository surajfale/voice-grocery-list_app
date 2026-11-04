import express from 'express';
import request from 'supertest';
import rateLimit from 'express-rate-limit';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveTrustProxy } from '../trustProxy.js';

describe('resolveTrustProxy', () => {
  afterEach(() => vi.restoreAllMocks());

  it('defaults to one hop in production and none elsewhere', () => {
    expect(resolveTrustProxy(undefined, 'production')).toBe(1);
    expect(resolveTrustProxy('', 'production')).toBe(1);
    expect(resolveTrustProxy(undefined, 'development')).toBe(false);
  });

  it('never returns a bare true', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveTrustProxy('true', 'production')).toBe(1);
    expect(resolveTrustProxy('TRUE', 'development')).toBe(1);
  });

  it('accepts hop counts, false and proxy addresses', () => {
    expect(resolveTrustProxy('2', 'production')).toBe(2);
    expect(resolveTrustProxy('0', 'production')).toBe(0);
    expect(resolveTrustProxy('false', 'production')).toBe(false);
    expect(resolveTrustProxy('loopback', 'production')).toBe('loopback');
    expect(resolveTrustProxy(' 10.0.0.0/8, 127.0.0.1 ', 'production')).toBe('10.0.0.0/8, 127.0.0.1');
  });
});

// Behind one proxy that appends the real client IP (Railway's edge), a client
// can still prepend whatever it likes to X-Forwarded-For
const buildLimitedApp = (trustProxy) => {
  const app = express();
  app.set('trust proxy', trustProxy);
  app.use(rateLimit({
    windowMs: 60_000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    validate: false
  }));
  app.get('/', (req, res) => res.json({ ip: req.ip }));
  return app;
};

const hitWithSpoofedIps = async (app, count) => {
  const statuses = [];
  for (let i = 0; i < count; i += 1) {
    const res = await request(app)
      .get('/')
      .set('X-Forwarded-For', `198.51.100.${i}, 203.0.113.7`);
    statuses.push(res.status);
  }
  return statuses;
};

describe('rate limiting behind a proxy', () => {
  it('keys on the proxy-appended IP, so spoofed X-Forwarded-For entries do not reset the limit', async () => {
    const app = buildLimitedApp(resolveTrustProxy(undefined, 'production'));
    const ipRes = await request(app).get('/').set('X-Forwarded-For', '198.51.100.99, 203.0.113.7');
    expect(ipRes.body.ip).toBe('203.0.113.7');
    // the probe above used 1 of the 3 allowed requests
    expect(await hitWithSpoofedIps(app, 4)).toEqual([200, 200, 429, 429]);
  });

  it('(regression) trust proxy = true would have let every spoofed IP through', async () => {
    const app = buildLimitedApp(true);
    expect(await hitWithSpoofedIps(app, 5)).toEqual([200, 200, 200, 200, 200]);
  });
});
