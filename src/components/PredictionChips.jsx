import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Plus, Sparkles } from 'lucide-react';
import { describePrediction } from '../hooks/usePurchasePredictions';

const MAX_PREDICTION_CHIPS = 6;

/**
 * "Running low?" row of one-tap suggestions, shown above a non-empty list.
 */
const PredictionChips = memo(({ predictions, onAddItems, disabled = false }) => {
  const chips = predictions.slice(0, MAX_PREDICTION_CHIPS);
  if (chips.length === 0) {return null;}

  return (
    <div className="mb-6">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2 px-1">
        <Sparkles className="size-3.5 text-primary" />
        Running low?
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-1 sm:flex-wrap [scrollbar-width:none]">
        {chips.map((prediction) => (
          <button
            key={prediction.key}
            type="button"
            onClick={() => onAddItems([prediction.text])}
            disabled={disabled}
            title={describePrediction(prediction)}
            className="shrink-0 inline-flex items-center gap-1 h-8 pl-2 pr-3 rounded-full border border-dashed border-input bg-card text-sm text-foreground transition-[background-color,border-color,transform] hover:border-solid hover:border-primary/50 hover:bg-accent active:scale-[0.97] disabled:opacity-50"
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
