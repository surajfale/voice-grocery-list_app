import React, { useState, useMemo, memo, useRef } from 'react';
import PropTypes from 'prop-types';
import { Loader2, X, Sparkles, ArrowUp } from 'lucide-react';
import Fuse from 'fuse.js';
import { Badge } from './ui/badge';

const MAX_EMPTY_SUGGESTIONS = 5;

const ManualInput = memo(({
  onAddItems,
  historicalItems = [],
  predictions = [],
  loading = false,
  disabled = false,
  trailing = null,
  dropUp = false,
  listening = false
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
  const predictionLabel = predictions.some((prediction) => prediction.reason === 'due') ? 'Due' : 'Usual';

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


  const addTag = (value) => {
    if (!value.trim()) { return; }
    setSelectedItems((prev) => [...prev, value.trim()]);
    setInputValue('');
    inputRef.current?.focus();
  };

  const removeTag = (index) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit selected tags plus whatever is still typed in the box
  const handleAddItems = () => {
    const pending = inputValue.trim();
    const items = pending ? [...selectedItems, pending] : selectedItems;
    if (items.length > 0 && !disabled) {
      onAddItems(items);
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
  const canSubmit = (selectedItems.length > 0 || inputValue.trim().length > 0) && !isDisabled;

  let placeholder = selectedItems.length > 0 ? 'Add another…' : 'Add items, e.g. milk, apples, basmati rice';
  if (disabled) {placeholder = 'Past lists are read-only';}
  if (listening) {placeholder = 'Listening… say your items';}

  return (
    <div className="flex items-end gap-2">
      <div className="relative flex-1 min-w-0">
        <div
          className={`flex flex-wrap gap-1.5 items-center min-h-11 w-full rounded-[22px] border border-input bg-card pl-4 pr-1 py-1 shadow-xs transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20 ${isDisabled && !loading ? 'opacity-60' : ''}`}
        >
          {selectedItems.map((item, index) => (
            <Badge key={`${item}-${index}`} variant="secondary" className="gap-1 pl-2 pr-1 h-7 text-[13px] font-medium">
              {item}
              <button
                type="button"
                onClick={() => removeTag(index)}
                disabled={isDisabled}
                aria-label={`Remove ${item}`}
                className="rounded-full hover:bg-background p-0.5"
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
            placeholder={placeholder}
            aria-label="Add grocery items"
            enterKeyHint="done"
            className="flex-1 min-w-[120px] h-9 bg-transparent outline-none text-[15px] disabled:cursor-not-allowed placeholder:text-muted-foreground"
          />
          {(canSubmit || loading) && (
            <button
              type="button"
              onClick={handleAddItems}
              disabled={!canSubmit}
              aria-label="Add items"
              className="size-9 shrink-0 rounded-full bg-foreground text-background flex items-center justify-center transition-transform active:scale-95 disabled:opacity-50 animate-in fade-in zoom-in-90 duration-150"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
            </button>
          )}
        </div>

        {open && suggestions.length > 0 && !isDisabled && (
          <div
            role="listbox"
            className={`absolute z-30 w-full rounded-xl border border-border bg-popover text-popover-foreground shadow-lg max-h-60 overflow-y-auto p-1 ${
              dropUp ? 'bottom-full mb-2' : 'top-full mt-2'
            }`}
          >
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                role="option"
                aria-selected="false"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addTag(suggestion)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-accent flex items-center justify-between gap-2"
              >
                <span className="truncate">{suggestion}</span>
                {predictionRank.has(suggestion.toLowerCase()) && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <Sparkles className="size-3 text-primary" />
                    {predictionLabel}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {trailing}
    </div>
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
  loading: PropTypes.bool,
  disabled: PropTypes.bool,
  trailing: PropTypes.node,
  dropUp: PropTypes.bool,
  listening: PropTypes.bool
};

export default ManualInput;
