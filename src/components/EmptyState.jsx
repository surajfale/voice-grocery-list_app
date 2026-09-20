import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { ShoppingCart, Mic, Pencil } from 'lucide-react';
import { Card } from './ui/card';

const EmptyState = memo(({ currentDateString, formatDateDisplay }) => {
  return (
    <Card className="p-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="size-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mx-auto mb-5 animate-bounce [animation-duration:3s]">
        <ShoppingCart className="size-10 text-primary" />
      </div>

      <h5 className="font-display text-xl font-bold mb-1">Your list is empty</h5>

      <p className="text-muted-foreground font-medium mb-1">
        for {formatDateDisplay(currentDateString)}
      </p>

      <p className="text-sm text-muted-foreground mb-5">
        Start adding items using voice recognition or manual input to create your smart grocery list
      </p>

      <div className="flex justify-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/8 border border-primary/20">
          <Mic className="size-4 text-primary" />
          <span className="text-xs font-semibold text-primary">Voice Recognition</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-success/10 border border-success/25">
          <Pencil className="size-4 text-success" />
          <span className="text-xs font-semibold text-success">Auto-correction</span>
        </div>
      </div>
    </Card>
  );
});

EmptyState.displayName = 'EmptyState';

// PropTypes validation
EmptyState.propTypes = {
  currentDateString: PropTypes.string.isRequired,
  formatDateDisplay: PropTypes.func.isRequired
};

export default EmptyState;
