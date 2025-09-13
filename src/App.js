import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Plus, Trash2, Check, Calendar, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';

const VoiceGroceryList = () => {
  const [allLists, setAllLists] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const recognitionRef = useRef(null);

  // Grocery categories for auto-categorization
  const categories = {
    'Produce': ['apple', 'banana', 'orange', 'lettuce', 'tomato', 'onion', 'carrot', 'potato', 'spinach', 'broccoli', 'cucumber', 'pepper', 'avocado', 'lemon', 'lime', 'garlic', 'ginger', 'celery', 'mushroom', 'corn'],
    'Dairy': ['milk', 'cheese', 'butter', 'yogurt', 'cream', 'eggs', 'sour cream', 'cottage cheese', 'ice cream'],
    'Meat & Seafood': ['chicken', 'beef', 'pork', 'fish', 'salmon', 'turkey', 'ham', 'bacon', 'sausage', 'shrimp', 'tuna'],
    'Pantry': ['bread', 'rice', 'pasta', 'flour', 'sugar', 'salt', 'pepper', 'oil', 'vinegar', 'cereal', 'oats', 'beans', 'canned goods', 'soup', 'sauce'],
    'Frozen': ['frozen vegetables', 'frozen fruit', 'ice cream', 'frozen pizza', 'frozen meals'],
    'Beverages': ['water', 'juice', 'soda', 'coffee', 'tea', 'wine', 'beer'],
    'Snacks': ['chips', 'crackers', 'cookies', 'nuts', 'chocolate', 'candy'],
    'Other': []
  };

  const categoryList = Object.keys(categories);

  // Get current list items
  const currentItems = allLists[currentDate] || [];

  // Auto-categorize items
  const categorizeItem = (item) => {
    const itemLower = item.toLowerCase();
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => itemLower.includes(keyword))) {
        return category;
      }
    }
    return 'Other';
  };

  // Parse speech transcript into grocery items
  const parseGroceryItems = (text) => {
    const commonSeparators = /[,;]|\band\b|\bthen\b|\balso\b|\bplus\b/gi;
    const items = text
      .split(commonSeparators)
      .map(item => item.trim())
      .filter(item => item.length > 0)
      .map(item => item.replace(/^(i need|get|buy|pick up)\s*/i, ''))
      .filter(item => item.length > 0);
    
    return items;
  };

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscript(finalTranscript);
          const newItems = parseGroceryItems(finalTranscript);
          addItemsToList(newItems);
        }
      };

      recognitionRef.current.onerror = (event) => {
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      setError('Speech recognition not supported in this browser');
    }
  }, []);

  // Initialize today's list if it doesn't exist
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (!allLists[today]) {
      setAllLists(prev => ({ ...prev, [today]: [] }));
    }
  }, [allLists]);

  const addItemsToList = (newItems) => {
    const itemsWithData = newItems.map(item => ({
      id: Date.now() + Math.random(),
      text: item,
      category: categorizeItem(item),
      completed: false
    }));
    
    setAllLists(prev => ({
      ...prev,
      [currentDate]: [...(prev[currentDate] || []), ...itemsWithData]
    }));
  };

  const startListening = () => {
    if (recognitionRef.current) {
      setError('');
      setTranscript('');
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const toggleItem = (id) => {
    setAllLists(prev => ({
      ...prev,
      [currentDate]: prev[currentDate].map(item => 
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    }));
  };

  const removeItem = (id) => {
    setAllLists(prev => ({
      ...prev,
      [currentDate]: prev[currentDate].filter(item => item.id !== id)
    }));
  };

  const updateItemCategory = (id, newCategory) => {
    setAllLists(prev => ({
      ...prev,
      [currentDate]: prev[currentDate].map(item => 
        item.id === id ? { ...item, category: newCategory } : item
      )
    }));
    setEditingCategory(null);
  };

  const addManualItem = () => {
    if (manualInput.trim()) {
      const newItems = parseGroceryItems(manualInput);
      addItemsToList(newItems);
      setManualInput('');
    }
  };

  const clearCurrentList = () => {
    setAllLists(prev => ({
      ...prev,
      [currentDate]: []
    }));
  };

  const deleteList = (date) => {
    setAllLists(prev => {
      const newLists = { ...prev };
      delete newLists[date];
      return newLists;
    });
    
    // If we deleted the current list, switch to today
    if (date === currentDate) {
      const today = new Date().toISOString().split('T')[0];
      setCurrentDate(today);
    }
  };

  const formatDateDisplay = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = dateString === today.toISOString().split('T')[0];
    const isYesterday = dateString === yesterday.toISOString().split('T')[0];
    const isTomorrow = dateString === tomorrow.toISOString().split('T')[0];

    if (isToday) return `Today (${date.toLocaleDateString()})`;
    if (isYesterday) return `Yesterday (${date.toLocaleDateString()})`;
    if (isTomorrow) return `Tomorrow (${date.toLocaleDateString()})`;
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  };

  const createNewListForDate = (date) => {
    setCurrentDate(date);
    if (!allLists[date]) {
      setAllLists(prev => ({ ...prev, [date]: [] }));
    }
    setShowDatePicker(false);
  };

  // Group current items by category
  const groupedItems = currentItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  // Get sorted list of dates (most recent first)
  const sortedDates = Object.keys(allLists).sort((a, b) => new Date(b) - new Date(a));

  return (
    <div className="min-h-screen bg-gray-900" style={{backgroundColor: '#272822'}}>
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-gray-800 rounded-lg shadow-xl p-6" style={{backgroundColor: '#1e1f1c', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'}}>
          <h1 className="text-3xl font-bold text-center mb-6" style={{color: '#f8f8f2'}}>
            🛒 Voice Grocery Lists
          </h1>
          
          {/* Date Selection */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <Calendar size={20} style={{color: '#a6e22e'}} />
              <div className="flex-1">
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors duration-200"
                  style={{
                    backgroundColor: '#49483e',
                    border: '1px solid #75715e',
                    color: '#f8f8f2'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#75715e'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#49483e'}
                >
                  <span className="font-medium">{formatDateDisplay(currentDate)}</span>
                  {showDatePicker ? <ChevronUp size={20} style={{color: '#fd971f'}} /> : <ChevronDown size={20} style={{color: '#fd971f'}} />}
                </button>
              </div>
              <input
                type="date"
                value={currentDate}
                onChange={(e) => createNewListForDate(e.target.value)}
                className="px-3 py-2 rounded-lg"
                style={{
                  backgroundColor: '#49483e',
                  border: '1px solid #75715e',
                  color: '#f8f8f2'
                }}
              />
            </div>

            {/* Date Picker Dropdown */}
            {showDatePicker && (
              <div className="rounded-lg shadow-lg max-h-48 overflow-y-auto" style={{backgroundColor: '#1e1f1c', border: '1px solid #49483e'}}>
                {sortedDates.length > 0 ? (
                  sortedDates.map(date => (
                    <div key={date} className="flex items-center justify-between p-3 border-b last:border-b-0 transition-colors duration-150" 
                         style={{borderColor: '#49483e'}}
                         onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#49483e'}
                         onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <button
                        onClick={() => createNewListForDate(date)}
                        className={`flex-1 text-left ${date === currentDate ? 'font-semibold' : ''}`}
                        style={{color: date === currentDate ? '#a6e22e' : '#f8f8f2'}}
                      >
                        {formatDateDisplay(date)}
                        <span className="text-sm ml-2" style={{color: '#75715e'}}>
                          ({allLists[date]?.length || 0} items)
                        </span>
                      </button>
                      {date !== currentDate && (
                        <button
                          onClick={() => deleteList(date)}
                          className="p-1 transition-colors duration-150"
                          style={{color: '#f92672'}}
                          onMouseEnter={(e) => e.target.style.color = '#ff6b9d'}
                          onMouseLeave={(e) => e.target.style.color = '#f92672'}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="p-3 text-center" style={{color: '#75715e'}}>No grocery lists yet</p>
                )}
              </div>
            )}
          </div>

          {/* Voice Controls */}
          <div className="mb-6 text-center">
            <button
              onClick={isListening ? stopListening : startListening}
              className={`px-6 py-3 rounded-lg font-semibold text-white flex items-center gap-2 mx-auto transition-all duration-200 ${
                isListening 
                  ? 'hover:shadow-lg' 
                  : 'hover:shadow-lg'
              }`}
              style={{
                backgroundColor: isListening ? '#f92672' : '#ae81ff',
                boxShadow: isListening ? '0 4px 14px 0 rgba(249, 38, 114, 0.4)' : '0 4px 14px 0 rgba(174, 129, 255, 0.4)'
              }}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              {isListening ? 'Stop Listening' : 'Start Listening'}
            </button>
            
            {isListening && (
              <p className="mt-2 text-sm animate-pulse" style={{color: '#a6e22e'}}>
                🎤 Listening... Say your grocery items!
              </p>
            )}
            
            {transcript && (
              <p className="mt-2 text-sm italic" style={{color: '#75715e'}}>
                Last heard: "{transcript}"
              </p>
            )}
          </div>

          {/* Manual Input */}
          <div className="mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addManualItem()}
                placeholder="Or type items manually (e.g., apples, milk, bread)"
                className="flex-1 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 transition-all duration-200"
                style={{
                  backgroundColor: '#49483e',
                  border: '1px solid #75715e',
                  color: '#f8f8f2',
                  focusRingColor: '#a6e22e'
                }}
                onFocus={(e) => e.target.style.borderColor = '#a6e22e'}
                onBlur={(e) => e.target.style.borderColor = '#75715e'}
              />
              <button
                onClick={addManualItem}
                className="px-4 py-2 text-white rounded-lg flex items-center gap-1 transition-all duration-200 hover:shadow-lg"
                style={{
                  backgroundColor: '#a6e22e',
                  boxShadow: '0 4px 14px 0 rgba(166, 226, 46, 0.4)'
                }}
              >
                <Plus size={16} /> Add
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 rounded-lg" style={{
              backgroundColor: 'rgba(249, 38, 114, 0.1)',
              border: '1px solid #f92672',
              color: '#f92672'
            }}>
              {error}
            </div>
          )}

          {/* List Controls */}
          {currentItems.length > 0 && (
            <div className="mb-4 flex justify-between items-center">
              <span style={{color: '#75715e'}}>
                {currentItems.filter(item => !item.completed).length} of {currentItems.length} items remaining
              </span>
              <button
                onClick={clearCurrentList}
                className="px-3 py-1 text-white rounded text-sm flex items-center gap-1 transition-all duration-200"
                style={{backgroundColor: '#f92672'}}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#ff6b9d'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#f92672'}
              >
                <Trash2 size={14} /> Clear List
              </button>
            </div>
          )}

          {/* Grocery List by Categories */}
          <div className="space-y-4">
            {Object.entries(groupedItems).map(([category, categoryItems]) => (
              <div key={category} className="rounded-lg p-4" style={{
                backgroundColor: '#49483e',
                border: '1px solid #75715e'
              }}>
                <h3 className="font-semibold text-lg mb-3 border-b pb-2" style={{
                  color: category === 'Other' ? '#fd971f' : '#f8f8f2',
                  borderColor: '#75715e'
                }}>
                  {category} ({categoryItems.length})
                  {category === 'Other' && (
                    <span className="text-sm font-normal ml-2" style={{color: '#75715e'}}>
                      - Click edit to categorize
                    </span>
                  )}
                </h3>
                <div className="space-y-2">
                  {categoryItems.map(item => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-2 rounded transition-colors duration-150 ${
                        item.completed ? '' : ''
                      }`}
                      style={{backgroundColor: item.completed ? '#1e1f1c' : 'transparent'}}
                    >
                      <button
                        onClick={() => toggleItem(item.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                          item.completed
                            ? ''
                            : 'hover:scale-110'
                        }`}
                        style={{
                          backgroundColor: item.completed ? '#a6e22e' : 'transparent',
                          borderColor: item.completed ? '#a6e22e' : '#75715e',
                          color: item.completed ? '#272822' : 'transparent'
                        }}
                      >
                        {item.completed && <Check size={12} />}
                      </button>
                      <span
                        className={`flex-1 transition-all duration-200 ${
                          item.completed
                            ? 'line-through'
                            : ''
                        }`}
                        style={{
                          color: item.completed ? '#75715e' : '#f8f8f2'
                        }}
                      >
                        {item.text}
                      </span>
                      
                      {/* Category Edit Dropdown */}
                      {editingCategory === item.id ? (
                        <select
                          value={item.category}
                          onChange={(e) => updateItemCategory(item.id, e.target.value)}
                          className="px-2 py-1 rounded text-sm"
                          style={{
                            backgroundColor: '#1e1f1c',
                            color: '#f8f8f2',
                            border: '1px solid #a6e22e'
                          }}
                        >
                          {categoryList.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={() => setEditingCategory(item.id)}
                          className="p-1 transition-colors duration-150"
                          style={{color: item.category === 'Other' ? '#fd971f' : '#75715e'}}
                          onMouseEnter={(e) => e.target.style.color = '#a6e22e'}
                          onMouseLeave={(e) => e.target.style.color = item.category === 'Other' ? '#fd971f' : '#75715e'}
                        >
                          <Edit3 size={16} />
                        </button>
                      )}
                      
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 transition-colors duration-150"
                        style={{color: '#f92672'}}
                        onMouseEnter={(e) => e.target.style.color = '#ff6b9d'}
                        onMouseLeave={(e) => e.target.style.color = '#f92672'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {currentItems.length === 0 && (
            <div className="text-center py-8">
              <p className="text-lg" style={{color: '#f8f8f2'}}>
                No items in your grocery list for {formatDateDisplay(currentDate)}!
              </p>
              <p className="text-sm mt-2" style={{color: '#75715e'}}>
                Click "Start Listening" and say your grocery items, or type them manually.
              </p>
            </div>
          )}

          {/* Usage Instructions */}
          <div className="mt-8 p-4 rounded-lg" style={{
            backgroundColor: 'rgba(174, 129, 255, 0.1)',
            border: '1px solid #ae81ff'
          }}>
            <h4 className="font-semibold mb-2" style={{color: '#ae81ff'}}>How to use:</h4>
            <ul className="text-sm space-y-1" style={{color: '#f8f8f2'}}>
              <li>• Each date gets its own separate grocery list</li>
              <li>• Click "Start Listening" and speak: "I need apples, milk, bread, and chicken"</li>
              <li>• Items are auto-categorized - click the edit icon to recategorize</li>
              <li>• Use the date picker to switch between lists or create new ones</li>
              <li>• Check off items as you shop, view past lists anytime</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceGroceryList;