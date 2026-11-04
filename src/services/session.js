/**
 * Session expiry handling. The backend answers 401 when a session token is
 * expired or revoked (password reset or account deletion bumps the user's
 * tokenVersion), tagged with code SESSION_INVALID. Other 401s (a wrong
 * password on login or account deletion) don't carry it and are left alone.
 * On a dead session the stored token is useless: clear it and reload at the
 * app root, where AuthProvider finds no saved user and shows the login page.
 */

export const TOKEN_STORAGE_KEY = 'groceryListToken';
export const USER_STORAGE_KEY = 'groceryListUser';

export const SESSION_INVALID = 'SESSION_INVALID';

// Workbox runtime cache for API responses (vite.config.js). It holds the
// signed-in user's lists and receipts, so it must not outlive the session.
export const API_CACHE_NAME = 'api-cache';

/**
 * Delete the service worker's API response cache. Never throws.
 * @returns {Promise<void>}
 */
export const clearApiCache = async () => {
  try {
    await globalThis.caches?.delete(API_CACHE_NAME);
  } catch {
    // Cache Storage unavailable (e.g. insecure context): nothing cached
  }
};

let ending = false;

/**
 * @param {number} status - HTTP status of the response
 * @param {{ code?: string }|null|undefined} body - Parsed JSON body, if any
 * @returns {boolean} true when the session was ended
 */
export const endSessionIfUnauthorized = (status, body) => {
  if (status !== 401 || body?.code !== SESSION_INVALID || ending) {
    return false;
  }
  ending = true;

  try {
    globalThis.localStorage?.removeItem(TOKEN_STORAGE_KEY);
    globalThis.localStorage?.removeItem(USER_STORAGE_KEY);
  } catch {
    // Storage unavailable: nothing stored to clear
  }

  // Several requests can fail at once; only the first one redirects, after
  // the cached API responses are gone
  clearApiCache().finally(() => {
    globalThis.location?.replace(import.meta.env?.BASE_URL || '/');
  });
  return true;
};

/** Test helper: allow another redirect */
export const resetSessionState = () => {
  ending = false;
};
