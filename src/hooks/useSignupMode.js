import { useEffect, useState } from 'react';
import serviceManager from '../services/ServiceManager.js';

/**
 * Sign-up mode for the auth screens: 'loading' while fetching, then 'open',
 * 'invite' or 'closed' as reported by the server, or 'unknown' if it can't be
 * reached (the sign-up form then shows the invite field and lets the server
 * decide).
 *
 * @returns {'loading'|'open'|'invite'|'closed'|'unknown'}
 */
export const useSignupMode = () => {
  const [mode, setMode] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    serviceManager.getService('auth').getSignupMode().then((result) => {
      if (!cancelled) {
        setMode(result || 'unknown');
      }
    });
    return () => { cancelled = true; };
  }, []);

  return mode;
};

export default useSignupMode;
