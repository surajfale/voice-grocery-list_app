import ragConfig from '../config/ragConfig.js';

const MIN_CHUNK_WORDS = 50;
const MAX_CHUNK_WORDS = 200;

const resolveChunkSize = (size) => {
    const parsed = Number(size);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return 150;
    }

    return Math.max(MIN_CHUNK_WORDS, Math.min(parsed, MAX_CHUNK_WORDS));
};

const normalizeWhitespace = (text = '') => {
    return text
        .replace(/\r\n/g, '\n')
        .replace(/[^\S\n]+/g, ' ')
        .replace(/-{2,}/g, '-')
        .replace(/[=]{2,}/g, '=')
        .replace(/\s*\|\s*/g, ' | ')
        .replace(/\n{2,}/g, '\n')
        .replace(/[^\x20-\x7E\n]/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
};

const formatCurrency = (value, currency) => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return 'Unknown total';
    }

    const normalizedCurrency = currency || 'USD';
    return `${normalizedCurrency.toUpperCase()} ${value.toFixed(2)}`;
};

const formatItemsList = (items = []) => {
    return items
        .map((item) => {
            if (!item || !item.name) {
                return '';
            }
            const parts = [item.name.trim()];
            if (item.quantity && item.quantity !== 1) {
                parts.push(`x${item.quantity}`);
            }
            if (typeof item.price === 'number' && !Number.isNaN(item.price)) {
                parts.push(`@ ${item.price.toFixed(2)}`);
            }
            return parts.join(' ').trim();
        })
        .filter(Boolean)
        .join('; ');
};

const splitIntoChunks = (text, chunkSize) => {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
        return [];
    }

    const chunks = [];
    for (let i = 0; i < words.length; i += chunkSize) {
        const segment = words.slice(i, i + chunkSize).join(' ');
        chunks.push(segment);
    }

    return chunks;
};

const buildPreamble = (receipt) => {
    const merchant = receipt.merchant?.trim() || 'Unknown merchant';
    const purchaseDate = receipt.purchaseDate || 'Unknown date';
    const total = formatCurrency(receipt.total, receipt.currency);

    return `Receipt summary — Merchant: ${merchant} | Date: ${purchaseDate} | Total: ${total}`;
};

const buildMetadata = (receipt, chunkSize) => ({
    currency: receipt.currency || 'USD',
    source: 'receipt',
    chunkSizeWords: chunkSize,
    hasRawText: Boolean(receipt.rawText),
    itemCount: Array.isArray(receipt.items) ? receipt.items.length : 0
});

export class ReceiptChunker {
    constructor(config = {}) {
        this.defaultChunkSize = resolveChunkSize(config.chunkSize ?? ragConfig.chunkSize);
    }

    chunkReceipt(receipt, options = {}) {
        if (!receipt) {
            throw new Error('Receipt is required for chunking.');
        }

        if (!receipt.userId) {
            throw new Error('Receipt must include userId to generate chunks.');
        }

        if (!receipt._id && !receipt.id) {
            throw new Error('Receipt must include _id or id to generate chunks.');
        }

        const chunkSize = resolveChunkSize(options.chunkSize ?? this.defaultChunkSize);
        const normalizedText = normalizeWhitespace(receipt.rawText || '');
        const formattedItems = formatItemsList(receipt.items);
        const combinedText = [normalizedText, formattedItems].filter(Boolean).join('\n\n').trim();
        const preamble = buildPreamble(receipt);
        const itemNames = Array.isArray(receipt.items)
            ? receipt.items.map((item) => item?.name).filter(Boolean)
            : [];

        const baseChunk = {
            receiptId: receipt._id || receipt.id,
            userId: receipt.userId,
            merchant: receipt.merchant || null,
            purchaseDate: receipt.purchaseDate || null,
            total: typeof receipt.total === 'number' ? receipt.total : null,
            items: itemNames,
            metadata: buildMetadata(receipt, chunkSize)
        };

        if (!combinedText) {
            return [{
                ...baseChunk,
                chunkIndex: 0,
                text: `${preamble}\n\nNo additional receipt details were provided.`,
                metadata: {
                    ...baseChunk.metadata,
                    hasContent: false
                }
            }];
        }

        const textChunks = splitIntoChunks(combinedText, chunkSize);

        return textChunks.map((chunkText, index) => ({
            ...baseChunk,
            chunkIndex: index,
            text: `${preamble}\n\n${chunkText}`.trim(),
            metadata: {
                ...baseChunk.metadata,
                hasContent: true,
                wordCount: chunkText.split(/\s+/).filter(Boolean).length
            }
        }));
    }
}

const receiptChunker = new ReceiptChunker();

export const chunkReceipt = (receipt, options) => receiptChunker.chunkReceipt(receipt, options);

export default receiptChunker;


