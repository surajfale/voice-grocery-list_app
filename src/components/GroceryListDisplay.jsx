import React, { useState, memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import { ChevronDown, MoreHorizontal, Pencil, Trash2, Check, X, Tag, Hash, ArrowUp, BadgeDollarSign } from 'lucide-react';
import dayjs from 'dayjs';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from './ui/dropdown-menu';
import { getCategoryStyle } from '../utils/categoryStyles';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { formatMoney } from '../utils/money';

const COUNT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const STAGGER_MS = 60;

/**
 * Receipt-based price hint for a list item: a red "▲ 9%" when the price went up
 * on the last purchase, or a green tag when another store was cheaper. Taps
 * open the details (hover tooltips don't exist on phones).
 */
const PriceHint = ({ itemText, signal }) => {
  const { rise, cheaper, currency } = signal;
  const risePct = rise ? Math.round(rise.changePct * 100) : 0;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={rise ? `${itemText} price up ${risePct}%` : `${itemText} is cheaper at ${cheaper.store}`}
          className={`shrink-0 inline-flex items-center gap-0.5 h-6 rounded-md px-1.5 text-[11px] font-semibold tabular-nums transition-colors ${
            rise
              ? 'bg-red-500/12 text-red-600 hover:bg-red-500/20 dark:text-red-400'
              : 'bg-emerald-500/12 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400'
          }`}
        >
          {rise ? (
            <>
              <ArrowUp className="size-3" strokeWidth={3} />
              {risePct}%
            </>
          ) : (
            <BadgeDollarSign className="size-3.5" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3.5 text-sm">
        <p className="font-semibold capitalize mb-2">{itemText}</p>
        {rise && (
          <div className="mb-2 last:mb-0">
            <p className="text-red-600 dark:text-red-400 font-medium">Up {risePct}% at {rise.store}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {formatMoney(rise.previous.unitPrice, currency)} ({dayjs(rise.previous.date).format('MMM D')}) → {formatMoney(rise.latest.unitPrice, currency)} ({dayjs(rise.latest.date).format('MMM D')})
            </p>
          </div>
        )}
        {cheaper && (
          <p className="text-emerald-700 dark:text-emerald-400 font-medium">
            Cheapest recently: {cheaper.store} {formatMoney(cheaper.unitPrice, currency)}
          </p>
        )}
        <p className="text-[11px] text-muted-foreground mt-2">From your scanned receipts, per unit.</p>
      </PopoverContent>
    </Popover>
  );
};

PriceHint.propTypes = {
  itemText: PropTypes.string.isRequired,
  signal: PropTypes.shape({
    rise: PropTypes.object,
    cheaper: PropTypes.object,
    currency: PropTypes.string,
  }).isRequired,
};

const GroceryListDisplay = memo(({
  groupedItems,
  expandedCategories,
  onToggleCategory,
  onToggleItem,
  onRemoveItem,
  onUpdateCategory,
  onUpdateText,
  onUpdateCount,
  categoryList,
  loading = false,
  priceSignalFor = null
}) => {
  const [editingText, setEditingText] = useState(null);
  const [editedTextValue, setEditedTextValue] = useState('');
  const [removingIds, setRemovingIds] = useState(() => new Set());

  // Play an exit transition before the item actually leaves the data
  const requestRemoveItem = (id) => {
    setRemovingIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      onRemoveItem(id);
      setRemovingIds(prev => {
        if (!prev.has(id)) { return prev; }
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 200);
  };

  const handleUpdateCategory = (id, newCategory) => onUpdateCategory(id, newCategory);

  const handleStartEditText = (item) => {
    setEditingText(item.id);
    setEditedTextValue(item.text);
  };

  const handleSaveText = async (id, originalText) => {
    if (editedTextValue.trim() && editedTextValue.trim() !== originalText.trim()) {
      await onUpdateText(id, editedTextValue);
    }
    setEditingText(null);
    setEditedTextValue('');
  };

  const handleCancelEditText = () => {
    setEditingText(null);
    setEditedTextValue('');
  };

  const handleCountChange = (itemId, newCount) => onUpdateCount(itemId, newCount);

  // Memoize the grouped items processing
  const processedGroupedItems = useMemo(() => {
    return Object.entries(groupedItems).map(([category, categoryItems]) => {
      const isExpanded = expandedCategories[category] !== false;
      const completedCount = categoryItems.filter(item => item.completed).length;

      return {
        category,
        categoryItems,
        isExpanded,
        completedCount
      };
    });
  }, [groupedItems, expandedCategories]);

  return (
    <div className="space-y-6">
      {processedGroupedItems.map(({ category, categoryItems, isExpanded, completedCount }, index) => {
        const isComplete = completedCount === categoryItems.length;
        const { emoji, hue } = getCategoryStyle(category);
        const sectionId = `category-${category.replace(/\W+/g, '-').toLowerCase()}`;

        return (
          <section
            key={category}
            aria-labelledby={`${sectionId}-label`}
            className="rise-in"
            style={{ '--cat-h': hue, animationDelay: `${index * STAGGER_MS}ms` }}
          >
            {/* Category header: emoji tile, tinted label, count, collapse */}
            <button
              type="button"
              onClick={() => onToggleCategory(category)}
              aria-expanded={isExpanded}
              aria-controls={sectionId}
              className="group/header flex w-full items-center gap-2.5 px-1 pb-2.5 text-left"
            >
              <span aria-hidden="true" className="cat-tile size-8 rounded-[10px] flex items-center justify-center text-base shrink-0">
                {emoji}
              </span>
              <span id={`${sectionId}-label`} className="section-label cat-label">{category}</span>
              <span className={`text-xs tabular-nums ${isComplete ? 'text-success' : 'text-muted-foreground'}`}>
                {isComplete ? <Check className="size-3.5 inline -mt-0.5" aria-label="All done" /> : `${completedCount}/${categoryItems.length}`}
              </span>
              <span className="flex-1" />
              <ChevronDown
                className={`size-4 text-muted-foreground transition-transform duration-200 group-hover/header:text-foreground ${isExpanded ? '' : '-rotate-90'}`}
              />
            </button>

            {/* Items: one tinted surface, hairline dividers */}
            <div
              id={sectionId}
              className="grid transition-[grid-template-rows] duration-300 ease-out"
              style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
            >
              <div className="overflow-hidden">
                <ul className="cat-card rounded-2xl border bg-card divide-y divide-border">
                  {categoryItems.map((item) => {
                    const isRemoving = removingIds.has(item.id);
                    const isEditingThis = editingText === item.id;
                    const count = item.count || 1;

                    return (
                      <li
                        key={item.id}
                        className={`group flex items-center gap-3 min-h-13 pl-3.5 pr-1.5 py-1.5 transition-[opacity,transform,background-color] duration-200 animate-in fade-in first:rounded-t-2xl last:rounded-b-2xl hover:bg-accent/50 ${
                          isRemoving ? 'opacity-0 -translate-x-2' : 'opacity-100'
                        }`}
                      >
                        <Checkbox
                          checked={item.completed}
                          onCheckedChange={() => onToggleItem(item.id)}
                          onClick={(e) => e.stopPropagation()}
                          disabled={loading || isEditingThis}
                          aria-label={`Mark ${item.text} as ${item.completed ? 'not bought' : 'bought'}`}
                          className="cat-check pop-on-check size-5 rounded-full border-2 data-[state=checked]:border-primary transition-colors"
                        />

                        <div className="flex-1 min-w-0">
                          {isEditingThis ? (
                            <Input
                              value={editedTextValue}
                              onChange={(e) => setEditedTextValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveText(item.id, item.text);
                                } else if (e.key === 'Escape') {
                                  handleCancelEditText();
                                }
                              }}
                              autoFocus
                              disabled={loading}
                              aria-label="Item name"
                              className="h-9"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => !loading && onToggleItem(item.id)}
                              disabled={loading}
                              className={`w-full text-left text-[15px] break-words py-1 transition-colors disabled:cursor-default ${
                                item.completed ? 'text-muted-foreground' : 'text-foreground'
                              }`}
                            >
                              {/* Strike line sweeps in on check (see .strike-sweep) */}
                              <span className="strike-sweep" data-done={item.completed}>{item.text}</span>
                            </button>
                          )}
                        </div>

                        {isEditingThis ? (
                          <div className="flex items-center shrink-0">
                            <button
                              type="button"
                              onClick={() => handleSaveText(item.id, item.text)}
                              disabled={loading || !editedTextValue.trim()}
                              aria-label="Save name"
                              className="size-9 rounded-lg flex items-center justify-center text-primary hover:bg-accent disabled:opacity-40"
                            >
                              <Check className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEditText}
                              disabled={loading}
                              aria-label="Cancel editing"
                              className="size-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent disabled:opacity-40"
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            {!item.completed && priceSignalFor?.(item.text) && (
                              <PriceHint itemText={item.text} signal={priceSignalFor(item.text)} />
                            )}
                            {count > 1 && (
                              <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                                ×{count}
                              </span>
                            )}

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  disabled={loading}
                                  aria-label={`Options for ${item.text}`}
                                  className="size-9 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-accent data-[state=open]:bg-accent data-[state=open]:text-foreground disabled:opacity-40 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 md:data-[state=open]:opacity-100"
                                >
                                  <MoreHorizontal className="size-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-44">
                                <DropdownMenuItem onClick={() => handleStartEditText(item)}>
                                  <Pencil />
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger>
                                    <Hash className="size-4 text-muted-foreground mr-2" />
                                    Quantity
                                    <span className="ml-auto pl-3 text-xs tabular-nums text-muted-foreground">×{count}</span>
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
                                    <DropdownMenuRadioGroup
                                      value={String(count)}
                                      onValueChange={(value) => handleCountChange(item.id, Number(value))}
                                    >
                                      {COUNT_OPTIONS.map((num) => (
                                        <DropdownMenuRadioItem key={num} value={String(num)} className="tabular-nums">
                                          ×{num}
                                        </DropdownMenuRadioItem>
                                      ))}
                                    </DropdownMenuRadioGroup>
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger>
                                    <Tag className="size-4 text-muted-foreground mr-2" />
                                    Category
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
                                    <DropdownMenuRadioGroup
                                      value={item.category}
                                      onValueChange={(value) => handleUpdateCategory(item.id, value)}
                                    >
                                      {categoryList.map((cat) => (
                                        <DropdownMenuRadioItem key={cat} value={cat}>
                                          {cat}
                                        </DropdownMenuRadioItem>
                                      ))}
                                    </DropdownMenuRadioGroup>
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onClick={() => requestRemoveItem(item.id)}>
                                  <Trash2 />
                                  Remove
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
});

GroceryListDisplay.displayName = 'GroceryListDisplay';

// PropTypes validation
GroceryListDisplay.propTypes = {
  groupedItems: PropTypes.object.isRequired,
  expandedCategories: PropTypes.object.isRequired,
  onToggleCategory: PropTypes.func.isRequired,
  onToggleItem: PropTypes.func.isRequired,
  onRemoveItem: PropTypes.func.isRequired,
  onUpdateCategory: PropTypes.func.isRequired,
  onUpdateText: PropTypes.func.isRequired,
  onUpdateCount: PropTypes.func.isRequired,
  categoryList: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  // (itemText) => { rise?, cheaper?, currency? } | null, from usePriceSignals
  priceSignalFor: PropTypes.func
};

export default GroceryListDisplay;
