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

    // Asian/Indian pantry item conversions (local names to English)
    this.asianPantryConversions = {
      // Hindi/Indian local names
      'mirchi': 'green chilies',
      'hari mirchi': 'green chilies',
      'lal mirchi': 'red chili powder',
      'jeera': 'cumin',
      'jira': 'cumin',
      'haldi': 'turmeric',
      'dhania': 'coriander',
      'dhaniya': 'coriander',
      'methi': 'fenugreek leaves',
      'hing': 'asafoetida',
      'heeng': 'asafoetida',
      'kalonji': 'nigella seeds',
      'ajwain': 'carom seeds',
      'saunf': 'fennel seeds',
      'elaichi': 'cardamom',
      'dalchini': 'cinnamon',
      'laung': 'cloves',
      'tej patta': 'bay leaves',
      'kali mirch': 'black pepper',
      'imli': 'tamarind',
      'gud': 'jaggery',
      'gur': 'jaggery',
      'besan': 'gram flour',
      'atta': 'chapati flour',
      'suji': 'semolina',
      'rava': 'semolina',
      'chana': 'chickpeas',
      'channa': 'chickpeas',
      'rajma': 'kidney beans',
      'rajmah': 'kidney beans',
      'moong': 'mung beans',
      'masoor': 'red lentils',
      'toor': 'pigeon peas',
      'urad': 'black lentils',
      'dal': 'lentils',
      'daal': 'lentils',
      'dahi': 'yogurt',
      'panir': 'paneer',
      'ghee': 'clarified butter',
      'ghii': 'ghee',
      'aloo': 'potato',
      'pyaz': 'onion',
      'tamatar': 'tomato',
      'adrak': 'ginger',
      'lehsun': 'garlic',
      'pudina': 'mint',
      'palak': 'spinach',
      'gobi': 'cauliflower',
      'phool gobi': 'cauliflower',
      'band gobi': 'cabbage',
      'bhindi': 'okra',
      'baingan': 'eggplant',
      'brinjal': 'eggplant',
      'karela': 'bitter melon',
      'lauki': 'bottle gourd',
      'tori': 'zucchini',
      'kaddu': 'pumpkin',
      'shimla mirch': 'bell pepper',
      // Chinese/Asian local names
      'bok choy': 'chinese cabbage',
      'pak choi': 'chinese cabbage',
      'yu choy': 'chinese broccoli',
      'gai lan': 'chinese broccoli',
      'daikon': 'white radish',
      'mooli': 'white radish'
    };

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

      // Asian/Indian spelling mistakes
      'basmatti': 'basmati rice',
      'jasmin rice': 'jasmine rice',
      'tumeric': 'turmeric',
      'cummin': 'cumin',
      'cinammon': 'cinnamon',
      'cardemon': 'cardamom',
      'corriander': 'coriander',
      'cilentro': 'cilantro',
      'fenugrek': 'fenugreek',
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

    if (s1 === s2) {return 1;}

    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) {return 1;}

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
   * Check if an item is already correctly spelled and exists in database
   */
  isValidGroceryItem(itemText) {
    const lowerText = itemText.toLowerCase().trim();

    // Check if it's exactly in our database
    for (const items of Object.values(this.groceryDatabase)) {
      if (items.some(item => item.toLowerCase() === lowerText)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Auto-correct item name and suggest category
   * Only suggests corrections for misspelled or local-named items
   */
  processGroceryItem(itemText) {
    const originalText = itemText.trim();
    const lowerText = originalText.toLowerCase();

    // Step 1: Check if it's already a valid item (correctly spelled)
    if (this.isValidGroceryItem(lowerText)) {
      // No correction needed - it's already correct
      const category = this.categorizeItem(lowerText);
      return {
        originalText,
        correctedText: originalText,
        wasCorreted: false,
        category,
        confidence: 'high'
      };
    }

    // Step 2: Check for Asian/Indian pantry item conversions
    if (this.asianPantryConversions[lowerText]) {
      const correctedText = this.asianPantryConversions[lowerText];
      const category = this.categorizeItem(correctedText.toLowerCase());
      return {
        originalText,
        correctedText,
        wasCorreted: true,
        category,
        confidence: 'high',
        conversionType: 'asian_pantry'
      };
    }

    // Step 3: Check for common misspellings
    if (this.commonCorrections[lowerText]) {
      const correctedText = this.commonCorrections[lowerText];
      const category = this.categorizeItem(correctedText.toLowerCase());
      return {
        originalText,
        correctedText,
        wasCorreted: true,
        category,
        confidence: 'high',
        conversionType: 'spelling'
      };
    }

    // Step 4: Try fuzzy matching only for potentially misspelled words
    const bestMatch = this.findBestMatch(lowerText);
    // Higher threshold (85%) and ensure it's not already the same word
    if (bestMatch.similarity > 0.85 && bestMatch.similarity < 1.0) {
      const category = this.categorizeItem(bestMatch.item.toLowerCase());
      return {
        originalText,
        correctedText: bestMatch.item,
        wasCorreted: true,
        category,
        confidence: 'medium',
        conversionType: 'fuzzy',
        similarity: bestMatch.similarity
      };
    }

    // Step 5: No correction found - use as-is
    const category = this.categorizeItem(lowerText);
    return {
      originalText,
      correctedText: originalText,
      wasCorreted: false,
      category,
      confidence: 'low'
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
      if (category === 'Other') {continue;}

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
   * Check if a word/phrase is likely a grocery item
   */
  isLikelyGroceryItem(text) {
    const lowerText = text.toLowerCase().trim();

    // Check if it's a valid item in database
    if (this.isValidGroceryItem(lowerText)) {
      return true;
    }

    // Check if it's an Asian/Indian pantry conversion
    if (this.asianPantryConversions[lowerText]) {
      return true;
    }

    // Check common corrections
    if (this.commonCorrections[lowerText]) {
      return true;
    }

    // Check if it's similar to known items (higher threshold)
    const bestMatch = this.findBestMatch(lowerText);
    return bestMatch.similarity > 0.85;
  }

  /**
   * Enhanced item processing for voice recognition
   */
  processMultipleItems(itemTexts) {
    return itemTexts.map(text => this.processGroceryItem(text));
  }

  /**
   * Smart parsing for space-separated items
   */
  parseSpaceSeparatedItems(text) {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    if (words.length <= 1) {return [text];}

    const items = [];
    let i = 0;

    while (i < words.length) {
      let bestPhrase = words[i];
      let bestScore = this.isLikelyGroceryItem(words[i]) ? 0.8 : 0.3;

      // Try 2-word combinations
      if (i < words.length - 1) {
        const twoWordPhrase = `${words[i]} ${words[i + 1]}`;
        if (this.isLikelyGroceryItem(twoWordPhrase)) {
          bestPhrase = twoWordPhrase;
          bestScore = 0.9;
        }
      }

      // Try 3-word combinations
      if (i < words.length - 2 && bestScore < 0.9) {
        const threeWordPhrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
        if (this.isLikelyGroceryItem(threeWordPhrase)) {
          bestPhrase = threeWordPhrase;
          bestScore = 0.95;
        }
      }

      items.push(bestPhrase);
      i += bestPhrase.split(' ').length;
    }

    return items;
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