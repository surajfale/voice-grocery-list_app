/**
 * Android back gesture support for in-app layers (dialogs, sheets, menus,
 * the Receipts view). Without it, back in the installed app leaves the app.
 *
 * Each open layer owns one history entry. A back gesture pops the entry and
 * closes only the top layer. When a layer is closed from the UI instead
 * (X button, outside tap), its entry is removed with history.back(); the
 * popstate that follows is ignored rather than treated as a back gesture.
 *
 * history.back() is asynchronous, so a layer opened while such a back is in
 * flight (e.g. a menu item that closes the menu and opens a dialog) has its
 * entry pushed once the pending back has landed; otherwise the back would
 * remove the new layer's entry instead of the old one.
 */

const layers = []; // [{ id, close }], top of stack last
let pendingBacks = 0; // history.back() calls whose popstate hasn't arrived
let queuedPushes = 0; // entries to push once pendingBacks reaches 0
let nextId = 0;
let listening = false;

const pushEntry = () => window.history.pushState({ backLayer: true }, '');

const onPopState = () => {
  if (pendingBacks > 0) {
    // Our own history.back() from releaseLayer, not the user
    pendingBacks -= 1;
    if (pendingBacks === 0) {
      for (; queuedPushes > 0; queuedPushes -= 1) { pushEntry(); }
    }
    return;
  }
  // A real back gesture: close the top layer. Its entry is already gone, so
  // removing it here keeps releaseLayer from calling history.back() again.
  const top = layers.pop();
  top?.close();
};

const ensureListener = () => {
  if (listening) { return; }
  window.addEventListener('popstate', onPopState);
  listening = true;
};

/**
 * Register an open layer.
 * @param {() => void} close - Closes the layer (called on a back gesture)
 * @returns {number} id to pass to releaseLayer
 */
export const pushLayer = (close) => {
  if (typeof window === 'undefined') { return -1; }
  ensureListener();
  nextId += 1;
  layers.push({ id: nextId, close });
  if (pendingBacks > 0) {
    queuedPushes += 1;
  } else {
    pushEntry();
  }
  return nextId;
};

/**
 * The layer closed by other means (or unmounted): drop its history entry.
 * A no-op when a back gesture already closed it.
 * @param {number} id
 */
export const releaseLayer = (id) => {
  const index = layers.findIndex((layer) => layer.id === id);
  if (index === -1) { return; }
  layers.splice(index, 1);
  if (queuedPushes > 0) {
    // Its entry was never pushed
    queuedPushes -= 1;
    return;
  }
  pendingBacks += 1;
  window.history.back();
};

/** Number of open layers (for tests) */
export const openLayerCount = () => layers.length;

/** Test helper: forget all state */
export const resetBackStack = () => {
  layers.length = 0;
  pendingBacks = 0;
  queuedPushes = 0;
  if (listening && typeof window !== 'undefined') {
    window.removeEventListener('popstate', onPopState);
  }
  listening = false;
};
