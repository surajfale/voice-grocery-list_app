import React from 'react';
import PropTypes from 'prop-types';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { useThemeContext, colorThemes } from '../contexts/ThemeContext';

const MODE_OPTIONS = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
];

const ThemeSettings = ({ open, onClose }) => {
  const { mode, resolvedMode, colorTheme, setMode, changeColorTheme } = useThemeContext();

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Appearance</DialogTitle>
          <DialogDescription>Changes apply instantly and are saved on this device.</DialogDescription>
        </DialogHeader>

        {/* Mode: segmented control */}
        <fieldset>
          <legend className="text-sm font-medium mb-2">Theme</legend>
          <div role="radiogroup" className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
            {MODE_OPTIONS.map(({ value, label, Icon }) => {
              const isActive = mode === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setMode(value)}
                  className={`h-9 rounded-lg text-sm font-medium inline-flex items-center justify-center gap-1.5 transition-[background-color,color,box-shadow] ${
                    isActive ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Accent swatches, previewed in the shade used by the current mode */}
        <fieldset>
          <legend className="text-sm font-medium mb-2">Accent color</legend>
          <div role="radiogroup" className="grid grid-cols-3 gap-2">
            {Object.entries(colorThemes).map(([key, theme]) => {
              const isSelected = colorTheme === key;
              const { primary, foreground } = theme[resolvedMode];
              return (
                <button
                  type="button"
                  key={key}
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => changeColorTheme(key)}
                  className={`flex items-center gap-2.5 h-11 px-3 rounded-xl border text-sm text-left transition-[border-color,background-color] ${
                    isSelected ? 'border-foreground/40 bg-accent font-medium' : 'border-border hover:bg-accent/60'
                  }`}
                >
                  <span
                    className="size-5 rounded-full shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: primary, color: foreground }}
                  >
                    {isSelected && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  {theme.name}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Live preview using real tokens */}
        <div className="rounded-xl border border-border bg-card p-3 space-y-2" aria-hidden="true">
          <div className="flex items-center gap-3">
            <span className="size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Check className="size-3" strokeWidth={3} />
            </span>
            <span className="text-sm text-muted-foreground line-through">Greek yogurt</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="size-5 rounded-full border-[1.5px] border-muted-foreground/50" />
            <span className="text-sm">Basmati rice</span>
            <span className="ml-auto h-1.5 w-16 rounded-full bg-muted overflow-hidden">
              <span className="block h-full w-1/2 bg-primary" />
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

ThemeSettings.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ThemeSettings;
