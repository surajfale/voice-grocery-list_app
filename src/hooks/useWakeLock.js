import { useEffect, useState } from 'react';
import logger from '../utils/logger.js';

export const isWakeLockSupported = () => typeof navigator !== 'undefined' && 'wakeLock' in navigator;

/**
 * Keeps the screen on while `enabled` (e.g. "Shopping mode" in the store).
 * Browsers drop the lock whenever the app is hidden, so it is re-acquired
 * each time the app becomes visible again.
 * @param {boolean} enabled
 * @returns {{ supported: boolean, active: boolean }}
 */
export function useWakeLock(enabled) {
  const [active, setActive] = useState(false);
  const supported = isWakeLockSupported();

  useEffect(() => {
    if (!enabled || !supported) { setActive(false); return undefined; }

    let sentinel = null;
    let cancelled = false;

    const acquire = async () => {
      if (document.visibilityState !== 'visible' || sentinel) { return; }
      try {
        sentinel = await navigator.wakeLock.request('screen');
        if (cancelled) { sentinel.release(); return; }
        setActive(true);
        sentinel.addEventListener('release', () => { sentinel = null; setActive(false); });
      } catch (error) {
        // e.g. battery saver on: the screen just sleeps as usual
        logger.warn('Screen wake lock unavailable:', error?.message || error);
      }
    };

    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', acquire);
      sentinel?.release();
      setActive(false);
    };
  }, [enabled, supported]);

  return { supported, active };
}

export default useWakeLock;
