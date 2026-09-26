import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { ShoppingCart, Mic, Pencil, Sparkles, Plus } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { formatPredictionFrequency, describePrediction } from '../hooks/usePurchasePredictions';

const MAX_EMPTY_PREDICTIONS = 8;

const EmptyState = memo(({
  currentDateString,
  formatDateDisplay,
  predictions = [],
  onAddItems,
  loading = false
}) => {
  const topPredictions = predictions.slice(0, MAX_EMPTY_PREDICTIONS);
  const showPredictions = topPredictions.length > 0 && typeof onAddItems === 'function';

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

      {showPredictions && (
        <div className="mt-8 pt-6 border-t border-border text-left">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div>
              <h6 className="flex items-center gap-1.5 font-display font-bold">
                <Sparkles className="size-4 text-primary" />
                You&apos;ll probably need
              </h6>
              <p className="text-xs text-muted-foreground">Based on how often you&apos;ve bought these before</p>
            </div>
            <Button
              size="sm"
              onClick={() => onAddItems(topPredictions.map((p) => p.text))}
              disabled={loading}
            >
              <Plus />
              Add all {topPredictions.length}
            </Button>
          </div>

          <ul className="grid gap-2 sm:grid-cols-2">
            {topPredictions.map((prediction) => (
              <li key={prediction.key}>
                <button
                  type="button"
                  onClick={() => onAddItems([prediction.text])}
                  disabled={loading}
                  title={describePrediction(prediction)}
                  className="w-full flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:bg-accent disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Plus className="size-3.5 text-primary shrink-0" />
                    <span className="truncate font-medium">{prediction.text}</span>
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatPredictionFrequency(prediction)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
});

EmptyState.displayName = 'EmptyState';

// PropTypes validation
EmptyState.propTypes = {
  currentDateString: PropTypes.string.isRequired,
  formatDateDisplay: PropTypes.func.isRequired,
  predictions: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired
  })),
  onAddItems: PropTypes.func,
  loading: PropTypes.bool
};

export default EmptyState;
