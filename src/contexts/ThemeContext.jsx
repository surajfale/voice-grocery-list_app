import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';

const ThemeContext = createContext();

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};

// Color theme configurations
export const colorThemes = {
  indigo: {
    name: 'Indigo',
    primary: '#6366F1',
    primaryLight: '#818CF8',
    primaryDark: '#4F46E5',
    secondary: '#10B981',
    secondaryLight: '#34D399',
    secondaryDark: '#059669',
  },
  purple: {
    name: 'Purple',
    primary: '#8B5CF6',
    primaryLight: '#A78BFA',
    primaryDark: '#7C3AED',
    secondary: '#EC4899',
    secondaryLight: '#F472B6',
    secondaryDark: '#DB2777',
  },
  emerald: {
    name: 'Emerald',
    primary: '#10B981',
    primaryLight: '#34D399',
    primaryDark: '#059669',
    secondary: '#3B82F6',
    secondaryLight: '#60A5FA',
    secondaryDark: '#2563EB',
  },
  rose: {
    name: 'Rose',
    primary: '#F43F5E',
    primaryLight: '#FB7185',
    primaryDark: '#E11D48',
    secondary: '#8B5CF6',
    secondaryLight: '#A78BFA',
    secondaryDark: '#7C3AED',
  },
  amber: {
    name: 'Amber',
    primary: '#F59E0B',
    primaryLight: '#FBBF24',
    primaryDark: '#D97706',
    secondary: '#06B6D4',
    secondaryLight: '#22D3EE',
    secondaryDark: '#0891B2',
  },
  teal: {
    name: 'Teal',
    primary: '#14B8A6',
    primaryLight: '#2DD4BF',
    primaryDark: '#0F766E',
    secondary: '#F59E0B',
    secondaryLight: '#FBBF24',
    secondaryDark: '#D97706',
  },
};

// Pushes the selected accent preset onto the document as CSS custom properties
// so every shadcn/Tailwind surface (bg-primary, ring-ring, text-secondary, ...)
// picks it up without re-rendering a component tree.
const applyAccentVariables = (colors) => {
  const root = document.documentElement.style;
  root.setProperty('--primary', colors.primary);
  root.setProperty('--primary-foreground', '#ffffff');
  root.setProperty('--secondary', colors.secondary);
  root.setProperty('--secondary-foreground', '#ffffff');
  root.setProperty('--ring', colors.primary);
  root.setProperty('--glow', colors.primary);
  root.setProperty('--chart-1', colors.primary);
  root.setProperty('--chart-2', colors.secondary);
  root.setProperty('--chart-3', colors.primaryLight);
  root.setProperty('--chart-4', colors.secondaryLight);
  root.setProperty('--chart-5', colors.primaryDark);
};

export const CustomThemeProvider = ({ children }) => {
  const [mode, setMode] = useState('light');
  const [colorTheme, setColorTheme] = useState('indigo');

  // Load theme preferences from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('themeMode');
    const savedColorTheme = localStorage.getItem('colorTheme');

    if (savedMode && (savedMode === 'light' || savedMode === 'dark')) {
      setMode(savedMode);
    }

    if (savedColorTheme && colorThemes[savedColorTheme]) {
      setColorTheme(savedColorTheme);
    }
  }, []);

  // Save mode, sync the `.dark` class Tailwind's dark: variant looks for
  useEffect(() => {
    localStorage.setItem('themeMode', mode);
    document.documentElement.classList.toggle('dark', mode === 'dark');
  }, [mode]);

  // Save + apply the accent color preset as CSS variables
  useEffect(() => {
    localStorage.setItem('colorTheme', colorTheme);
    applyAccentVariables(colorThemes[colorTheme]);
  }, [colorTheme]);

  const toggleMode = () => {
    setMode(prevMode => prevMode === 'light' ? 'dark' : 'light');
  };

  const changeColorTheme = (newColorTheme) => {
    if (colorThemes[newColorTheme]) {
      setColorTheme(newColorTheme);
    }
  };

  const value = useMemo(() => ({
    mode,
    colorTheme,
    colorThemes,
    toggleMode,
    changeColorTheme,
  }), [mode, colorTheme]);

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
