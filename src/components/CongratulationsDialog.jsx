import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { CircleCheck, PartyPopper, ShoppingCart } from 'lucide-react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';

const CONFETTI_COLORS = ['var(--warning)', 'var(--success)', 'var(--primary)', 'var(--secondary)'];

const CongratulationsDialog = ({ open, onClose, itemCount, currentDate }) => {
  const randomMessage = useMemo(() => {
    const congratsMessages = [
      '🎉 Shopping list complete!',
      '✨ All done! Great job!',
      '🌟 List conquered!',
      '🎊 Mission accomplished!',
      '💪 All items checked off!',
    ];
    return congratsMessages[Math.floor(Math.random() * congratsMessages.length)];
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-roll only when the dialog (re)opens
  }, [open]);

  const confetti = useMemo(
    () => Array.from({ length: 20 }, () => ({
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 2}s`,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-roll only when the dialog (re)opens
    [open]
  );

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton
        className="sm:max-w-md text-center overflow-hidden bg-gradient-to-br from-primary/6 to-success/8 dark:from-success/12 dark:to-card"
      >
        <div className="relative pt-4">
          {/* Confetti effect */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden -m-6 rounded-2xl">
            {confetti.map((c, i) => (
              <span
                key={i}
                className="absolute size-1.5 rounded-full animate-confetti"
                style={{ left: c.left, animationDelay: c.delay, backgroundColor: c.color, top: '-10px' }}
              />
            ))}
          </div>

          {/* Floating celebration icon */}
          <div className="flex justify-center mb-2">
            <PartyPopper className="size-11 text-warning drop-shadow-[0_4px_8px_var(--warning)] animate-bounce" />
          </div>

          {/* Main success icon */}
          <div className="mb-4">
            <div className="size-28 rounded-full bg-success mx-auto flex items-center justify-center shadow-[0_20px_40px_-8px_var(--success)] animate-pulse">
              <CircleCheck className="size-14 text-white" strokeWidth={1.75} />
            </div>
          </div>

          <h4 className="font-display text-2xl sm:text-3xl font-bold text-success mb-2">
            {randomMessage}
          </h4>

          <p className="text-muted-foreground font-medium mb-4">
            You&apos;ve completed all {itemCount} items on your grocery list!
          </p>

          {/* Stats box */}
          <div className="bg-card/80 backdrop-blur rounded-2xl p-3.5 mb-4 border border-success/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <ShoppingCart className="size-4.5 text-primary" />
              <span className="font-semibold">Shopping Complete</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {currentDate} • {itemCount} items checked off
            </p>
          </div>

          <Button
            onClick={onClose}
            size="lg"
            className="bg-success text-white hover:bg-success/90 shadow-[0_8px_24px_-6px_var(--success)] w-full sm:w-auto"
          >
            Awesome! 🎉
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
