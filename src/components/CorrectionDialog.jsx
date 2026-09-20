import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Pencil, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-warning flex items-center justify-center shrink-0 shadow-[0_4px_12px_-2px_var(--warning)]">
              <Pencil className="text-white size-5" />
            </div>
            <div>
              <DialogTitle>Smart Auto-corrections</DialogTitle>
              <p className="text-xs text-muted-foreground">
                {corrections.length} item{corrections.length > 1 ? 's' : ''} found
              </p>
            </div>
          </div>
        </DialogHeader>

        <p className="text-sm text-muted-foreground p-3 rounded-xl bg-primary/5 border border-primary/10">
          💡 We detected some items that might have spelling mistakes or could be auto-corrected.
          Review the suggestions below and choose your preferred option.
        </p>

        <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto">
          {corrections.map((correction, index) => (
            <Card
              key={index}
              className="p-4 animate-in fade-in zoom-in-95"
              style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'backwards' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[0.7rem] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">
                  #{index + 1}
                </span>
                <Badge>{correction.category}</Badge>
              </div>

              <div className="flex items-center gap-3">
                {/* Original Text */}
                <div className="flex-1 min-w-0">
                  <span className="block text-[0.7rem] text-muted-foreground mb-1">Original</span>
                  <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm font-medium line-through text-destructive truncate">
                      &quot;{correction.original}&quot;
                    </p>
                  </div>
                </div>

                {/* Arrow */}
                <div className="size-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <ArrowRight className="size-4 text-white" />
                </div>

                {/* Corrected Text */}
                <div className="flex-1 min-w-0">
                  <span className="block text-[0.7rem] text-muted-foreground mb-1">Suggested</span>
                  <div className="p-2.5 rounded-lg bg-success/10 border border-success/25">
                    <p className="text-sm font-semibold text-success truncate">
                      &quot;{correction.corrected}&quot;
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <DialogFooter>
          <Button
            onClick={onReject}
            variant="outline"
            className="border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
          >
            Keep Original
          </Button>
          <Button
            onClick={onAccept}
            className="bg-success text-white hover:bg-success/90"
          >
            Apply Corrections
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
