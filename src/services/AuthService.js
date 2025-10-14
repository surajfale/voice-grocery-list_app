import { BaseService } from './BaseService.js';
import ApiService from './ApiService.js';
import logger from '../utils/logger.js';

/**
 * Authentication Service
 * Handles user authentication, registration, and profile management
 * Extends BaseService for common functionality
 */
export class AuthService extends BaseService {
  constructor() {
    super('Auth');
    
    this.apiService = new ApiService();
    this.tokenKey = 'groceryListToken';
    this.userKey = 'groceryListUser';
  }

  /**
   * Register a new user
   * 
   * @param {Object} userData - User registration data
   * @returns {Promise} Registration result
   */
  async register(userData) {
    return this.executeWithRetry(async () => {
      logger.auth('Registering new user:', userData.email);
      
      const result = await this.apiService.makeRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
      
      if (result.success) {
        logger.auth('User registration successful');
        return this.createSuccessResponse(result.user, 'User registered successfully');
      }
      
      throw new Error(result.error || 'Registration failed');
    }, { context: { email: userData.email } });
  }

  /**
   * Login user with email and password
   * 
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise} Login result
   */
  async login(email, password) {
    return this.executeWithRetry(async () => {
      logger.auth('Attempting login for:', email);
      
      const result = await this.apiService.makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      
      if (result.success) {
        // Store user data and token locally
        this.storeUserData(result.user, result.token);
        logger.auth('Login successful');
        return this.createSuccessResponse(result.user, 'Login successful');
      }
      
      throw new Error(result.error || 'Login failed');
    }, { context: { email } });
  }

  /**
   * Get user profile by ID
   * 
   * @param {string} userId - User ID
   * @returns {Promise} User profile
   */
  async getUserProfile(userId) {
    return this.executeWithRetry(async () => {
      const result = await this.apiService.makeRequest(`/auth/profile/${userId}`);
      
      if (result.success) {
        return this.createSuccessResponse(result.user, 'Profile retrieved successfully');
      }
      
      throw new Error(result.error || 'Failed to retrieve profile');
    }, { context: { userId } });
  }

  /**
   * Logout user
   * Clears stored authentication data
   * 
   * @returns {Promise} Logout result
   */
  async logout() {
    try {
      logger.auth('User logging out');
      
      // Clear stored data
      this.clearStoredData();
      
      return this.createSuccessResponse(null, 'Logout successful');
    } catch (error) {
      return this.handleError(error, 'logout');
    }
  }

  /**
   * Store user data and token in localStorage
   * 
   * @param {Object} user - User data
   * @param {string} token - Authentication token
   */
  storeUserData(user, token) {
    try {
      localStorage.setItem(this.userKey, JSON.stringify(user));
      if (token) {
        localStorage.setItem(this.tokenKey, token);
      }
      logger.auth('User data stored locally');
    } catch (error) {
      logger.error('Failed to store user data:', error);
    }
  }

  /**
   * Get stored user data
   * 
   * @returns {Object|null} Stored user data or null
   */
  getStoredUserData() {
    try {
      const userData = localStorage.getItem(this.userKey);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      logger.error('Failed to retrieve stored user data:', error);
      return null;
    }
  }

  /**
   * Get stored authentication token
   * 
   * @returns {string|null} Stored token or null
   */
  getStoredToken() {
    try {
      return localStorage.getItem(this.tokenKey);
    } catch (error) {
      logger.error('Failed to retrieve stored token:', error);
      return null;
    }
  }

  /**
   * Clear stored authentication data
   */
  clearStoredData() {
    try {
      localStorage.removeItem(this.userKey);
      localStorage.removeItem(this.tokenKey);
      logger.auth('Stored authentication data cleared');
    } catch (error) {
      logger.error('Failed to clear stored data:', error);
    }
  }

  /**
   * Check if user is authenticated
   * 
   * @returns {boolean} True if user is authenticated
   */
  isAuthenticated() {
    const userData = this.getStoredUserData();
    const token = this.getStoredToken();
    return !!(userData && token);
  }

  /**
   * Validate user operation permissions
   * 
   * @param {string} userId - User ID to validate
   * @param {string} operation - Operation being performed
   * @returns {boolean} True if operation is allowed
   */
  validateUserOperation(userId, operation) {
    const currentUser = this.getStoredUserData();
    
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    if (currentUser._id !== userId) {
      logger.warn(`Unauthorized access attempt: ${operation}`, {
        requestedUserId: userId,
        currentUserId: currentUser._id
      });
      throw new Error('Access denied: Cannot access another user\'s data');
    }
    
    return true;
  }

  /**
   * Refresh authentication token
   *
   * @returns {Promise} Token refresh result
   */
  async refreshToken() {
    const token = this.getStoredToken();
    if (!token) {
      throw new Error('No token to refresh');
    }

    return this.executeWithRetry(async () => {
      const result = await this.apiService.makeAuthenticatedRequest('/auth/refresh', {
        method: 'POST'
      }, token);

      if (result.success && result.token) {
        localStorage.setItem(this.tokenKey, result.token);
        return this.createSuccessResponse(result.token, 'Token refreshed successfully');
      }

      throw new Error(result.error || 'Token refresh failed');
    });
  }

  /**
   * Delete user account
   * Permanently deletes all user data and account
   *
   * @param {string} userId - User ID
   * @param {string} password - User password for re-authentication
   * @returns {Promise} Account deletion result
   */
  async deleteAccount(userId, password) {
    return this.executeWithRetry(async () => {
      logger.auth('Attempting account deletion for user:', userId);

      // Validate user operation
      this.validateUserOperation(userId, 'deleteAccount');

      const result = await this.apiService.makeRequest('/auth/account', {
        method: 'DELETE',
        body: JSON.stringify({ userId, password })
      });

      if (result.success) {
        // Clear stored data after successful deletion
        this.clearStoredData();
        logger.auth('Account deletion successful');
        return this.createSuccessResponse(null, 'Account deleted successfully');
      }

      throw new Error(result.error || 'Account deletion failed');
    }, { context: { userId } });
  }
}

export default AuthService;
