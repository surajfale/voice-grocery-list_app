import { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import apiStorage from '../services/apiStorage.js';
import groceryIntelligence from '../services/groceryIntelligence.js';
import logger from '../utils/logger.js';
import useErrorHandler from './useErrorHandler.js';

export const useGroceryList = (user) => {
  const [allLists, setAllLists] = useState({});
  const [currentDate, setCurrentDate] = useState(() => {
    return dayjs().startOf('day');
  });
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [pendingCorrections, setPendingCorrections] = useState([]);
  const [skippedDuplicates, setSkippedDuplicates] = useState([]);
  
  // Use centralized error handling
  const { error, setError, clearError, handleAsyncOperation } = useErrorHandler({
    autoClearDelay: 8000 // Auto-clear errors after 8 seconds
  });

  // Get current list items
  const currentDateString = currentDate.format('YYYY-MM-DD');
  const currentItems = allLists[currentDateString] || [];

  // Process items with intelligent system
  const processGroceryItem = useCallback((itemText) => {
    return groceryIntelligence.processGroceryItem(itemText);
  }, []);

  // Check for duplicates
  const isDuplicate = useCallback((itemText) => {
    return currentItems.some(item =>
      item.text.toLowerCase().trim() === itemText.toLowerCase().trim()
    );
  }, [currentItems]);

  // Add items to list
  const addItemsToList = useCallback(async (newItems, skipCorrection = false) => {
    if (!user?._id) return;

    try {
      // Validate user permission
      if (!user || !user._id) {
        throw new Error('User not authenticated');
      }
    } catch (error) {
      setError(error.message);
      return;
    }

    setLoading(true);
    const corrections = [];
    const duplicates = [];

    try {
      for (const item of newItems) {
        // Process item with intelligent system
        const processed = processGroceryItem(item);

        // If correction was made and we haven't skipped correction, ask user
        if (processed.wasCorreted && !skipCorrection) {
          corrections.push({
            original: processed.originalText,
            corrected: processed.correctedText,
            category: processed.category
          });
          continue; // Don't add yet, wait for user confirmation
        }

        // Check for duplicates
        const finalText = skipCorrection ? processed.originalText : processed.correctedText;
        if (isDuplicate(finalText)) {
          duplicates.push(finalText);
          continue;
        }

        const itemData = {
          text: finalText,
          category: processed.category,
          completed: false
        };

        const result = await apiStorage.addGroceryItem(user._id, currentDateString, itemData);
        if (result.success) {
          setAllLists(prev => ({
            ...prev,
            [currentDateString]: result.list.items
          }));
        } else {
          setError(result.error || 'Failed to add item');
        }
      }

      // Show corrections dialog if any
      if (corrections.length > 0) {
        setPendingCorrections(corrections);
      }

      // Show duplicate info if any
      if (duplicates.length > 0) {
        setSkippedDuplicates(duplicates);
        setTimeout(() => setSkippedDuplicates([]), 3000); // Clear after 3 seconds
      }

    } catch (error) {
      logger.error('Error adding items:', error);
      setError('Failed to add items. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentDateString, processGroceryItem, user, isDuplicate]);

  // Handle correction acceptance
  const acceptCorrections = useCallback(async () => {
    setLoading(true);
    try {
      for (const correction of pendingCorrections) {
        // Check for duplicates before adding
        if (isDuplicate(correction.corrected)) {
          logger.groceryList(`Skipping duplicate item: ${correction.corrected}`);
          continue;
        }

        const itemData = {
          text: correction.corrected,
          category: correction.category,
          completed: false
        };

        const result = await apiStorage.addGroceryItem(user._id, currentDateString, itemData);
        if (result.success) {
          setAllLists(prev => ({
            ...prev,
            [currentDateString]: result.list.items
          }));
        } else {
          setError(result.error || 'Failed to add item');
        }
      }
    } catch (error) {
      logger.error('Error adding corrected items:', error);
      setError('Failed to add corrected items');
    } finally {
      setLoading(false);
      setPendingCorrections([]);
    }
  }, [pendingCorrections, user, currentDateString, isDuplicate]);

  // Handle correction rejection (use original)
  const rejectCorrections = useCallback(async () => {
    setLoading(true);
    try {
      for (const correction of pendingCorrections) {
        // Check for duplicates before adding
        if (isDuplicate(correction.original)) {
          logger.groceryList(`Skipping duplicate item: ${correction.original}`);
          continue;
        }

        // Process the original item without correction
        const processed = processGroceryItem(correction.original);
        const itemData = {
          text: correction.original, // Use original text, not corrected
          category: processed.category, // But use intelligent categorization
          completed: false
        };

        const result = await apiStorage.addGroceryItem(user._id, currentDateString, itemData);
        if (result.success) {
          setAllLists(prev => ({
            ...prev,
            [currentDateString]: result.list.items
          }));
        } else {
          setError(result.error || 'Failed to add item');
        }
      }
    } catch (error) {
      logger.error('Error adding original items:', error);
      setError('Failed to add items. Please try again.');
    } finally {
      setLoading(false);
      setPendingCorrections([]);
    }
  }, [pendingCorrections, user, currentDateString, isDuplicate, processGroceryItem]);

  // Toggle item completion
  const toggleItem = useCallback(async (id) => {
    logger.groceryList('Toggle item requested:', id);

    if (!user?._id) {
      logger.error('Toggle item: User not authenticated');
      setError('User not authenticated. Please log in again.');
      return;
    }

    const item = currentItems.find(item => item.id === id);
    if (!item) {
      logger.error('Toggle item: Item not found:', id);
      setError('Item not found. Please refresh the page.');
      return;
    }

    logger.groceryList('Toggling item:', {
      id,
      text: item.text,
      currentCompleted: item.completed,
      willBeCompleted: !item.completed
    });

    setLoading(true);
    try {
      const result = await apiStorage.updateGroceryItem(
        user._id,
        currentDateString,
        id,
        { completed: !item.completed }
      );

      logger.groceryList('Toggle item API response:', result);

      if (result.success) {
        setAllLists(prev => ({
          ...prev,
          [currentDateString]: result.list.items
        }));
        logger.groceryList('Item toggled successfully:', id);
      } else {
        logger.error('Toggle item API error:', result.error);
        setError(result.error || 'Failed to update item');
      }
    } catch (error) {
      logger.error('Error toggling item:', error);
      setError('Failed to update item. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, currentDateString, currentItems]);

  // Remove item
  const removeItem = useCallback(async (id) => {
    if (!user?._id) return;
    
    setLoading(true);
    try {
      const result = await apiStorage.removeGroceryItem(user._id, currentDateString, id);
      
      if (result.success) {
        setAllLists(prev => ({
          ...prev,
          [currentDateString]: result.list.items
        }));
      } else {
        setError(result.error || 'Failed to remove item');
      }
    } catch (error) {
      logger.error('Error removing item:', error);
      setError('Failed to remove item. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, currentDateString]);

  // Update item category
  const updateItemCategory = useCallback(async (id, newCategory) => {
    if (!user?._id) return;
    
    setLoading(true);
    try {
      const result = await apiStorage.updateGroceryItem(
        user._id, 
        currentDateString, 
        id, 
        { category: newCategory }
      );
      
      if (result.success) {
        setAllLists(prev => ({
          ...prev,
          [currentDateString]: result.list.items
        }));
      } else {
        setError(result.error || 'Failed to update category');
      }
    } catch (error) {
      logger.error('Error updating category:', error);
      setError('Failed to update category. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, currentDateString]);

  // Clear current list
  const clearCurrentList = useCallback(async () => {
    if (!user?._id) return;
    
    setLoading(true);
    try {
      const result = await apiStorage.clearGroceryList(user._id, currentDateString);
      
      if (result.success) {
        setAllLists(prev => ({
          ...prev,
          [currentDateString]: []
        }));
      } else {
        setError(result.error || 'Failed to clear list');
      }
    } catch (error) {
      logger.error('Error clearing list:', error);
      setError('Failed to clear list. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, currentDateString]);

  // Delete list
  const deleteList = useCallback(async (date) => {
    if (!user?._id) return;
    
    setLoading(true);
    try {
      const result = await apiStorage.deleteGroceryList(user._id, date);
      
      if (result.success) {
        setAllLists(prev => {
          const newLists = { ...prev };
          delete newLists[date];
          return newLists;
        });
        
        // If we deleted the current list, switch to today
        if (date === currentDateString) {
          const today = new Date();
          setCurrentDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
        }
      } else {
        setError(result.error || 'Failed to delete list');
      }
    } catch (error) {
      logger.error('Error deleting list:', error);
      setError('Failed to delete list. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, currentDateString]);

  // Load user's grocery lists on component mount and when user changes
  useEffect(() => {
    const loadUserLists = async () => {
      if (!user?._id) return;
      
      setDataLoading(true);
      try {
        // Load all user lists
        const result = await apiStorage.getUserGroceryLists(user._id);
        if (result.success) {
          const listsMap = {};
          result.lists.forEach(list => {
            listsMap[list.date] = list.items;
          });
          setAllLists(listsMap);
        } else {
          setError(result.error || 'Failed to load grocery lists');
        }
      } catch (error) {
        logger.error('Error loading lists:', error);
        setError('Failed to load grocery lists. Please try again.');
      } finally {
        setDataLoading(false);
      }
    };
    
    loadUserLists();
  }, [user]);
  
  // Load current date list if it doesn't exist
  useEffect(() => {
    const loadCurrentList = async () => {
      if (!user?._id || allLists[currentDateString]) return;
      
      try {
        const result = await apiStorage.getGroceryListByDate(user._id, currentDateString);
        if (result.success) {
          setAllLists(prev => ({
            ...prev,
            [currentDateString]: result.list.items
          }));
        }
      } catch (error) {
        logger.error('Error loading current list:', error);
      }
    };
    
    loadCurrentList();
  }, [currentDateString, user, allLists]);

  return {
    allLists,
    currentDate,
    setCurrentDate,
    currentDateString,
    currentItems,
    loading,
    dataLoading,
    pendingCorrections,
    setPendingCorrections,
    skippedDuplicates,
    error,
    setError,
    clearError,
    addItemsToList,
    acceptCorrections,
    rejectCorrections,
    toggleItem,
    removeItem,
    updateItemCategory,
    clearCurrentList,
    deleteList,
  };
};
