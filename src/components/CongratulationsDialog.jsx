import React from 'react';
import PropTypes from 'prop-types';
import { Check } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';

// Dots that burst out around the check when the dialog opens
const BURST = Array.from({ length: 12 }, (_, i) => {
  const angle = (Math.PI * 2 * i) / 12;
  const distance = 44 + (i % 2) * 14;
  return { dx: Math.round(Math.cos(angle) * distance), dy: Math.round(Math.sin(angle) * distance) };
});

const CongratulationsDialog = ({ open, onClose, itemCount, currentDate }) => {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className="sm:max-w-sm p-0 gap-0 overflow-hidden text-center focus-visible:outline-none"
        showCloseButton={false}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          event.currentTarget?.focus?.();
        }}
      >
        <div className="hero-gradient px-6 pt-9 pb-7" style={{ boxShadow: 'none' }}>
          <div className="relative z-10 flex flex-col items-center">
            <div className="relative mb-4">
              <span aria-hidden="true" className="absolute left-1/2 top-1/2">
                {BURST.map(({ dx, dy }, i) => (
                  <span
                    key={i}
                    className="burst-dot bg-primary-foreground"
                    style={{ '--dx': `${dx}px`, '--dy': `${dy}px`, animationDelay: `${150 + i * 15}ms` }}
                  />
                ))}
              </span>
              <span className="size-16 rounded-full bg-primary-foreground text-primary flex items-center justify-center shadow-xl">
                <Check className="size-8 check-pop-in" strokeWidth={3} />
              </span>
            </div>
            <DialogTitle className="text-2xl font-semibold tracking-tight">All bought</DialogTitle>
            <DialogDescription className="mt-1 text-sm opacity-85 text-inherit">
              {currentDate} · {itemCount} {itemCount === 1 ? 'item' : 'items'} checked off
            </DialogDescription>
          </div>
        </div>

        <div className="px-6 py-5">
          <Button onClick={onClose} className="w-full h-11 rounded-xl btn-gradient border-0 hover:opacity-95">
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
