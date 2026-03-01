/**
 * Central place to read RAG-related environment variables.
 * Replace default fallbacks with real values when wiring up the pipeline.
 */
export const ragConfig = {
  embeddingsModel: process.env.RAG_EMBEDDINGS_MODEL || 'text-embedding-3-small',
  completionsModel: process.env.RAG_COMPLETIONS_MODEL || 'gpt-4o-mini',
  topK: Number(process.env.RAG_TOP_K || 15),
  chunkSize: Number(process.env.RAG_CHUNK_SIZE || 512),
  vectorIndex: process.env.RAG_VECTOR_INDEX || 'receiptVectorIndex',
  embeddingsVersion: Number(process.env.EMBEDDINGS_VERSION || 1)
};

export default ragConfig;

