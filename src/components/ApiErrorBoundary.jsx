import React from 'react';
import PropTypes from 'prop-types';
import { Box, Alert, Button, Typography } from '@mui/material';
import { Refresh, WifiOff, CloudOff } from '@mui/icons-material';
import logger from '../utils/logger.js';

/**
 * API Error Boundary Component
 * Handles API-related errors with specific recovery options
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {Function} props.onRetry - Function to call when retry is requested
 * @param {string} props.error - Current error message
 * @param {boolean} props.isOnline - Whether the device is online
 */
const ApiErrorBoundary = ({ 
  children, 
  onRetry = null, 
  error = null, 
  isOnline = navigator.onLine,
  showOfflineMessage = true 
}) => {
  // Don't show error boundary if there's no error
  if (!error) {
    return children;
  }

  // Determine error type and appropriate message
  const getErrorDetails = () => {
    if (!isOnline) {
      return {
        icon: <WifiOff />,
        title: 'You\'re offline',
        message: 'Please check your internet connection and try again.',
        action: 'Retry when online'
      };
    }

    if (error.includes('Network') || error.includes('fetch')) {
      return {
        icon: <CloudOff />,
        title: 'Connection Error',
        message: 'Unable to connect to the server. Please check your connection.',
        action: 'Retry Connection'
      };
    }

    if (error.includes('401') || error.includes('Unauthorized')) {
      return {
        icon: <CloudOff />,
        title: 'Authentication Error',
        message: 'Your session has expired. Please log in again.',
        action: 'Go to Login'
      };
    }

    if (error.includes('500') || error.includes('Internal Server Error')) {
      return {
        icon: <CloudOff />,
        title: 'Server Error',
        message: 'Something went wrong on our end. We\'re working to fix it.',
        action: 'Try Again'
      };
    }

    // Generic API error
    return {
      icon: <CloudOff />,
      title: 'API Error',
      message: error,
      action: 'Retry'
    };
  };

  const errorDetails = getErrorDetails();

  const handleRetry = () => {
    logger.info('User requested retry after API error');
    if (onRetry) {
      onRetry();
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Alert 
        severity="error" 
        icon={errorDetails.icon}
        action={
          <Button 
            color="inherit" 
            size="small" 
            startIcon={<Refresh />}
            onClick={handleRetry}
            disabled={!isOnline && showOfflineMessage}
          >
            {errorDetails.action}
          </Button>
        }
        sx={{ mb: 2 }}
      >
        <Typography variant="subtitle2" gutterBottom>
          {errorDetails.title}
        </Typography>
        <Typography variant="body2">
          {errorDetails.message}
        </Typography>
      </Alert>
      
      {/* Show children with reduced opacity to indicate error state */}
      <Box sx={{ opacity: 0.7 }}>
        {children}
      </Box>
    </Box>
  );
};

// PropTypes validation
ApiErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  onRetry: PropTypes.func,
  error: PropTypes.string,
  isOnline: PropTypes.bool,
  showOfflineMessage: PropTypes.bool
};


export default ApiErrorBoundary;
