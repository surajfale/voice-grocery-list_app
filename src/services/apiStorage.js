// API-based Storage Service - MongoDB Backend
class ApiStorageService {
  constructor() {
    this.apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
    this.isOnline = navigator.onLine;
    
    // Cache for offline support
    this.cache = {
      users: null,
      groceryLists: new Map(),
      lastUpdate: 0
    };
    
    // Cache duration (5 minutes)
    this.cacheExpiry = 5 * 60 * 1000;
    
    // Listen for online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('🌐 Back online - API available');
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📴 Gone offline - using cached data');
    });
    
    console.log('🚀 API storage service initialized');
    console.log('🔗 API Base URL:', this.apiBaseUrl);
  }

  // Utility Methods
  async makeRequest(endpoint, options = {}) {
    const url = `${this.apiBaseUrl}${endpoint}`;
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options
    };

    try {
      const response = await fetch(url, defaultOptions);
      const data = await response.json();

      if (!response.ok) {
        // For 404 errors, return the error data instead of throwing
        if (response.status === 404) {
          return { success: false, error: data.error || `HTTP ${response.status}` };
        }
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      // Only log and throw if it's a network error or other unexpected error
      if (error.name === 'TypeError' || !error.message.includes('HTTP')) {
        console.error(`API request failed for ${endpoint}:`, error);
        throw error;
      }
      throw error;
    }
  }

  async initialize() {
    console.log('🚀 Initializing API storage...');
    console.log('🌐 Online:', this.isOnline);
    
    if (!this.isOnline) {
      console.warn('⚠️ Starting offline - limited functionality');
      return { success: true, offline: true };
    }

    try {
      // Test API connectivity
      await this.makeRequest('/health');
      console.log('✅ API storage ready');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to initialize API storage:', error);
      return { success: false, error: error.message };
    }
  }

  // Cache Management
  isCacheValid(key) {
    const now = Date.now();
    return this.cache[key] !== null && (now - this.cache.lastUpdate) < this.cacheExpiry;
  }

  updateCache(key, data) {
    this.cache[key] = data;
    this.cache.lastUpdate = Date.now();
  }

  async clearCache() {
    this.cache.users = null;
    this.cache.groceryLists.clear();
    this.cache.lastUpdate = 0;
  }

  // User Management
  async createUser(userData) {
    try {
      console.log('👤 Creating user account...');
      
      const result = await this.makeRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
      
      if (result.success) {
        console.log('✅ User account created successfully');
        return { success: true, user: result.user };
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      console.error('❌ Error creating user:', error);
      return { success: false, error: error.message };
    }
  }

  async loginUser(email, password) {
    try {
      console.log('🔑 Attempting login for:', email);
      
      const result = await this.makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      
      if (result.success) {
        console.log('✅ Login successful');
        this.updateCache('currentUser', result.user);
        return { success: true, user: result.user };
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      console.error('❌ Error during login:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserProfile(userId) {
    try {
      const result = await this.makeRequest(`/auth/profile/${userId}`);
      
      if (result.success) {
        return { success: true, user: result.user };
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
      return { success: false, error: error.message };
    }
  }

  // Grocery List Management
  async getUserGroceryLists(userId) {
    try {
      console.log('📋 Loading grocery lists for user:', userId);
      
      const result = await this.makeRequest(`/grocery-lists/user/${userId}`);
      
      if (result.success) {
        console.log('✅ Loaded grocery lists:', result.lists.length);
        return { success: true, lists: result.lists };
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      console.error('❌ Error loading grocery lists:', error);
      return { success: false, error: error.message };
    }
  }

  async getGroceryListByDate(userId, date) {
    try {
      const result = await this.makeRequest(`/grocery-lists/user/${userId}/date/${date}`);
      
      if (result.success) {
        return { success: true, list: result.list };
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      console.error('❌ Error loading grocery list:', error);
      return { success: false, error: error.message };
    }
  }

  async addGroceryItem(userId, date, itemData) {
    try {
      const result = await this.makeRequest(`/grocery-lists/user/${userId}/date/${date}/items`, {
        method: 'POST',
        body: JSON.stringify(itemData)
      });
      
      if (result.success) {
        return { success: true, list: result.list };
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      console.error('❌ Error adding grocery item:', error);
      return { success: false, error: error.message };
    }
  }

  async updateGroceryItem(userId, date, itemId, updates) {
    try {
      const result = await this.makeRequest(`/grocery-lists/user/${userId}/date/${date}/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      
      if (result.success) {
        return { success: true, list: result.list };
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      console.error('❌ Error updating grocery item:', error);
      return { success: false, error: error.message };
    }
  }

  async removeGroceryItem(userId, date, itemId) {
    try {
      const result = await this.makeRequest(`/grocery-lists/user/${userId}/date/${date}/items/${itemId}`, {
        method: 'DELETE'
      });
      
      if (result.success) {
        return { success: true, list: result.list };
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      console.error('❌ Error removing grocery item:', error);
      // Handle specific error cases more gracefully
      if (error.message.includes('Item not found')) {
        return { success: false, error: 'This item has already been removed or does not exist.' };
      }
      return { success: false, error: error.message };
    }
  }

  async clearGroceryList(userId, date) {
    try {
      const result = await this.makeRequest(`/grocery-lists/user/${userId}/date/${date}/items`, {
        method: 'DELETE'
      });
      
      if (result.success) {
        return { success: true, list: result.list };
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      console.error('❌ Error clearing grocery list:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteGroceryList(userId, date) {
    try {
      const result = await this.makeRequest(`/grocery-lists/user/${userId}/date/${date}`, {
        method: 'DELETE'
      });
      
      if (result.success) {
        return { success: true };
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      console.error('❌ Error deleting grocery list:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const apiStorage = new ApiStorageService();

// Make available globally for debugging
if (typeof window !== 'undefined') {
  window.apiStorage = apiStorage;
}

export default apiStorage;