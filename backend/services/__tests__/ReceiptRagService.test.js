import { describe, it, expect, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { ReceiptRagService } from '../ReceiptRagService.js';

// Mock Receipt model to avoid real MongoDB calls
vi.mock('../../models/Receipt.js', () => {
  const mockReceipts = [];
  return {
    default: {
      find: vi.fn(() => ({
        lean: vi.fn(async () => mockReceipts),
        select: vi.fn(() => ({
          lean: vi.fn(async () => mockReceipts)
        }))
      })),
      _setMockReceipts: (receipts) => {
        mockReceipts.length = 0;
        mockReceipts.push(...receipts);
      }
    }
  };
});

// Mock ReceiptChunk model for hybrid retrieval — returns mock chunks
let mockReceiptChunks = [];
vi.mock('../../models/ReceiptChunk.js', () => ({
  default: {
    find: vi.fn(() => ({
      select: vi.fn(() => ({
        lean: vi.fn(async () => mockReceiptChunks)
      }))
    }))
  }
}));

const objectId = () => new mongoose.Types.ObjectId().toString();

describe('ReceiptRagService', () => {
  let embeddingClient;
  let vectorStore;
  let service;
  const userId = objectId();
  const sharedReceiptId = objectId();

  beforeEach(async () => {
    const sharedChunk = {
      receiptId: sharedReceiptId,
      merchant: 'Farmer Market',
      purchaseDate: '2024-10-01',
      total: 42.13,
      chunkIndex: 0,
      score: 0.91,
      text: 'Sample chunk body',
      items: [{ name: 'Apples', quantity: 2, price: 3.99, currency: 'USD' }]
    };

    // Set what ReceiptChunk.find() returns for hybrid retrieval
    mockReceiptChunks = [sharedChunk];

    embeddingClient = {
      embedText: vi.fn(async () => ({
        embedding: [0.1, 0.2, 0.3],
        usage: { total_tokens: 12 },
        model: 'text-embedding-3-small'
      })),
      complete: vi.fn(async () => ({
        message: { content: 'You spent $42 at Farmer Market.' },
        usage: { total_tokens: 123 }
      }))
    };

    vectorStore = {
      searchChunks: vi.fn(async () => ([sharedChunk])),
      fetchAllChunks: vi.fn(async () => ([]))
    };

    service = new ReceiptRagService({ embeddingClient, vectorStoreClient: vectorStore });

    // Set up Receipt mock with synced receipts so checkEmbeddingStatus succeeds
    const { default: Receipt } = await import('../../models/Receipt.js');
    Receipt._setMockReceipts([
      {
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(userId),
        status: 'ready',
        embeddingStatus: 'synced',
        embeddingsVersion: 1
      }
    ]);
  });

  it('retrieves context with normalized filters', async () => {
    const receiptId = objectId();
    const result = await service.retrieveContext({
      userId,
      question: 'How much did I spend?',
      receiptIds: [receiptId],
      dateRange: { start: '2024-10-01', end: '2024-10-31' },
      topK: 3
    });

    expect(embeddingClient.embedText).toHaveBeenCalledWith('How much did I spend?');
    expect(vectorStore.searchChunks).toHaveBeenCalledWith(
      [0.1, 0.2, 0.3],
      expect.objectContaining({
        userId: expect.any(mongoose.Types.ObjectId),
        receiptIds: expect.any(Array),
        dateRange: { start: '2024-10-01', end: '2024-10-31' }
      }),
      3
    );
    expect(result.chunks).toHaveLength(1);
  });

  it('returns fallback answer when no context is available', async () => {
    const response = await service.generateAnswer('What did I buy?', []);
    expect(response.answer).toMatch(/could not locate any receipts/i);
    expect(response.sources).toEqual([]);
  });

  it('generates an answer from provided context', async () => {
    const context = [{
      receiptId: objectId(),
      merchant: 'Grocer',
      purchaseDate: '2024-10-01',
      total: 10,
      text: 'Context body'
    }];

    const response = await service.generateAnswer('Summarize my spend', context);
    expect(embeddingClient.complete).toHaveBeenCalled();
    expect(response.answer).toContain('You spent $42');
    expect(response.sources).toHaveLength(1);
  });

  it('chat returns helpful fallback when no chunks found', async () => {
    vectorStore.searchChunks.mockResolvedValueOnce([]);

    const response = await service.chat({
      userId,
      question: 'Anything about groceries?'
    });

    expect(response.sources).toEqual([]);
    expect(response.answer).toMatch(/could not find any receipts/i);
  });

  it('chat orchestrates retrieval and generation', async () => {
    const response = await service.chat({
      userId,
      question: 'Summarize groceries'
    });

    expect(embeddingClient.embedText).toHaveBeenCalled();
    expect(vectorStore.searchChunks).toHaveBeenCalled();
    expect(embeddingClient.complete).toHaveBeenCalled();
    expect(response.sources).toHaveLength(1);
    expect(response.answer).toContain('You spent $42');
  });
});
