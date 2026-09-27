import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { ArrowRight, SpellCheck } from 'lucide-react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import DialogHero from './DialogHero';
import { getCategoryStyle } from '../utils/categoryStyles';

const CorrectionDialog = memo(({
  open,
  corrections,
  onAccept,
  onReject,
  onClose
}) => {
  if (!open || corrections.length === 0) {return null;}

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose?.()}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md p-0 gap-0 overflow-hidden focus-visible:outline-none"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          event.currentTarget?.focus?.();
        }}
      >
        <DialogHero
          icon={SpellCheck}
          title="Check spelling"
          description={corrections.length === 1
            ? 'This item looks misspelled. Use the suggestion or keep what you typed.'
            : `${corrections.length} items look misspelled. Use the suggestions or keep what you typed.`}
        />

        <div className="px-6 pt-5 pb-6 space-y-5">
          <ul className="space-y-2 max-h-[45vh] overflow-y-auto">
            {corrections.map((correction, index) => {
              const { emoji, hue } = getCategoryStyle(correction.category);
              return (
                <li
                  key={index}
                  className="rise-in cat-card flex items-center gap-3 rounded-2xl border px-3 py-2.5"
                  style={{ '--cat-h': hue, animationDelay: `${index * 50}ms` }}
                >
                  <span aria-hidden="true" className="cat-tile size-9 rounded-xl flex items-center justify-center text-base shrink-0">
                    {emoji}
                  </span>
                  <span className="flex-1 min-w-0 flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground line-through truncate">{correction.original}</span>
                    <ArrowRight className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate rounded-lg bg-primary/10 text-foreground font-semibold px-2 py-0.5">{correction.corrected}</span>
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={onReject} variant="outline" className="h-11 rounded-xl">
              Keep original
            </Button>
            <Button onClick={onAccept} className="h-11 rounded-xl btn-gradient border-0 hover:opacity-95">
              Use {corrections.length === 1 ? 'suggestion' : 'suggestions'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

CorrectionDialog.displayName = 'CorrectionDialog';

// PropTypes validation
CorrectionDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  corrections: PropTypes.array.isRequired,
  onAccept: PropTypes.func.isRequired,
  onReject: PropTypes.func.isRequired
};

// onClose is optional (dialog can be controlled externally)
CorrectionDialog.propTypes.onClose = PropTypes.func;

export default CorrectionDialog;
