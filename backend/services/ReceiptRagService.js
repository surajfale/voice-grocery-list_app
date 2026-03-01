import mongoose from 'mongoose';
import ragConfig from '../config/ragConfig.js';
import { getEmbeddingClient } from '../utils/embeddingClient.js';
import { vectorStore } from '../utils/vectorStore.js';
import logger from '../utils/logger.js';
import { estimateCompletionCost, estimateEmbeddingCost } from '../utils/costEstimator.js';
import Receipt from '../models/Receipt.js';

const MIN_QUESTION_LENGTH = 3;
const MAX_QUESTION_LENGTH = 500;
const DEFAULT_MAX_CONTEXT_CHUNKS = 20;

const SYSTEM_PROMPT = `You are a meticulous grocery finance assistant. You have access to receipt data provided below as context chunks.

CRITICAL RULES:
1. EXHAUSTIVELY scan EVERY receipt context chunk provided — do NOT stop after the first match.
2. When the user asks about a CATEGORY (e.g. "dairy", "produce", "meat"), include ALL items that belong to that category across ALL receipts. For example "dairy" includes milk, yogurt, cheese, butter, cream, ice cream, etc.
3. Always list the individual items you found, their prices, and which receipt/merchant they came from.
4. If a receipt has a "Categories:" line, use it to identify which categories the items belong to.
5. Show a clear total at the end when the user asks about spending.
6. State the date range of the receipts you examined.
7. If you cannot find relevant items, say so clearly — do NOT guess.
8. Be thorough rather than brief — the user wants a complete picture.`;

const sanitizeQuestion = (question) => {
  if (typeof question !== 'string') {
    return '';
  }
  return question.replace(/\s+/g, ' ').trim();
};

const ensureValidObjectId = (value, fieldName) => {
  if (!value) {
    throw new Error(`${fieldName} is required.`);
  }

  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }

  if (mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }

  throw new Error(`${fieldName} must be a valid ObjectId.`);
};

const formatContextForPrompt = (chunks = [], maxChunks = DEFAULT_MAX_CONTEXT_CHUNKS) => {
  const limitedChunks = chunks.slice(0, maxChunks);
  return limitedChunks
    .map((chunk, index) => {
      const items = Array.isArray(chunk.items) && chunk.items.length
        ? chunk.items.join(', ')
        : 'No item details';

      const total = typeof chunk.total === 'number'
        ? `$${chunk.total.toFixed(2)}`
        : 'Unknown total';

      return [
        `Context #${index + 1}`,
        `Receipt ID: ${chunk.receiptId}`,
        `Merchant: ${chunk.merchant || 'Unknown merchant'}`,
        `Date: ${chunk.purchaseDate || 'Unknown date'}`,
        `Total: ${total}`,
        `Items: ${items}`,
        'Details:',
        chunk.text
      ].join('\n');
    })
    .join('\n\n');
};

const mapChunksToSources = (chunks = []) => {
  const seen = new Map();

  chunks.forEach((chunk) => {
    if (!chunk.receiptId) {
      return;
    }

    if (!seen.has(chunk.receiptId.toString())) {
      seen.set(chunk.receiptId.toString(), {
        receiptId: chunk.receiptId,
        merchant: chunk.merchant || 'Unknown merchant',
        purchaseDate: chunk.purchaseDate || null,
        total: chunk.total ?? null,
        score: chunk.score ?? null
      });
    }
  });

  return Array.from(seen.values());
};

/**
 * Service orchestrating the end-to-end RAG workflow for receipt QA.
 */
export class ReceiptRagService {
  constructor(options = {}) {
    const {
      embeddingClient = getEmbeddingClient(),
      vectorStoreClient = vectorStore
    } = options;

    this.embeddingClient = embeddingClient;
    this.vectorStore = vectorStoreClient;
  }

  /**
   * Embed a user question and run vector search with optional filters.
   * @param {Object} params
   * @param {string} params.userId - Owner of the receipts.
   * @param {string} params.question - Natural language question.
   * @param {string[]} [params.receiptIds] - Optional list of receipt ObjectIds.
   * @param {{start?: string, end?: string}} [params.dateRange] - ISO date bounds.
   * @param {number} [params.topK] - Maximum chunks to retrieve.
   */
  async retrieveContext({ userId, question, receiptIds, dateRange, topK } = {}) {
    const sanitizedQuestion = sanitizeQuestion(question);
    if (!sanitizedQuestion || sanitizedQuestion.length < MIN_QUESTION_LENGTH) {
      throw new Error(`Question must be at least ${MIN_QUESTION_LENGTH} characters.`);
    }

    if (sanitizedQuestion.length > MAX_QUESTION_LENGTH) {
      throw new Error(`Question must be fewer than ${MAX_QUESTION_LENGTH} characters.`);
    }

    const normalizedUserId = ensureValidObjectId(userId, 'userId');
    const filters = {
      userId: normalizedUserId
    };

    if (Array.isArray(receiptIds) && receiptIds.length > 0) {
      filters.receiptIds = receiptIds.map((id) => ensureValidObjectId(id, 'receiptIds'));
    }

    if (dateRange && (dateRange.start || dateRange.end)) {
      filters.dateRange = {};

      if (dateRange.start) {
        filters.dateRange.start = dateRange.start;
      }

      if (dateRange.end) {
        filters.dateRange.end = dateRange.end;
      }
    }

    const embedStart = Date.now();
    const { embedding: questionEmbedding, usage: embeddingUsage, model: embeddingModel } = await this.embeddingClient.embedText(sanitizedQuestion);
    const embedDuration = Date.now() - embedStart;
    logger.info('rag.embedding.generated', {
      userId: normalizedUserId.toString(),
      durationMs: embedDuration,
      model: embeddingModel || ragConfig.embeddingsModel,
      tokensUsed: embeddingUsage?.total_tokens || embeddingUsage?.prompt_tokens || null,
      estimatedCostUsd: estimateEmbeddingCost(embeddingModel || ragConfig.embeddingsModel, embeddingUsage)
    });

    const searchStart = Date.now();
    const chunks = await this.vectorStore.searchChunks(
      questionEmbedding,
      filters,
      topK || ragConfig.topK
    );
    logger.info('rag.retrieval.completed', {
      userId: normalizedUserId.toString(),
      durationMs: Date.now() - searchStart,
      chunksFound: chunks.length,
      filtersApplied: Object.keys(filters).filter((key) => Boolean(filters[key]))
    });

    return {
      question,
      sanitizedQuestion,
      questionEmbedding,
      chunks
    };
  }

  /**
   * Call the completion model with the retrieved context.
   * @param {string} question
   * @param {Array<Object>} contextChunks
   * @param {{maxContextChunks?: number, maxTokens?: number, temperature?: number}} options
   */
  async generateAnswer(question, contextChunks = [], options = {}) {
    if (!question || typeof question !== 'string') {
      throw new Error('Question is required to generate an answer.');
    }

    const contextText = formatContextForPrompt(
      contextChunks,
      options.maxContextChunks || DEFAULT_MAX_CONTEXT_CHUNKS
    );

    if (!contextText) {
      return {
        answer: 'I could not locate any receipts relevant to your question. Please try uploading new receipts or adjust your filters.',
        sources: [],
        usage: null
      };
    }

    const messages = [
      {
        role: 'system',
        content: SYSTEM_PROMPT
      },
      {
        role: 'user',
        content: `Context:\n${contextText}\n\nQuestion: ${question}\n\nProvide a concise answer that references the receipts when possible.`
      }
    ];

    const completionStart = Date.now();
    const completion = await this.embeddingClient.complete(messages, {
      maxTokens: options.maxTokens || 800,
      temperature: options.temperature ?? 0.2
    });
    const completionDuration = Date.now() - completionStart;

    const answer = completion?.message?.content?.trim()
      || 'I was unable to generate an answer from the provided receipts.';
    logger.info('rag.llm.completed', {
      durationMs: completionDuration,
      model: completion?.model || ragConfig.completionsModel,
      promptTokens: completion?.usage?.prompt_tokens || null,
      completionTokens: completion?.usage?.completion_tokens || completion?.usage?.output_tokens || null,
      totalTokens: completion?.usage?.total_tokens || null,
      estimatedCostUsd: estimateCompletionCost(completion?.model || ragConfig.completionsModel, completion?.usage)
    });

    return {
      answer,
      sources: mapChunksToSources(contextChunks),
      usage: completion?.usage || null,
      rawCompletion: completion
    };
  }

  /**
   * Check if receipts are embedded and ready for RAG queries.
   * @param {Object} params
   * @param {string} params.userId - Owner of the receipts.
   * @param {string[]} [params.receiptIds] - Optional list of receipt ObjectIds to check.
   */
  async checkEmbeddingStatus({ userId, receiptIds } = {}) {
    const normalizedUserId = ensureValidObjectId(userId, 'userId');
    const query = { userId: normalizedUserId, status: 'ready' };

    if (Array.isArray(receiptIds) && receiptIds.length > 0) {
      query._id = { $in: receiptIds.map((id) => ensureValidObjectId(id, 'receiptIds')) };
    }

    const receipts = await Receipt.find(query).lean();
    const total = receipts.length;
    const synced = receipts.filter((r) => r.embeddingStatus === 'synced').length;
    const pending = receipts.filter((r) => r.embeddingStatus === 'pending' || !r.embeddingStatus).length;
    const failed = receipts.filter((r) => r.embeddingStatus === 'failed').length;

    return {
      total,
      synced,
      pending,
      failed,
      ready: synced > 0,
      receipts: receipts.map((r) => ({
        receiptId: r._id.toString(),
        embeddingStatus: r.embeddingStatus || 'pending',
        status: r.status,
        errorMessage: r.errorMessage
      }))
    };
  }

  /**
   * Convenience method that runs retrieval followed by generation.
   */
  async chat({ userId, question, receiptIds, dateRange, topK } = {}) {
    if (!userId) {
      throw new Error('userId is required.');
    }

    // Check embedding status before searching
    const embeddingStatus = await this.checkEmbeddingStatus({ userId, receiptIds });

    if (embeddingStatus.total === 0) {
      return {
        answer: 'You don\'t have any receipts uploaded yet. Please upload receipts first before asking questions.',
        sources: [],
        contextChunks: [],
        question: sanitizeQuestion(question),
        diagnostic: {
          totalReceipts: 0,
          embeddedReceipts: 0,
          pendingReceipts: 0
        }
      };
    }

    // If ALL receipts are pending and NONE are synced, warn but still try to search
    // (the vector store may have chunks from a previous successful embedding run)
    let pendingWarning = null;
    if (embeddingStatus.synced === 0 && embeddingStatus.pending > 0) {
      pendingWarning = `Note: ${embeddingStatus.pending} receipt(s) may still be processing. Results may be incomplete.`;
    } else if (embeddingStatus.pending > 0) {
      pendingWarning = `Note: ${embeddingStatus.pending} receipt(s) are still being processed and not included in results.`;
    }


    const retrieval = await this.retrieveContext({
      userId,
      question,
      receiptIds,
      dateRange,
      topK
    });

    if (!retrieval.chunks || retrieval.chunks.length === 0) {
      // Provide more helpful error message based on embedding status
      let errorMessage = 'I could not find any receipts that match your question.';

      if (embeddingStatus.pending > 0) {
        errorMessage += ` Note: ${embeddingStatus.pending} receipt(s) are still being processed.`;
      }

      if (embeddingStatus.failed > 0) {
        errorMessage += ` Warning: ${embeddingStatus.failed} receipt(s) failed to process.`;
      }

      errorMessage += ' Try adjusting the filters or uploading additional receipts.';

      return {
        answer: errorMessage,
        sources: [],
        contextChunks: [],
        question: retrieval.sanitizedQuestion,
        diagnostic: {
          totalReceipts: embeddingStatus.total,
          embeddedReceipts: embeddingStatus.synced,
          pendingReceipts: embeddingStatus.pending,
          failedReceipts: embeddingStatus.failed,
          chunksFound: 0
        }
      };
    }

    const generation = await this.generateAnswer(retrieval.sanitizedQuestion, retrieval.chunks);

    // Append pending warning if some receipts weren't embedded yet
    const finalAnswer = pendingWarning
      ? `${generation.answer}\n\n${pendingWarning}`
      : generation.answer;

    return {
      answer: finalAnswer,
      sources: generation.sources,
      usage: generation.usage,
      contextChunks: retrieval.chunks,
      question: retrieval.sanitizedQuestion,
      diagnostic: {
        totalReceipts: embeddingStatus.total,
        embeddedReceipts: embeddingStatus.synced,
        pendingReceipts: embeddingStatus.pending || 0,
        chunksFound: retrieval.chunks.length
      }
    };
  }
}

const receiptRagService = new ReceiptRagService();

export default receiptRagService;

