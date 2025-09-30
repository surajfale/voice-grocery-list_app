import { useState, useCallback } from 'react';
import logger from '../utils/logger.js';

/**
 * Custom hook for centralized error handling
 * Provides consistent error state management and logging
 * 
 * @param {Object} options - Configuration options
 * @param {Function} options.onError - Callback when error occurs
 * @param {Function} options.onRetry - Callback when retry is requested
 * @param {number} options.autoClearDelay - Auto-clear error after delay (ms)
 * @returns {Object} Error handling utilities
 */
export const useErrorHandler = (options = {}) => {
  const {
    onError,
    onRetry: _onRetry,
    autoClearDelay = 5000
  } = options;

  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);

  /**
   * Set an error with automatic logging and optional auto-clear
   * 
   * @param {Error|string} error - Error object or error message
   * @param {Object} context - Additional context for logging
   */
  const setErrorWithLogging = useCallback((error, context = {}) => {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorObject = error instanceof Error ? error : new Error(errorMessage);

    // Log the error with context
    logger.error('Error occurred:', {
      message: errorMessage,
      stack: errorObject.stack,
      context,
      timestamp: new Date().toISOString()
    });

    // Set error state
    setError(errorMessage);

    // Call custom error handler if provided
    if (onError) {
      onError(errorObject, context);
    }

    // Auto-clear error after delay
    if (autoClearDelay > 0) {
      setTimeout(() => {
        setError(null);
      }, autoClearDelay);
    }
  }, [onError, autoClearDelay]);

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setError(null);
    setIsRetrying(false);
  }, []);

  /**
   * Retry the last failed operation
   * 
   * @param {Function} retryFunction - Function to retry
   */
  const retry = useCallback(async (retryFunction) => {
    if (!retryFunction) {
      logger.warn('No retry function provided');
      return;
    }

    setIsRetrying(true);
    clearError();

    try {
      logger.info('Retrying operation...');
      await retryFunction();
      logger.success('Retry operation completed successfully');
    } catch (error) {
      logger.error('Retry operation failed:', error);
      setErrorWithLogging(error, { isRetry: true });
    } finally {
      setIsRetrying(false);
    }
  }, [clearError, setErrorWithLogging]);

  /**
   * Handle async operations with automatic error handling
   * 
   * @param {Function} operation - Async operation to execute
   * @param {Object} context - Context for error logging
   * @returns {Promise} Promise that resolves to operation result
   */
  const handleAsyncOperation = useCallback(async (operation, context = {}) => {
    try {
      clearError();
      const result = await operation();
      return result;
    } catch (error) {
      setErrorWithLogging(error, context);
      throw error; // Re-throw to allow caller to handle if needed
    }
  }, [clearError, setErrorWithLogging]);

  /**
   * Handle promise rejection with error logging
   * 
   * @param {Promise} promise - Promise to handle
   * @param {Object} context - Context for error logging
   * @returns {Promise} Promise that resolves to result or null on error
   */
  const handlePromise = useCallback(async (promise, context = {}) => {
    try {
      const result = await promise;
      return result;
    } catch (error) {
      setErrorWithLogging(error, context);
      return null;
    }
  }, [setErrorWithLogging]);

  return {
    error,
    isRetrying,
    setError: setErrorWithLogging,
    clearError,
    retry,
    handleAsyncOperation,
    handlePromise
  };
};

export default useErrorHandler;
