import React from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Button,
  Grid,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Divider,
  Chip,
} from '@mui/material';
import {
  Close,
  Palette,
  LightMode,
  DarkMode,
  CheckCircle,
} from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import { useThemeContext, colorThemes } from '../contexts/ThemeContext';

const ThemeSettings = ({ open, onClose }) => {
  const { mode, colorTheme, toggleMode, changeColorTheme } = useThemeContext();
  const muiTheme = useTheme();
  const { palette } = muiTheme;

  const handleColorThemeChange = (newTheme) => {
    changeColorTheme(newTheme);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: '24px',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
          borderBottom: '1px solid',
          borderBottomColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              backgroundColor: palette.primary.main,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 12px ${alpha(palette.primary.main, 0.3)}`,
            }}
          >
            <Palette sx={{ color: 'white', fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Theme Settings
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Customize your app appearance
            </Typography>
          </Box>
        </Box>

        <IconButton
          onClick={onClose}
          sx={{
            borderRadius: '12px',
            '&:hover': {
              backgroundColor: alpha(palette.error.main, 0.1),
              color: 'error.main',
            },
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 2 }}>
        {/* Light/Dark Mode Toggle */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Appearance Mode
          </Typography>

          <Card
            sx={{
              borderRadius: '16px',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '12px',
                      backgroundColor: mode === 'dark' ? '#1E293B' : '#F8FAFC',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid',
                      borderColor: mode === 'dark' ? '#475569' : '#E2E8F0',
                    }}
                  >
                    {mode === 'dark' ? (
                      <DarkMode sx={{ color: '#F1F5F9', fontSize: 24 }} />
                    ) : (
                      <LightMode sx={{ color: '#F59E0B', fontSize: 24 }} />
                    )}
                  </Box>

                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {mode === 'dark'
                        ? 'Easy on the eyes in low light'
                        : 'Classic bright appearance'
                      }
                    </Typography>
                  </Box>
                </Box>

                <FormControlLabel
                  control={
                    <Switch
                      checked={mode === 'dark'}
                      onChange={toggleMode}
                      sx={{
                        '& .MuiSwitch-thumb': {
                          backgroundColor: mode === 'dark' ? '#1E293B' : '#F59E0B',
                        },
                        '& .MuiSwitch-track': {
                          backgroundColor: mode === 'dark' ? '#475569' : '#E2E8F0',
                        },
                      }}
                    />
                  }
                  label=""
                />
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Color Theme Selection */}
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Color Theme
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Choose your preferred color scheme for the app interface
          </Typography>

          <Grid container spacing={2}>
            {Object.entries(colorThemes).map(([key, theme]) => (
              <Grid item xs={6} sm={4} md={3} key={key}>
                <Card
                  onClick={() => handleColorThemeChange(key)}
                  sx={{
                    borderRadius: '16px',
                    cursor: 'pointer',
                    border: '2px solid',
                    borderColor: colorTheme === key ? theme.primary : 'transparent',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: `0 8px 25px ${alpha(theme.primary, 0.25)}`,
                      borderColor: theme.primary,
                    },
                  }}
                >
                  <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
                    {/* Color Preview */}
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 0.5,
                        justifyContent: 'center',
                        mb: 2,
                      }}
                    >
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryLight} 100%)`,
                          border: '2px solid white',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                        }}
                      />
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${theme.secondary} 0%, ${theme.secondaryLight} 100%)`,
                          border: '2px solid white',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                        }}
                      />
                    </Box>

                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: colorTheme === key ? theme.primary : 'text.primary',
                      }}
                    >
                      {theme.name}
                    </Typography>

                    {/* Selected Indicator */}
                    {colorTheme === key && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: theme.primary,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <CheckCircle sx={{ color: 'white', fontSize: 16 }} />
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Preview Section */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Preview
          </Typography>

          <Card
            sx={{
              borderRadius: '16px',
              backgroundColor: alpha(palette.primary.main, 0.06),
              border: `1px solid ${alpha(palette.primary.main, 0.2)}`,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Chip
                  label="Sample Category"
                  sx={{
                    backgroundColor: palette.primary.main,
                    color: 'white',
                    fontWeight: 600,
                  }}
                />
                <Typography variant="body2" color="text.secondary">
                  This is how your grocery list will look
                </Typography>
              </Box>

              <Box
                sx={{
                  p: 2,
                  borderRadius: '12px',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  ✓ Sample grocery item
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            borderRadius: '12px',
            px: 4,
            py: 1.5,
            backgroundColor: palette.primary.main,
            boxShadow: `0 4px 12px ${alpha(palette.primary.main, 0.3)}`,
            '&:hover': {
              backgroundColor: palette.primary.dark,
              boxShadow: `0 6px 16px ${alpha(palette.primary.main, 0.4)}`,
            },
          }}
        >
          Apply Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

ThemeSettings.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ThemeSettings;