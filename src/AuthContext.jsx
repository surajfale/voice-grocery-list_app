import React, { createContext, useState, useContext, useEffect } from 'react';
import PropTypes from 'prop-types';
import apiStorage from './services/apiStorage.js';
import logger from './utils/logger.js';
import useErrorHandler from './hooks/useErrorHandler.js';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Use centralized error handling for auth operations
  const { error: authError, setError: _setAuthError, clearError: clearAuthError } = useErrorHandler({
    autoClearDelay: 10000 // Auto-clear auth errors after 10 seconds
  });

  // Check if user is already logged in on app start
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Initialize API storage
        await apiStorage.initialize();
        
        const savedUser = localStorage.getItem('groceryListUser');
        if (savedUser) {
          try {
            const userData = JSON.parse(savedUser);
            // Verify user still exists in cloud storage
            const result = await apiStorage.getUserProfile(userData._id);
            if (result.success) {
              setUser(result.user);
              setIsAuthenticated(true);
            } else {
              localStorage.removeItem('groceryListUser');
            }
          } catch (error) {
            logger.error('Auth check error:', error);
            localStorage.removeItem('groceryListUser');
          }
        }
      } catch (error) {
        logger.error('API storage initialization error:', error);
      }
      setLoading(false);
    };
    
    checkAuthStatus();
  }, []);

  const login = async (email, password) => {
    try {
      logger.auth('AuthContext login called with:', email);
      
      logger.auth('Calling apiStorage.loginUser...');
      const result = await apiStorage.loginUser(email, password);
      logger.auth('AuthContext received result:', result);
      
      if (result.success) {
        logger.auth('Login successful, setting user data');
        localStorage.setItem('groceryListUser', JSON.stringify(result.user));
        setUser(result.user);
        setIsAuthenticated(true);
        return { success: true };
      }
      
      logger.auth('Login failed, returning error:', result.error);
      return { 
        success: false, 
        error: result.error || 'Login failed'
      };
    } catch (error) {
      logger.error('AuthContext login error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      };
    }
  };

  const register = async (firstName, lastName, email, password) => {
    try {
      setLoading(true);
      
      const result = await apiStorage.createUser({
        firstName,
        lastName,
        email,
        password
      });
      
      if (result.success) {
        localStorage.setItem('groceryListUser', JSON.stringify(result.user));
        setUser(result.user);
        setIsAuthenticated(true);
        return { success: true };
      }
      
      return { 
        success: false, 
        error: result.error || 'Registration failed'
      };
    } catch (error) {
      logger.error('Registration error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      logger.auth('User logging out');
      localStorage.removeItem('groceryListUser');
      setUser(null);
      setIsAuthenticated(false);
      // Clear any cached data on logout for security
      await apiStorage.clearCache();
      logger.auth('Logout completed');
    } catch (error) {
      logger.error('Logout error:', error);
    }
  };

  const deleteAccount = async (password) => {
    try {
      setLoading(true);
      logger.auth('Account deletion requested');

      const result = await apiStorage.deleteAccount(user._id, password);

      if (result.success) {
        // Clear user data and log out
        localStorage.removeItem('groceryListUser');
        setUser(null);
        setIsAuthenticated(false);
        await apiStorage.clearCache();
        logger.auth('Account deletion completed');
        return { success: true };
      }

      return {
        success: false,
        error: result.error || 'Account deletion failed'
      };
    } catch (error) {
      logger.error('Account deletion error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      };
    } finally {
      setLoading(false);
    }
  };

  // Security validation helper
  const validateUserOperation = (targetUserId) => {
    if (!user || !user._id) {
      throw new Error('User not authenticated');
    }
    if (user._id !== targetUserId) {
      throw new Error('Access denied: Cannot access another user\'s data');
    }
    return true;
  };

  const value = {
    isAuthenticated,
    user,
    login,
    register,
    logout,
    deleteAccount,
    loading,
    validateUserOperation,
    authError,
    clearAuthError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// PropTypes validation
AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};