import 'dotenv/config';
import OpenAI, { APIConnectionError, APIConnectionTimeoutError } from 'openai';
import ragConfig from '../config/ragConfig.js';

const DEFAULT_MAX_ATTEMPTS = Number(process.env.RAG_CLIENT_MAX_ATTEMPTS || 3);
const DEFAULT_BASE_DELAY_MS = Number(process.env.RAG_CLIENT_RETRY_DELAY_MS || 1000);
const DEFAULT_COMPLETIONS_TEMPERATURE = Number(process.env.RAG_COMPLETIONS_TEMPERATURE ?? 0.2);
const RETRYABLE_STATUS_CODES = new Set([408, 409, 429, 500, 502, 503, 504]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const maskApiKey = (key) => {
  if (!key || key.length < 8) {
    return '***';
  }
  return `${key.slice(0, 4)}***${key.slice(-4)}`;
};

class EmbeddingClient {
  constructor() {
    this.maxAttempts = DEFAULT_MAX_ATTEMPTS;
    this.baseDelayMs = DEFAULT_BASE_DELAY_MS;
    this.temperature = DEFAULT_COMPLETIONS_TEMPERATURE;
    this.initializeClient();
  }

  initializeClient() {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      console.warn('⚠️ OPENAI_API_KEY is not set. RAG features will be disabled.');
      this.client = null;
      return;
    }

    try {
      this.client = new OpenAI({ apiKey });
      console.info(`🧠 OpenAI client initialized (key: ${maskApiKey(apiKey)})`);
    } catch (error) {
      console.error('❌ Failed to initialize OpenAI client:', error);
      this.client = null;
    }
  }

  ensureClient() {
    if (!this.client) {
      throw new Error('OpenAI client is not configured. Please set OPENAI_API_KEY.');
    }
  }

  async executeWithRetry(operation, label = 'OpenAI request') {
    let attempt = 0;
    const maxAttempts = this.maxAttempts;

    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        return await operation();
      } catch (error) {
        const status = error?.status || error?.response?.status;

        const retryable = RETRYABLE_STATUS_CODES.has(status) ||
          error instanceof APIConnectionError ||
          error instanceof APIConnectionTimeoutError ||
          error?.constructor?.name === 'APIConnectionError' ||
          error?.constructor?.name === 'APIConnectionTimeoutError';

        if (attempt >= maxAttempts || !retryable) {
          console.error(`❌ ${label} failed after ${attempt} attempt(s):`, error?.message || error);
          if (error?.cause) console.error('   Caused by:', error.cause);
          throw error;
        }

        const delay = this.baseDelayMs * Math.pow(2, attempt - 1);
        console.warn(`⚠️ ${label} attempt ${attempt} failed (status: ${status}). Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }

    throw new Error(`${label} failed after ${maxAttempts} attempts.`);
  }

  async embedBatch(texts, options = {}) {
    this.ensureClient();

    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error('embedBatch requires a non-empty array of strings.');
    }

    const model = options.model || ragConfig.embeddingsModel;

    return this.executeWithRetry(async () => {
      const response = await this.client.embeddings.create({
        model,
        input: texts,
        ...options.requestOptions
      });

      return {
        model: response.model || model,
        embeddings: response.data.map((entry) => entry.embedding),
        usage: response.usage || null
      };
    }, 'embeddings.create');
  }

  async embedText(text, options = {}) {
    if (typeof text !== 'string' || !text.trim()) {
      throw new Error('embedText requires a non-empty string.');
    }

    const { embeddings, usage, model } = await this.embedBatch([text], options);
    return {
      embedding: embeddings[0],
      usage,
      model
    };
  }

  async complete(messages, options = {}) {
    this.ensureClient();

    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('complete requires at least one message.');
    }

    const model = options.model || ragConfig.completionsModel;
    const temperature = typeof options.temperature === 'number' ? options.temperature : this.temperature;
    const maxTokens = options.maxTokens || 512;

    const response = await this.executeWithRetry(async () => {
      return this.client.chat.completions.create({
        model,
        temperature,
        max_tokens: maxTokens,
        messages,
        ...options.requestOptions
      });
    }, 'chat.completions.create');

    return {
      id: response.id,
      model: response.model,
      usage: response.usage,
      message: response.choices?.[0]?.message,
      raw: response
    };
  }
}

let singletonClient;

export const getEmbeddingClient = () => {
  if (!singletonClient) {
    singletonClient = new EmbeddingClient();
  }
  return singletonClient;
};

export default getEmbeddingClient;

