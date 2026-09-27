import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Plus, Sparkles } from 'lucide-react';
import { describePrediction, isFrequentFallback } from '../hooks/usePurchasePredictions';

const MAX_PREDICTION_CHIPS = 6;

/**
 * "Running low?" (or "Buy again?" for the most-bought fallback) row of
 * one-tap suggestions, shown above a non-empty list.
 */
const PredictionChips = memo(({ predictions, onAddItems, disabled = false }) => {
  const chips = predictions.slice(0, MAX_PREDICTION_CHIPS);
  if (chips.length === 0) {return null;}

  return (
    <div className="mb-6">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2 px-1">
        <Sparkles className="size-3.5 text-primary" />
        {isFrequentFallback(chips) ? 'Buy again?' : 'Running low?'}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-1 sm:flex-wrap no-scrollbar">
        {chips.map((prediction) => (
          <button
            key={prediction.key}
            type="button"
            onClick={() => onAddItems([prediction.text])}
            disabled={disabled}
            title={describePrediction(prediction)}
            className="shrink-0 inline-flex items-center gap-1 h-9 pl-2.5 pr-3.5 rounded-full border border-primary/25 bg-primary/10 text-sm font-medium text-foreground transition-[background-color,border-color,transform] hover:bg-primary/15 hover:border-primary/40 active:scale-[0.96] disabled:opacity-50"
          >
            <Plus className="size-3.5 text-primary" />
            {prediction.text}
          </button>
        ))}
      </div>
    </div>
  );
});

PredictionChips.displayName = 'PredictionChips';

PredictionChips.propTypes = {
  predictions: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired
  })).isRequired,
  onAddItems: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};

export default PredictionChips;
