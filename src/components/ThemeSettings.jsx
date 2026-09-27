import React from 'react';
import PropTypes from 'prop-types';
import { Sun, Moon, Monitor, Check, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from './ui/dialog';
import { Button } from './ui/button';
import { useThemeContext, colorThemes } from '../contexts/ThemeContext';
import { getCategoryStyle } from '../utils/categoryStyles';

const MODE_OPTIONS = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
];

// Decorative items for the live preview (same tints as the real list)
const PREVIEW_ITEMS = [
  { text: 'Spinach', category: 'Produce', done: true },
  { text: 'Paneer', category: 'Dairy', done: false },
];

// Same warm blend the hero gradient uses, so swatches preview the real look
const swatchGradient = (primary) =>
  `linear-gradient(135deg, ${primary} 0%, color-mix(in oklch, ${primary} 58%, oklch(0.76 0.16 62)) 100%)`;

const ThemeSettings = ({ open, onClose }) => {
  const { mode, resolvedMode, colorTheme, setMode, changeColorTheme } = useThemeContext();

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md p-0 gap-0 overflow-hidden focus-visible:outline-none"
        // Focus the dialog itself (still trapped for keyboard users) instead of
        // auto-focusing the close button, which drew a stray ring on open
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          event.currentTarget?.focus?.();
        }}
      >
        {/* Live preview: repaints instantly as mode/accent change */}
        <div className="hero-gradient px-6 pt-6 pb-5">
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle className="text-2xl font-semibold tracking-tight">Appearance</DialogTitle>
                <DialogDescription className="text-sm mt-0.5 opacity-85 text-inherit">
                  Saved on this device and applied instantly.
                </DialogDescription>
              </div>
              <DialogClose
                aria-label="Close"
                className="size-9 shrink-0 rounded-xl flex items-center justify-center border border-[color-mix(in_oklch,var(--primary-foreground)_25%,transparent)] bg-[color-mix(in_oklch,var(--primary-foreground)_14%,transparent)] hover:bg-[color-mix(in_oklch,var(--primary-foreground)_24%,transparent)] transition-colors"
              >
                <X className="size-4" />
              </DialogClose>
            </div>

            <div aria-hidden="true" className="mt-5 rounded-2xl bg-card text-card-foreground p-3.5 shadow-xl">
              <div className="flex items-baseline justify-between px-0.5 mb-2">
                <p className="font-semibold text-sm">Today</p>
                <p className="text-xs text-muted-foreground tabular-nums">1 of 2 left</p>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-3">
                <div className="h-full w-1/2 rounded-full btn-gradient transition-[background] duration-300" />
              </div>
              <ul className="space-y-2">
                {PREVIEW_ITEMS.map(({ text, category, done }) => {
                  const { emoji, hue } = getCategoryStyle(category);
                  return (
                    <li
                      key={text}
                      className="cat-card flex items-center gap-3 rounded-xl border px-2.5 py-2"
                      style={{ '--cat-h': hue }}
                    >
                      <span className="cat-tile size-7 rounded-lg flex items-center justify-center text-sm">{emoji}</span>
                      <span className={`flex-1 text-sm ${done ? 'text-muted-foreground line-through' : ''}`}>{text}</span>
                      <span
                        className={`size-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          done ? 'bg-primary border-primary text-primary-foreground' : 'cat-check'
                        }`}
                      >
                        {done && <Check className="size-3" strokeWidth={3} />}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>

        <div className="px-6 pt-5 pb-6 space-y-6">
          {/* Mode */}
          <fieldset>
            <legend className="text-sm font-semibold mb-2">Theme</legend>
            <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1">
              {MODE_OPTIONS.map(({ value, label, Icon }) => {
                const isActive = mode === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => setMode(value)}
                    className={`h-10 rounded-xl text-sm font-medium inline-flex items-center justify-center gap-1.5 transition-[background-color,color,box-shadow,transform] active:scale-[0.97] ${
                      isActive ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className={`size-4 ${isActive ? 'text-primary' : ''}`} />
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Accent */}
          <fieldset>
            <legend className="text-sm font-semibold mb-3">Accent color</legend>
            <div role="radiogroup" aria-label="Accent color" className="grid grid-cols-6 gap-2">
              {Object.entries(colorThemes).map(([key, theme]) => {
                const isSelected = colorTheme === key;
                const { primary, foreground } = theme[resolvedMode];
                return (
                  <button
                    type="button"
                    key={key}
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={theme.name}
                    title={theme.name}
                    onClick={() => changeColorTheme(key)}
                    className="group flex flex-col items-center gap-1.5"
                  >
                    <span
                      className={`size-11 rounded-full flex items-center justify-center transition-[transform,box-shadow] duration-200 group-hover:scale-105 group-active:scale-95 ${
                        isSelected ? 'ring-2 ring-offset-2 ring-offset-popover' : ''
                      }`}
                      style={{
                        background: swatchGradient(primary),
                        color: foreground,
                        '--tw-ring-color': primary,
                        boxShadow: isSelected ? `0 8px 18px -8px ${primary}` : undefined,
                      }}
                    >
                      {isSelected && <Check key={key} className="size-5 check-pop-in" strokeWidth={3} />}
                    </span>
                    <span className={`text-[11px] ${isSelected ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                      {theme.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <Button onClick={onClose} className="w-full h-11 rounded-xl btn-gradient border-0 hover:opacity-95">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

ThemeSettings.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ThemeSettings;
