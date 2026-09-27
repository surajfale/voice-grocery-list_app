import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { Pencil, Store, CalendarDays, Loader2 } from 'lucide-react';
import { Dialog, DialogContent } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import DialogHero from '../DialogHero';

const MERCHANT_MAX_LENGTH = 120; // mirrors backend validateReceiptUpdate

/**
 * Lets the user correct what OCR got wrong: the store name and purchase date.
 * Only changed fields are sent; errors stay inline and keep the dialog open.
 */
const EditReceiptDialog = ({ open, receipt, onOpenChange, onSave }) => {
  const [merchant, setMerchant] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Reset the form each time the dialog opens for a receipt
  useEffect(() => {
    if (open && receipt) {
      setMerchant(receipt.merchant || '');
      setPurchaseDate(receipt.purchaseDate || '');
      setError('');
      setSaving(false);
    }
  }, [open, receipt]);

  if (!receipt) {
    return null;
  }

  const today = dayjs().format('YYYY-MM-DD');
  const trimmed = merchant.trim();
  const updates = {};
  if (trimmed && trimmed !== (receipt.merchant || '')) { updates.merchant = trimmed; }
  if (purchaseDate && purchaseDate !== (receipt.purchaseDate || '')) { updates.purchaseDate = purchaseDate; }
  const hasChanges = Object.keys(updates).length > 0;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!trimmed) {
      setError('Store name can’t be empty.');
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

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md p-0 gap-0 overflow-hidden focus-visible:outline-none"
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
        <form onSubmit={handleSubmit} className="px-6 pt-5 pb-6 space-y-4">
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
                aria-invalid={Boolean(error) && !trimmed}
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
            <p className="text-xs text-muted-foreground">
              Updates spending totals and what the receipt assistant sees.
            </p>
          </div>

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button type="button" variant="outline" className="h-11 rounded-xl" disabled={saving} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="h-11 rounded-xl btn-gradient border-0 hover:opacity-95" disabled={saving || !hasChanges}>
              {saving && <Loader2 className="animate-spin" />}
              {saving ? 'Saving…' : 'Save'}
            </Button>
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
  }),
  onOpenChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default EditReceiptDialog;
