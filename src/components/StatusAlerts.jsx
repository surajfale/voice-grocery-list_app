import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Alert, Box, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

const StatusAlerts = memo(({ 
  isListening, 
  transcript, 
  skippedDuplicates, 
  error = '', 
  onClearError = null 
}) => {
  const { palette } = useTheme();

  return (
    <>
      {/* Error Display */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          onClose={onClearError}
        >
          {error}
        </Alert>
      )}

      {/* Voice Recognition Status */}
      {isListening && (
        <Alert
          severity="info"
          sx={{
            mb: 2,
            borderRadius: '16px',
            backgroundColor: alpha(palette.primary.main, 0.1),
            border: `1px solid ${alpha(palette.primary.main, 0.2)}`,
            '& .MuiAlert-icon': {
              color: 'primary.main',
            },
            animation: 'glow 2s ease-in-out infinite alternate',
            '@keyframes glow': {
              '0%': {
                boxShadow: `0 2px 10px ${alpha(palette.primary.main, 0.2)}`,
              },
              '100%': {
                boxShadow: `0 4px 20px ${alpha(palette.primary.main, 0.4)}`,
              },
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: palette.error.main,
                animation: 'pulse 1s infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                },
              }}
            />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              🎤 Listening... Say your grocery items!
            </Typography>
          </Box>
        </Alert>
      )}

      {/* Last Transcript */}
      {transcript && (
        <Alert
          severity="success"
          sx={{
            mb: 2,
            borderRadius: '16px',
            backgroundColor: alpha(palette.success.main, 0.1),
            border: `1px solid ${alpha(palette.success.main, 0.2)}`,
            '& .MuiAlert-icon': {
              color: 'success.main',
            },
            animation: 'slideInFromTop 0.3s ease-out',
            '@keyframes slideInFromTop': {
              '0%': {
                opacity: 0,
                transform: 'translateY(-10px)',
              },
              '100%': {
                opacity: 1,
                transform: 'translateY(0)',
              },
            },
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            <Box component="span" sx={{ color: 'text.secondary', mr: 1 }}>
              Last heard:
            </Box>
            <Box
              component="span"
              sx={{
                fontWeight: 600,
                color: 'success.dark',
                backgroundColor: alpha(palette.success.main, 0.1),
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontStyle: 'italic',
              }}
            >
              "{transcript}"
            </Box>
          </Typography>
        </Alert>
      )}

      {/* Skipped Duplicates */}
      {skippedDuplicates.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Skipped duplicate items: {skippedDuplicates.join(', ')}
        </Alert>
      )}
    </>
  );
});

StatusAlerts.displayName = 'StatusAlerts';

// PropTypes validation
StatusAlerts.propTypes = {
  isListening: PropTypes.bool.isRequired,
  transcript: PropTypes.string.isRequired,
  skippedDuplicates: PropTypes.array.isRequired,
  error: PropTypes.string,
  onClearError: PropTypes.func
};

export default StatusAlerts;
