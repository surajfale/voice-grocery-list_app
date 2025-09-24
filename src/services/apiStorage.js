// Legacy API Storage Service - Now uses new service architecture
// This file maintains backward compatibility while using the new service layer
import legacyApiStorage from './LegacyApiStorage.js';

// Re-export the legacy service for backward compatibility
const apiStorage = legacyApiStorage;

// Make available globally for debugging
if (typeof window !== 'undefined') {
  window.apiStorage = apiStorage;
}

export default apiStorage;