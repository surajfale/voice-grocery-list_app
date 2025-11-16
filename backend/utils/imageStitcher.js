import sharp from 'sharp';

const normalizeImage = async (buffer) => {
  return sharp(buffer)
    .rotate()
    .sharpen()
    .normalize()
    .toFormat('png')
    .toBuffer();
};

export const prepareReceiptImage = async (files = []) => {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('At least one receipt image is required.');
  }

  const sourceImages = files.map((file, index) => ({
    filename: file.originalname || `receipt-page-${index + 1}`,
    size: file.size ?? null,
    mimeType: file.mimetype || 'application/octet-stream'
  }));

  const processed = await Promise.all(
    files.map(async (file) => {
      const normalizedBuffer = await normalizeImage(file.buffer);
      const metadata = await sharp(normalizedBuffer).metadata();

      return {
        buffer: normalizedBuffer,
        width: metadata.width || 0,
        height: metadata.height || 0
      };
    })
  );

  if (processed.length === 1) {
    return {
      buffer: processed[0].buffer,
      mimeType: 'image/png',
      pageCount: 1,
      sourceImages,
      dimensions: {
        width: processed[0].width,
        height: processed[0].height
      }
    };
  }

  const width = Math.max(...processed.map((image) => image.width)) || 1;
  const totalHeight = processed.reduce((sum, image) => sum + image.height, 0) || 1;

  let offset = 0;
  const composites = processed.map((image) => {
    const top = offset;
    offset += image.height;
    return {
      input: image.buffer,
      top,
      left: Math.max(0, Math.floor((width - image.width) / 2))
    };
  });

  const stitchedBuffer = await sharp({
    create: {
      width,
      height: totalHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .composite(composites)
    .png()
    .toBuffer();

  return {
    buffer: stitchedBuffer,
    mimeType: 'image/png',
    pageCount: files.length,
    sourceImages,
    dimensions: {
      width,
      height: totalHeight
    }
  };
};

export default prepareReceiptImage;


