/**
 * Central place to read RAG-related environment variables.
 * Replace default fallbacks with real values when wiring up the pipeline.
 */
export const ragConfig = {
  embeddingsModel: process.env.RAG_EMBEDDINGS_MODEL || 'text-embedding-3-large',
  completionsModel: process.env.RAG_COMPLETIONS_MODEL || 'gpt-4o',
  topK: Number(process.env.RAG_TOP_K || 15),
  numCandidates: Number(process.env.RAG_NUM_CANDIDATES || 150),
  chunkSize: Number(process.env.RAG_CHUNK_SIZE || 512),
  vectorIndex: process.env.RAG_VECTOR_INDEX || 'receiptVectorIndex',
  embeddingsVersion: Number(process.env.EMBEDDINGS_VERSION || 3),
  /** Number of chunks to retrieve in first-pass vector search for hybrid retrieval */
  hybridTopK: Number(process.env.RAG_HYBRID_TOP_K || 50),
  /** Maximum number of receipts to include in the LLM context window */
  maxContextReceipts: Number(process.env.RAG_MAX_CONTEXT_RECEIPTS || 30)
};

export default ragConfig;

