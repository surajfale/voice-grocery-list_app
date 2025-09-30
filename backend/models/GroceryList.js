import mongoose from 'mongoose';

const groceryItemSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    default: 'Other'
  },
  completed: {
    type: Boolean,
    default: false
  },
  count: {
    type: Number,
    default: 1,
    min: 1
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const groceryListSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String,
    required: true
  },
  items: [groceryItemSchema]
}, {
  timestamps: true
});

// Compound index for efficient user + date queries
groceryListSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model('GroceryList', groceryListSchema);