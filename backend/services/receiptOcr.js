import Tesseract from 'tesseract.js';

const CURRENCY_REGEX = /(\$|£|€)/;
const AMOUNT_REGEX = /(\$|£|€)?\s?(\d{1,6}(?:\.\d{2})?)/;
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

export const runReceiptOcr = async (buffer, {
  language = 'eng',
  logger
} = {}) => {
  const result = await Tesseract.recognize(buffer, language, {
    logger
  });

  const rawText = result?.data?.text?.trim() || '';
  const structuredData = parseReceiptText(rawText);

  return {
    rawText,
    ...structuredData
  };
};

