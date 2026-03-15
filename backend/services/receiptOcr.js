import { getEmbeddingClient } from '../utils/embeddingClient.js';
import logger from '../utils/logger.js';

/**
 * Receipt OCR client v3.0 (LLM Powered)
 * ========================
 * Sends image buffers to the external EasyOCR/Vision microservice to get raw text,
 * and then uses an LLM (OpenAI) to accurately parse the structured data.
 */

const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL || 'http://localhost:8000';

const SYSTEM_PROMPT = `You are an expert receipt parsing assistant. Given the raw OCR text of a receipt, extract the following information and return it STRICTLY as a JSON object with no markdown formatting.
Required JSON schema:
{
  "merchant": "string or null",
  "purchaseDate": "YYYY-MM-DD string or null",
  "subtotal": number or null,
  "tax": number or null,
  "savings": number or null,
  "total": number or null,
  "currency": "string (e.g. $, ₹) or null",
  "itemCount": number or null,
  "items": [
    {
      "name": "string",
      "quantity": number,
      "price": number,
      "currency": "string"
    }
  ]
}

Important parsing rules:
1. ONLY return valid JSON. Do not include markdown code blocks like \`\`\`json.
2. 'total' must be the grand total charged to the customer. Usually 'subtotal' + 'tax' = 'total'.
3. 'items' should only include actual purchased items. Exclude decorative lines, store policies, barcodes, tips, or payment card details.
4. If an item line shows quantity and unit rate (e.g., "2 x $3.00"), the 'quantity' is 2 and the 'price' is the final extended price ($6.00).
5. 'purchaseDate' should be formatted strictly as YYYY-MM-DD.
6. Use context to determine missing values (e.g., if total is $5.00, use 5.0).`;

/**
 * @param {Buffer} buffer  – Raw image bytes (JPEG / PNG).
 * @param {object} [options]
 * @param {Function} [options.logger]
 */
export const runReceiptOcr = async (buffer, { logger: progressLogger } = {}) => {
  const safeLogger = typeof progressLogger === 'function' ? progressLogger : () => {};

  safeLogger({ status: 'extracting text from image via OCR service', progress: 0.2 });

  const blob = new Blob([buffer], { type: 'image/png' });
  const form = new FormData();
  form.append('file', blob, 'receipt.png');

  const TIMEOUT_MS = 120_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${OCR_SERVICE_URL}/ocr`, {
      method: 'POST',
      body: form,
      signal: controller.signal
    });
  } catch (networkError) {
    clearTimeout(timer);
    const isTimeout = networkError.name === 'AbortError';
    throw new Error(
      isTimeout
        ? `OCR service timed out after ${TIMEOUT_MS / 1000}s`
        : `OCR service unreachable at ${OCR_SERVICE_URL}: ${networkError.message}`
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown error');
    throw new Error(`OCR service returned HTTP ${response.status}: ${errorBody}`);
  }

  safeLogger({ status: 'analyzing receipt text with AI', progress: 0.6 });

  const data = await response.json();
  const rawText = (data.raw_text || '').trim();

  if (!rawText) {
    safeLogger({ status: 'done', progress: 1.0 });
    return { rawText: '', merchant: null, purchaseDate: null, total: null, currency: null, items: [], itemCount: 0, detectedStore: data.detected_store || 'unknown' };
  }

  // Pass to LLM for structured parsing
  let jsonResult;
  try {
    const aiClient = getEmbeddingClient();
    
    // Check if the embedding client is properly configured with an API key
    if (!aiClient.client) {
        throw new Error("OpenAI Client is not configured.");
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Raw Receipt Text:\n${rawText}` }
    ];

    const aiResponse = await aiClient.complete(messages, {
      model: 'gpt-4o-mini',
      maxTokens: 1500,
      temperature: 0,
      requestOptions: {
        response_format: { type: 'json_object' }
      }
    });

    jsonResult = JSON.parse(aiResponse.message.content);
    
  } catch (error) {
    logger.error('Failed to parse OCR via LLM, falling back to Python service output:', error);
    // Fallback to Python's original unstructured/partially structured data
    jsonResult = {
      merchant: data.merchant || null,
      purchaseDate: data.purchase_date || null,
      total: data.total ?? null,
      subtotal: data.subtotal ?? null,
      tax: data.tax ?? null,
      savings: data.savings ?? null,
      currency: data.currency || null,
      items: (data.items || []).map((item) => ({
        name: item.name,
        quantity: item.quantity || 1,
        price: item.price,
        currency: data.currency || null
      })),
      itemCount: data.item_count ?? (data.items || []).length
    };
  }

  safeLogger({ status: 'done', progress: 1.0 });

  return {
    rawText,
    merchant: jsonResult.merchant || null,
    purchaseDate: jsonResult.purchaseDate || null,
    subtotal: jsonResult.subtotal ?? null,
    tax: jsonResult.tax ?? null,
    total: jsonResult.total ?? null,
    savings: jsonResult.savings ?? null,
    currency: jsonResult.currency || null,
    items: Array.isArray(jsonResult.items) ? jsonResult.items : [],
    itemCount: jsonResult.itemCount ?? (jsonResult.items ? jsonResult.items.length : 0),
    detectedStore: data.detected_store || 'generic'
  };
};
