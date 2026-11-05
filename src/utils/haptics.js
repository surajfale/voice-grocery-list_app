/**
 * A short vibration as tactile feedback (Android; a no-op where unsupported).
 * Skipped when the user asked for reduced motion.
 * @param {number | number[]} pattern - ms
 */
export const haptic = (pattern = 12) => {
  try {
    if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { return; }
    globalThis.navigator?.vibrate?.(pattern);
  } catch {
    // Vibration blocked (e.g. no user activation yet): feedback is optional
  }
};

export default haptic;
