import { BaseService } from './BaseService.js';
import ApiService from './ApiService.js';
import AuthService from './AuthService.js';
import GroceryListService from './GroceryListService.js';
import GroceryIntelligenceService from './groceryIntelligence.js';
import logger from '../utils/logger.js';

/**
 * Service Manager
 * Centralized service management and coordination
 * Provides a single entry point for all service operations
 */
export class ServiceManager extends BaseService {
  constructor() {
    super('ServiceManager');
    
    // Initialize services
    this.apiService = new ApiService();
    this.authService = new AuthService();
    this.groceryListService = new GroceryListService();
    this.groceryIntelligenceService = GroceryIntelligenceService;
    
    // Service registry for easy access
    this.services = {
      api: this.apiService,
      auth: this.authService,
      groceryList: this.groceryListService,
      intelligence: this.groceryIntelligenceService
    };
    
    // Service health status
    this.serviceHealth = new Map();
    
    logger.info('Service Manager initialized with all services');
  }

  /**
   * Initialize all services
   * 
   * @returns {Promise} Initialization result
   */
  async initialize() {
    try {
      logger.info('Initializing all services...');
      
      // Test API connectivity
      const apiStatus = await this.apiService.testConnectivity();
      this.serviceHealth.set('api', apiStatus.success);
      
      if (!apiStatus.success) {
        logger.warn('API service unavailable:', apiStatus.error);
      }
      
      // Initialize other services
      this.serviceHealth.set('auth', true);
      this.serviceHealth.set('groceryList', true);
      this.serviceHealth.set('intelligence', true);
      
      const allHealthy = Array.from(this.serviceHealth.values()).every(status => status);
      
      if (allHealthy) {
        logger.success('All services initialized successfully');
        return this.createSuccessResponse(this.getServiceStatus(), 'All services ready');
      } else {
        logger.warn('Some services may have limited functionality');
        return this.createSuccessResponse(this.getServiceStatus(), 'Services initialized with warnings');
      }
      
    } catch (error) {
      return this.handleError(error, 'service initialization');
    }
  }

  /**
   * Get service by name
   * 
   * @param {string} serviceName - Name of the service
   * @returns {Object} Service instance
   */
  getService(serviceName) {
    const service = this.services[serviceName];
    if (!service) {
      throw new Error(`Service '${serviceName}' not found`);
    }
    return service;
  }

  /**
   * Get all service statuses
   * 
   * @returns {Object} Service status information
   */
  getServiceStatus() {
    const status = {};
    
    for (const [name, service] of Object.entries(this.services)) {
      status[name] = {
        healthy: this.serviceHealth.get(name) || false,
        online: service.isServiceAvailable ? service.isServiceAvailable() : true,
        ...service.getServiceStatus?.()
      };
    }
    
    return status;
  }

  /**
   * Health check for all services
   * 
   * @returns {Promise} Health check results
   */
  async healthCheck() {
    try {
      const results = {};
      
      // Check API service
      try {
        const apiHealth = await this.apiService.healthCheck();
        results.api = apiHealth.success;
      } catch (error) {
        results.api = false;
        logger.error('API health check failed:', error);
      }
      
      // Check other services
      results.auth = this.authService.isServiceAvailable();
      results.groceryList = this.groceryListService.isServiceAvailable();
      results.intelligence = true; // Local service, always available
      
      const allHealthy = Object.values(results).every(status => status);
      
      return this.createSuccessResponse(results, 
        allHealthy ? 'All services healthy' : 'Some services have issues');
      
    } catch (error) {
      return this.handleError(error, 'health check');
    }
  }

  /**
   * Clear all service caches
   */
  clearAllCaches() {
    try {
      // Clear grocery list cache
      if (this.groceryListService.clearCache) {
        this.groceryListService.clearCache();
      }
      
      logger.info('All service caches cleared');
      return this.createSuccessResponse(null, 'All caches cleared');
    } catch (error) {
      return this.handleError(error, 'cache clearing');
    }
  }

  /**
   * Get service statistics
   * 
   * @returns {Object} Service statistics
   */
  getServiceStats() {
    const stats = {
      totalServices: Object.keys(this.services).length,
      healthyServices: Array.from(this.serviceHealth.values()).filter(Boolean).length,
      onlineServices: Object.values(this.services).filter(service => 
        service.isServiceAvailable ? service.isServiceAvailable() : true
      ).length,
      services: {}
    };
    
    // Get individual service stats
    for (const [name, service] of Object.entries(this.services)) {
      stats.services[name] = {
        healthy: this.serviceHealth.get(name) || false,
        online: service.isServiceAvailable ? service.isServiceAvailable() : true,
        ...service.getCacheStats?.()
      };
    }
    
    return stats;
  }

  /**
   * Restart a specific service
   * 
   * @param {string} serviceName - Name of service to restart
   * @returns {Promise} Restart result
   */
  async restartService(serviceName) {
    try {
      logger.info(`Restarting service: ${serviceName}`);
      
      // Recreate the service
      switch (serviceName) {
        case 'api':
          this.apiService = new ApiService();
          this.services.api = this.apiService;
          break;
        case 'auth':
          this.authService = new AuthService();
          this.services.auth = this.authService;
          break;
        case 'groceryList':
          this.groceryListService = new GroceryListService();
          this.services.groceryList = this.groceryListService;
          break;
        default:
          throw new Error(`Cannot restart service: ${serviceName}`);
      }
      
      // Update health status
      this.serviceHealth.set(serviceName, true);
      
      logger.success(`Service ${serviceName} restarted successfully`);
      return this.createSuccessResponse(null, `Service ${serviceName} restarted`);
      
    } catch (error) {
      return this.handleError(error, `restart service ${serviceName}`);
    }
  }
}

// Create singleton instance
const serviceManager = new ServiceManager();

// Make available globally for debugging
if (typeof window !== 'undefined') {
  window.serviceManager = serviceManager;
}

export default serviceManager;
