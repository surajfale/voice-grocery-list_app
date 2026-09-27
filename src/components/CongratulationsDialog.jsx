import React from 'react';
import PropTypes from 'prop-types';
import { Check } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';

const CongratulationsDialog = ({ open, onClose, itemCount, currentDate }) => {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-sm text-center">
        <div className="pt-2">
          <div className="size-14 rounded-full bg-success/12 text-success mx-auto mb-4 flex items-center justify-center animate-in zoom-in-50 fade-in duration-300 ease-out">
            <Check className="size-7" strokeWidth={2.5} />
          </div>

          <DialogTitle className="text-xl font-semibold tracking-tight">All bought</DialogTitle>
          <DialogDescription className="mt-1.5">
            {currentDate} · {itemCount} {itemCount === 1 ? 'item' : 'items'} checked off
          </DialogDescription>

          <Button onClick={onClose} className="mt-6 w-full">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

CongratulationsDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  itemCount: PropTypes.number.isRequired,
  currentDate: PropTypes.string.isRequired,
};

export default CongratulationsDialog;
