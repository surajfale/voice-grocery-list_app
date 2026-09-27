import React, { createContext, useContext, useState, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';

const ThemeContext = createContext();

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};

const MODE_KEY = 'themeMode';
const COLOR_KEY = 'colorTheme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

export const THEME_MODES = ['light', 'dark', 'system'];

// Accent presets. Each mode gets its own tuned shade: the light shade keeps
// white text >= 4.5:1 on buttons, the dark shade keeps accent-colored text
// readable on the near-black background (with dark text on filled buttons).
export const colorThemes = {
  indigo: {
    name: 'Indigo',
    light: { primary: '#4F46E5', foreground: '#FFFFFF' },
    dark: { primary: '#8B93F8', foreground: '#0B0B12' },
  },
  purple: {
    name: 'Violet',
    light: { primary: '#7C3AED', foreground: '#FFFFFF' },
    dark: { primary: '#B196FA', foreground: '#0D0A14' },
  },
  emerald: {
    name: 'Emerald',
    light: { primary: '#047857', foreground: '#FFFFFF' },
    dark: { primary: '#3DD6A0', foreground: '#04130D' },
  },
  rose: {
    name: 'Rose',
    light: { primary: '#E11D48', foreground: '#FFFFFF' },
    dark: { primary: '#FB7F95', foreground: '#1A0509' },
  },
  amber: {
    name: 'Amber',
    light: { primary: '#B45309', foreground: '#FFFFFF' },
    dark: { primary: '#FBBF3C', foreground: '#1A1004' },
  },
  teal: {
    name: 'Teal',
    light: { primary: '#0F766E', foreground: '#FFFFFF' },
    dark: { primary: '#3CD4C4', foreground: '#031312' },
  },
};

const readStorage = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // private mode / blocked storage
  }
};

const writeStorage = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Preference just won't persist; the app still works
  }
};

// Read synchronously so the very first render already has the right theme
// (no flash, and no effect-ordering race that overwrites the saved value).
const getInitialMode = () => {
  const saved = readStorage(MODE_KEY);
  return THEME_MODES.includes(saved) ? saved : 'system';
};

const getInitialColorTheme = () => {
  const saved = readStorage(COLOR_KEY);
  return saved && colorThemes[saved] ? saved : 'indigo';
};

const getSystemPrefersDark = () =>
  typeof window !== 'undefined' && window.matchMedia?.(DARK_QUERY).matches;

// Pushes the accent onto the document as CSS custom properties so every
// shadcn/Tailwind surface (bg-primary, ring-ring, ...) picks it up.
const applyAccentVariables = ({ primary, foreground }) => {
  const root = document.documentElement.style;
  root.setProperty('--primary', primary);
  root.setProperty('--primary-foreground', foreground);
  root.setProperty('--ring', primary);
  root.setProperty('--chart-1', primary);
};

export const CustomThemeProvider = ({ children }) => {
  const [mode, setModeState] = useState(getInitialMode);
  const [colorTheme, setColorTheme] = useState(getInitialColorTheme);
  const [systemDark, setSystemDark] = useState(getSystemPrefersDark);

  // Follow OS changes while in "system" mode
  useEffect(() => {
    const media = window.matchMedia?.(DARK_QUERY);
    if (!media) {return undefined;}
    const onChange = (event) => setSystemDark(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const resolvedMode = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;

  // Layout effect: apply before paint so switching never flashes
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolvedMode === 'dark');
    root.style.colorScheme = resolvedMode;
    applyAccentVariables(colorThemes[colorTheme][resolvedMode]);

    const themeColor = window.getComputedStyle(root).getPropertyValue('--background').trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor || '#ffffff');
  }, [resolvedMode, colorTheme]);

  const setMode = useCallback((nextMode) => {
    if (!THEME_MODES.includes(nextMode)) {return;}
    setModeState(nextMode);
    writeStorage(MODE_KEY, nextMode);
  }, []);

  // Flip whatever is currently showing; an explicit choice leaves "system"
  const toggleMode = useCallback(() => {
    setMode(resolvedMode === 'dark' ? 'light' : 'dark');
  }, [resolvedMode, setMode]);

  const changeColorTheme = useCallback((newColorTheme) => {
    if (colorThemes[newColorTheme]) {
      setColorTheme(newColorTheme);
      writeStorage(COLOR_KEY, newColorTheme);
    }
  }, []);

  const value = useMemo(() => ({
    mode,
    resolvedMode,
    colorTheme,
    colorThemes,
    setMode,
    toggleMode,
    changeColorTheme,
  }), [mode, resolvedMode, colorTheme, setMode, toggleMode, changeColorTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

CustomThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default CustomThemeProvider;
