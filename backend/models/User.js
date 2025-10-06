import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  resetToken: {
    type: String,
    default: null
  },
  resetTokenExpiry: {
    type: Date,
    default: null
  },
  resetTokenUsed: {
    type: Boolean,
    default: false
  },
  resetRequestIP: {
    type: String,
    default: null
  },
  resetRequestTime: {
    type: Date,
    default: null
  },
  lastPasswordChange: {
    type: Date,
    default: null
  },
  passwordResetCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});


export default mongoose.model('User', userSchema);