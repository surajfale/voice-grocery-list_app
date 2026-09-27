// Emoji + hue per grocery category. The hue drives tinted tiles, labels, cards
// and chart bars (see the .cat-* classes in index.css), so the grocery list and
// spending charts always agree on a category's color.
export const CATEGORY_STYLES = {
  'Produce': { emoji: '🥬', hue: 145 },
  'Dairy': { emoji: '🥛', hue: 240 },
  'Meat & Seafood': { emoji: '🍗', hue: 25 },
  'Bakery': { emoji: '🥖', hue: 75 },
  'Frozen': { emoji: '🧊', hue: 215 },
  'Snacks': { emoji: '🍿', hue: 95 },
  'Beverages': { emoji: '🧃', hue: 305 },
  'Asian Pantry': { emoji: '🍜', hue: 330 },
  'Indian Pantry': { emoji: '🫘', hue: 55 },
  'Canned Goods': { emoji: '🥫', hue: 10 },
  'Condiments & Sauces': { emoji: '🧂', hue: 120 },
  'Household': { emoji: '🧽', hue: 190 },
  'Personal Care': { emoji: '🧴', hue: 280 },
};

export const DEFAULT_CATEGORY_STYLE = { emoji: '🛒', hue: 265 };

export const getCategoryStyle = (category) => CATEGORY_STYLES[category] || DEFAULT_CATEGORY_STYLE;

// Stable hue for free-text names (e.g. store names) so each keeps its color
export const hueFromString = (value = '') => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 360;
  }
  return hash;
};
