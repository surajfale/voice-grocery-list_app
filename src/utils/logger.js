/**
 * Centralized logging utility for the Voice Grocery List App
 * Provides consistent logging with different levels and formatting
 */

class Logger {
  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.isProduction = import.meta.env.PROD;
  }

  /**
   * Log info messages (development only)
   */
  info(message, data = null) {
    if (this.isDevelopment) {
      console.log(`ℹ️ ${message}`, data ? data : '');
    }
  }

  /**
   * Log success messages (development only)
   */
  success(message, data = null) {
    if (this.isDevelopment) {
      console.log(`✅ ${message}`, data ? data : '');
    }
  }

  /**
   * Log warning messages (always logged)
   */
  warn(message, data = null) {
    console.warn(`⚠️ ${message}`, data ? data : '');
  }

  /**
   * Log error messages (always logged)
   */
  error(message, error = null) {
    console.error(`❌ ${message}`, error ? error : '');
  }

  /**
   * Log debug messages (development only)
   */
  debug(message, data = null) {
    if (this.isDevelopment) {
      console.log(`🐛 ${message}`, data ? data : '');
    }
  }

  /**
   * Log API requests (development only)
   */
  apiRequest(method, endpoint, data = null) {
    if (this.isDevelopment) {
      console.log(`🌐 ${method} ${endpoint}`, data ? data : '');
    }
  }

  /**
   * Log API responses (development only)
   */
  apiResponse(endpoint, success, data = null) {
    if (this.isDevelopment) {
      const icon = success ? '✅' : '❌';
      console.log(`${icon} ${endpoint}`, data ? data : '');
    }
  }

  /**
   * Log voice recognition events (development only)
   */
  voice(event, data = null) {
    if (this.isDevelopment) {
      console.log(`🎤 ${event}`, data ? data : '');
    }
  }

  /**
   * Log grocery list operations (development only)
   */
  groceryList(operation, data = null) {
    if (this.isDevelopment) {
      console.log(`📋 ${operation}`, data ? data : '');
    }
  }

  /**
   * Log user authentication events (development only)
   */
  auth(event, data = null) {
    if (this.isDevelopment) {
      console.log(`🔐 ${event}`, data ? data : '');
    }
  }
}

// Create singleton instance
const logger = new Logger();

export default logger;
