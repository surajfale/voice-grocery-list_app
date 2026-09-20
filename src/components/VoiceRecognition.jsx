import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import PropTypes from 'prop-types';
import { Mic, MicOff } from 'lucide-react';
import logger from '../utils/logger.js';
import groceryIntelligence from '../services/groceryIntelligence.js';

const VoiceRecognition = memo(({ onItemsDetected, disabled = false }) => {
  const [isListening, setIsListening] = useState(false);
  const [_transcript, setTranscript] = useState('');
  const [fullTranscript, setFullTranscript] = useState('');
  const recognitionRef = useRef(null);
  const isManualStopRef = useRef(false);
  const processAccumulatedItemsRef = useRef(null);




  // ...existing code... (speech initialization moved below so helpers are defined first)

  // ...existing code...

  // Clean speech text by removing filler words, utterances, and speech artifacts
  const cleanSpeechText = useCallback((text) => {
    // Comprehensive list of filler words, utterances, and speech artifacts
    const fillerWords = [
      // Utterances and sounds
      'uhh', 'umm', 'ahh', 'ohh', 'err', 'hmm', 'huh', 'mhm', 'uh-huh', 'mm-hmm',
      'uh', 'um', 'ah', 'oh', 'er', 'hm', 'eh', 'mm',
      // Pronouns and non-grocery words
      'i', 'me', 'my', 'we', 'us', 'our', 'you', 'your', 'he', 'she', 'it', 'they', 'them', 'their',
      // Common speech patterns
      'like', 'you know', 'i mean', 'basically', 'actually', 'literally', 'really', 'just', 'maybe',
      'i think', 'i guess', 'sort of', 'kind of', 'kinda', 'sorta',
      // Commands already handled in prefixes but adding for safety
      'get', 'buy', 'pick', 'grab', 'take', 'find',
      // Politeness words
      'please', 'thanks', 'thank you', 'thanks a lot', 'thank you very much',
      // Time/sequence words that aren't separators
      'now', 'today', 'later', 'first', 'second', 'third', 'last', 'finally'
    ];

    let cleaned = text.toLowerCase();

    // Remove common speech prefixes
    cleaned = cleaned.replace(/^(i need|get me|buy|pick up|add|i want|get|grab|find|take)\s*/i, '');

    // Remove common speech suffixes
    cleaned = cleaned.replace(/\s*(please|thanks|thank you|thanks a lot|thank you very much)$/i, '');

    // Remove articles and determiners
    cleaned = cleaned.replace(/\b(some|a|an|the|these|those|this|that)\s+/gi, '');

    // Remove filler words by tokenizing and filtering using a Set (avoids dynamic RegExp usage)
    const fillerSet = new Set(fillerWords.map(w => w.toLowerCase()));
    const tokens = cleaned.split(/\s+/).filter(Boolean);
    const filteredTokens = tokens.filter(t => !fillerSet.has(t));
    cleaned = filteredTokens.join(' ').replace(/\s+/g, ' ').trim();

    return cleaned;
  }, []);

  // Intelligent word splitting for space-separated grocery items
  const intelligentWordSplit = useCallback((text) => {
    // Use the enhanced parsing from grocery intelligence
    const items = groceryIntelligence.parseSpaceSeparatedItems(text);

    logger.voice('Intelligent word split result:', items);

    // If we only got one item back and it's the same as input,
    // try a simple space split as fallback
    if (items.length === 1 && items[0] === text && text.includes(' ')) {
      const words = text.split(/\s+/).filter(word => word.length > 1);
      logger.voice('Fallback to simple space split:', words);
      return words;
    }

    return items;
  }, []);

  // speech initialization moved later (after helpers and refs are declared)

  // Check if a word is a filler word
  const isFillerWord = useCallback((word) => {
    const fillers = [
      'uhh', 'umm', 'ahh', 'ohh', 'err', 'hmm', 'huh', 'mhm',
      'uh', 'um', 'ah', 'oh', 'er', 'hm', 'eh', 'mm',
      'like', 'really', 'just', 'maybe', 'actually', 'basically'
    ];
    return fillers.includes(word.toLowerCase().trim());
  }, []);

  // Parse speech transcript into grocery items
  const parseGroceryItems = useCallback((text) => {
    if (!text || !text.trim()) { return []; }

    logger.voice('Raw transcript:', text);

    // Enhanced separators for natural speech
    const commonSeparators = /[,;]|\band\b|\bthen\b|\balso\b|\bplus\b|\bnext\b|\bafter that\b|\band then\b|\boh and\b/gi;

    // Clean up the text by removing filler words, utterances, and speech artifacts
    const cleanedText = cleanSpeechText(text);
    logger.voice('After cleaning:', cleanedText);

    if (!cleanedText.trim()) { return []; }

    let items = [];

    // First try to split by common separators
    if (commonSeparators.test(cleanedText)) {
      items = cleanedText
        .split(commonSeparators)
        .map(item => item.trim())
        .filter(item => item.length > 0);
    } else {
      // If no separators found, try intelligent space-based splitting
      items = intelligentWordSplit(cleanedText);
    }

    // Final cleanup of items
    items = items
      .map(item => item.trim())
      .filter(item => item.length > 1) // Filter very short items
      .filter(item => !isFillerWord(item)) // Remove any remaining filler words
      // Remove duplicates (case-insensitive)
      .filter((item, index, arr) =>
        arr.findIndex(i => i.toLowerCase() === item.toLowerCase()) === index
      );

    logger.voice('Final parsed items:', items);
    return items;
  }, [cleanSpeechText, intelligentWordSplit, isFillerWord]);

  // Process accumulated items from voice recognition
  const processAccumulatedItems = useCallback(() => {
    if (fullTranscript.trim()) {
      logger.voice('Processing accumulated transcript:', fullTranscript);
      const newItems = parseGroceryItems(fullTranscript);
      if (newItems.length > 0) {
        logger.voice('Items detected from voice:', newItems);
        onItemsDetected(newItems);
      }
      // Clear the transcript for next session
      setFullTranscript('');
    }
  }, [fullTranscript, onItemsDetected, parseGroceryItems]);

  // Keep ref updated with latest function so callbacks can call it safely
  useEffect(() => {
    processAccumulatedItemsRef.current = processAccumulatedItems;
  }, [processAccumulatedItems]);

  // Initialize speech recognition after helpers and refs are ready
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 1;

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Update the full transcript accumulator with final results
        if (finalTranscript) {
          setFullTranscript(prev => {
            const newFull = prev + ' ' + finalTranscript;
            return newFull.trim();
          });
        }

        // Show current progress (both final + interim)
        const currentDisplay = fullTranscript + ' ' + finalTranscript + ' ' + interimTranscript;
        setTranscript(currentDisplay.trim());
      };

      recognitionRef.current.onerror = (event) => {
        // Don't log "aborted" errors as they're expected when user stops manually
        if (event.error === 'aborted' && isManualStopRef.current) {
          logger.voice('Speech recognition stopped by user');
        } else if (event.error !== 'aborted') {
          logger.error('Speech recognition error:', event.error);
        }
        setIsListening(false);
        isManualStopRef.current = false; // Reset flag
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        // Process items when recognition ends naturally
        if (processAccumulatedItemsRef.current) {
          processAccumulatedItemsRef.current();
        }
      };
    }
  }, [fullTranscript]);

  const startListening = () => {
    if (recognitionRef.current && !disabled) {
      setTranscript('');
      setFullTranscript(''); // Clear previous session
      isManualStopRef.current = false; // Reset manual stop flag
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      // Set flag to indicate manual stop
      isManualStopRef.current = true;

      // Process items immediately when user stops manually
      logger.voice('User stopped listening manually, processing immediately');
      if (processAccumulatedItemsRef.current) {
        processAccumulatedItemsRef.current();
      }

      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Compute currentDisplay for use in JSX (if needed)
  // Example: const currentDisplay = (fullTranscriptRef.current || '') + ' ' + finalTranscript + ' ' + interimTranscript;

  return (
    <div className="fixed bottom-6 right-6 z-[1000]">
      {/* Listening Animation Rings */}
      {isListening && (
        <>
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-20 rounded-full border-2 border-destructive/30 animate-ping [animation-duration:2s]" />
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-24 rounded-full border-2 border-destructive/20 animate-ping [animation-duration:2s] [animation-delay:0.5s]" />
        </>
      )}

      <button
        type="button"
        onClick={isListening ? stopListening : startListening}
        disabled={disabled}
        aria-label={isListening ? 'Stop listening' : 'Start voice input'}
        className={`relative size-16 rounded-full flex items-center justify-center text-white transition-all duration-300 ease-out hover:scale-110 active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${
          isListening
            ? 'bg-destructive shadow-[0_8px_32px_-4px_var(--destructive)] hover:shadow-[0_12px_40px_-4px_var(--destructive)] animate-breathe'
            : 'bg-primary shadow-[0_8px_32px_-4px_var(--primary)] hover:shadow-[0_12px_40px_-4px_var(--primary)]'
        }`}
      >
        <span className={`flex items-center justify-center transition-transform duration-200 ${isListening ? 'scale-110' : 'scale-100'}`}>
          {isListening ? <MicOff className="size-7" /> : <Mic className="size-7" />}
        </span>
      </button>

      {/* Voice Status Tooltip */}
      {isListening && (
        <div className="absolute bottom-20 right-0 bg-destructive/95 text-white px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap backdrop-blur border border-white/20 animate-in fade-in slide-in-from-bottom-2 duration-300">
          🎤 Listening...
        </div>
      )}
    </div>
  );
});

VoiceRecognition.displayName = 'VoiceRecognition';

// PropTypes validation
VoiceRecognition.propTypes = {
  onItemsDetected: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};

export default VoiceRecognition;
