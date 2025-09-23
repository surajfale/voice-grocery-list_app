/**
 * Intelligent Grocery Categorization and Auto-correction Service
 * Handles Asian/Indian groceries and spelling corrections
 */

class GroceryIntelligenceService {
  constructor() {
    // Comprehensive grocery database with Asian/Indian items
    this.groceryDatabase = {
      'Produce': [
        // Common produce
        'apple', 'banana', 'orange', 'lettuce', 'tomato', 'onion', 'carrot', 'potato',
        'spinach', 'broccoli', 'cucumber', 'pepper', 'avocado', 'lemon', 'lime',
        'garlic', 'ginger', 'celery', 'mushroom', 'corn', 'cauliflower',
        // Asian/Indian produce
        'bok choy', 'napa cabbage', 'daikon', 'bitter melon', 'okra', 'bhindi',
        'eggplant', 'brinjal', 'green chilies', 'thai basil', 'cilantro', 'coriander',
        'mint', 'curry leaves', 'lemongrass', 'galangal', 'shallots', 'scallions',
        'snow peas', 'bean sprouts', 'water chestnuts', 'bamboo shoots',
        'chinese broccoli', 'yu choy', 'mustard greens', 'fenugreek leaves', 'methi'
      ],

      'Asian Pantry': [
        // Rice and grains
        'basmati rice', 'jasmine rice', 'sushi rice', 'sticky rice', 'brown rice',
        'rice flour', 'glutinous rice flour', 'tapioca starch', 'potato starch',
        // Noodles
        'ramen noodles', 'udon noodles', 'soba noodles', 'rice noodles', 'glass noodles',
        'instant noodles', 'vermicelli', 'rice vermicelli',
        // Sauces and condiments
        'soy sauce', 'oyster sauce', 'fish sauce', 'hoisin sauce', 'sriracha',
        'sesame oil', 'rice vinegar', 'mirin', 'sake', 'miso paste',
        'tahini', 'sambal oelek', 'black bean sauce', 'teriyaki sauce',
        // Oils and vinegars
        'coconut oil', 'peanut oil', 'sesame oil', 'rice bran oil'
      ],

      'Indian Pantry': [
        // Spices and seasonings
        'turmeric', 'cumin', 'coriander seeds', 'mustard seeds', 'fenugreek seeds',
        'cardamom', 'cinnamon', 'cloves', 'bay leaves', 'black pepper',
        'red chili powder', 'garam masala', 'curry powder', 'tandoori masala',
        'chaat masala', 'asafoetida', 'hing', 'fennel seeds', 'nigella seeds', 'kalonji',
        // Lentils and legumes
        'toor dal', 'moong dal', 'chana dal', 'urad dal', 'masoor dal',
        'rajma', 'chickpeas', 'black gram', 'green lentils', 'red lentils',
        // Flours and grains
        'chapati flour', 'besan', 'gram flour', 'semolina', 'rava', 'poha',
        'quinoa', 'amaranth', 'millet', 'buckwheat flour',
        // Other essentials
        'ghee', 'coconut milk', 'tamarind paste', 'jaggery', 'palm sugar',
        'pickles', 'papad', 'poppadom'
      ],

      'Meat & Seafood': [
        'chicken', 'beef', 'pork', 'fish', 'salmon', 'turkey', 'ham', 'bacon',
        'sausage', 'shrimp', 'tuna', 'prawns', 'crab', 'lobster', 'scallops',
        'lamb', 'mutton', 'goat meat', 'duck'
      ],

      'Dairy': [
        'milk', 'cheese', 'butter', 'yogurt', 'cream', 'eggs', 'sour cream',
        'cottage cheese', 'ice cream', 'paneer', 'greek yogurt', 'heavy cream',
        'condensed milk', 'evaporated milk', 'coconut cream'
      ],

      'Frozen': [
        'frozen vegetables', 'frozen fruit', 'ice cream', 'frozen pizza',
        'frozen meals', 'frozen dumplings', 'frozen samosas', 'frozen parathas'
      ],

      'Beverages': [
        'water', 'juice', 'soda', 'coffee', 'tea', 'wine', 'beer',
        'green tea', 'chai', 'lassi', 'coconut water', 'almond milk',
        'soy milk', 'oat milk'
      ],

      'Snacks': [
        'chips', 'crackers', 'cookies', 'nuts', 'chocolate', 'candy',
        'pretzels', 'popcorn', 'trail mix', 'dried fruit',
        'namkeen', 'bhujia', 'mixture', 'murukku', 'rice crackers'
      ],

      'Bakery': [
        'bread', 'naan', 'roti', 'chapati', 'pita bread', 'bagels',
        'croissants', 'muffins', 'cake', 'pastries'
      ],

      'Other': []
    };

    // Create a flat list of all items for fuzzy matching
    this.allItems = [];
    Object.values(this.groceryDatabase).forEach(items => {
      this.allItems.push(...items);
    });

    // Common misspellings and their corrections
    this.commonCorrections = {
      // Common spelling mistakes
      'tomatoe': 'tomato',
      'potatoe': 'potato',
      'bannana': 'banana',
      'avacado': 'avocado',
      'brocooli': 'broccoli',
      'brocoli': 'broccoli',
      'carot': 'carrot',
      'carrott': 'carrot',
      'onions': 'onion',
      'garlick': 'garlic',

      // Asian/Indian items
      'basmatti': 'basmati rice',
      'basmati': 'basmati rice',
      'jasmin rice': 'jasmine rice',
      'tumeric': 'turmeric',
      'cummin': 'cumin',
      'cinammon': 'cinnamon',
      'cardemon': 'cardamom',
      'corriander': 'coriander',
      'cilentro': 'cilantro',
      'fenugrek': 'fenugreek',
      'methi': 'fenugreek leaves',
      'dal': 'lentils',
      'daal': 'lentils',
      'channa': 'chickpeas',
      'rajmah': 'rajma',
      'panir': 'paneer',
      'ghii': 'ghee',
      'hing': 'asafoetida',
      'jeera': 'cumin',
      'haldi': 'turmeric',
      'dhania': 'coriander',
      'chili': 'chilies',
      'chilli': 'chilies',
      'green chili': 'green chilies',
      'green chilli': 'green chilies'
    };
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance
   */
  calculateSimilarity(str1, str2) {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1;

    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Levenshtein distance algorithm
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Auto-correct item name and suggest category
   */
  processGroceryItem(itemText) {
    const originalText = itemText.trim();
    const lowerText = originalText.toLowerCase();

    // First check for exact common corrections
    let correctedText = this.commonCorrections[lowerText] || originalText;
    let wasCorreted = correctedText !== originalText;

    // If no exact correction found, try fuzzy matching
    if (!wasCorreted) {
      const bestMatch = this.findBestMatch(lowerText);
      if (bestMatch.similarity > 0.8) { // 80% similarity threshold
        correctedText = bestMatch.item;
        wasCorreted = true;
      }
    }

    // Determine category
    const category = this.categorizeItem(correctedText.toLowerCase());

    return {
      originalText,
      correctedText,
      wasCorreted,
      category,
      confidence: wasCorreted ? 'high' : 'medium'
    };
  }

  /**
   * Find best matching item using fuzzy search
   */
  findBestMatch(input) {
    let bestMatch = { item: input, similarity: 0 };

    for (const item of this.allItems) {
      const similarity = this.calculateSimilarity(input, item);
      if (similarity > bestMatch.similarity) {
        bestMatch = { item, similarity };
      }

      // Also check if input is contained in item (partial match)
      if (item.includes(input) && input.length > 2) {
        const partialSimilarity = 0.9; // High confidence for partial matches
        if (partialSimilarity > bestMatch.similarity) {
          bestMatch = { item, similarity: partialSimilarity };
        }
      }
    }

    return bestMatch;
  }

  /**
   * Categorize item based on keyword matching
   */
  categorizeItem(itemText) {
    const text = itemText.toLowerCase();

    for (const [category, items] of Object.entries(this.groceryDatabase)) {
      if (category === 'Other') continue;

      for (const item of items) {
        // Exact match
        if (text === item.toLowerCase()) {
          return category;
        }

        // Partial match for compound items
        if (text.includes(item.toLowerCase())) {
          // Only match if the input contains the full item name
          // e.g., "almond milk" contains "milk", but "milk" doesn't contain "coconut milk"
          if (text.length > 2 && item.length > 2) {
            return category;
          }
        }
      }
    }

    // Try keyword-based categorization for unknown items
    if (this.containsKeywords(text, ['rice', 'dal', 'lentil', 'flour', 'spice', 'masala', 'powder'])) {
      return text.includes('rice') ? 'Asian Pantry' : 'Indian Pantry';
    }

    if (this.containsKeywords(text, ['milk', 'cheese', 'yogurt', 'cream'])) {
      return 'Dairy';
    }

    if (this.containsKeywords(text, ['vegetable', 'green', 'leaf', 'leaves'])) {
      return 'Produce';
    }

    if (this.containsKeywords(text, ['meat', 'chicken', 'fish', 'seafood'])) {
      return 'Meat & Seafood';
    }

    if (this.containsKeywords(text, ['milk', 'cheese', 'yogurt', 'cream'])) {
      return 'Dairy';
    }

    return 'Other';
  }

  /**
   * Check if text contains any of the given keywords
   */
  containsKeywords(text, keywords) {
    return keywords.some(keyword => text.includes(keyword));
  }

  /**
   * Get suggestions for similar items
   */
  getSuggestions(input, limit = 5) {
    const suggestions = [];
    const lowerInput = input.toLowerCase();

    for (const item of this.allItems) {
      const similarity = this.calculateSimilarity(lowerInput, item);
      if (similarity > 0.6) { // 60% similarity for suggestions
        suggestions.push({ item, similarity });
      }
    }

    return suggestions
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(s => s.item);
  }
}

// Export singleton instance
export default new GroceryIntelligenceService();