import { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { pushLayer, releaseLayer } from '../utils/backStack.js';

/**
 * While `open`, the Android back gesture calls `onClose` instead of leaving
 * the app. See utils/backStack.js.
 * @param {boolean} open
 * @param {() => void} onClose
 */
export function useBackToClose(open, onClose) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) { return undefined; }
    const id = pushLayer(() => onCloseRef.current());
    return () => releaseLayer(id);
  }, [open]);
}

/**
 * Radix-style open state that works controlled (open/onOpenChange) or
 * uncontrolled (defaultOpen), so wrappers can always observe it.
 * @returns {[boolean, (open: boolean) => void]}
 */
export function useControllableOpen({ open, defaultOpen = false, onOpenChange }) {
  const [innerOpen, setInnerOpen] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  const setOpen = useCallback((next) => {
    if (!isControlled) { setInnerOpen(next); }
    onOpenChangeRef.current?.(next);
  }, [isControlled]);

  return [isControlled ? open : innerOpen, setOpen];
}

/**
 * Wrap a Radix Root (Dialog, Popover, DropdownMenu…) so back closes it.
 * @param {React.ComponentType} Root
 * @param {string} slot - data-slot attribute
 */
export function withBackToClose(Root, slot) {
  function BackClosableRoot({ open, defaultOpen, onOpenChange, ...props }) {
    const [isOpen, setOpen] = useControllableOpen({ open, defaultOpen, onOpenChange });
    useBackToClose(isOpen, () => setOpen(false));
    return <Root data-slot={slot} open={isOpen} onOpenChange={setOpen} {...props} />;
  }
  BackClosableRoot.displayName = `BackClosable(${slot})`;
  BackClosableRoot.propTypes = {
    open: PropTypes.bool,
    defaultOpen: PropTypes.bool,
    onOpenChange: PropTypes.func
  };
  return BackClosableRoot;
}

export default useBackToClose;
