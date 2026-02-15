/**
 * Receipt OCR client
 * ==================
 * Sends image buffers to the external EasyOCR microservice and parses
 * the structured JSON response into the same shape the rest of the app
 * expects (rawText, merchant, purchaseDate, total, currency, items).
 *
 * The public API of `runReceiptOcr(buffer, options)` is intentionally
 * identical to the old Tesseract.js implementation so that callers
 * (receiptController, localReceiptPipeline) need zero changes.
 */

const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL || 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Receipt‑text parser (unchanged from original Tesseract version)
// ---------------------------------------------------------------------------

const CURRENCY_REGEX = /(\$|£|€|₹)/;
const AMOUNT_REGEX = /(\$|£|€|₹)?\s?(\d{1,6}(?:\.\d{2})?)/;
const DATE_REGEX = /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/;

const parseAmount = (text) => {
  const match = text.match(AMOUNT_REGEX);
  if (!match) {
    return {};
  }

  const currencySymbol = match[1] || null;
  const amountValue = parseFloat(match[2]);

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

    const name = line.replace(AMOUNT_REGEX, '').trim();
    if (!name) {
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

  let response;
  try {
    response = await fetch(`${OCR_SERVICE_URL}/ocr`, {
      method: 'POST',
      body: form
    });
  } catch (networkError) {
    throw new Error(
      `OCR service unreachable at ${OCR_SERVICE_URL}: ${networkError.message}`
    );
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

  // Run the same structured parser on the raw text so that the caller
  // receives merchant / date / total / items fields exactly as before.
  const structuredData = parseReceiptText(rawText);

  safeLogger({ status: 'done', progress: 1.0 });

  return {
    rawText,
    ...structuredData
  };
};
