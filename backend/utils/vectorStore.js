import mongoose from 'mongoose';
import ragConfig from '../config/ragConfig.js';
import ReceiptChunk from '../models/ReceiptChunk.js';

const { Types } = mongoose;

const toObjectId = (value, fieldName) => {
  if (!value) {
    throw new Error(`${fieldName} is required.`);
  }

  if (value instanceof Types.ObjectId) {
    return value;
  }

  if (Types.ObjectId.isValid(value)) {
    return new Types.ObjectId(value);
  }

  throw new Error(`Invalid ObjectId provided for ${fieldName}.`);
};

/**
 * Build a standard MQL filter object for $vectorSearch.
 * Unlike the old knnBeta (which used Atlas Search query syntax like {equals:{path,value}}),
 * $vectorSearch uses plain MQL syntax (same as $match).
 */
const buildVectorSearchFilter = (filters = {}) => {
  const mqlFilter = {};

  if (filters.userId) {
    mqlFilter.userId = toObjectId(filters.userId, 'userId');
  }

  if (filters.receiptIds?.length) {
    mqlFilter.receiptId = {
      $in: filters.receiptIds.map((id) => toObjectId(id, 'receiptIds'))
    };
  } else if (filters.receiptId) {
    mqlFilter.receiptId = toObjectId(filters.receiptId, 'receiptId');
  }

  if (filters.purchaseDate) {
    mqlFilter.purchaseDate = filters.purchaseDate;
  } else if (filters.dateRange && (filters.dateRange.start || filters.dateRange.end)) {
    mqlFilter.purchaseDate = {};
    if (filters.dateRange.start) {
      mqlFilter.purchaseDate.$gte = filters.dateRange.start;
    }
    if (filters.dateRange.end) {
      mqlFilter.purchaseDate.$lte = filters.dateRange.end;
    }
  }

  return Object.keys(mqlFilter).length > 0 ? mqlFilter : undefined;
};


export const vectorStore = {
  async upsertChunks(chunks = []) {
    if (!Array.isArray(chunks) || chunks.length === 0) {
      return {
        success: true,
        matchedCount: 0,
        modifiedCount: 0,
        upsertedCount: 0
      };
    }

    const operations = chunks.map((chunk) => {
      const receiptId = toObjectId(chunk.receiptId, 'chunk.receiptId');
      const userId = toObjectId(chunk.userId, 'chunk.userId');

      if (typeof chunk.chunkIndex !== 'number') {
        throw new Error('chunk.chunkIndex must be a number.');
      }

      const updateDoc = {
        receiptId,
        userId,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
        embedding: chunk.embedding,
        merchant: chunk.merchant,
        purchaseDate: chunk.purchaseDate,
        total: chunk.total,
        items: chunk.items || [],
        metadata: chunk.metadata || {}
      };

      return {
        updateOne: {
          filter: { receiptId, chunkIndex: chunk.chunkIndex },
          update: {
            $set: updateDoc,
            $setOnInsert: {
              createdAt: chunk.createdAt || new Date()
            }
          },
          upsert: true
        }
      };
    });

    try {
      const result = await ReceiptChunk.bulkWrite(operations, { ordered: false });
      return {
        success: true,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        upsertedCount: result.upsertedCount
      };
    } catch (error) {
      console.error('❌ Failed to upsert receipt chunks:', error);
      throw new Error('Failed to upsert receipt chunks');
    }
  },

  async searchChunks(queryVector, filters = {}, topK = ragConfig.topK) {
    if (!Array.isArray(queryVector) || queryVector.length === 0) {
      throw new Error('queryVector must be a non-empty array of numbers.');
    }

    if (!Number.isInteger(topK) || topK <= 0) {
      throw new Error('topK must be a positive integer.');
    }

    const formattedFilter = buildVectorSearchFilter(filters);

    // $vectorSearch uses numCandidates for ANN breadth.
    // Higher = more accurate but slower. Default 150 is good for topK=15.
    const numCandidates = Math.max(
      topK,
      ragConfig.numCandidates || topK * 10
    );

    const vectorSearchStage = {
      index: ragConfig.vectorIndex,
      queryVector,
      path: 'embedding',
      numCandidates,
      limit: topK
    };

    if (formattedFilter) {
      vectorSearchStage.filter = formattedFilter;
    }

    const pipeline = [
      { $vectorSearch: vectorSearchStage },
      { $addFields: { score: { $meta: 'vectorSearchScore' } } },
      {
        $project: {
          receiptId: 1,
          userId: 1,
          chunkIndex: 1,
          text: 1,
          merchant: 1,
          purchaseDate: 1,
          total: 1,
          items: 1,
          metadata: 1,
          score: 1
        }
      }
    ];

    try {
      const results = await ReceiptChunk.aggregate(pipeline).exec();

      // If no results, check if chunks exist and log diagnostic info
      if (results.length === 0) {
        if (filters.userId) {
          const userChunks = await ReceiptChunk.countDocuments({
            userId: toObjectId(filters.userId, 'userId')
          });
          console.warn(`⚠️  Vector search returned 0 results. Total chunks for userId ${filters.userId}: ${userChunks}`);
        } else {
          const totalChunks = await ReceiptChunk.countDocuments({});
          console.warn(`⚠️  Vector search returned 0 results. Total chunks in database: ${totalChunks}`);
        }
      }

      return results;
    } catch (error) {
      // Check if it's a MongoDB Atlas Vector Search index error
      const isIndexError = error.message?.includes('index') ||
        error.message?.includes('vectorSearch') ||
        error.message?.includes('$vectorSearch') ||
        error.codeName === 'InvalidPipelineOperator' ||
        error.code === 17106;

      if (isIndexError) {
        console.error(`❌ MongoDB Atlas Vector Search index error. Index "${ragConfig.vectorIndex}" may not exist or be misconfigured.`);
        console.error('   Ensure you have a Vector Search index (not a regular Search index) in MongoDB Atlas.');
        console.error('   See docs/atlas_vector_index.md for setup instructions.');
      }

      console.error('❌ Failed to search receipt chunks:', error.message || error);
      throw new Error(`Failed to search receipt chunks: ${error.message || 'Unknown error'}`);
    }
  }
};

export default vectorStore;

