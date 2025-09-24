import serviceManager from './ServiceManager.js';
import logger from '../utils/logger.js';

/**
 * Legacy API Storage Service
 * Provides backward compatibility with the existing apiStorage interface
 * while using the new service architecture under the hood
 */
class LegacyApiStorageService {
  constructor() {
    this.apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
    this.isOnline = navigator.onLine;
    
    // Cache for offline support (maintained for compatibility)
    this.cache = {
      users: null,
      groceryLists: new Map(),
      lastUpdate: 0
    };
    
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    
    // Set up network listeners
    this.setupNetworkListeners();
    
    logger.info('Legacy API storage service initialized');
  }

  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      logger.info('Back online - API available');
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      logger.warn('Gone offline - using cached data');
    });
  }

  async initialize() {
    try {
      logger.info('Initializing legacy API storage...');
      
      // Initialize the service manager
      const result = await serviceManager.initialize();
      
      if (result.success) {
        logger.success('Legacy API storage ready');
        return { success: true };
      } else {
        logger.warn('Legacy API storage initialized with warnings');
        return { success: true, warning: result.message };
      }
    } catch (error) {
      logger.error('Failed to initialize legacy API storage:', error);
      return { success: false, error: error.message };
    }
  }

  // Cache Management (maintained for compatibility)
  isCacheValid(key) {
    const now = Date.now();
    return this.cache[key] !== null && (now - this.cache[key].timestamp || 0) < this.cacheExpiry;
  }

  updateCache(key, data) {
    this.cache[key] = { data, timestamp: Date.now() };
  }

  async clearCache() {
    this.cache.users = null;
    this.cache.groceryLists.clear();
    this.cache.lastUpdate = 0;
  }

  // User Management - Delegated to AuthService
  async createUser(userData) {
    try {
      const result = await serviceManager.getService('auth').register(userData);
      
      if (result.success) {
        return { success: true, user: result.data };
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      logger.error('Error creating user:', error);
      return { success: false, error: error.message };
    }
  }

  async loginUser(email, password) {
    try {
      const result = await serviceManager.getService('auth').login(email, password);
      
      if (result.success) {
        this.updateCache('currentUser', result.data);
        return { success: true, user: result.data };
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      logger.error('Error during login:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserProfile(userId) {
    try {
      const result = await serviceManager.getService('auth').getUserProfile(userId);
      
      if (result.success) {
        return { success: true, user: result.data };
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      logger.error('Error fetching user profile:', error);
      return { success: false, error: error.message };
    }
  }

  // Grocery List Management - Delegated to GroceryListService
  async getUserGroceryLists(userId) {
    try {
      const result = await serviceManager.getService('groceryList').getUserGroceryLists(userId);
      
      if (result.success) {
        return { success: true, lists: result.data };
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      logger.error('Error loading grocery lists:', error);
      return { success: false, error: error.message };
    }
  }

  async getGroceryListByDate(userId, date) {
    try {
      const result = await serviceManager.getService('groceryList').getGroceryListByDate(userId, date);
      
      if (result.success) {
        return { success: true, list: result.data };
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      logger.error('Error loading grocery list:', error);
      return { success: false, error: error.message };
    }
  }

  async addGroceryItem(userId, date, itemData) {
    try {
      const result = await serviceManager.getService('groceryList').addGroceryItem(userId, date, itemData);
      
      if (result.success) {
        return { success: true, list: result.data };
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      logger.error('Error adding grocery item:', error);
      return { success: false, error: error.message };
    }
  }

  async updateGroceryItem(userId, date, itemId, updates) {
    try {
      const result = await serviceManager.getService('groceryList').updateGroceryItem(userId, date, itemId, updates);
      
      if (result.success) {
        return { success: true, list: result.data };
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      logger.error('Error updating grocery item:', error);
      return { success: false, error: error.message };
    }
  }

  async removeGroceryItem(userId, date, itemId) {
    try {
      const result = await serviceManager.getService('groceryList').removeGroceryItem(userId, date, itemId);
      
      if (result.success) {
        return { success: true, list: result.data };
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      logger.error('Error removing grocery item:', error);
      return { success: false, error: error.message };
    }
  }

  async clearGroceryList(userId, date) {
    try {
      const result = await serviceManager.getService('groceryList').clearGroceryList(userId, date);
      
      if (result.success) {
        return { success: true, list: result.data };
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      logger.error('Error clearing grocery list:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteGroceryList(userId, date) {
    try {
      const result = await serviceManager.getService('groceryList').deleteGroceryList(userId, date);
      
      if (result.success) {
        return { success: true };
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      logger.error('Error deleting grocery list:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const legacyApiStorage = new LegacyApiStorageService();

// Make available globally for debugging
if (typeof window !== 'undefined') {
  window.legacyApiStorage = legacyApiStorage;
}

export default legacyApiStorage;
