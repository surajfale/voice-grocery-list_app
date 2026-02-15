import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to mock fetch before importing the module
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Dynamic import so the module picks up our stubbed fetch
const { runReceiptOcr } = await import('../../services/receiptOcr.js');

const makeMockResponse = (body, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body))
});

describe('runReceiptOcr (EasyOCR HTTP client)', () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('sends the buffer as multipart/form-data and returns structured data', async () => {
        const ocrResponse = {
            raw_text: 'SuperMart\n01/15/2025\nApples $3.99\nMilk $2.49\nTotal $6.48',
            lines: [
                'SuperMart',
                '01/15/2025',
                'Apples $3.99',
                'Milk $2.49',
                'Total $6.48'
            ],
            items: [
                { name: 'Apples', quantity: 1, price: 3.99, currency: '$' },
                { name: 'Milk', quantity: 1, price: 2.49, currency: '$' }
            ]
        };

        mockFetch.mockResolvedValueOnce(makeMockResponse(ocrResponse));

        const buffer = Buffer.from('fake-image-bytes');
        const result = await runReceiptOcr(buffer);

        // Verify fetch was called correctly
        expect(mockFetch).toHaveBeenCalledOnce();
        const [url, options] = mockFetch.mock.calls[0];
        expect(url).toContain('/ocr');
        expect(options.method).toBe('POST');
        expect(options.body).toBeInstanceOf(FormData);

        // Verify structured output
        expect(result.rawText).toBe(ocrResponse.raw_text);
        expect(result.merchant).toBe('SuperMart');
        expect(result.purchaseDate).toBe('01/15/2025');
        expect(result.total).toBe(6.48);
        expect(result.currency).toBe('$');
        expect(result.items).toBeInstanceOf(Array);
        expect(result.items.length).toBeGreaterThan(0);
    });

    it('calls the optional logger with progress updates', async () => {
        mockFetch.mockResolvedValueOnce(
            makeMockResponse({ raw_text: '', lines: [], items: [] })
        );

        const logMessages = [];
        const logger = (msg) => logMessages.push(msg);

        await runReceiptOcr(Buffer.from('img'), { logger });

        expect(logMessages.length).toBeGreaterThanOrEqual(2);
        expect(logMessages[0]).toHaveProperty('status');
        expect(logMessages[logMessages.length - 1].status).toBe('done');
    });

    it('throws a clear error when the service is unreachable', async () => {
        mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

        await expect(runReceiptOcr(Buffer.from('img'))).rejects.toThrow(
            /OCR service unreachable/
        );
    });

    it('throws when the service returns a non-200 status', async () => {
        mockFetch.mockResolvedValueOnce(
            makeMockResponse({ detail: 'bad image' }, 400)
        );

        await expect(runReceiptOcr(Buffer.from('img'))).rejects.toThrow(
            /OCR service returned HTTP 400/
        );
    });

    it('handles empty OCR text gracefully', async () => {
        mockFetch.mockResolvedValueOnce(
            makeMockResponse({ raw_text: '', lines: [], items: [] })
        );

        const result = await runReceiptOcr(Buffer.from('blank'));

        expect(result.rawText).toBe('');
        expect(result.merchant).toBeNull();
        expect(result.purchaseDate).toBeNull();
        expect(result.total).toBeNull();
        expect(result.items).toEqual([]);
    });
});
