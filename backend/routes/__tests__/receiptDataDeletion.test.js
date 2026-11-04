import mongoose from 'mongoose';
import { describe, it, expect, vi, afterEach } from 'vitest';
import Receipt from '../../models/Receipt.js';
import ReceiptChunk from '../../models/ReceiptChunk.js';
import { deleteFileFromGridFs } from '../../utils/gridFs.js';
import { deleteAllReceiptDataForUser } from '../../controllers/receiptController.js';

vi.mock('../../utils/gridFs.js', () => ({
  __esModule: true,
  uploadBufferToGridFs: vi.fn(),
  getFileStreamFromGridFs: vi.fn(),
  deleteFileFromGridFs: vi.fn()
}));

vi.mock('../../services/ReceiptRagService.js', () => ({ __esModule: true, default: { chat: vi.fn() } }));

describe('deleteAllReceiptDataForUser', () => {
  afterEach(() => vi.restoreAllMocks());

  it('deletes images, chunks and receipts for that user only, tolerating a missing image', async () => {
    const userId = new mongoose.Types.ObjectId();
    const fileA = new mongoose.Types.ObjectId();
    const fileB = new mongoose.Types.ObjectId();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const findSpy = vi.spyOn(Receipt, 'find').mockReturnValue({
      select: () => ({ lean: async () => [{ fileId: fileA }, { fileId: fileB }, { fileId: null }] })
    });
    deleteFileFromGridFs.mockReset();
    deleteFileFromGridFs.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('FileNotFound'));
    const chunkSpy = vi.spyOn(ReceiptChunk, 'deleteMany').mockResolvedValue({ deletedCount: 7 });
    const receiptSpy = vi.spyOn(Receipt, 'deleteMany').mockResolvedValue({ deletedCount: 3 });

    const result = await deleteAllReceiptDataForUser(userId.toString());

    expect(findSpy).toHaveBeenCalledWith({ userId });
    expect(deleteFileFromGridFs).toHaveBeenCalledTimes(2);
    expect(chunkSpy).toHaveBeenCalledWith({ userId });
    expect(receiptSpy).toHaveBeenCalledWith({ userId });
    expect(result).toEqual({ receipts: 3, chunks: 7, files: 1, fileErrors: 1 });
  });
});
