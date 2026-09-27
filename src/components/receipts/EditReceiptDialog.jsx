import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { Pencil, Store, CalendarDays, Loader2, Plus, X } from 'lucide-react';
import { Dialog, DialogContent } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import DialogHero from '../DialogHero';
import { formatMoney } from '../../utils/money';
import { getCategoryStyle } from '../../utils/categoryStyles';
import { RECEIPT_CATEGORIES } from '../../utils/receiptInsights';

// Mirror backend validateReceiptUpdate limits
const MERCHANT_MAX_LENGTH = 120;
const ITEM_NAME_MAX_LENGTH = 120;
const MAX_ITEMS = 200;

let rowKey = 0;
const toRow = (item = {}) => ({
  key: ++rowKey,
  name: item.name || '',
  quantity: item.quantity !== undefined && item.quantity !== null ? String(item.quantity) : '1',
  price: typeof item.price === 'number' ? item.price.toFixed(2) : '',
  category: item.category || '', // '' = auto (guess from the name)
});

/** Same shape the backend stores, for change detection */
const normalizeItems = (items = []) => items.map((item) => ({
  name: (item.name || '').trim().replace(/\s+/g, ' '),
  quantity: item.quantity ?? 1,
  price: typeof item.price === 'number' ? Math.round(item.price * 100) / 100 : null,
  ...(item.category ? { category: item.category } : {}),
}));

const parseAmount = (value) => {
  const cleaned = String(value).replace(/[^0-9.-]/g, '');
  return cleaned === '' ? null : Number(cleaned);
};

/**
 * Parses the editable rows; returns { items } or { error } naming the row.
 */
const parseRows = (rows) => {
  const items = [];
  for (const [index, row] of rows.entries()) {
    const label = `Item ${index + 1}`;
    const name = row.name.trim().replace(/\s+/g, ' ');
    if (!name) { return { error: `${label} needs a name.` }; }
    const quantity = row.quantity.trim() === '' ? 1 : Number(row.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) { return { error: `${label}: quantity must be more than 0.` }; }
    const price = parseAmount(row.price);
    if (price !== null && !Number.isFinite(price)) { return { error: `${label}: price isn’t a number.` }; }
    items.push({
      name,
      quantity,
      price: price === null ? null : Math.round(price * 100) / 100,
      ...(row.category ? { category: row.category } : {}),
    });
  }
  return { items };
};

/**
 * Compact category chip for an item row. Empty value = "Auto": the spending
 * charts use the guess (remembered pick or keyword match) shown in the label.
 */
const CategoryPicker = ({ value, guess, label, onChange }) => {
  const shown = value || guess;
  const { emoji, hue } = getCategoryStyle(shown);
  return (
    <div className="col-span-3 -mt-0.5 flex items-center gap-2">
      <span
        aria-hidden="true"
        className="cat-tile size-6 rounded-md flex items-center justify-center text-xs shrink-0"
        style={{ '--cat-h': hue }}
      >
        {emoji}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className={`h-7 min-w-0 max-w-full rounded-md border border-transparent bg-transparent pl-1 pr-6 text-xs font-medium hover:border-border focus-visible:border-ring focus-visible:outline-none cursor-pointer ${
          value ? 'text-foreground' : 'text-muted-foreground'
        }`}
      >
        <option value="">Auto · {guess}</option>
        {RECEIPT_CATEGORIES.map((category) => (
          <option key={category} value={category}>{category}</option>
        ))}
      </select>
    </div>
  );
};

CategoryPicker.propTypes = {
  value: PropTypes.string.isRequired,
  guess: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

/**
 * Lets the user correct what OCR got wrong: store name, purchase date, line
 * items (including their spending category) and total. Only changed fields are sent; errors stay inline and keep
 * the dialog open.
 */
const EditReceiptDialog = ({ open, receipt, onOpenChange, onSave, guessCategory = () => 'Other' }) => {
  const [merchant, setMerchant] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const focusRowKey = useRef(null);
  const listRef = useRef(null);

  // Reset the form when the dialog opens (or switches receipt) — not on every
  // new receipt object: the selected receipt is re-fetched after selection,
  // and that refresh must not wipe what the user is typing
  const receiptRef = useRef(receipt);
  receiptRef.current = receipt;
  const receiptId = receipt?._id;
  useEffect(() => {
    const current = receiptRef.current;
    if (open && current) {
      setMerchant(current.merchant || '');
      setPurchaseDate(current.purchaseDate || '');
      setRows((current.items || []).filter((item) => item?.name).map(toRow));
      setTotal(typeof current.total === 'number' ? current.total.toFixed(2) : '');
      setError('');
      setSaving(false);
    }
  }, [open, receiptId]);

  // Focus the name field of a freshly added row
  useEffect(() => {
    if (focusRowKey.current === null) { return; }
    const input = listRef.current?.querySelector(`[data-row="${focusRowKey.current}"] input`);
    input?.focus();
    input?.scrollIntoView({ block: 'nearest' });
    focusRowKey.current = null;
  }, [rows]);

  if (!receipt) {
    return null;
  }

  const currency = receipt.currency;
  const today = dayjs().format('YYYY-MM-DD');
  const trimmedMerchant = merchant.trim();
  const parsed = parseRows(rows);
  const parsedTotal = parseAmount(total);

  const updates = {};
  if (trimmedMerchant && trimmedMerchant !== (receipt.merchant || '')) { updates.merchant = trimmedMerchant; }
  if (purchaseDate && purchaseDate !== (receipt.purchaseDate || '')) { updates.purchaseDate = purchaseDate; }
  if (parsed.items && JSON.stringify(parsed.items) !== JSON.stringify(normalizeItems((receipt.items || []).filter((item) => item?.name)))) {
    updates.items = parsed.items;
  }
  if (parsedTotal !== null && Number.isFinite(parsedTotal) && parsedTotal !== receipt.total) {
    updates.total = Math.round(parsedTotal * 100) / 100;
  }
  // A row that doesn't parse is still an edit: keep Save enabled so submitting
  // explains what's wrong instead of silently doing nothing
  const hasChanges = Object.keys(updates).length > 0 || Boolean(parsed.error);

  // Line prices are line totals, so the sum is directly comparable to the total
  const itemsSum = (parsed.items || []).reduce((sum, item) => sum + (item.price ?? 0), 0);
  const hasPrices = (parsed.items || []).some((item) => item.price !== null);
  const sumDiffers = hasPrices && parsedTotal !== null && Math.abs(itemsSum - parsedTotal) >= 0.005;

  const updateRow = (key, field, value) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
  };

  const addRow = () => {
    const row = toRow();
    focusRowKey.current = row.key;
    setRows((prev) => [...prev, row]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!trimmedMerchant) {
      setError('Store name can’t be empty.');
      return;
    }
    if (parsed.error) {
      setError(parsed.error);
      return;
    }
    if (total.trim() !== '' && (!Number.isFinite(parsedTotal) || parsedTotal < 0)) {
      setError('Total must be a positive number.');
      return;
    }
    if (!hasChanges) {
      onOpenChange(false);
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSave(receipt._id, updates);
      onOpenChange(false);
    } catch (saveError) {
      setError(saveError.message || 'Couldn’t save changes. Please try again.');
      setSaving(false);
    }
  };

  const amountInputClass = 'h-10 rounded-lg px-2 text-right tabular-nums';

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-lg p-0 gap-0 overflow-hidden focus-visible:outline-none"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          event.currentTarget?.focus?.();
        }}
      >
        <DialogHero
          icon={Pencil}
          title="Edit receipt"
          description="Fix anything the scan got wrong."
          showClose={!saving}
        />
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[calc(100dvh-11rem)]">
          <div className="flex-1 overflow-y-auto px-6 pt-5 pb-4 space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="receipt-merchant">Store name</Label>
                <div className="relative">
                  <Store className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    id="receipt-merchant"
                    value={merchant}
                    maxLength={MERCHANT_MAX_LENGTH}
                    onChange={(event) => setMerchant(event.target.value)}
                    placeholder="e.g. Trader Joe’s"
                    autoComplete="off"
                    className="pl-9 h-11 rounded-xl"
                    aria-invalid={Boolean(error) && !trimmedMerchant}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="receipt-date">Purchase date</Label>
                <div className="relative">
                  <CalendarDays className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    id="receipt-date"
                    type="date"
                    value={purchaseDate}
                    max={today}
                    onChange={(event) => setPurchaseDate(event.target.value)}
                    className="pl-9 h-11 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Line items */}
            <fieldset>
              <div className="flex items-baseline justify-between mb-2">
                <legend className="text-sm font-medium">Items</legend>
                <span className="text-xs text-muted-foreground tabular-nums">{rows.length}</span>
              </div>

              {rows.length > 0 && (
                <div className="grid grid-cols-[minmax(0,1fr)_3.25rem_5.5rem_2rem] gap-1.5 px-0.5 mb-1 text-[11px] font-medium text-muted-foreground">
                  <span>Name</span>
                  <span className="text-right">Qty</span>
                  <span className="text-right">Price</span>
                  <span />
                </div>
              )}

              <ul ref={listRef} className="space-y-3">
                {rows.map((row, index) => (
                  <li
                    key={row.key}
                    data-row={row.key}
                    className="grid grid-cols-[minmax(0,1fr)_3.25rem_5.5rem_2rem] gap-1.5 items-center"
                  >
                    <Input
                      value={row.name}
                      maxLength={ITEM_NAME_MAX_LENGTH}
                      onChange={(event) => updateRow(row.key, 'name', event.target.value)}
                      aria-label={`Item ${index + 1} name`}
                      placeholder="Item name"
                      autoComplete="off"
                      className="h-10 rounded-lg px-2.5"
                    />
                    <Input
                      value={row.quantity}
                      inputMode="decimal"
                      onChange={(event) => updateRow(row.key, 'quantity', event.target.value)}
                      aria-label={`Item ${index + 1} quantity`}
                      className={amountInputClass}
                    />
                    <Input
                      value={row.price}
                      inputMode="decimal"
                      onChange={(event) => updateRow(row.key, 'price', event.target.value)}
                      aria-label={`Item ${index + 1} price`}
                      placeholder="—"
                      className={amountInputClass}
                    />
                    <button
                      type="button"
                      onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                      aria-label={`Remove ${row.name.trim() || `item ${index + 1}`}`}
                      className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <X className="size-4" />
                    </button>
                    <CategoryPicker
                      value={row.category}
                      guess={guessCategory(row.name)}
                      label={`Item ${index + 1} category`}
                      onChange={(value) => updateRow(row.key, 'category', value)}
                    />
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={addRow}
                disabled={rows.length >= MAX_ITEMS}
                className="mt-2 w-full h-10 rounded-lg border border-dashed border-primary/40 text-sm font-medium text-primary inline-flex items-center justify-center gap-1.5 hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                <Plus className="size-4" />
                Add item
              </button>
            </fieldset>

            {/* Total */}
            <div className="space-y-1.5">
              <Label htmlFor="receipt-total">Total</Label>
              <Input
                id="receipt-total"
                value={total}
                inputMode="decimal"
                onChange={(event) => setTotal(event.target.value)}
                placeholder="0.00"
                className="h-11 rounded-xl tabular-nums text-base font-semibold"
              />
              {sumDiffers && (
                <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
                  Items add up to <span className="font-medium text-foreground tabular-nums">{formatMoney(itemsSum, currency)}</span>
                  <button
                    type="button"
                    onClick={() => setTotal(itemsSum.toFixed(2))}
                    className="font-medium text-primary hover:underline"
                  >
                    Use sum of items
                  </button>
                </p>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Changes update spending totals and what the receipt assistant sees.
            </p>
          </div>

          <div className="px-6 pt-3 pb-6 border-t border-border space-y-3">
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" className="h-11 rounded-xl" disabled={saving} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="h-11 rounded-xl btn-gradient border-0 hover:opacity-95" disabled={saving || !hasChanges}>
                {saving && <Loader2 className="animate-spin" />}
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

EditReceiptDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  receipt: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    merchant: PropTypes.string,
    purchaseDate: PropTypes.string,
    total: PropTypes.number,
    currency: PropTypes.string,
    items: PropTypes.array,
  }),
  onOpenChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  guessCategory: PropTypes.func,
};

export default EditReceiptDialog;
