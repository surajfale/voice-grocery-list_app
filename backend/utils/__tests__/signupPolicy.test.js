import crypto from 'crypto';
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  getSignupMode,
  isInviteCodeValid,
  checkSignupAllowed,
  SIGNUP_ERRORS
} from '../signupPolicy.js';

const CODE = 'grocer-2026-Kx9';

describe('getSignupMode', () => {
  it.each([
    [{}, 'closed'],
    [{ SIGNUP_OPEN: '' }, 'closed'],
    [{ SIGNUP_OPEN: 'false' }, 'closed'],
    [{ SIGNUP_OPEN: '0' }, 'closed'],
    [{ SIGNUP_OPEN: 'no' }, 'closed'],
    [{ SIGNUP_OPEN: 'maybe' }, 'closed'],
    [{ REGISTRATION_INVITE_CODE: '' }, 'closed'],
    [{ REGISTRATION_INVITE_CODE: '   ' }, 'closed'],
    [{ REGISTRATION_INVITE_CODE: CODE }, 'invite'],
    [{ REGISTRATION_INVITE_CODE: CODE, SIGNUP_OPEN: 'false' }, 'invite'],
    [{ SIGNUP_OPEN: 'true' }, 'open'],
    [{ SIGNUP_OPEN: ' TRUE ' }, 'open'],
    [{ SIGNUP_OPEN: '1' }, 'open'],
    [{ SIGNUP_OPEN: 'true', REGISTRATION_INVITE_CODE: CODE }, 'open'],
  ])('%j → %s', (env, mode) => {
    expect(getSignupMode(env)).toBe(mode);
  });

  it('reads process.env at call time', () => {
    const saved = { ...process.env };
    try {
      delete process.env.SIGNUP_OPEN;
      delete process.env.REGISTRATION_INVITE_CODE;
      expect(getSignupMode()).toBe('closed');
      process.env.REGISTRATION_INVITE_CODE = CODE;
      expect(getSignupMode()).toBe('invite');
    } finally {
      process.env = saved;
    }
  });
});

describe('isInviteCodeValid', () => {
  const env = { REGISTRATION_INVITE_CODE: CODE };

  afterEach(() => vi.restoreAllMocks());

  it.each([
    [CODE, true],
    [`  ${CODE}\n`, true],
    [`${CODE}x`, false],
    [CODE.slice(0, -1), false], // partial
    [CODE.toUpperCase(), false], // case matters
    ['', false],
    ['   ', false],
    [undefined, false],
    [null, false],
    [12345, false],
    [[CODE], false],
    [{ code: CODE }, false],
    [true, false],
  ])('%j → %s', (provided, expected) => {
    expect(isInviteCodeValid(provided, env)).toBe(expected);
  });

  it('accepts a code configured with surrounding whitespace', () => {
    expect(isInviteCodeValid(CODE, { REGISTRATION_INVITE_CODE: `  ${CODE}  ` })).toBe(true);
  });

  it('never matches when no code is configured, even an empty submission', () => {
    expect(isInviteCodeValid('', {})).toBe(false);
    expect(isInviteCodeValid('', { REGISTRATION_INVITE_CODE: '  ' })).toBe(false);
  });

  it('compares equal-length digests in constant time for every input', () => {
    const spy = vi.spyOn(crypto, 'timingSafeEqual');
    ['short', `${CODE}-much-longer-than-the-real-code`, '', 42].forEach((value) => {
      isInviteCodeValid(value, env);
    });
    expect(spy).toHaveBeenCalledTimes(4);
    spy.mock.calls.forEach(([a, b]) => {
      expect(a.length).toBe(32);
      expect(b.length).toBe(32);
    });
  });
});

describe('checkSignupAllowed', () => {
  it('refuses in closed mode even with a code', () => {
    expect(checkSignupAllowed(CODE, {})).toEqual({ allowed: false, mode: 'closed', status: 403, ...SIGNUP_ERRORS.CLOSED });
  });

  it('allows a matching code in invite mode and refuses others with a distinct error', () => {
    const env = { REGISTRATION_INVITE_CODE: CODE };
    expect(checkSignupAllowed(CODE, env)).toEqual({ allowed: true, mode: 'invite' });
    expect(checkSignupAllowed('nope', env)).toEqual({ allowed: false, mode: 'invite', status: 403, ...SIGNUP_ERRORS.INVALID_INVITE });
    expect(SIGNUP_ERRORS.INVALID_INVITE.code).not.toBe(SIGNUP_ERRORS.CLOSED.code);
  });

  it('allows anyone in open mode', () => {
    expect(checkSignupAllowed(undefined, { SIGNUP_OPEN: 'true' })).toEqual({ allowed: true, mode: 'open' });
  });
});
