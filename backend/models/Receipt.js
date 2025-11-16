import mongoose from 'mongoose';

const ReceiptItemSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  quantity: { type: Number, default: 1 },
  price: { type: Number, default: null },
  currency: { type: String, trim: true }
}, { _id: false });

const ReceiptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  originalFilename: { type: String },
  mimeType: { type: String },
  size: { type: Number },
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['processing', 'ready', 'error'],
    default: 'processing'
  },
  embeddingStatus: {
    type: String,
    enum: ['pending', 'synced', 'failed'],
    default: 'pending'
  },
  embeddingsVersion: {
    type: Number,
    default: 0
  },
  rawText: { type: String },
  merchant: { type: String },
  purchaseDate: { type: String },
  total: { type: Number },
  currency: { type: String },
  items: [ReceiptItemSchema],
  errorMessage: { type: String }
}, {
  timestamps: true
});

ReceiptSchema.index({ embeddingStatus: 1, embeddingsVersion: 1 });

const Receipt = mongoose.model('Receipt', ReceiptSchema);

export default Receipt;

