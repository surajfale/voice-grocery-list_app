import React, { useState, useMemo, memo, useRef } from 'react';
import PropTypes from 'prop-types';
import { Plus, Loader2, X, Sparkles } from 'lucide-react';
import Fuse from 'fuse.js';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { describePrediction } from '../hooks/usePurchasePredictions';

const MAX_EMPTY_SUGGESTIONS = 5;
const MAX_PREDICTION_CHIPS = 6;

const ManualInput = memo(({
  onAddItems,
  historicalItems = [],
  predictions = [],
  showPredictionChips = false,
  loading = false,
  disabled = false
}) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);

  const fuse = useMemo(() => new Fuse(historicalItems, {
    threshold: 0.3,
    distance: 100,
    minMatchCharLength: 2,
  }), [historicalItems]);

  // Lowercased prediction text -> rank (0 = most likely needed)
  const predictionRank = useMemo(() => new Map(
    predictions.map((prediction, index) => [prediction.text.toLowerCase(), index])
  ), [predictions]);

  const suggestions = useMemo(() => {
    if (inputValue === '') {
      // Predicted items first, then fill up with history (no case-variant repeats)
      const seen = new Set();
      return [...predictions.map((p) => p.text), ...historicalItems]
        .filter((item) => {
          const key = item.toLowerCase();
          if (seen.has(key)) { return false; }
          seen.add(key);
          return true;
        })
        .slice(0, MAX_EMPTY_SUGGESTIONS);
    }

    // Keep Fuse's relevance order, but float predicted items to the top
    const rankOf = (item) => predictionRank.get(item.toLowerCase()) ?? predictions.length;
    const results = fuse.search(inputValue)
      .map(result => result.item)
      .sort((a, b) => rankOf(a) - rankOf(b));

    // Suggest the exact input if it's not in the list (and not empty)
    const isExisting = results.some((option) => option.toLowerCase() === inputValue.toLowerCase());
    if (!isExisting) {
      results.push(inputValue);
    }

    return results;
  }, [fuse, historicalItems, inputValue, predictions, predictionRank]);

  const predictionChips = useMemo(() => {
    const selected = new Set(selectedItems.map((item) => item.toLowerCase()));
    return predictions
      .filter((prediction) => !selected.has(prediction.text.toLowerCase()))
      .slice(0, MAX_PREDICTION_CHIPS);
  }, [predictions, selectedItems]);

  const addTag = (value) => {
    if (!value.trim()) { return; }
    setSelectedItems((prev) => [...prev, value.trim()]);
    setInputValue('');
    inputRef.current?.focus();
  };

  const removeTag = (index) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddItems = () => {
    if (selectedItems.length > 0 && !disabled) {
      onAddItems(selectedItems);
      setSelectedItems([]);
      setInputValue('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      } else if (selectedItems.length > 0) {
        handleAddItems();
      }
    } else if (e.key === 'Backspace' && !inputValue && selectedItems.length > 0) {
      setSelectedItems((prev) => prev.slice(0, -1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const isDisabled = loading || disabled;

  return (
    <Card className="p-5 sm:p-6 mb-5">
      <div className="mb-4">
        <h5 className="font-display text-xl font-bold text-primary mb-1">Add to Your List</h5>
        <p className="text-sm text-muted-foreground">
          Type items manually or use voice recognition to add multiple items at once
        </p>
      </div>

      <div className="flex gap-2 items-start">
        <div className="relative flex-1">
          <div
            className={`flex flex-wrap gap-1.5 items-center min-h-[52px] w-full rounded-2xl border border-input bg-card px-3 py-2 transition-shadow focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 ${isDisabled ? 'opacity-60' : ''}`}
          >
            {selectedItems.map((item, index) => (
              <Badge key={`${item}-${index}`} variant="outline" className="gap-1 pr-1 font-normal">
                {item}
                <button
                  type="button"
                  onClick={() => removeTag(index)}
                  disabled={isDisabled}
                  aria-label={`Remove ${item}`}
                  className="rounded-full hover:bg-accent p-0.5"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 120)}
              onKeyDown={handleKeyDown}
              disabled={isDisabled}
              placeholder={disabled ? 'Cannot add items to past dates' : 'e.g., milk, apples, basmati rice...'}
              className="flex-1 min-w-[140px] bg-transparent outline-none text-sm py-1 disabled:cursor-not-allowed placeholder:text-muted-foreground"
            />
          </div>

          {open && suggestions.length > 0 && !isDisabled && (
            <div className="absolute z-20 mt-1.5 w-full rounded-xl border border-border bg-popover shadow-lg max-h-56 overflow-y-auto py-1.5">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addTag(suggestion)}
                  className="w-full text-left px-3.5 py-2 text-sm hover:bg-accent flex items-center justify-between gap-2"
                >
                  <span>{suggestion}</span>
                  {predictionRank.has(suggestion.toLowerCase()) && (
                    <span className="flex items-center gap-1 text-xs text-primary">
                      <Sparkles className="size-3" />
                      Due
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button
          onClick={handleAddItems}
          disabled={selectedItems.length === 0 || isDisabled}
          className="min-h-[52px] px-5 shadow-[0_4px_16px_-4px_var(--primary)]"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Plus />
              Add Items
            </>
          )}
        </Button>
      </div>

      {showPredictionChips && predictionChips.length > 0 && !isDisabled && (
        <div className="mt-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
            <Sparkles className="size-3.5 text-primary" />
            Running low? Based on how often you buy these
          </p>
          <div className="flex flex-wrap gap-1.5">
            {predictionChips.map((prediction) => (
              <Badge key={prediction.key} variant="soft" asChild>
                <button
                  type="button"
                  onClick={() => onAddItems([prediction.text])}
                  title={describePrediction(prediction)}
                  className="cursor-pointer font-medium hover:bg-primary/20"
                >
                  <Plus />
                  {prediction.text}
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
});

ManualInput.displayName = 'ManualInput';

// PropTypes validation
ManualInput.propTypes = {
  onAddItems: PropTypes.func.isRequired,
  historicalItems: PropTypes.arrayOf(PropTypes.string),
  predictions: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired
  })),
  showPredictionChips: PropTypes.bool,
  loading: PropTypes.bool,
  disabled: PropTypes.bool
};

export default ManualInput;
