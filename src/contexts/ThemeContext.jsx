import React, { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { createTheme } from '@mui/material/styles';

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

const createCustomTheme = (mode, colorTheme) => {
  const colors = colorThemes[colorTheme];
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: colors.primary,
        light: colors.primaryLight,
        dark: colors.primaryDark,
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: colors.secondary,
        light: colors.secondaryLight,
        dark: colors.secondaryDark,
        contrastText: '#FFFFFF',
      },
      background: {
        default: isDark ? '#0F172A' : '#F8FAFC',
        paper: isDark ? '#1E293B' : '#FFFFFF',
      },
      text: {
        primary: isDark ? '#F8FAFC' : '#1E293B',
        secondary: isDark ? '#CBD5E1' : '#64748B',
      },
      action: {
        hover: isDark ? 'rgba(248, 250, 252, 0.08)' : 'rgba(0, 0, 0, 0.04)',
        selected: isDark ? 'rgba(248, 250, 252, 0.12)' : 'rgba(0, 0, 0, 0.08)',
        disabled: isDark ? 'rgba(248, 250, 252, 0.3)' : 'rgba(0, 0, 0, 0.26)',
        disabledBackground: isDark ? 'rgba(248, 250, 252, 0.12)' : 'rgba(0, 0, 0, 0.12)',
      },
      divider: isDark ? 'rgba(248, 250, 252, 0.12)' : 'rgba(0, 0, 0, 0.12)',
      success: {
        main: '#10B981',
        light: '#D1FAE5',
        dark: '#059669',
      },
      error: {
        main: '#EF4444',
        light: '#FEE2E2',
        dark: '#DC2626',
      },
      warning: {
        main: '#F59E0B',
        light: '#FEF3C7',
        dark: '#D97706',
      },
      info: {
        main: '#3B82F6',
        light: '#DBEAFE',
        dark: '#2563EB',
      },
      grey: {
        50: isDark ? '#1E293B' : '#F8FAFC',
        100: isDark ? '#334155' : '#F1F5F9',
        200: isDark ? '#475569' : '#E2E8F0',
        300: isDark ? '#64748B' : '#CBD5E1',
        400: isDark ? '#94A3B8' : '#94A3B8',
        500: isDark ? '#CBD5E1' : '#64748B',
        600: isDark ? '#E2E8F0' : '#475569',
        700: isDark ? '#F1F5F9' : '#334155',
        800: isDark ? '#F8FAFC' : '#1E293B',
        900: isDark ? '#FFFFFF' : '#0F172A',
      },
    },
    typography: {
      fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      h1: {
        fontWeight: 800,
        fontSize: '2.5rem',
        lineHeight: 1.2,
        letterSpacing: '-0.02em',
      },
      h2: {
        fontWeight: 700,
        fontSize: '2rem',
        lineHeight: 1.3,
        letterSpacing: '-0.01em',
      },
      h3: {
        fontWeight: 600,
        fontSize: '1.5rem',
        lineHeight: 1.4,
      },
      h4: {
        fontWeight: 600,
        fontSize: '1.25rem',
        lineHeight: 1.4,
      },
      h5: {
        fontWeight: 600,
        fontSize: '1.125rem',
        lineHeight: 1.4,
      },
      h6: {
        fontWeight: 600,
        fontSize: '1rem',
        lineHeight: 1.5,
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.6,
        color: isDark ? '#F8FAFC' : '#1E293B',
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.6,
        color: isDark ? '#CBD5E1' : '#64748B',
      },
      button: {
        fontWeight: 600,
        textTransform: 'none',
        letterSpacing: '0.02em',
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
            backgroundImage: isDark
              ? 'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.15) 1px, transparent 0)'
              : 'radial-gradient(circle at 1px 1px, rgba(99,102,241,0.05) 1px, transparent 0)',
            backgroundSize: '20px 20px',
          },
          '*': {
            boxSizing: 'border-box',
          },
          '*::-webkit-scrollbar': {
            width: '8px',
          },
          '*::-webkit-scrollbar-track': {
            backgroundColor: isDark ? '#334155' : '#F1F5F9',
          },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: isDark ? '#64748B' : '#CBD5E1',
            borderRadius: '4px',
          },
          '*::-webkit-scrollbar-thumb:hover': {
            backgroundColor: isDark ? '#94A3B8' : '#94A3B8',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            boxShadow: isDark
              ? '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px 0 rgba(0, 0, 0, 0.3)'
              : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
            borderRadius: '12px',
            border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.8)' : 'rgba(226, 232, 240, 0.8)'}`,
            backdropFilter: 'blur(8px)',
            background: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.9)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: '10px',
            textTransform: 'none',
            fontWeight: 600,
            padding: '10px 24px',
            fontSize: '0.875rem',
            boxShadow: 'none',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              boxShadow: isDark
                ? '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)'
                : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              transform: 'translateY(-1px)',
            },
          },
          contained: {
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
            '&:hover': {
              background: `linear-gradient(135deg, ${colors.primaryDark} 0%, ${colors.secondaryDark} 100%)`,
            },
          },
          outlined: {
            borderColor: isDark ? '#64748B' : '#E2E8F0',
            color: isDark ? '#CBD5E1' : '#64748B',
            '&:hover': {
              borderColor: colors.primary,
              backgroundColor: `${colors.primary}20`,
              color: isDark ? '#F8FAFC' : colors.primary,
            },
          },
        },
      },
      MuiFab: {
        styleOverrides: {
          root: {
            boxShadow: `0 10px 25px ${colors.primary}50`,
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              boxShadow: `0 20px 40px ${colors.primary}70`,
              transform: 'translateY(-2px) scale(1.05)',
              background: `linear-gradient(135deg, ${colors.primaryDark} 0%, ${colors.secondaryDark} 100%)`,
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: '16px',
            border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.8)' : 'rgba(226, 232, 240, 0.8)'}`,
            background: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            color: isDark ? '#F8FAFC' : '#1E293B',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: isDark
                ? '0 10px 25px rgba(0, 0, 0, 0.4)'
                : '0 10px 25px rgba(0, 0, 0, 0.08)',
              borderColor: `${colors.primary}60`,
            },
          },
        },
      },
      MuiListItem: {
        styleOverrides: {
          root: {
            borderRadius: '12px',
            marginBottom: '8px',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              backgroundColor: `${colors.primary}10`,
              transform: 'translateX(4px)',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.75rem',
          },
          colorPrimary: {
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
            color: '#FFFFFF',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(12px)',
            borderBottom: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.8)' : 'rgba(226, 232, 240, 0.8)'}`,
            color: isDark ? '#F8FAFC' : '#1E293B',
            boxShadow: isDark
              ? '0 1px 3px 0 rgba(0, 0, 0, 0.5), 0 1px 2px 0 rgba(0, 0, 0, 0.4)'
              : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            background: isDark ? 'rgba(30, 41, 59, 0.98)' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(12px)',
            borderRight: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.8)' : 'rgba(226, 232, 240, 0.8)'}`,
            color: isDark ? '#F8FAFC' : '#1E293B',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.8)',
              color: isDark ? '#F8FAFC' : '#1E293B',
              '& fieldset': {
                borderColor: isDark ? '#64748B' : '#E2E8F0',
              },
              '&:hover fieldset': {
                borderColor: colors.primary,
              },
              '&.Mui-focused fieldset': {
                borderColor: colors.primary,
                borderWidth: '2px',
              },
              '& input': {
                color: isDark ? '#F8FAFC' : '#1E293B',
              },
              '& input::placeholder': {
                color: isDark ? '#94A3B8' : '#64748B',
                opacity: 1,
              },
            },
          },
        },
      },
    },
    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 900,
        lg: 1200,
        xl: 1536,
      },
    },
  });
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

  // Save theme preferences to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('colorTheme', colorTheme);
  }, [colorTheme]);

  const toggleMode = () => {
    setMode(prevMode => prevMode === 'light' ? 'dark' : 'light');
  };

  const changeColorTheme = (newColorTheme) => {
    if (colorThemes[newColorTheme]) {
      setColorTheme(newColorTheme);
    }
  };

  const theme = createCustomTheme(mode, colorTheme);

  const value = {
    mode,
    colorTheme,
    colorThemes,
    theme,
    toggleMode,
    changeColorTheme,
  };

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