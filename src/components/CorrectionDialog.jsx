import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Check spelling</DialogTitle>
          <DialogDescription>
            {corrections.length === 1
              ? 'This item looks misspelled. Use the suggestion or keep what you typed.'
              : `${corrections.length} items look misspelled. Use the suggestions or keep what you typed.`}
          </DialogDescription>
        </DialogHeader>

        <ul className="rounded-xl border border-border divide-y divide-border max-h-[50vh] overflow-y-auto">
          {corrections.map((correction, index) => (
            <li
              key={index}
              className="flex items-center gap-3 px-3.5 py-3 animate-in fade-in"
              style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'backwards' }}
            >
              <span className="flex-1 min-w-0 flex items-center gap-2 text-sm">
                <span className="text-muted-foreground line-through truncate">{correction.original}</span>
                <ArrowRight className="size-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium truncate">{correction.corrected}</span>
              </span>
              <span className="text-xs text-muted-foreground shrink-0">{correction.category}</span>
            </li>
          ))}
        </ul>

        <DialogFooter>
          <Button onClick={onReject} variant="outline">
            Keep original
          </Button>
          <Button onClick={onAccept}>
            Use {corrections.length === 1 ? 'suggestion' : 'suggestions'}
          </Button>
        </DialogFooter>
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
