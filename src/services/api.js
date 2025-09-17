import CloudStorage from './cloudStorage.js';

class ApiService {
  constructor() {
    this.storage = CloudStorage;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      await this.storage.initialize();
      this.isInitialized = true;
      console.log('✅ API Service initialized with browser storage');
    } catch (error) {
      console.error('❌ Failed to initialize API Service:', error);
      throw error;
    }
  }

  // Authentication Methods
  async login(username, password) {
    await this.initialize();
    
    try {
      const result = await this.storage.loginUser(username, password);
      
      if (result.success) {
        return {
          success: true,
          user: result.user,
          message: 'Login successful'
        };
      }
      
      return {
        success: false,
        error: result.error || 'Login failed'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Login failed'
      };
    }
  }

  async register(username, password, email = null) {
    await this.initialize();
    
    try {
      const result = await this.storage.createUser({
        username: username.toLowerCase(),
        password,
        email
      });
      
      if (result.success) {
        return {
          success: true,
          user: result.user,
          message: 'Registration successful'
        };
      }
      
      return {
        success: false,
        error: result.error || 'Registration failed'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Registration failed'
      };
    }
  }

  async getUserProfile(userId) {
    await this.initialize();
    
    try {
      return await this.storage.getUserProfile(userId);
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to fetch user profile'
      };
    }
  }

  // Grocery List Methods
  async getUserGroceryLists(userId, limit = 50) {
    await this.initialize();
    
    try {
      const result = await this.storage.getUserGroceryLists(userId);
      
      if (result.success) {
        return {
          success: true,
          lists: result.lists.slice(0, limit),
          count: result.lists.length
        };
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to fetch grocery lists'
      };
    }
  }

  async getGroceryListByDate(userId, date) {
    await this.initialize();
    
    try {
      return await this.storage.getGroceryListByDate(userId, date);
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to fetch grocery list'
      };
    }
  }

  async updateGroceryList(userId, date, updates) {
    await this.initialize();
    
    try {
      return await this.storage.updateGroceryList(userId, date, updates);
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to update grocery list'
      };
    }
  }

  async addGroceryItem(userId, date, itemData) {
    await this.initialize();
    
    try {
      const result = await this.storage.addGroceryItem(userId, date, itemData);
      
      if (result.success) {
        const addedItem = result.list.items[result.list.items.length - 1];
        return {
          success: true,
          list: result.list,
          item: addedItem
        };
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to add grocery item'
      };
    }
  }

  async updateGroceryItem(userId, date, itemId, updates) {
    await this.initialize();
    
    try {
      const result = await this.storage.updateGroceryItem(userId, date, itemId, updates);
      
      if (result.success) {
        const updatedItem = result.list.items.find(item => item.id === itemId);
        return {
          success: true,
          list: result.list,
          item: updatedItem
        };
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to update grocery item'
      };
    }
  }

  async removeGroceryItem(userId, date, itemId) {
    await this.initialize();
    
    try {
      return await this.storage.removeGroceryItem(userId, date, itemId);
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to remove grocery item'
      };
    }
  }

  async clearGroceryList(userId, date) {
    await this.initialize();
    
    try {
      return await this.storage.clearGroceryList(userId, date);
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to clear grocery list'
      };
    }
  }

  async deleteGroceryList(userId, date) {
    await this.initialize();
    
    try {
      const result = await this.storage.deleteGroceryList(userId, date);
      
      if (result.success) {
        return {
          success: true,
          message: 'Grocery list deleted successfully'
        };
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to delete grocery list'
      };
    }
  }

  // Utility Methods
  async getConnectionStatus() {
    return this.storage.getConnectionStatus();
  }

  async disconnect() {
    await this.storage.disconnect();
    this.isInitialized = false;
  }
}

export default new ApiService();