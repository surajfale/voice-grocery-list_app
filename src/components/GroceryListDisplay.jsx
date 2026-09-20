import React, { useState, memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import { ChevronUp, ChevronDown, Pencil, Trash2, Check, X } from 'lucide-react';
import { Card } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from './ui/dropdown-menu';

const ACCENT_CLASSES = {
  primary: { dot: 'bg-primary', chip: 'bg-primary/10 text-primary', hoverBorder: 'hover:border-primary/40', iconHover: 'hover:bg-primary/10 hover:text-primary' },
  success: { dot: 'bg-success', chip: 'bg-success/10 text-success', hoverBorder: 'hover:border-success/40', iconHover: 'hover:bg-success/10 hover:text-success' },
  secondary: { dot: 'bg-secondary', chip: 'bg-secondary/10 text-secondary', hoverBorder: 'hover:border-secondary/40', iconHover: 'hover:bg-secondary/10 hover:text-secondary' },
  warning: { dot: 'bg-warning', chip: 'bg-warning/10 text-warning', hoverBorder: 'hover:border-warning/40', iconHover: 'hover:bg-warning/10 hover:text-warning' },
};

const getCategoryAccentKey = (category) => {
  if (category === 'Other') { return 'warning'; }
  if (category === 'Produce') { return 'success'; }
  if (category === 'Asian Pantry' || category === 'Indian Pantry') { return 'secondary'; }
  return 'primary';
};

const COUNT_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

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
  loading = false
}) => {
  const [editingCategory, setEditingCategory] = useState(null);
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

  const handleUpdateCategory = async (id, newCategory) => {
    await onUpdateCategory(id, newCategory);
    setEditingCategory(null);
  };

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

  const handleCountChange = async (itemId, newCount) => {
    if (newCount === 0) {
      // Remove item when count is 0
      requestRemoveItem(itemId);
    } else {
      await onUpdateCount(itemId, newCount);
    }
  };

  // Memoize the grouped items processing
  const processedGroupedItems = useMemo(() => {
    return Object.entries(groupedItems).map(([category, categoryItems]) => {
      const isExpanded = expandedCategories[category] !== false;
      const completedCount = categoryItems.filter(item => item.completed).length;
      const progress = (completedCount / categoryItems.length) * 100;

      return {
        category,
        categoryItems,
        isExpanded,
        completedCount,
        progress
      };
    });
  }, [groupedItems, expandedCategories]);

  return (
    <div className="grid md:grid-cols-2 gap-4 sm:gap-5">
      {processedGroupedItems.map(({ category, categoryItems, isExpanded, completedCount, progress }) => {
        const accent = ACCENT_CLASSES[getCategoryAccentKey(category)];
        const isComplete = progress === 100;

        return (
          <Card
            key={category}
            className={`h-fit p-5 transition-all hover:-translate-y-1 ${accent.hoverBorder}`}
          >
            {/* Category Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className={`size-3 rounded-full shrink-0 ${accent.dot}`} />
                <h6 className="font-display font-bold text-base">{category}</h6>
              </div>

              <div className="flex items-center gap-1.5">
                <Badge className={`${isComplete ? 'bg-success/15 text-success' : accent.chip} border-transparent`}>
                  {completedCount}/{categoryItems.length}
                </Badge>
                <button
                  type="button"
                  onClick={() => onToggleCategory(category)}
                  className={`size-8 rounded-lg flex items-center justify-center transition-transform hover:scale-110 ${accent.iconHover}`}
                >
                  {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1 rounded-full bg-border overflow-hidden mb-1.5">
              <div
                className={`h-full transition-[width] duration-300 ${isComplete ? 'bg-success' : accent.dot}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs font-medium text-muted-foreground">
              {isComplete ? 'Complete!' : `${Math.round(progress)}% complete`}
            </p>

            {/* Items List */}
            <div
              className="grid transition-[grid-template-rows] duration-300 ease-out"
              style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
            >
              <div className="overflow-hidden">
                <div className="mt-3 space-y-1.5">
                  {categoryItems.map((item) => {
                    const isRemoving = removingIds.has(item.id);
                    const isEditingThis = editingText === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all duration-200 animate-in fade-in slide-in-from-top-1 ${
                          isRemoving ? 'opacity-0 scale-95 -translate-x-2' : 'opacity-100'
                        } ${
                          item.completed
                            ? 'bg-success/8 border-success/20 hover:bg-success/12 hover:border-success/30'
                            : 'bg-background border-border hover:border-primary hover:bg-accent'
                        } hover:translate-x-1`}
                      >
                        <Checkbox
                          checked={item.completed}
                          onCheckedChange={() => onToggleItem(item.id)}
                          onClick={(e) => e.stopPropagation()}
                          disabled={loading || isEditingThis}
                          className="shrink-0 data-[state=checked]:bg-success data-[state=checked]:border-success"
                        />

                        {/* Count Chip */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              disabled={loading || isEditingThis}
                              className="inline-flex items-center justify-center text-xs font-bold h-7 min-w-[42px] px-2 rounded-full bg-primary/10 text-primary shrink-0 transition-transform select-none active:scale-95 disabled:opacity-50 disabled:pointer-events-none hover:bg-primary/20"
                            >
                              ×{item.count || 1}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="min-w-[8rem] max-h-64 overflow-y-auto">
                            {COUNT_OPTIONS.map((num) => (
                              <DropdownMenuItem
                                key={num}
                                variant={num === 0 ? 'destructive' : 'default'}
                                onClick={() => handleCountChange(item.id, num)}
                                className={num === 0 ? 'font-semibold' : ''}
                              >
                                {num === 0 ? '🗑️ Remove Item' : `×${num}`}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>

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
                              className="h-8 text-sm font-medium"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => !loading && handleStartEditText(item)}
                              disabled={loading}
                              className={`text-sm font-medium text-left break-words w-full disabled:cursor-default ${
                                item.completed ? 'line-through opacity-70 text-muted-foreground' : 'text-foreground'
                              } hover:text-primary hover:underline`}
                            >
                              {item.text}
                            </button>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          {isEditingThis ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSaveText(item.id, item.text)}
                                disabled={loading || !editedTextValue.trim()}
                                className="size-7 rounded-lg flex items-center justify-center text-success hover:bg-success/10 disabled:opacity-40"
                              >
                                <Check className="size-4" />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEditText}
                                disabled={loading}
                                className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                              >
                                <X className="size-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              {editingCategory === item.id ? (
                                <Select
                                  value={item.category}
                                  onValueChange={(value) => handleUpdateCategory(item.id, value)}
                                  disabled={loading}
                                >
                                  <SelectTrigger size="sm" className="h-8 min-w-[6.5rem] text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {categoryList.map(cat => (
                                      <SelectItem key={cat} value={cat} className="text-xs">
                                        {cat}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setEditingCategory(item.id)}
                                  disabled={loading}
                                  className={`size-7 rounded-lg flex items-center justify-center disabled:opacity-40 ${
                                    item.category === 'Other'
                                      ? 'text-warning hover:bg-warning/10'
                                      : 'text-muted-foreground hover:bg-primary/8 hover:text-primary'
                                  }`}
                                >
                                  <Pencil className="size-4" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => requestRemoveItem(item.id)}
                                disabled={loading}
                                className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
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
  loading: PropTypes.bool
};

export default GroceryListDisplay;
