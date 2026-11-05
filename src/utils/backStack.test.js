import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { pushLayer, releaseLayer, openLayerCount, resetBackStack } from './backStack.js';

/**
 * Minimal browser history: pushState adds an entry, back() removes one and
 * fires popstate asynchronously (as browsers do). userBack() is the Android
 * back gesture.
 */
const createFakeWindow = () => {
  const listeners = new Set();
  const entries = [{ app: true }];
  const firePop = () => listeners.forEach((fn) => fn({ state: entries.at(-1) }));
  return {
    entries,
    addEventListener: (type, fn) => { if (type === 'popstate') { listeners.add(fn); } },
    removeEventListener: (type, fn) => { listeners.delete(fn); },
    history: {
      pushState: (state) => { entries.push(state); },
      back: () => { entries.pop(); setTimeout(firePop, 0); }
    },
    userBack: () => { entries.pop(); firePop(); }
  };
};

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('backStack', () => {
  let win;

  beforeEach(() => {
    resetBackStack();
    win = createFakeWindow();
    vi.stubGlobal('window', win);
  });

  afterEach(() => {
    resetBackStack();
    vi.unstubAllGlobals();
  });

  it('back closes only the top layer', async () => {
    const closeA = vi.fn();
    const closeB = vi.fn();
    pushLayer(closeA);
    pushLayer(closeB);
    expect(win.entries).toHaveLength(3);

    win.userBack();
    expect(closeB).toHaveBeenCalledOnce();
    expect(closeA).not.toHaveBeenCalled();
    expect(openLayerCount()).toBe(1);

    win.userBack();
    expect(closeA).toHaveBeenCalledOnce();
    expect(win.entries).toHaveLength(1);
  });

  it('closing a layer from the UI removes its entry without closing anything else', async () => {
    const closeA = vi.fn();
    pushLayer(closeA);
    const b = pushLayer(vi.fn());
    releaseLayer(b);
    await tick();
    expect(win.entries).toHaveLength(2);
    expect(closeA).not.toHaveBeenCalled();
    expect(openLayerCount()).toBe(1);
  });

  it('releasing a layer that back already closed does nothing', async () => {
    const a = pushLayer(vi.fn());
    win.userBack();
    releaseLayer(a);
    await tick();
    expect(win.entries).toHaveLength(1);
  });

  it('a layer opened while a UI close is in flight keeps its own entry', async () => {
    // A menu item closes the menu and opens a dialog in the same tick
    const menu = pushLayer(vi.fn());
    releaseLayer(menu);
    const closeDialog = vi.fn();
    pushLayer(closeDialog);
    await tick();
    expect(win.entries).toHaveLength(2);
    expect(closeDialog).not.toHaveBeenCalled();

    win.userBack();
    expect(closeDialog).toHaveBeenCalledOnce();
    expect(win.entries).toHaveLength(1);
  });

  it('open and immediately close (e.g. React StrictMode effects) leaves no entry', async () => {
    const a = pushLayer(vi.fn());
    releaseLayer(a);
    const b = pushLayer(vi.fn());
    releaseLayer(b);
    await tick();
    expect(win.entries).toHaveLength(1);
    expect(openLayerCount()).toBe(0);
  });

  it('back with no layers open is left to the browser (exits the app)', () => {
    win.userBack();
    expect(openLayerCount()).toBe(0);
  });
});
