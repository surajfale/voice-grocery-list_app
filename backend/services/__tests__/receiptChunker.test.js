import { describe, it, expect } from 'vitest';
import { ReceiptChunker, chunkReceipt } from '../receiptChunker.js';

const baseReceipt = {
  _id: '64f5c4d2f5c4d2f5c4d2f5c4',
  userId: '64f5c4d2f5c4d2f5c4d2f5c5',
  merchant: 'Farmer Market',
  purchaseDate: '2024-10-01',
  total: 42.13,
  currency: 'usd',
  items: [
    { name: 'Apples', quantity: 2, price: 3.99 },
    { name: 'Spinach', quantity: 1, price: 4.5 }
  ]
};

const longParagraph = 'The freshest apples and seasonal greens were purchased today at the neighborhood market, where bulk discounts and loyalty rewards stacked up for extra savings.';
const longText = Array.from({ length: 8 }).map(() => longParagraph).join(' ');

describe('ReceiptChunker', () => {
  it('splits receipts into chunks with consistent metadata and preamble', () => {
    const chunker = new ReceiptChunker({ chunkSize: 25 });
    const chunks = chunker.chunkReceipt({
      ...baseReceipt,
      rawText: longText
    });

    expect(chunks.length).toBeGreaterThan(1);

    chunks.forEach((chunk, index) => {
      expect(chunk.chunkIndex).toBe(index);
      expect(chunk.text.startsWith('Receipt summary — Merchant: Farmer Market')).toBe(true);
      expect(chunk.userId).toBe(baseReceipt.userId);
      expect(chunk.receiptId).toBe(baseReceipt._id);
      expect(chunk.metadata.hasContent).toBe(true);
      expect(chunk.metadata.wordCount).toBeGreaterThan(0);
      expect(chunk.items).toEqual(['Apples', 'Spinach']);
    });
  });

  it('falls back to a single descriptive chunk when there is no text', () => {
    const chunks = chunkReceipt({
      ...baseReceipt,
      rawText: '',
      items: []
    });

    expect(chunks).toHaveLength(1);
    expect(chunks[0].metadata.hasContent).toBe(false);
    expect(chunks[0].text).toContain('No additional receipt details were provided.');
  });

  it('normalizes whitespace and integrates item summaries', () => {
    const messyText = 'Apples\t \t  \n\n Spinach -- special \n\n';
    const chunker = new ReceiptChunker({ chunkSize: 50 });
    const [chunk] = chunker.chunkReceipt({
      ...baseReceipt,
      rawText: messyText
    });

    expect(chunk.text).not.toMatch(/\t|\s{3,}/);
    expect(chunk.metadata.itemCount).toBe(2);
  });
});


