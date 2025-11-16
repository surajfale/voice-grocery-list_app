import mongoose from 'mongoose';
import { Readable } from 'stream';

let receiptBucket;

const getBucket = () => {
  if (receiptBucket) {
    return receiptBucket;
  }

  if (!mongoose.connection || mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    throw new Error('MongoDB connection not ready for GridFS operations');
  }

  receiptBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: 'receiptFiles'
  });

  return receiptBucket;
};

export const uploadBufferToGridFs = async (buffer, {
  filename,
  contentType,
  metadata
}) => {
  const bucket = getBucket();

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      contentType,
      metadata
    });

    uploadStream.on('error', (error) => {
      reject(error);
    });

    uploadStream.on('finish', () => {
      resolve(uploadStream.id);
    });

    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
};

export const deleteFileFromGridFs = async (fileId) => {
  if (!fileId) {
    return;
  }

  const bucket = getBucket();
  await bucket.delete(new mongoose.Types.ObjectId(fileId));
};

export const getFileStreamFromGridFs = (fileId) => {
  const bucket = getBucket();
  return bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
};

