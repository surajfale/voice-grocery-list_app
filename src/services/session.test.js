import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { clearApiCache, endSessionIfUnauthorized, resetSessionState, API_CACHE_NAME, SESSION_INVALID, TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from './session.js';

const dead = { success: false, code: SESSION_INVALID, error: 'Your session has ended.' };

describe('endSessionIfUnauthorized', () => {
  let store;
  let replace;
  let cacheDelete;

  beforeEach(() => {
    resetSessionState();
    store = new Map([[TOKEN_STORAGE_KEY, 'tok'], [USER_STORAGE_KEY, '{}']]);
    replace = vi.fn();
    vi.stubGlobal('localStorage', { removeItem: (key) => store.delete(key) });
    vi.stubGlobal('location', { replace });
    cacheDelete = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('caches', { delete: cacheDelete });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('clears the session and API cache, then goes to the login page on a SESSION_INVALID 401', async () => {
    expect(endSessionIfUnauthorized(401, dead)).toBe(true);
    expect(store.size).toBe(0);
    expect(cacheDelete).toHaveBeenCalledWith(API_CACHE_NAME);
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
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

  it('redirects only once when several requests fail together', async () => {
    endSessionIfUnauthorized(401, dead);
    endSessionIfUnauthorized(401, dead);
    await vi.waitFor(() => expect(replace).toHaveBeenCalled());
    expect(replace).toHaveBeenCalledTimes(1);
  });
});

describe('clearApiCache', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('deletes the API cache', async () => {
    const del = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('caches', { delete: del });
    await clearApiCache();
    expect(del).toHaveBeenCalledWith(API_CACHE_NAME);
  });

  it('never throws when Cache Storage is missing or fails', async () => {
    vi.stubGlobal('caches', undefined);
    await expect(clearApiCache()).resolves.toBeUndefined();
    vi.stubGlobal('caches', { delete: () => Promise.reject(new Error('SecurityError')) });
    await expect(clearApiCache()).resolves.toBeUndefined();
  });
});
