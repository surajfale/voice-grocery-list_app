import { BaseService } from './BaseService.js';
import ApiService from './ApiService.js';
import logger from '../utils/logger.js';

/**
 * Grocery List Service
 * Handles all grocery list operations including CRUD operations
 * Extends BaseService for common functionality
 */
export class GroceryListService extends BaseService {
  constructor() {
    super('GroceryList');
    
    this.apiService = new ApiService();
    
    // Cache for offline support
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get all grocery lists for a user
   * 
   * @param {string} userId - User ID
   * @returns {Promise} User's grocery lists
   */
  async getUserGroceryLists(userId) {
    return this.executeWithRetry(async () => {
      logger.groceryList('Loading grocery lists for user:', userId);
      
      const result = await this.apiService.makeRequest(`/grocery-lists/user/${userId}`);
      
      if (result.success) {
        // Cache the result
        this.cache.set(`lists_${userId}`, {
          data: result.lists,
          timestamp: Date.now()
        });
        
        logger.groceryList('Loaded grocery lists:', result.lists.length);
        return this.createSuccessResponse(result.lists, 'Grocery lists loaded successfully');
      }
      
      throw new Error(result.error || 'Failed to load grocery lists');
    }, { context: { userId } });
  }

  /**
   * Get grocery list for specific date
   * 
   * @param {string} userId - User ID
   * @param {string} date - Date string (YYYY-MM-DD)
   * @returns {Promise} Grocery list for date
   */
  async getGroceryListByDate(userId, date) {
    return this.executeWithRetry(async () => {
      const result = await this.apiService.makeRequest(`/grocery-lists/user/${userId}/date/${date}`);
      
      if (result.success) {
        // Cache the result
        this.cache.set(`list_${userId}_${date}`, {
          data: result.list,
          timestamp: Date.now()
        });
        
        return this.createSuccessResponse(result.list, 'Grocery list loaded successfully');
      }
      
      throw new Error(result.error || 'Failed to load grocery list');
    }, { context: { userId, date } });
  }

  /**
   * Add item to grocery list
   * 
   * @param {string} userId - User ID
   * @param {string} date - Date string (YYYY-MM-DD)
   * @param {Object} itemData - Item data
   * @returns {Promise} Updated grocery list
   */
  async addGroceryItem(userId, date, itemData) {
    return this.executeWithRetry(async () => {
      logger.groceryList('Adding grocery item:', itemData.text);
      
      const result = await this.apiService.makeRequest(`/grocery-lists/user/${userId}/date/${date}/items`, {
        method: 'POST',
        body: JSON.stringify(itemData)
      });
      
      if (result.success) {
        // Update cache
        this.cache.set(`list_${userId}_${date}`, {
          data: result.list,
          timestamp: Date.now()
        });
        
        logger.groceryList('Item added successfully');
        return this.createSuccessResponse(result.list, 'Item added successfully');
      }
      
      throw new Error(result.error || 'Failed to add item');
    }, { context: { userId, date, itemText: itemData.text } });
  }

  /**
   * Update grocery item
   * 
   * @param {string} userId - User ID
   * @param {string} date - Date string (YYYY-MM-DD)
   * @param {string} itemId - Item ID
   * @param {Object} updates - Item updates
   * @returns {Promise} Updated grocery list
   */
  async updateGroceryItem(userId, date, itemId, updates) {
    return this.executeWithRetry(async () => {
      logger.groceryList('Updating grocery item:', { itemId, updates });

      const endpoint = `/grocery-lists/user/${userId}/date/${date}/items/${itemId}`;
      logger.groceryList('PUT request to:', endpoint);

      const result = await this.apiService.makeRequest(endpoint, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });

      logger.groceryList('Update item API response:', result);

      if (result.success) {
        // Update cache
        this.cache.set(`list_${userId}_${date}`, {
          data: result.list,
          timestamp: Date.now()
        });

        logger.groceryList('Item updated successfully');
        return this.createSuccessResponse(result.list, 'Item updated successfully');
      }

      logger.error('Update item failed:', result);
      throw new Error(result.error || 'Failed to update item');
    }, { context: { userId, date, itemId } });
  }

  /**
   * Remove grocery item
   * 
   * @param {string} userId - User ID
   * @param {string} date - Date string (YYYY-MM-DD)
   * @param {string} itemId - Item ID
   * @returns {Promise} Updated grocery list
   */
  async removeGroceryItem(userId, date, itemId) {
    return this.executeWithRetry(async () => {
      logger.groceryList('Removing grocery item:', itemId);
      
      const result = await this.apiService.makeRequest(`/grocery-lists/user/${userId}/date/${date}/items/${itemId}`, {
        method: 'DELETE'
      });
      
      if (result.success) {
        // Update cache
        this.cache.set(`list_${userId}_${date}`, {
          data: result.list,
          timestamp: Date.now()
        });
        
        logger.groceryList('Item removed successfully');
        return this.createSuccessResponse(result.list, 'Item removed successfully');
      }
      
      throw new Error(result.error || 'Failed to remove item');
    }, { context: { userId, date, itemId } });
  }

  /**
   * Clear all items from grocery list
   * 
   * @param {string} userId - User ID
   * @param {string} date - Date string (YYYY-MM-DD)
   * @returns {Promise} Updated grocery list
   */
  async clearGroceryList(userId, date) {
    return this.executeWithRetry(async () => {
      logger.groceryList('Clearing grocery list for date:', date);
      
      const result = await this.apiService.makeRequest(`/grocery-lists/user/${userId}/date/${date}/items`, {
        method: 'DELETE'
      });
      
      if (result.success) {
        // Update cache
        this.cache.set(`list_${userId}_${date}`, {
          data: result.list,
          timestamp: Date.now()
        });
        
        logger.groceryList('List cleared successfully');
        return this.createSuccessResponse(result.list, 'List cleared successfully');
      }
      
      throw new Error(result.error || 'Failed to clear list');
    }, { context: { userId, date } });
  }

  /**
   * Delete entire grocery list
   * 
   * @param {string} userId - User ID
   * @param {string} date - Date string (YYYY-MM-DD)
   * @returns {Promise} Deletion result
   */
  async deleteGroceryList(userId, date) {
    return this.executeWithRetry(async () => {
      logger.groceryList('Deleting grocery list for date:', date);
      
      const result = await this.apiService.makeRequest(`/grocery-lists/user/${userId}/date/${date}`, {
        method: 'DELETE'
      });
      
      if (result.success) {
        // Remove from cache
        this.cache.delete(`list_${userId}_${date}`);
        
        logger.groceryList('List deleted successfully');
        return this.createSuccessResponse(null, 'List deleted successfully');
      }
      
      throw new Error(result.error || 'Failed to delete list');
    }, { context: { userId, date } });
  }

  /**
   * Get cached data if available and not expired
   * 
   * @param {string} key - Cache key
   * @returns {Object|null} Cached data or null
   */
  getCachedData(key) {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }
    
    const now = Date.now();
    if (now - cached.timestamp > this.cacheExpiry) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    this.cache.clear();
    logger.debug('Grocery list cache cleared');
  }

  /**
   * Get cache statistics
   * 
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      expiry: this.cacheExpiry
    };
  }
}

export default GroceryListService;
