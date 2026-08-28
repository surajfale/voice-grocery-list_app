import React, { memo } from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Box,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { ShoppingCart, Mic, Edit } from '@mui/icons-material';

const EmptyState = memo(({ currentDateString, formatDateDisplay }) => {
  const theme = useTheme();
  const { primary, success } = theme.palette;

  return (
    <Paper
      sx={{
        p: 6,
        textAlign: 'center',
        borderRadius: '20px',
        animation: 'fadeInUp 0.6s ease-out',
        '@keyframes fadeInUp': {
          '0%': {
            opacity: 0,
            transform: 'translateY(20px)',
          },
          '100%': {
            opacity: 1,
            transform: 'translateY(0)',
          },
        },
      }}
    >
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          backgroundColor: alpha(primary.main, 0.1),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 3,
          border: `2px solid ${alpha(primary.main, 0.2)}`,
          animation: 'float 3s ease-in-out infinite',
          '@keyframes float': {
            '0%, 100%': {
              transform: 'translateY(0px)',
            },
            '50%': {
              transform: 'translateY(-8px)',
            },
          },
        }}
      >
        <ShoppingCart sx={{ fontSize: 40, color: primary.main }} />
      </Box>

      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          mb: 1,
          color: 'text.primary',
        }}
      >
        Your list is empty
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
        for {formatDateDisplay(currentDateString)}
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Start adding items using voice recognition or manual input to create your smart grocery list
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1,
            borderRadius: '12px',
            backgroundColor: alpha(primary.main, 0.08),
            border: `1px solid ${alpha(primary.main, 0.2)}`,
          }}
        >
          <Mic sx={{ fontSize: 16, color: 'primary.main' }} />
          <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
            Voice Recognition
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1,
            borderRadius: '12px',
            backgroundColor: alpha(success.main, 0.08),
            border: `1px solid ${alpha(success.main, 0.2)}`,
          }}
        >
          <Edit sx={{ fontSize: 16, color: 'success.main' }} />
          <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600 }}>
            Auto-correction
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
});

EmptyState.displayName = 'EmptyState';

// PropTypes validation
EmptyState.propTypes = {
  currentDateString: PropTypes.string.isRequired,
  formatDateDisplay: PropTypes.func.isRequired
};

export default EmptyState;
