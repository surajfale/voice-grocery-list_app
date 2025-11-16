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

const buildFilterClauses = (filters = {}) => {
  const clauses = [];

  if (filters.userId) {
    clauses.push({
      equals: {
        path: 'userId',
        value: toObjectId(filters.userId, 'userId')
      }
    });
  }

  if (filters.receiptIds?.length) {
    const receiptIds = filters.receiptIds.map((id) => toObjectId(id, 'receiptIds'));
    clauses.push({
      in: {
        path: 'receiptId',
        value: receiptIds
      }
    });
  } else if (filters.receiptId) {
    clauses.push({
      equals: {
        path: 'receiptId',
        value: toObjectId(filters.receiptId, 'receiptId')
      }
    });
  }

  if (filters.purchaseDate) {
    clauses.push({
      equals: {
        path: 'purchaseDate',
        value: filters.purchaseDate
      }
    });
  } else if (filters.dateRange && (filters.dateRange.start || filters.dateRange.end)) {
    const range = {
      path: 'purchaseDate'
    };
    if (filters.dateRange.start) {
      range.gte = filters.dateRange.start;
    }
    if (filters.dateRange.end) {
      range.lte = filters.dateRange.end;
    }
    clauses.push({ range });
  }

  return clauses;
};

const formatFilter = (clauses) => {
  if (!clauses.length) {
    return undefined;
  }

  if (clauses.length === 1) {
    return clauses[0];
  }

  return {
    compound: {
      must: clauses
    }
  };
};

const buildMatchConditions = (filters = {}) => {
  const match = {};

  if (filters.userId) {
    match.userId = toObjectId(filters.userId, 'userId');
  }

  if (filters.receiptIds?.length) {
    match.receiptId = {
      $in: filters.receiptIds.map((id) => toObjectId(id, 'receiptIds'))
    };
  } else if (filters.receiptId) {
    match.receiptId = toObjectId(filters.receiptId, 'receiptId');
  }

  if (filters.purchaseDate) {
    match.purchaseDate = filters.purchaseDate;
  } else if (filters.dateRange && (filters.dateRange.start || filters.dateRange.end)) {
    match.purchaseDate = {};
    if (filters.dateRange.start) {
      match.purchaseDate.$gte = filters.dateRange.start;
    }
    if (filters.dateRange.end) {
      match.purchaseDate.$lte = filters.dateRange.end;
    }
  }

  return Object.keys(match).length ? match : null;
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

    const filterClauses = buildFilterClauses(filters);
    const formattedFilter = formatFilter(filterClauses);
    const matchConditions = buildMatchConditions(filters);

    const searchK = formattedFilter ? Math.min(topK * 5, 100) : topK;

    const searchStage = {
      index: ragConfig.vectorIndex,
      knnBeta: {
        vector: queryVector,
        path: 'embedding',
        k: searchK
      }
    };

    if (formattedFilter) {
      searchStage.knnBeta.filter = formattedFilter;
    }

    const pipeline = [
      { $search: searchStage },
      ...(matchConditions ? [{ $match: matchConditions }] : []),
      { $addFields: { score: { $meta: 'searchScore' } } },
      { $limit: topK },
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
      return results;
    } catch (error) {
      console.error('❌ Failed to search receipt chunks:', error);
      throw new Error('Failed to search receipt chunks');
    }
  }
};

export default vectorStore;

