import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import OpenAI, { APIConnectionError } from 'openai';
import { getEmbeddingClient } from '../embeddingClient.js';

// Hoist mocks to prevent access errors in factory
const mocks = vi.hoisted(() => ({
    mockCreateEmbeddings: vi.fn(),
    mockCreateCompletions: vi.fn(),
}));

vi.mock('openai', async (importOriginal) => {
    const actual = await importOriginal();

    class MockOpenAI {
        constructor() {
            this.embeddings = {
                create: mocks.mockCreateEmbeddings,
            };
            this.chat = {
                completions: {
                    create: mocks.mockCreateCompletions,
                },
            };
        }
    }

    return {
        ...actual,
        default: MockOpenAI,
        APIConnectionError: actual.APIConnectionError,
    };
});

// Mock config to speed up retries during test
vi.mock('../../config/ragConfig.js', () => ({
    default: {
        embeddingsModel: 'test-embedding-model',
        completionsModel: 'test-completion-model',
    },
}));

describe('EmbeddingClient', () => {
    let originalEnv;

    beforeEach(() => {
        originalEnv = process.env;
        process.env = { ...originalEnv, OPENAI_API_KEY: 'test-key', RAG_CLIENT_RETRY_DELAY_MS: '10' };
        vi.clearAllMocks();

        // Reset singleton if possible
        const client = getEmbeddingClient();
        client.client = new OpenAI(); // Re-initialize mock client
        client.baseDelayMs = 10; // Speed up tests
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('should retry on APIConnectionError', async () => {
        const client = getEmbeddingClient();

        const connectionError = new APIConnectionError({ message: 'Connection error' });
        connectionError.status = undefined;

        // Setup mock: Fail twice, then succeed
        mocks.mockCreateEmbeddings
            .mockRejectedValueOnce(connectionError)
            .mockRejectedValueOnce(connectionError)
            .mockResolvedValueOnce({
                data: [{ embedding: [0.1, 0.2] }],
                usage: { total_tokens: 10 },
            });

        const texts = ['test text'];
        const result = await client.embedBatch(texts);

        expect(mocks.mockCreateEmbeddings).toHaveBeenCalledTimes(3);
        expect(result.embeddings).toHaveLength(1);
        expect(result.embeddings[0]).toEqual([0.1, 0.2]);
    });

    it('should fail after max retries if connection error persists', async () => {
        const client = getEmbeddingClient();

        const connectionError = new APIConnectionError({ message: 'Persistent connection error' });
        connectionError.status = undefined;

        mocks.mockCreateEmbeddings.mockRejectedValue(connectionError);

        // Expect the raw error to be thrown
        await expect(client.embedBatch(['test'])).rejects.toThrow('Persistent connection error');

        // Default max attempts is 3
        expect(mocks.mockCreateEmbeddings).toHaveBeenCalledTimes(3);
    });
});
