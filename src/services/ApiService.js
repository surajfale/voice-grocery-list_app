import { BaseService } from './BaseService.js';
import logger from '../utils/logger.js';

/**
 * API Service Class
 * Handles all HTTP API communications with the backend
 * Extends BaseService for common functionality
 */
export class ApiService extends BaseService {
  constructor() {
    super('API');
    
    this.apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
    
    // Request timeout (30 seconds)
    this.timeout = 30000;
    
    logger.info(`API Service initialized with base URL: ${this.apiBaseUrl}`);
  }

  /**
   * Make HTTP request with enhanced error handling and retry logic
   * 
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise} Response data
   */
  async makeRequest(endpoint, options = {}) {
    const url = `${this.apiBaseUrl}${endpoint}`;
    
    const requestOptions = {
      method: 'GET',
      headers: { ...this.defaultHeaders },
      ...options
    };

    // Add timeout if AbortController is available (browser environments)
    let controller;
    let timeoutId;
    if (typeof globalThis !== 'undefined' && typeof globalThis.AbortController !== 'undefined') {
      controller = new globalThis.AbortController();
      timeoutId = setTimeout(() => controller.abort(), this.timeout);
      requestOptions.signal = controller.signal;
    }

    try {
      logger.debug(`API Request: ${requestOptions.method} ${url}`);
      
    const response = await fetch(url, requestOptions);
    if (timeoutId) { clearTimeout(timeoutId); }
      
      const data = await response.json();
      
      // Handle different response statuses
      if (!response.ok) {
        return this.handleHttpError(response, data, endpoint);
      }
      
      logger.debug(`API Response: ${response.status} ${url}`);
      return data;
      
    } catch (error) {
      if (timeoutId) { clearTimeout(timeoutId); }
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout for ${endpoint}`);
      }
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error(`Network error: Unable to connect to server`);
      }
      
      throw error;
    }
  }

  /**
   * Handle HTTP error responses
   * 
   * @param {Response} response - HTTP response
   * @param {Object} data - Response data
   * @param {string} endpoint - Requested endpoint
   * @returns {Object} Error response
   */
  handleHttpError(response, data, endpoint) {
    const status = response.status;
    const errorMessage = data.error || `HTTP ${status}`;
    
    logger.warn(`API Error: ${status} ${endpoint} - ${errorMessage}`);
    
    // Return error data for 404s (not found)
    if (status === 404) {
      return { success: false, error: errorMessage };
    }
    
    // Throw error for other status codes
    throw new Error(errorMessage);
  }

  /**
   * Make authenticated request with user token
   * 
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @param {string} token - User authentication token
   * @returns {Promise} Response data
   */
  async makeAuthenticatedRequest(endpoint, options = {}, token) {
    if (!token) {
      throw new Error('Authentication token required');
    }
    
    const authOptions = {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    };
    
    return this.makeRequest(endpoint, authOptions);
  }

  /**
   * Health check endpoint
   * 
   * @returns {Promise} Health status
   */
  async healthCheck() {
    try {
      const result = await this.makeRequest('/health');
      return this.createSuccessResponse(result, 'API health check passed');
    } catch (error) {
      return this.handleError(error, 'health check');
    }
  }

  /**
   * Test API connectivity
   * 
   * @returns {Promise} Connectivity status
   */
  async testConnectivity() {
    if (!this.isServiceAvailable()) {
      return {
        success: false,
        error: 'Service offline',
        offline: true
      };
    }

    try {
      await this.makeRequest('/health');
      return this.createSuccessResponse(null, 'API connectivity confirmed');
    } catch (error) {
      return this.handleError(error, 'connectivity test');
    }
  }
}

export default ApiService;
