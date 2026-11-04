/**
 * Resolve Express's "trust proxy" setting from TRUST_PROXY.
 *
 * Accepted values:
 *   unset                → production: 1 (one proxy hop, e.g. Railway's edge)
 *                          otherwise: false (direct connections)
 *   '0'..'n' (integer)   → that many proxy hops
 *   'false'              → false
 *   'true'               → 1 (a bare `true` would trust the client-controlled
 *                          left-most X-Forwarded-For entry, so it is never used)
 *   anything else        → passed through as proxy addresses/subnets,
 *                          e.g. 'loopback' or '10.0.0.0/8, 127.0.0.1'
 *
 * @param {string|undefined} value - process.env.TRUST_PROXY
 * @param {string|undefined} nodeEnv - process.env.NODE_ENV
 * @returns {number|false|string}
 */
export const resolveTrustProxy = (value, nodeEnv) => {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';

  if (!raw) {
    return nodeEnv === 'production' ? 1 : false;
  }
  if (raw === 'false') {
    return false;
  }
  if (raw === 'true') {
    console.warn('⚠️ TRUST_PROXY=true would let clients spoof their IP; using 1 proxy hop instead. Set TRUST_PROXY to your hop count.');
    return 1;
  }
  if (/^\d+$/.test(raw)) {
    return Number(raw);
  }
  return value.trim();
};

export default resolveTrustProxy;
