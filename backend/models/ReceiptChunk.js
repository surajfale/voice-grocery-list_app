import mongoose from 'mongoose';

const { Schema } = mongoose;

const ReceiptChunkSchema = new Schema({
  receiptId: {
    type: Schema.Types.ObjectId,
    ref: 'Receipt',
    required: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  chunkIndex: {
    type: Number,
    required: true,
    min: 0
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  embedding: {
    type: [Number],
    required: true,
    validate: {
      validator(values) {
        return Array.isArray(values) && values.length > 0;
      },
      message: 'Embedding vector must contain at least one value.'
    }
  },
  merchant: { type: String, trim: true },
  purchaseDate: { type: String, index: true },
  total: { type: Number },
  items: {
    type: [String],
    default: []
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

ReceiptChunkSchema.index({ receiptId: 1, chunkIndex: 1 }, { unique: true });

const ReceiptChunk = mongoose.models.ReceiptChunk || mongoose.model('ReceiptChunk', ReceiptChunkSchema);

export default ReceiptChunk;


