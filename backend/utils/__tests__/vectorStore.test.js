import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import vectorStore from '../vectorStore.js';
import ReceiptChunk from '../../models/ReceiptChunk.js';
import Receipt from '../../models/Receipt.js';

const oid = () => new mongoose.Types.ObjectId();

describe('vectorStore chunk cleanup', () => {
  beforeEach(() => {
    vi.spyOn(ReceiptChunk, 'bulkWrite').mockResolvedValue({ matchedCount: 0, modifiedCount: 0, upsertedCount: 2 });
    vi.spyOn(ReceiptChunk, 'deleteMany').mockResolvedValue({ deletedCount: 3 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('removes chunks beyond the new count after an upsert', async () => {
    const receiptId = oid();
    const userId = oid();
    await vectorStore.upsertChunks([0, 1].map((chunkIndex) => ({
      receiptId, userId, chunkIndex, text: `chunk ${chunkIndex}`, embedding: [0.1]
    })));

    expect(ReceiptChunk.deleteMany).toHaveBeenCalledTimes(1);
    const [filter] = ReceiptChunk.deleteMany.mock.calls[0];
    expect(filter.receiptId.toString()).toBe(receiptId.toString());
    expect(filter.chunkIndex).toEqual({ $gte: 2 });
  });

  it('trims each receipt in a multi-receipt batch separately', async () => {
    const [a, b] = [oid(), oid()];
    const userId = oid();
    await vectorStore.upsertChunks([
      { receiptId: a, userId, chunkIndex: 0, text: 'a0', embedding: [1] },
      { receiptId: b, userId, chunkIndex: 0, text: 'b0', embedding: [1] },
      { receiptId: b, userId, chunkIndex: 1, text: 'b1', embedding: [1] }
    ]);

    const trims = Object.fromEntries(ReceiptChunk.deleteMany.mock.calls.map(([f]) => [f.receiptId.toString(), f.chunkIndex.$gte]));
    expect(trims).toEqual({ [a.toString()]: 1, [b.toString()]: 2 });
  });

  it('deletes all chunks for a receipt', async () => {
    const receiptId = oid();
    await expect(vectorStore.deleteChunksForReceipt(receiptId)).resolves.toBe(3);
    expect(ReceiptChunk.deleteMany.mock.calls[0][0].receiptId.toString()).toBe(receiptId.toString());
  });

  it('prunes only chunks whose receipt no longer exists', async () => {
    const [kept, gone] = [oid(), oid()];
    vi.spyOn(ReceiptChunk, 'distinct').mockResolvedValue([kept, gone]);
    vi.spyOn(Receipt, 'find').mockReturnValue({ distinct: vi.fn().mockResolvedValue([kept]) });

    await expect(vectorStore.pruneOrphanChunks()).resolves.toBe(3);
    expect(ReceiptChunk.deleteMany).toHaveBeenCalledWith({ receiptId: { $in: [gone] } });
  });

  it('does nothing when every chunk has a receipt', async () => {
    const kept = oid();
    vi.spyOn(ReceiptChunk, 'distinct').mockResolvedValue([kept]);
    vi.spyOn(Receipt, 'find').mockReturnValue({ distinct: vi.fn().mockResolvedValue([kept]) });

    await expect(vectorStore.pruneOrphanChunks()).resolves.toBe(0);
    expect(ReceiptChunk.deleteMany).not.toHaveBeenCalled();
  });
});
