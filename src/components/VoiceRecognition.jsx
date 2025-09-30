import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import PropTypes from 'prop-types';
import { Fab, Box } from '@mui/material';
import { Mic, MicOff } from '@mui/icons-material';
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
  function intelligentWordSplit(text) {
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
  }

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
        if (processAccumulatedItemsRef.current) processAccumulatedItemsRef.current();
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
  if (processAccumulatedItemsRef.current) processAccumulatedItemsRef.current();

      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Compute currentDisplay for use in JSX (if needed)
  // Example: const currentDisplay = (fullTranscriptRef.current || '') + ' ' + finalTranscript + ' ' + interimTranscript;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1000,
      }}
    >
      {/* Listening Animation Rings */}
      {isListening && (
        <>
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 80,
              height: 80,
              borderRadius: '50%',
              border: '2px solid rgba(239, 68, 68, 0.3)',
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': {
                  transform: 'translate(-50%, -50%) scale(0.8)',
                  opacity: 1,
                },
                '100%': {
                  transform: 'translate(-50%, -50%) scale(1.4)',
                  opacity: 0,
                },
              },
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 100,
              height: 100,
              borderRadius: '50%',
              border: '2px solid rgba(239, 68, 68, 0.2)',
              animation: 'pulse 2s infinite 0.5s',
              '@keyframes pulse': {
                '0%': {
                  transform: 'translate(-50%, -50%) scale(0.8)',
                  opacity: 1,
                },
                '100%': {
                  transform: 'translate(-50%, -50%) scale(1.6)',
                  opacity: 0,
                },
              },
            }}
          />
        </>
      )}

      <Fab
        color={isListening ? "error" : "primary"}
        onClick={isListening ? stopListening : startListening}
        disabled={disabled}
        sx={{
          width: 64,
          height: 64,
          background: isListening
            ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
            : 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
          boxShadow: isListening
            ? '0 8px 32px rgba(239, 68, 68, 0.4)'
            : '0 8px 32px rgba(99, 102, 241, 0.4)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'scale(1.1)',
            boxShadow: isListening
              ? '0 12px 40px rgba(239, 68, 68, 0.5)'
              : '0 12px 40px rgba(99, 102, 241, 0.5)',
            background: isListening
              ? 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)'
              : 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
          },
          '&:active': {
            transform: 'scale(0.95)',
          },
          animation: isListening ? 'breathe 1.5s ease-in-out infinite' : 'none',
          '@keyframes breathe': {
            '0%, 100%': {
              transform: 'scale(1)',
            },
            '50%': {
              transform: 'scale(1.05)',
            },
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s ease',
            transform: isListening ? 'scale(1.1)' : 'scale(1)',
          }}
        >
          {isListening ? (
            <MicOff sx={{ fontSize: 28, color: 'white' }} />
          ) : (
            <Mic sx={{ fontSize: 28, color: 'white' }} />
          )}
        </Box>
      </Fab>

      {/* Voice Status Tooltip */}
      {isListening && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 80,
            right: 0,
            background: 'rgba(239, 68, 68, 0.95)',
            color: 'white',
            px: 2,
            py: 1,
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            animation: 'slideUp 0.3s ease-out',
            '@keyframes slideUp': {
              '0%': {
                opacity: 0,
                transform: 'translateY(10px)',
              },
              '100%': {
                opacity: 1,
                transform: 'translateY(0)',
              },
            },
          }}
        >
          🎤 Listening...
        </Box>
      )}
    </Box>
  );
});

VoiceRecognition.displayName = 'VoiceRecognition';

// PropTypes validation
VoiceRecognition.propTypes = {
  onItemsDetected: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};

export default VoiceRecognition;
