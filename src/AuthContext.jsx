import React, { createContext, useState, useContext, useEffect } from 'react';
import apiStorage from './services/apiStorage.js';

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
            console.error('Auth check error:', error);
            localStorage.removeItem('groceryListUser');
          }
        }
      } catch (error) {
        console.error('API storage initialization error:', error);
      }
      setLoading(false);
    };
    
    checkAuthStatus();
  }, []);

  const login = async (email, password) => {
    try {
      console.log('🔐 AuthContext login called with:', email);
      
      console.log('🔐 Calling apiStorage.loginUser...');
      const result = await apiStorage.loginUser(email, password);
      console.log('🔐 AuthContext received result:', result);
      
      if (result.success) {
        console.log('🔐 Login successful, setting user data');
        localStorage.setItem('groceryListUser', JSON.stringify(result.user));
        setUser(result.user);
        setIsAuthenticated(true);
        return { success: true };
      }
      
      console.log('🔐 Login failed, returning error:', result.error);
      return { 
        success: false, 
        error: result.error || 'Login failed'
      };
    } catch (error) {
      console.error('🔐 AuthContext login error:', error);
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
      console.error('Registration error:', error);
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
      localStorage.removeItem('groceryListUser');
      setUser(null);
      setIsAuthenticated(false);
      // Clear any cached data on logout for security
      await apiStorage.clearCache();
    } catch (error) {
      console.error('Logout error:', error);
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
    loading,
    validateUserOperation,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};