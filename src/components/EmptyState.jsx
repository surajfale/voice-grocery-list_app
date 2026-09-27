import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { ShoppingBasket, Sparkles, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { formatPredictionFrequency, describePrediction, isFrequentFallback } from '../hooks/usePurchasePredictions';

const MAX_EMPTY_PREDICTIONS = 8;

const EmptyState = memo(({
  predictions = [],
  onAddItems,
  loading = false,
  readOnly = false
}) => {
  const topPredictions = predictions.slice(0, MAX_EMPTY_PREDICTIONS);
  const showPredictions = !readOnly && topPredictions.length > 0 && typeof onAddItems === 'function';
  const frequentOnly = isFrequentFallback(topPredictions);

  return (
    <div className="animate-in fade-in duration-300">
      {showPredictions && (
        <section aria-labelledby="predictions-heading" className="mb-8">
          <div className="flex items-end justify-between gap-3 mb-2 px-1">
            <div>
              <h2 id="predictions-heading" className="flex items-center gap-1.5 text-base font-semibold">
                <Sparkles className="size-4 text-primary" />
                {frequentOnly ? 'Your usual items' : 'You\u2019ll probably need'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {frequentOnly ? 'The things you buy most often' : 'Based on how often you buy these'}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAddItems(topPredictions.map((p) => p.text))}
              disabled={loading}
            >
              <Plus />
              Add all
            </Button>
          </div>

          <ul className="rounded-xl border border-border bg-card shadow-xs divide-y divide-border">
            {topPredictions.map((prediction) => (
              <li key={prediction.key}>
                <button
                  type="button"
                  onClick={() => onAddItems([prediction.text])}
                  disabled={loading}
                  title={describePrediction(prediction)}
                  className="w-full flex items-center gap-3 min-h-13 px-3.5 py-2 text-left transition-colors hover:bg-accent/50 first:rounded-t-xl last:rounded-b-xl disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="size-5 rounded-full border-[1.5px] border-dashed border-muted-foreground/50 flex items-center justify-center shrink-0">
                    <Plus className="size-3 text-primary" />
                  </span>
                  <span className="flex-1 min-w-0 truncate text-[15px]">{prediction.text}</span>
                  <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                    {formatPredictionFrequency(prediction)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className={`text-center px-6 ${showPredictions ? 'py-6' : 'py-16'}`}>
        <div className="size-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <ShoppingBasket className="size-6 text-muted-foreground" />
        </div>
        <p className="font-medium">
          {readOnly ? 'Nothing was on this list' : 'Nothing on this list yet'}
        </p>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
          {readOnly
            ? 'Past lists are read-only. Pick today or a future date to start a new one.'
            : 'Type an item or tap the mic and say a few, like “milk, eggs and spinach”.'}
        </p>
      </div>
    </div>
  );
});

EmptyState.displayName = 'EmptyState';

// PropTypes validation
EmptyState.propTypes = {
  predictions: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired
  })),
  onAddItems: PropTypes.func,
  loading: PropTypes.bool,
  readOnly: PropTypes.bool
};

export default EmptyState;
