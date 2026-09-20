import React from 'react';
import PropTypes from 'prop-types';
import { Palette, Sun, Moon, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { useThemeContext, colorThemes } from '../contexts/ThemeContext';

const ThemeSettings = ({ open, onClose }) => {
  const { mode, colorTheme, toggleMode, changeColorTheme } = useThemeContext();

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-[0_4px_12px_-2px_var(--primary)]">
              <Palette className="text-white size-5" />
            </div>
            <div>
              <DialogTitle>Theme Settings</DialogTitle>
              <p className="text-xs text-muted-foreground">Customize your app appearance</p>
            </div>
          </div>
        </DialogHeader>

        {/* Light/Dark Mode Toggle */}
        <div>
          <h6 className="font-display font-semibold mb-2">Appearance Mode</h6>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-xl border-2 border-border flex items-center justify-center bg-muted">
                  {mode === 'dark' ? (
                    <Moon className="size-6 text-foreground" />
                  ) : (
                    <Sun className="size-6 text-warning" />
                  )}
                </div>
                <div>
                  <p className="font-semibold">{mode === 'dark' ? 'Dark Mode' : 'Light Mode'}</p>
                  <p className="text-sm text-muted-foreground">
                    {mode === 'dark' ? 'Easy on the eyes in low light' : 'Classic bright appearance'}
                  </p>
                </div>
              </div>
              <Switch checked={mode === 'dark'} onCheckedChange={toggleMode} />
            </div>
          </Card>
        </div>

        <Separator />

        {/* Color Theme Selection */}
        <div>
          <h6 className="font-display font-semibold mb-1">Color Theme</h6>
          <p className="text-sm text-muted-foreground mb-3">
            Choose your preferred color scheme for the app interface
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(colorThemes).map(([key, theme]) => {
              const isSelected = colorTheme === key;
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => changeColorTheme(key)}
                  className="relative rounded-2xl p-4 text-center border-2 transition-all hover:-translate-y-0.5"
                  style={{
                    borderColor: isSelected ? theme.primary : 'transparent',
                    boxShadow: isSelected ? `0 8px 20px -6px ${theme.primary}66` : undefined,
                    backgroundColor: 'var(--card)',
                  }}
                >
                  <div className="flex justify-center gap-1.5 mb-2">
                    <span
                      className="size-6 rounded-full border-2 border-white shadow"
                      style={{ background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryLight} 100%)` }}
                    />
                    <span
                      className="size-6 rounded-full border-2 border-white shadow"
                      style={{ background: `linear-gradient(135deg, ${theme.secondary} 0%, ${theme.secondaryLight} 100%)` }}
                    />
                  </div>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: isSelected ? theme.primary : 'var(--foreground)' }}
                  >
                    {theme.name}
                  </span>

                  {isSelected && (
                    <span
                      className="absolute top-2 right-2 size-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: theme.primary }}
                    >
                      <Check className="size-3 text-white" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Preview Section */}
        <div>
          <h6 className="font-display font-semibold mb-2">Preview</h6>
          <Card className="p-4 bg-primary/6 border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Badge>Sample Category</Badge>
              <span className="text-sm text-muted-foreground">This is how your grocery list will look</span>
            </div>
            <div className="p-2.5 rounded-lg border border-border">
              <span className="text-sm font-medium">✓ Sample grocery item</span>
            </div>
          </Card>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Apply Changes</Button>
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
