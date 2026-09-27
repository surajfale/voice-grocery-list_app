/**
 * Format an amount with the receipt's currency. Receipts store either an ISO
 * code ("USD") or a symbol ("$"); prefixing a code produced "USD64.37".
 */
export const formatMoney = (amount, currency) => {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {return '—';}
  if (typeof currency === 'string' && /^[A-Z]{3}$/.test(currency)) {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
    } catch {
      // Unknown code: fall through to the plain format
    }
  }
  return `${currency || '$'}${amount.toFixed(2)}`;
};
