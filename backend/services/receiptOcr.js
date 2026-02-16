/**
 * Receipt OCR client  v2.0
 * ========================
 * Sends image buffers to the external EasyOCR microservice (v2) and returns
 * structured receipt data.
 *
 * The v2 Python service now does all the heavy lifting – structured extraction
 * (merchant, date, total, items) happens server-side with much better accuracy.
 * This client prefers the service's structured data but falls back to local
 * parsing if the service returns only raw text.
 *
 * The public API of `runReceiptOcr(buffer, options)` is intentionally
 * identical to the old Tesseract.js implementation so that callers
 * (receiptController, localReceiptPipeline) need zero changes.
 */

const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL || 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Fallback receipt-text parser (only used if the service doesn't return
// structured fields)
// ---------------------------------------------------------------------------

const CURRENCY_REGEX = /(Rs\.?|₹|\$|£|€)/i;
const AMOUNT_REGEX = /(?:Rs\.?|₹|\$|£|€)?\s?(\d{1,6}(?:\.\d{1,2})?)/i;
const DATE_REGEX = /\b(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}|\d{4}[/\-.]\d{1,2}[/\-.]\d{1,2})\b/;

const parseAmount = (text) => {
  const match = text.match(AMOUNT_REGEX);
  if (!match) {
    return {};
  }

  const currencyMatch = text.match(CURRENCY_REGEX);
  const currencySymbol = currencyMatch ? currencyMatch[1] : null;
  const amountValue = parseFloat(match[1]);

  return {
    currency: currencySymbol,
    amount: Number.isNaN(amountValue) ? null : amountValue
  };
};

const parseItems = (lines) => {
  const items = [];

  lines.forEach((line) => {
    if (!line || line.length < 3) {
      return;
    }

    const amountData = parseAmount(line);
    if (amountData.amount === null) {
      return;
    }

    const name = line.replace(AMOUNT_REGEX, '').replace(CURRENCY_REGEX, '').trim();
    if (!name || name.length < 2) {
      return;
    }

    items.push({
      name,
      quantity: 1,
      price: amountData.amount,
      currency: amountData.currency
    });
  });

  return items;
};

const parseReceiptText = (rawText) => {
  if (!rawText) {
    return {
      merchant: null,
      purchaseDate: null,
      total: null,
      currency: null,
      items: []
    };
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const merchant = lines[0] || null;

  const dateLine = lines.find((line) => DATE_REGEX.test(line));
  const purchaseDate = dateLine ? dateLine.match(DATE_REGEX)?.[0] : null;

  let total = null;
  let currency = null;
  const totalLine = lines.find((line) => /total/i.test(line));

  if (totalLine) {
    const amountData = parseAmount(totalLine);
    total = amountData.amount;
    currency = amountData.currency;
  } else {
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const amountData = parseAmount(lines[i]);
      if (amountData.amount) {
        total = amountData.amount;
        currency = amountData.currency;
        break;
      }
    }
  }

  if (!currency) {
    const symbolMatch = rawText.match(CURRENCY_REGEX);
    currency = symbolMatch ? symbolMatch[1] : null;
  }

  return {
    merchant,
    purchaseDate,
    total,
    currency,
    items: parseItems(lines.slice(1))
  };
};

// ---------------------------------------------------------------------------
// HTTP client → EasyOCR microservice
// ---------------------------------------------------------------------------

/**
 * Send an image buffer to the EasyOCR microservice and return structured
 * receipt data.
 *
 * @param {Buffer} buffer  – Raw image bytes (JPEG / PNG).
 * @param {object} [options]
 * @param {string} [options.language]  – Unused in the new service but kept
 *   for API compatibility.
 * @param {Function} [options.logger]  – Optional progress callback (called
 *   with status messages).
 * @returns {Promise<{rawText:string, merchant:string|null, purchaseDate:string|null, total:number|null, currency:string|null, items:Array}>}
 */
export const runReceiptOcr = async (buffer, {
  language = 'eng',
  logger
} = {}) => {
  const safeLogger = typeof logger === 'function'
    ? logger
    : () => { };

  safeLogger({ status: 'sending image to OCR service', progress: 0.1 });

  // Build multipart/form-data body using the global FormData (Node 18+)
  const blob = new Blob([buffer], { type: 'image/png' });
  const form = new FormData();
  form.append('file', blob, 'receipt.png');

  // 120-second timeout – accounts for Railway cold starts (~30s) plus
  // OCR processing (~15-30s on CPU).  Without a timeout the UI hangs
  // until the platform kills the request.
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
        ? `OCR service timed out after ${TIMEOUT_MS / 1000}s – the image may be too large or the service is overloaded`
        : `OCR service unreachable at ${OCR_SERVICE_URL}: ${networkError.message}`
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown error');
    throw new Error(
      `OCR service returned HTTP ${response.status}: ${errorBody}`
    );
  }

  safeLogger({ status: 'parsing OCR response', progress: 0.8 });

  const data = await response.json();
  const rawText = (data.raw_text || '').trim();

  // The v2 service returns structured data directly – prefer it over
  // local re-parsing which was the source of most accuracy problems.
  const serviceHasStructuredData = data.merchant !== undefined
    || data.purchase_date !== undefined
    || data.total !== undefined
    || (data.items && data.items.length > 0);

  let result;

  if (serviceHasStructuredData) {
    // Use the service's superior extraction, normalise key names to camelCase
    result = {
      rawText,
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
      itemCount: data.item_count ?? (data.items || []).length,
      detectedStore: data.detected_store || 'generic'
    };
  } else {
    // Fallback: re-parse the raw text locally (backward compat)
    const structuredData = parseReceiptText(rawText);
    result = {
      rawText,
      ...structuredData
    };
  }

  safeLogger({ status: 'done', progress: 1.0 });

  return result;
};
