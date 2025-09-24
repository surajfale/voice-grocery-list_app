import logger from '../utils/logger.js';

/**
 * Base Service Class
 * Provides common functionality for all service classes including:
 * - Error handling
 * - Request/response logging
 * - Retry logic
 * - Offline/online state management
 */
export class BaseService {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.isOnline = navigator.onLine;
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
    
    // Set up online/offline listeners
    this.setupNetworkListeners();
    
    logger.info(`${this.serviceName} service initialized`);
  }

  /**
   * Set up network status listeners
   */
  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      logger.info(`${this.serviceName}: Back online`);
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      logger.warn(`${this.serviceName}: Gone offline`);
    });
  }

  /**
   * Execute operation with retry logic
   * 
   * @param {Function} operation - Operation to execute
   * @param {Object} options - Retry options
   * @returns {Promise} Result of operation
   */
  async executeWithRetry(operation, options = {}) {
    const { 
      maxAttempts = this.retryAttempts, 
      delay = this.retryDelay,
      context = {} 
    } = options;

    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        logger.debug(`${this.serviceName}: Attempt ${attempt}/${maxAttempts}`, context);
        const result = await operation();
        
        if (attempt > 1) {
          logger.success(`${this.serviceName}: Operation succeeded on attempt ${attempt}`);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        logger.warn(`${this.serviceName}: Attempt ${attempt} failed:`, error.message);
        
        // Don't retry on certain error types
        if (this.shouldNotRetry(error)) {
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        if (attempt < maxAttempts) {
          const waitTime = delay * Math.pow(2, attempt - 1);
          logger.debug(`${this.serviceName}: Waiting ${waitTime}ms before retry`);
          await this.delay(waitTime);
        }
      }
    }
    
    logger.error(`${this.serviceName}: All retry attempts failed`);
    throw lastError;
  }

  /**
   * Determine if an error should not be retried
   * 
   * @param {Error} error - Error to check
   * @returns {boolean} True if should not retry
   */
  shouldNotRetry(error) {
    // Don't retry on authentication errors
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      return true;
    }
    
    // Don't retry on validation errors
    if (error.message.includes('400') || error.message.includes('Bad Request')) {
      return true;
    }
    
    // Don't retry on permission errors
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      return true;
    }
    
    return false;
  }

  /**
   * Delay execution for specified milliseconds
   * 
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handle service errors with consistent logging
   * 
   * @param {Error} error - Error to handle
   * @param {string} operation - Operation that failed
   * @param {Object} context - Additional context
   * @returns {Object} Standardized error response
   */
  handleError(error, operation, context = {}) {
    const errorMessage = error.message || 'An unexpected error occurred';
    
    logger.error(`${this.serviceName}: ${operation} failed`, {
      error: errorMessage,
      context,
      timestamp: new Date().toISOString()
    });

    return {
      success: false,
      error: errorMessage,
      context
    };
  }

  /**
   * Create success response
   * 
   * @param {*} data - Response data
   * @param {string} message - Success message
   * @returns {Object} Standardized success response
   */
  createSuccessResponse(data, message = 'Operation completed successfully') {
    logger.success(`${this.serviceName}: ${message}`);
    
    return {
      success: true,
      data,
      message
    };
  }

  /**
   * Check if service is available (online)
   * 
   * @returns {boolean} True if service is available
   */
  isServiceAvailable() {
    return this.isOnline;
  }

  /**
   * Get service status information
   * 
   * @returns {Object} Service status
   */
  getServiceStatus() {
    return {
      serviceName: this.serviceName,
      isOnline: this.isOnline,
      timestamp: new Date().toISOString()
    };
  }
}

export default BaseService;
