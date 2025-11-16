import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { prepareReceiptImage } from '../imageStitcher.js';

const createImageBuffer = async (width, height, background) => {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background
    }
  }).png().toBuffer();
};

describe('prepareReceiptImage', () => {
  it('normalizes a single image and preserves metadata', async () => {
    const buffer = await createImageBuffer(120, 240, { r: 255, g: 255, b: 255, alpha: 1 });

    const result = await prepareReceiptImage([{
      buffer,
      originalname: 'single.png',
      mimetype: 'image/png',
      size: buffer.length
    }]);

    expect(result.pageCount).toBe(1);
    expect(result.mimeType).toBe('image/png');
    expect(result.sourceImages).toHaveLength(1);
    expect(result.dimensions.width).toBeGreaterThan(0);
    expect(result.dimensions.height).toBeGreaterThan(0);
    expect(Buffer.isBuffer(result.buffer)).toBe(true);
  });

  it('stitches multiple images vertically into one buffer', async () => {
    const first = await createImageBuffer(100, 150, { r: 255, g: 0, b: 0, alpha: 1 });
    const second = await createImageBuffer(120, 200, { r: 0, g: 0, b: 255, alpha: 1 });

    const result = await prepareReceiptImage([
      {
        buffer: first,
        originalname: 'page-a.png',
        mimetype: 'image/png',
        size: first.length
      },
      {
        buffer: second,
        originalname: 'page-b.png',
        mimetype: 'image/png',
        size: second.length
      }
    ]);

    expect(result.pageCount).toBe(2);
    expect(result.sourceImages).toHaveLength(2);
    expect(result.dimensions.height).toBeGreaterThan(300);
    expect(result.dimensions.width).toBeGreaterThanOrEqual(120);
  });
});


