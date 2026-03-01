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

/**
 * Common grocery category keywords — used to tag each chunk so that
 * category-level questions ("how much dairy?") match chunks containing
 * specific items like "yogurt" or "cheese".
 */
const CATEGORY_KEYWORDS = {
    dairy: [
        'milk', 'yogurt', 'yoghurt', 'cheese', 'butter', 'cream', 'curd',
        'paneer', 'ghee', 'whey', 'cottage cheese', 'mozzarella', 'cheddar',
        'parmesan', 'sour cream', 'half and half', 'half & half', 'creamer',
        'kefir', 'ice cream', 'gelato', 'frozen yogurt', 'dannon', 'chobani',
        'yoplait', 'fage', 'oikos', 'siggi', 'lactaid'
    ],
    produce: [
        'apple', 'banana', 'orange', 'grape', 'berry', 'berries', 'strawberry',
        'blueberry', 'raspberry', 'mango', 'pineapple', 'melon', 'watermelon',
        'avocado', 'tomato', 'potato', 'onion', 'garlic', 'ginger', 'pepper',
        'lettuce', 'spinach', 'kale', 'broccoli', 'carrot', 'celery', 'cucumber',
        'zucchini', 'squash', 'corn', 'mushroom', 'cilantro', 'parsley', 'basil',
        'lemon', 'lime', 'peach', 'pear', 'plum', 'cherry', 'fig', 'coconut',
        'cabbage', 'cauliflower', 'asparagus', 'artichoke', 'beet', 'radish',
        'green bean', 'pea', 'eggplant', 'jalapeño', 'habanero', 'serrano',
        'fruit', 'vegetable', 'veggie', 'salad', 'herb', 'organic'
    ],
    meat: [
        'chicken', 'beef', 'pork', 'turkey', 'lamb', 'steak', 'ground meat',
        'sausage', 'bacon', 'ham', 'salami', 'pepperoni', 'hot dog', 'deli',
        'roast', 'ribs', 'wing', 'thigh', 'breast', 'drumstick', 'tenderloin',
        'brisket', 'jerky', 'meatball', 'patty', 'veal', 'goat'
    ],
    seafood: [
        'fish', 'salmon', 'tuna', 'shrimp', 'prawn', 'crab', 'lobster',
        'tilapia', 'cod', 'catfish', 'sardine', 'anchovy', 'oyster', 'clam',
        'mussel', 'scallop', 'squid', 'calamari', 'sushi', 'seafood'
    ],
    bakery: [
        'bread', 'bagel', 'muffin', 'croissant', 'roll', 'bun', 'tortilla',
        'pita', 'naan', 'cake', 'pie', 'cookie', 'donut', 'doughnut',
        'pastry', 'biscuit', 'cracker', 'waffle', 'pancake'
    ],
    beverage: [
        'water', 'juice', 'soda', 'pop', 'cola', 'coffee', 'tea', 'beer',
        'wine', 'spirits', 'liquor', 'cocktail', 'energy drink', 'sport drink',
        'gatorade', 'kombucha', 'smoothie', 'lemonade', 'cider'
    ],
    snacks: [
        'chip', 'chips', 'pretzel', 'popcorn', 'nuts', 'almond', 'cashew',
        'peanut', 'walnut', 'pistachio', 'trail mix', 'granola', 'candy',
        'chocolate', 'gummy', 'snack bar', 'protein bar', 'energy bar'
    ],
    frozen: [
        'frozen', 'pizza', 'frozen meal', 'frozen dinner', 'popsicle',
        'frozen vegetable', 'frozen fruit', 'tv dinner', 'lean cuisine',
        'hot pocket', 'frozen waffle', 'frozen fry', 'frozen fries'
    ],
    grains: [
        'rice', 'pasta', 'noodle', 'cereal', 'oat', 'oatmeal', 'quinoa',
        'flour', 'wheat', 'barley', 'couscous', 'grain'
    ],
    condiments: [
        'sauce', 'ketchup', 'mustard', 'mayo', 'mayonnaise', 'dressing',
        'vinegar', 'oil', 'olive oil', 'soy sauce', 'hot sauce', 'salsa',
        'relish', 'jam', 'jelly', 'honey', 'syrup', 'peanut butter'
    ],
    household: [
        'paper towel', 'toilet paper', 'tissue', 'soap', 'detergent',
        'bleach', 'sponge', 'trash bag', 'plastic wrap', 'foil',
        'cleaning', 'cleaner', 'disinfectant', 'laundry'
    ],
    personal_care: [
        'shampoo', 'conditioner', 'body wash', 'toothpaste', 'toothbrush',
        'deodorant', 'lotion', 'sunscreen', 'razor', 'face wash'
    ]
};

/**
 * Given item names, return the set of matching grocery categories.
 */
const detectCategories = (itemNames = []) => {
    const categories = new Set();
    const lowerNames = itemNames.map((name) => (name || '').toLowerCase());

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        for (const keyword of keywords) {
            if (lowerNames.some((name) => name.includes(keyword))) {
                categories.add(category);
                break; // one match is enough for this category
            }
        }
    }

    return Array.from(categories);
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
    itemCount: Array.isArray(receipt.items) ? receipt.items.length : 0,
    pageCount: typeof receipt.pageCount === 'number' ? receipt.pageCount : 1,
    dimensions: receipt.stitchedDimensions || null
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

        // Detect grocery categories from item names for better semantic retrieval
        const categories = detectCategories(itemNames);
        const categoryLine = categories.length
            ? `Categories: ${categories.join(', ')}`
            : '';

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
                    hasContent: false,
                    categories
                }
            }];
        }

        const textChunks = splitIntoChunks(combinedText, chunkSize);

        return textChunks.map((chunkText, index) => ({
            ...baseChunk,
            chunkIndex: index,
            text: [preamble, categoryLine, chunkText].filter(Boolean).join('\n\n').trim(),
            metadata: {
                ...baseChunk.metadata,
                hasContent: true,
                wordCount: chunkText.split(/\s+/).filter(Boolean).length,
                categories
            }
        }));

    }
}

const receiptChunker = new ReceiptChunker();

export const chunkReceipt = (receipt, options) => receiptChunker.chunkReceipt(receipt, options);

export default receiptChunker;


