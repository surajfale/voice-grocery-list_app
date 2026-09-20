import React from 'react';
import PropTypes from 'prop-types';
import { RotateCw, WifiOff, CloudOff } from 'lucide-react';
import { Button } from './ui/button';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
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
        icon: <WifiOff className="size-4" />,
        title: "You're offline",
        message: 'Please check your internet connection and try again.',
        action: 'Retry when online'
      };
    }

    if (error.includes('Network') || error.includes('fetch')) {
      return {
        icon: <CloudOff className="size-4" />,
        title: 'Connection Error',
        message: 'Unable to connect to the server. Please check your connection.',
        action: 'Retry Connection'
      };
    }

    if (error.includes('401') || error.includes('Unauthorized')) {
      return {
        icon: <CloudOff className="size-4" />,
        title: 'Authentication Error',
        message: 'Your session has expired. Please log in again.',
        action: 'Go to Login'
      };
    }

    if (error.includes('500') || error.includes('Internal Server Error')) {
      return {
        icon: <CloudOff className="size-4" />,
        title: 'Server Error',
        message: "Something went wrong on our end. We're working to fix it.",
        action: 'Try Again'
      };
    }

    // Generic API error
    return {
      icon: <CloudOff className="size-4" />,
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
    <div className="w-full">
      <Alert variant="destructive" className="mb-4 pr-4">
        {errorDetails.icon}
        <AlertTitle>{errorDetails.title}</AlertTitle>
        <AlertDescription>{errorDetails.message}</AlertDescription>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRetry}
          disabled={!isOnline && showOfflineMessage}
          className="col-start-2 mt-2 justify-self-start text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <RotateCw />
          {errorDetails.action}
        </Button>
      </Alert>

      {/* Show children with reduced opacity to indicate error state */}
      <div className="opacity-70">
        {children}
      </div>
    </div>
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
