import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { endSessionIfUnauthorized, resetSessionState, SESSION_INVALID, TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from './session.js';

const dead = { success: false, code: SESSION_INVALID, error: 'Your session has ended.' };

describe('endSessionIfUnauthorized', () => {
  let store;
  let replace;

  beforeEach(() => {
    resetSessionState();
    store = new Map([[TOKEN_STORAGE_KEY, 'tok'], [USER_STORAGE_KEY, '{}']]);
    replace = vi.fn();
    vi.stubGlobal('localStorage', { removeItem: (key) => store.delete(key) });
    vi.stubGlobal('location', { replace });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('clears the session and goes to the login page on a SESSION_INVALID 401', () => {
    expect(endSessionIfUnauthorized(401, dead)).toBe(true);
    expect(store.size).toBe(0);
    expect(replace).toHaveBeenCalledWith('/');
  });

  it('ignores other 401s, e.g. a wrong password on login or account deletion', () => {
    expect(endSessionIfUnauthorized(401, { success: false, error: 'Incorrect password.' })).toBe(false);
    expect(endSessionIfUnauthorized(401, {})).toBe(false);
    expect(endSessionIfUnauthorized(401, null)).toBe(false);
    expect(store.size).toBe(2);
    expect(replace).not.toHaveBeenCalled();
  });

  it('ignores other statuses', () => {
    expect(endSessionIfUnauthorized(403, { code: SESSION_INVALID })).toBe(false);
    expect(endSessionIfUnauthorized(500, dead)).toBe(false);
    expect(replace).not.toHaveBeenCalled();
  });

  it('redirects only once when several requests fail together', () => {
    endSessionIfUnauthorized(401, dead);
    endSessionIfUnauthorized(401, dead);
    expect(replace).toHaveBeenCalledTimes(1);
  });
});
