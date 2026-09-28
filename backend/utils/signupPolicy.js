import crypto from 'crypto';

/**
 * Sign-up policy: the single source of truth for whether new accounts can be
 * created. Both POST /api/auth/register and GET /api/auth/signup-mode call
 * this, so enforcement and what the UI is told can't disagree.
 *
 * Configuration (read on every call, so a restart-free env change applies):
 *   SIGNUP_OPEN=true                → "open": anyone can sign up
 *   REGISTRATION_INVITE_CODE=<code> → "invite": sign-up requires the matching code
 *   neither set                     → "closed" (the default)
 *
 * Closed by default: a missing, empty or non-"true" SIGNUP_OPEN never means
 * open, and a blank REGISTRATION_INVITE_CODE is treated as unset.
 */

export const SIGNUP_MODES = Object.freeze({
  OPEN: 'open',
  INVITE: 'invite',
  CLOSED: 'closed'
});

const ENABLED_VALUES = new Set(['true', '1', 'yes', 'on']);

const configuredInviteCode = (env) => (
  typeof env.REGISTRATION_INVITE_CODE === 'string' ? env.REGISTRATION_INVITE_CODE.trim() : ''
);

/**
 * @param {object} [env] - Defaults to process.env; injectable for tests
 * @returns {'open' | 'invite' | 'closed'}
 */
export const getSignupMode = (env = process.env) => {
  if (ENABLED_VALUES.has(String(env.SIGNUP_OPEN ?? '').trim().toLowerCase())) {
    return SIGNUP_MODES.OPEN;
  }
  if (configuredInviteCode(env)) {
    return SIGNUP_MODES.INVITE;
  }
  return SIGNUP_MODES.CLOSED;
};

// Hash both sides to equal-length digests so the comparison takes the same
// time regardless of where the strings differ or how long either one is
const digest = (value) => crypto.createHash('sha256').update(value, 'utf8').digest();

/**
 * Constant-time check of a submitted invite code against REGISTRATION_INVITE_CODE.
 * Surrounding whitespace is ignored (codes get copy-pasted); empty and
 * non-string values are rejected.
 * @param {unknown} provided
 * @param {object} [env]
 * @returns {boolean}
 */
export const isInviteCodeValid = (provided, env = process.env) => {
  const expected = configuredInviteCode(env);
  const candidate = typeof provided === 'string' ? provided.trim() : '';
  // Always run the comparison so invalid input costs the same time
  const matches = crypto.timingSafeEqual(digest(candidate), digest(expected));
  return Boolean(expected) && Boolean(candidate) && matches;
};

export const SIGNUP_ERRORS = Object.freeze({
  CLOSED: {
    code: 'SIGNUP_CLOSED',
    error: "Sign-up is closed. This is a personal learning project and isn't taking new accounts."
  },
  INVALID_INVITE: {
    code: 'INVALID_INVITE_CODE',
    error: 'That invite code isn’t valid. Check it and try again.'
  }
});

/**
 * Decides whether an account-creation request may proceed. Call this before
 * touching the database, so a refused caller learns nothing about which
 * emails already have accounts.
 * @param {unknown} inviteCode - The submitted code (req.body.inviteCode)
 * @param {object} [env]
 * @returns {{ allowed: true, mode: string } | { allowed: false, mode: string, status: 403, code: string, error: string }}
 */
export const checkSignupAllowed = (inviteCode, env = process.env) => {
  const mode = getSignupMode(env);
  if (mode === SIGNUP_MODES.OPEN) {
    return { allowed: true, mode };
  }
  if (mode === SIGNUP_MODES.INVITE && isInviteCodeValid(inviteCode, env)) {
    return { allowed: true, mode };
  }
  const reason = mode === SIGNUP_MODES.INVITE ? SIGNUP_ERRORS.INVALID_INVITE : SIGNUP_ERRORS.CLOSED;
  return { allowed: false, mode, status: 403, ...reason };
};
