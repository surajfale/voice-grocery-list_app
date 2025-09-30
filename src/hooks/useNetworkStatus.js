import { useState, useEffect, useCallback } from 'react';
import logger from '../utils/logger.js';

/**
 * Custom hook for monitoring network connectivity
 * Provides real-time network status and connection quality information
 * 
 * @returns {Object} Network status information and utilities
 */
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState('unknown');
  const [effectiveType, setEffectiveType] = useState('unknown');
  const [downlink, setDownlink] = useState(0);
  const [rtt, setRtt] = useState(0);

  /**
   * Update network information from navigator.connection
   */
  const updateConnectionInfo = useCallback(() => {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      setConnectionType(connection.type || 'unknown');
      setEffectiveType(connection.effectiveType || 'unknown');
      setDownlink(connection.downlink || 0);
      setRtt(connection.rtt || 0);
    }
  }, []);

  /**
   * Handle online status change
   */
  const handleOnline = useCallback(() => {
    logger.info('Network: Device came online');
    setIsOnline(true);
    updateConnectionInfo();
  }, [updateConnectionInfo]);

  /**
   * Handle offline status change
   */
  const handleOffline = useCallback(() => {
    logger.warn('Network: Device went offline');
    setIsOnline(false);
  }, []);

  /**
   * Handle connection change
   */
  const handleConnectionChange = useCallback(() => {
    logger.info('Network: Connection changed', {
      type: connectionType,
      effectiveType,
      downlink,
      rtt
    });
    updateConnectionInfo();
  }, [connectionType, effectiveType, downlink, rtt, updateConnectionInfo]);

  // Set up event listeners
  useEffect(() => {
    // Initial connection info
    updateConnectionInfo();

    // Online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Connection change events
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', handleConnectionChange);
    }

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if ('connection' in navigator) {
        navigator.connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [handleOnline, handleOffline, handleConnectionChange, updateConnectionInfo]);

  /**
   * Get connection quality assessment
   * 
   * @returns {string} Quality assessment ('slow', 'medium', 'fast')
   */
  const getConnectionQuality = useCallback(() => {
    if (!isOnline) {return 'offline';}
    
    // Use effective type if available
    if (effectiveType !== 'unknown') {
      switch (effectiveType) {
        case 'slow-2g':
        case '2g':
          return 'slow';
        case '3g':
          return 'medium';
        case '4g':
          return 'fast';
        default:
          return 'unknown';
      }
    }

    // Fallback to downlink speed
    if (downlink > 0) {
      if (downlink < 1) {return 'slow';}
      if (downlink < 3) {return 'medium';}
      return 'fast';
    }

    return 'unknown';
  }, [isOnline, effectiveType, downlink]);

  /**
   * Check if connection is suitable for voice recognition
   * Voice recognition requires stable, fast connection
   * 
   * @returns {boolean} Whether connection is suitable for voice features
   */
  const isSuitableForVoice = useCallback(() => {
    if (!isOnline) {return false;}
    
    const quality = getConnectionQuality();
    return quality === 'fast' || quality === 'medium';
  }, [isOnline, getConnectionQuality]);

  /**
   * Get user-friendly connection status message
   * 
   * @returns {string} Human-readable connection status
   */
  const getStatusMessage = useCallback(() => {
    if (!isOnline) {return 'You\'re offline';}
    
    const quality = getConnectionQuality();
    switch (quality) {
      case 'slow':
        return 'Slow connection - some features may be limited';
      case 'medium':
        return 'Good connection';
      case 'fast':
        return 'Excellent connection';
      default:
        return 'Connected';
    }
  }, [isOnline, getConnectionQuality]);

  return {
    isOnline,
    connectionType,
    effectiveType,
    downlink,
    rtt,
    getConnectionQuality,
    isSuitableForVoice,
    getStatusMessage
  };
};

export default useNetworkStatus;
