import express from 'express';
import GroceryList from '../models/GroceryList.js';
const router = express.Router();

// Get all grocery lists for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const lists = await GroceryList.find({ userId }).sort({ date: -1 });

    res.json({
      success: true,
      lists: lists.map(list => ({
        date: list.date,
        items: list.items
      }))
    });

  } catch (error) {
    console.error('Error fetching grocery lists:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch grocery lists'
    });
  }
});

// Get grocery list by date
router.get('/user/:userId/date/:date', async (req, res) => {
  try {
    const { userId, date } = req.params;

    let list = await GroceryList.findOne({ userId, date });

    // Create empty list if it doesn't exist
    if (!list) {
      list = new GroceryList({
        userId,
        date,
        items: []
      });
      await list.save();
    }

    res.json({
      success: true,
      list: {
        date: list.date,
        items: list.items
      }
    });

  } catch (error) {
    console.error('Error fetching grocery list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch grocery list'
    });
  }
});

// Add item to grocery list
router.post('/user/:userId/date/:date/items', async (req, res) => {
  try {
    const { userId, date } = req.params;
    const { text, category } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Item text is required'
      });
    }

    let list = await GroceryList.findOne({ userId, date });

    if (!list) {
      list = new GroceryList({
        userId,
        date,
        items: []
      });
    }

    const newItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text,
      category: category || 'Other',
      completed: false,
      count: 1,
      addedAt: new Date()
    };

    list.items.push(newItem);
    await list.save();

    res.json({
      success: true,
      list: {
        date: list.date,
        items: list.items
      }
    });

  } catch (error) {
    console.error('Error adding item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add item'
    });
  }
});

// Update item in grocery list
router.put('/user/:userId/date/:date/items/:itemId', async (req, res) => {
  try {
    const { userId, date, itemId } = req.params;
    const updates = req.body;

    const list = await GroceryList.findOne({ userId, date });

    if (!list) {
      return res.status(404).json({
        success: false,
        error: 'Grocery list not found'
      });
    }

    const item = list.items.find(item => item.id === itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    // Update item properties
    Object.keys(updates).forEach(key => {
      if (['text', 'category', 'completed', 'count'].includes(key)) {
        item[key] = updates[key];
      }
    });

    await list.save();

    res.json({
      success: true,
      list: {
        date: list.date,
        items: list.items
      }
    });

  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update item'
    });
  }
});

// Remove item from grocery list
router.delete('/user/:userId/date/:date/items/:itemId', async (req, res) => {
  try {
    const { userId, date, itemId } = req.params;

    const list = await GroceryList.findOne({ userId, date });

    if (!list) {
      return res.status(404).json({
        success: false,
        error: 'Grocery list not found'
      });
    }

    const itemIndex = list.items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Item not found in grocery list'
      });
    }

    list.items.splice(itemIndex, 1);
    await list.save();

    res.json({
      success: true,
      list: {
        date: list.date,
        items: list.items
      }
    });

  } catch (error) {
    console.error('Error removing item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove item'
    });
  }
});

// Clear all items from grocery list
router.delete('/user/:userId/date/:date/items', async (req, res) => {
  try {
    const { userId, date } = req.params;

    const list = await GroceryList.findOne({ userId, date });

    if (!list) {
      return res.status(404).json({
        success: false,
        error: 'Grocery list not found'
      });
    }

    list.items = [];
    await list.save();

    res.json({
      success: true,
      list: {
        date: list.date,
        items: list.items
      }
    });

  } catch (error) {
    console.error('Error clearing list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear list'
    });
  }
});

// Delete entire grocery list
router.delete('/user/:userId/date/:date', async (req, res) => {
  try {
    const { userId, date } = req.params;

    await GroceryList.deleteOne({ userId, date });

    res.json({
      success: true
    });

  } catch (error) {
    console.error('Error deleting list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete list'
    });
  }
});

export default router;