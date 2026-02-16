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

describe('runReceiptOcr (EasyOCR HTTP client v2.1)', () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // -------------------------------------------------------
    // Core functionality
    // -------------------------------------------------------

    it('sends the buffer as multipart/form-data and uses service structured data', async () => {
        const ocrResponse = {
            raw_text: 'SuperMart\n01/15/2025\nApples $3.99\nMilk $2.49\nSubtotal $6.48\nTax $0.52\nTotal $7.00',
            lines: [
                'SuperMart', '01/15/2025', 'Apples $3.99', 'Milk $2.49',
                'Subtotal $6.48', 'Tax $0.52', 'Total $7.00'
            ],
            items: [
                { name: 'Apples', quantity: 1, price: 3.99 },
                { name: 'Milk', quantity: 1, price: 2.49 }
            ],
            merchant: 'SuperMart',
            purchase_date: '01/15/2025',
            total: 7.00,
            subtotal: 6.48,
            tax: 0.52,
            savings: null,
            currency: '$',
            item_count: 2,
            detected_store: 'generic'
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

        // Verify structured output uses service data
        expect(result.rawText).toBe(ocrResponse.raw_text);
        expect(result.merchant).toBe('SuperMart');
        expect(result.purchaseDate).toBe('01/15/2025');
        expect(result.total).toBe(7.00);
        expect(result.subtotal).toBe(6.48);
        expect(result.tax).toBe(0.52);
        expect(result.currency).toBe('$');
        expect(result.items).toBeInstanceOf(Array);
        expect(result.items.length).toBe(2);
        expect(result.items[0].name).toBe('Apples');
        expect(result.items[0].price).toBe(3.99);
        expect(result.items[1].name).toBe('Milk');
        expect(result.itemCount).toBe(2);
        expect(result.detectedStore).toBe('generic');
    });

    // -------------------------------------------------------
    // Indian grocery stores in USA
    // -------------------------------------------------------

    it('handles Indian grocery store in USA (Patel Brothers format)', async () => {
        const ocrResponse = {
            raw_text: 'PATEL BROTHERS\n123 Oak Ave, Edison NJ\n02-15-2025\nToor Dal $4.99\nBasmati Rice 10lb $12.99\nMDH Chana Masala $2.49\nDeep Paneer $3.99\nSubtotal $24.46\nTax $1.56\nTotal $26.02',
            lines: [
                'PATEL BROTHERS', '123 Oak Ave, Edison NJ', '02-15-2025',
                'Toor Dal $4.99', 'Basmati Rice 10lb $12.99',
                'MDH Chana Masala $2.49', 'Deep Paneer $3.99',
                'Subtotal $24.46', 'Tax $1.56', 'Total $26.02'
            ],
            items: [
                { name: 'Toor Dal', quantity: 1, price: 4.99 },
                { name: 'Basmati Rice 10lb', quantity: 1, price: 12.99 },
                { name: 'MDH Chana Masala', quantity: 1, price: 2.49 },
                { name: 'Deep Paneer', quantity: 1, price: 3.99 }
            ],
            merchant: 'Patel Brothers',
            purchase_date: '02-15-2025',
            total: 26.02,
            subtotal: 24.46,
            tax: 1.56,
            savings: null,
            currency: '$',
            item_count: 4,
            detected_store: 'indian_grocery'
        };

        mockFetch.mockResolvedValueOnce(makeMockResponse(ocrResponse));

        const result = await runReceiptOcr(Buffer.from('img'));

        expect(result.merchant).toBe('Patel Brothers');
        expect(result.purchaseDate).toBe('02-15-2025');
        expect(result.total).toBe(26.02);
        expect(result.subtotal).toBe(24.46);
        expect(result.tax).toBe(1.56);
        expect(result.currency).toBe('$');
        expect(result.items.length).toBe(4);
        expect(result.items[0].name).toBe('Toor Dal');
        expect(result.items[1].name).toBe('Basmati Rice 10lb');
        expect(result.items[2].name).toBe('MDH Chana Masala');
        expect(result.items[3].name).toBe('Deep Paneer');
        expect(result.detectedStore).toBe('indian_grocery');
    });

    // -------------------------------------------------------
    // Costco
    // -------------------------------------------------------

    it('handles Costco receipt format (ALL CAPS, item codes)', async () => {
        const ocrResponse = {
            raw_text: 'COSTCO WHOLESALE\n02/15/2025\nMember 1234\n1234567 KS OLIVE OIL 2PK $14.99 E\n2345678 KS TP 36CT $24.99\n3456789 ORGANIC EGGS $6.99\nSubtotal $46.97\nTax $1.20\nTotal $48.17\n3 Items Sold',
            lines: [
                'COSTCO WHOLESALE', '02/15/2025', 'Member 1234',
                '1234567 KS OLIVE OIL 2PK $14.99 E',
                '2345678 KS TP 36CT $24.99',
                '3456789 ORGANIC EGGS $6.99',
                'Subtotal $46.97', 'Tax $1.20', 'Total $48.17',
                '3 Items Sold'
            ],
            items: [
                { name: 'Ks Olive Oil 2Pk', quantity: 1, price: 14.99 },
                { name: 'Ks Tp 36Ct', quantity: 1, price: 24.99 },
                { name: 'Organic Eggs', quantity: 1, price: 6.99 }
            ],
            merchant: 'Costco Wholesale',
            purchase_date: '02/15/2025',
            total: 48.17,
            subtotal: 46.97,
            tax: 1.20,
            savings: null,
            currency: '$',
            item_count: 3,
            detected_store: 'costco'
        };

        mockFetch.mockResolvedValueOnce(makeMockResponse(ocrResponse));

        const result = await runReceiptOcr(Buffer.from('img'));

        expect(result.merchant).toBe('Costco Wholesale');
        expect(result.total).toBe(48.17);
        expect(result.items.length).toBe(3);
        expect(result.itemCount).toBe(3);
        expect(result.detectedStore).toBe('costco');
    });

    // -------------------------------------------------------
    // Walmart
    // -------------------------------------------------------

    it('handles Walmart receipt format (item codes, tax indicators)', async () => {
        const ocrResponse = {
            raw_text: 'WALMART\nStore# 1234\n02/15/2025\nGV MILK GAL $3.48 N\n2 X $1.50 GV BREAD $3.00 N\nTIDE PODS $12.97 T\nSubtotal $19.45\nSales Tax $0.83\nTotal $20.28',
            lines: [
                'WALMART', 'Store# 1234', '02/15/2025',
                'GV MILK GAL $3.48 N',
                '2 X $1.50 GV BREAD $3.00 N',
                'TIDE PODS $12.97 T',
                'Subtotal $19.45', 'Sales Tax $0.83', 'Total $20.28'
            ],
            items: [
                { name: 'Gv Milk Gal', quantity: 1, price: 3.48 },
                { name: 'Gv Bread', quantity: 2, price: 3.00 },
                { name: 'Tide Pods', quantity: 1, price: 12.97 }
            ],
            merchant: 'Walmart',
            purchase_date: '02/15/2025',
            total: 20.28,
            subtotal: 19.45,
            tax: 0.83,
            savings: null,
            currency: '$',
            item_count: 3,
            detected_store: 'walmart'
        };

        mockFetch.mockResolvedValueOnce(makeMockResponse(ocrResponse));

        const result = await runReceiptOcr(Buffer.from('img'));

        expect(result.merchant).toBe('Walmart');
        expect(result.total).toBe(20.28);
        expect(result.tax).toBe(0.83);
        expect(result.items.length).toBe(3);
        expect(result.detectedStore).toBe('walmart');
    });

    // -------------------------------------------------------
    // Target
    // -------------------------------------------------------

    it('handles Target receipt format', async () => {
        const ocrResponse = {
            raw_text: 'TARGET\n02/15/2025\nMARKET PNTRY MILK $3.29 F\nUP&UP TOWELS $5.99 T\nSubtotal $9.28\nSales Tax $0.48\nTotal $9.76',
            lines: [
                'TARGET', '02/15/2025',
                'MARKET PNTRY MILK $3.29 F',
                'UP&UP TOWELS $5.99 T',
                'Subtotal $9.28', 'Sales Tax $0.48', 'Total $9.76'
            ],
            items: [
                { name: 'Market Pntry Milk', quantity: 1, price: 3.29 },
                { name: 'Up&Up Towels', quantity: 1, price: 5.99 }
            ],
            merchant: 'Target',
            purchase_date: '02/15/2025',
            total: 9.76,
            subtotal: 9.28,
            tax: 0.48,
            savings: null,
            currency: '$',
            item_count: 2,
            detected_store: 'target'
        };

        mockFetch.mockResolvedValueOnce(makeMockResponse(ocrResponse));

        const result = await runReceiptOcr(Buffer.from('img'));

        expect(result.merchant).toBe('Target');
        expect(result.total).toBe(9.76);
        expect(result.items.length).toBe(2);
        expect(result.detectedStore).toBe('target');
    });

    // -------------------------------------------------------
    // Fallback + edge cases
    // -------------------------------------------------------

    it('falls back to local parsing when service returns only raw_text', async () => {
        const ocrResponse = {
            raw_text: 'QuickMart\n03/10/2025\nBread $2.50\nButter $3.00\nTotal $5.50',
            lines: [
                'QuickMart', '03/10/2025', 'Bread $2.50', 'Butter $3.00', 'Total $5.50'
            ],
            items: []
        };

        mockFetch.mockResolvedValueOnce(makeMockResponse(ocrResponse));

        const result = await runReceiptOcr(Buffer.from('img'));

        expect(result.rawText).toBe(ocrResponse.raw_text);
        expect(result.merchant).toBe('QuickMart');
        expect(result.purchaseDate).toBe('03/10/2025');
        expect(result.total).toBe(5.50);
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

    it('throws a clear timeout error when the service takes too long', async () => {
        const abortError = new Error('The operation was aborted');
        abortError.name = 'AbortError';
        mockFetch.mockRejectedValueOnce(abortError);

        await expect(runReceiptOcr(Buffer.from('img'))).rejects.toThrow(
            /timed out/
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
            makeMockResponse({
                raw_text: '',
                lines: [],
                items: [],
                merchant: null,
                purchase_date: null,
                total: null,
                subtotal: null,
                tax: null,
                savings: null,
                currency: null,
                item_count: 0,
                detected_store: 'unknown'
            })
        );

        const result = await runReceiptOcr(Buffer.from('blank'));

        expect(result.rawText).toBe('');
        expect(result.merchant).toBeNull();
        expect(result.purchaseDate).toBeNull();
        expect(result.total).toBeNull();
        expect(result.items).toEqual([]);
        expect(result.detectedStore).toBe('unknown');
    });

    it('includes savings information when available', async () => {
        const ocrResponse = {
            raw_text: 'WALMART\n02/15/2025\nGV MILK $3.48\nTotal $3.48\nYou Saved $1.50',
            lines: ['WALMART', '02/15/2025', 'GV MILK $3.48', 'Total $3.48', 'You Saved $1.50'],
            items: [{ name: 'Gv Milk', quantity: 1, price: 3.48 }],
            merchant: 'Walmart',
            purchase_date: '02/15/2025',
            total: 3.48,
            subtotal: null,
            tax: null,
            savings: 1.50,
            currency: '$',
            item_count: 1,
            detected_store: 'walmart'
        };

        mockFetch.mockResolvedValueOnce(makeMockResponse(ocrResponse));

        const result = await runReceiptOcr(Buffer.from('img'));

        expect(result.savings).toBe(1.50);
        expect(result.detectedStore).toBe('walmart');
    });
});
