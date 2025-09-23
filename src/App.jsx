import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ThemeProvider,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Paper,
  Box,
  Fab,
  Button,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Checkbox,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Grid,
  Drawer,
  useMediaQuery,
  useTheme,
  Collapse,
  Alert,
  Divider,
  ListSubheader,
  CircularProgress,
  Menu,
  Avatar,
} from '@mui/material';
import {
  Mic,
  MicOff,
  Add,
  Delete,
  CalendarToday,
  ShoppingCart,
  Menu as MenuIcon,
  ExpandLess,
  ExpandMore,
  Edit,
  Clear,
  Logout,
  AccountCircle,
  Help,
  Palette,
  LightMode,
  DarkMode,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { AuthProvider, useAuth } from './AuthContext';
import { CustomThemeProvider, useThemeContext } from './contexts/ThemeContext';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import HelpPage from './components/HelpPage';
import ThemeSettings from './components/ThemeSettings';
import apiStorage from './services/apiStorage.js';
import groceryIntelligence from './services/groceryIntelligence.js';

const VoiceGroceryListApp = () => {
  const { isAuthenticated, user, logout, loading } = useAuth();
  const { theme } = useThemeContext();
  const [showRegister, setShowRegister] = useState(false);

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <CircularProgress size={60} />
        </Box>
      </ThemeProvider>
    );
  }

  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {showRegister ? (
          <RegisterPage onSwitchToLogin={() => setShowRegister(false)} />
        ) : (
          <LoginPage onSwitchToRegister={() => setShowRegister(true)} />
        )}
      </ThemeProvider>
    );
  }

  return <VoiceGroceryList user={user} logout={logout} />;
};

const VoiceGroceryList = ({ user, logout }) => {
  const { validateUserOperation } = useAuth();
  const { theme, mode, toggleMode } = useThemeContext();
  const [allLists, setAllLists] = useState({});
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [pendingCorrections, setPendingCorrections] = useState([]);
  const [skippedDuplicates, setSkippedDuplicates] = useState([]);
  const [fullTranscript, setFullTranscript] = useState('');
  const [showHelpPage, setShowHelpPage] = useState(false);
  const [showThemeSettings, setShowThemeSettings] = useState(false);
  const recognitionRef = useRef(null);
  
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = () => {
    handleUserMenuClose();
    logout();
  };

  // Get categories from intelligent service
  const categoryList = Object.keys(groceryIntelligence.groceryDatabase);

  // Get current list items
  const currentDateString = currentDate.format('YYYY-MM-DD');
  const currentItems = allLists[currentDateString] || [];

  // Process items with intelligent system
  const processGroceryItem = useCallback((itemText) => {
    return groceryIntelligence.processGroceryItem(itemText);
  }, []);

  // Parse speech transcript into grocery items
  const parseGroceryItems = (text) => {
    if (!text || !text.trim()) return [];

    // Enhanced separators for natural speech
    const commonSeparators = /[,;]|\band\b|\bthen\b|\balso\b|\bplus\b|\bnext\b|\bafter that\b|\band then\b|\boh and\b/gi;

    // Remove common speech prefixes and suffixes
    let cleanedText = text
      .replace(/^(i need|get me|buy|pick up|add|i want|get)\s*/i, '')
      .replace(/\s*(please|thanks|thank you)$/i, '')
      .trim();

    const items = cleanedText
      .split(commonSeparators)
      .map(item => item.trim())
      .filter(item => item.length > 0)
      // Remove any remaining speech artifacts
      .map(item => item.replace(/^(some|a|an|the)\s+/i, ''))
      .map(item => item.replace(/\s+(please|thanks)$/i, ''))
      .filter(item => item.length > 1) // Filter very short items
      // Remove duplicates (case-insensitive)
      .filter((item, index, arr) =>
        arr.findIndex(i => i.toLowerCase() === item.toLowerCase()) === index
      );

    console.log('Parsed grocery items:', items);
    return items;
  };

  const addItemsToList = useCallback(async (newItems, skipCorrection = false) => {
    if (!user?._id) return;

    try {
      // Validate user permission
      validateUserOperation(user._id);
    } catch (error) {
      setError(error.message);
      return;
    }

    setLoading(true);
    const corrections = [];
    const duplicates = [];

    try {
      for (const item of newItems) {
        // Process item with intelligent system
        const processed = processGroceryItem(item);

        // If correction was made and we haven't skipped correction, ask user
        if (processed.wasCorreted && !skipCorrection) {
          corrections.push({
            original: processed.originalText,
            corrected: processed.correctedText,
            category: processed.category
          });
          continue; // Don't add yet, wait for user confirmation
        }

        // Check for duplicates
        const finalText = skipCorrection ? processed.originalText : processed.correctedText;
        if (isDuplicate(finalText)) {
          duplicates.push(finalText);
          continue;
        }

        const itemData = {
          text: finalText,
          category: processed.category,
          completed: false
        };

        const result = await apiStorage.addGroceryItem(user._id, currentDateString, itemData);
        if (result.success) {
          setAllLists(prev => ({
            ...prev,
            [currentDateString]: result.list.items
          }));
        } else {
          setError(result.error || 'Failed to add item');
        }
      }

      // Show corrections dialog if any
      if (corrections.length > 0) {
        setPendingCorrections(corrections);
      }

      // Show duplicate info if any
      if (duplicates.length > 0) {
        setSkippedDuplicates(duplicates);
        setTimeout(() => setSkippedDuplicates([]), 3000); // Clear after 3 seconds
      }

    } catch (error) {
      console.error('Error adding items:', error);
      setError('Failed to add items. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentDateString, processGroceryItem, user, validateUserOperation]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      // Increase timeout for longer sessions
      recognitionRef.current.maxAlternatives = 1;
      if (recognitionRef.current.serviceURI !== undefined) {
        // Some browsers support timeout configuration
        recognitionRef.current.grammars = null;
      }

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
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);

        // Process all accumulated items when voice session ends
        if (fullTranscript.trim()) {
          console.log('Processing full transcript:', fullTranscript);
          const newItems = parseGroceryItems(fullTranscript);
          if (newItems.length > 0) {
            addItemsToList(newItems);
          }
          // Clear the transcript for next session
          setFullTranscript('');
        }
      };
    } else {
      setError('Speech recognition not supported in this browser');
    }
  }, [addItemsToList, fullTranscript]);

  // Load user's grocery lists on component mount and when user changes
  useEffect(() => {
    const loadUserLists = async () => {
      if (!user?._id) return;
      
      setDataLoading(true);
      try {
        // Load all user lists
        const result = await apiStorage.getUserGroceryLists(user._id);
        if (result.success) {
          const listsMap = {};
          result.lists.forEach(list => {
            listsMap[list.date] = list.items;
          });
          setAllLists(listsMap);
        } else {
          setError(result.error || 'Failed to load grocery lists');
        }
      } catch (error) {
        console.error('Error loading lists:', error);
        setError('Failed to load grocery lists. Please try again.');
      } finally {
        setDataLoading(false);
      }
    };
    
    loadUserLists();
  }, [user]);
  
  // Load current date list if it doesn't exist
  useEffect(() => {
    const loadCurrentList = async () => {
      if (!user?._id || allLists[currentDateString]) return;
      
      try {
        const result = await apiStorage.getGroceryListByDate(user._id, currentDateString);
        if (result.success) {
          setAllLists(prev => ({
            ...prev,
            [currentDateString]: result.list.items
          }));
        }
      } catch (error) {
        console.error('Error loading current list:', error);
      }
    };
    
    loadCurrentList();
  }, [currentDateString, user, allLists]);

  const startListening = () => {
    if (recognitionRef.current) {
      setError('');
      setTranscript('');
      setFullTranscript(''); // Clear previous session
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

  const toggleItem = async (id) => {
    if (!user?._id) return;
    
    const currentItems = allLists[currentDateString] || [];
    const item = currentItems.find(item => item.id === id);
    if (!item) return;
    
    setLoading(true);
    try {
      const result = await apiStorage.updateGroceryItem(
        user._id, 
        currentDateString, 
        id, 
        { completed: !item.completed }
      );
      
      if (result.success) {
        setAllLists(prev => ({
          ...prev,
          [currentDateString]: result.list.items
        }));
      } else {
        setError(result.error || 'Failed to update item');
      }
    } catch (error) {
      console.error('Error toggling item:', error);
      setError('Failed to update item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (id) => {
    if (!user?._id) return;
    
    setLoading(true);
    try {
      const result = await apiStorage.removeGroceryItem(user._id, currentDateString, id);
      
      if (result.success) {
        setAllLists(prev => ({
          ...prev,
          [currentDateString]: result.list.items
        }));
      } else {
        setError(result.error || 'Failed to remove item');
      }
    } catch (error) {
      console.error('Error removing item:', error);
      setError('Failed to remove item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateItemCategory = async (id, newCategory) => {
    if (!user?._id) return;
    
    setLoading(true);
    try {
      const result = await apiStorage.updateGroceryItem(
        user._id, 
        currentDateString, 
        id, 
        { category: newCategory }
      );
      
      if (result.success) {
        setAllLists(prev => ({
          ...prev,
          [currentDateString]: result.list.items
        }));
        setEditingCategory(null);
      } else {
        setError(result.error || 'Failed to update category');
      }
    } catch (error) {
      console.error('Error updating category:', error);
      setError('Failed to update category. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addManualItem = () => {
    if (manualInput.trim()) {
      const newItems = parseGroceryItems(manualInput);
      addItemsToList(newItems);
      setManualInput('');
    }
  };

  // Handle correction acceptance
  const acceptCorrections = async () => {
    setLoading(true);
    try {
      for (const correction of pendingCorrections) {
        // Check for duplicates before adding
        if (isDuplicate(correction.corrected)) {
          console.log(`Skipping duplicate item: ${correction.corrected}`);
          continue;
        }

        const itemData = {
          text: correction.corrected,
          category: correction.category,
          completed: false
        };

        const result = await apiStorage.addGroceryItem(user._id, currentDateString, itemData);
        if (result.success) {
          setAllLists(prev => ({
            ...prev,
            [currentDateString]: result.list.items
          }));
        } else {
          setError(result.error || 'Failed to add item');
        }
      }
    } catch (error) {
      console.error('Error adding corrected items:', error);
      setError('Failed to add corrected items');
    } finally {
      setLoading(false);
      setPendingCorrections([]);
    }
  };

  // Check for duplicates
  const isDuplicate = useCallback((itemText) => {
    const currentItems = allLists[currentDateString] || [];
    return currentItems.some(item =>
      item.text.toLowerCase().trim() === itemText.toLowerCase().trim()
    );
  }, [allLists, currentDateString]);

  // Handle correction rejection (use original)
  const rejectCorrections = async () => {
    setLoading(true);
    try {
      for (const correction of pendingCorrections) {
        // Check for duplicates before adding
        if (isDuplicate(correction.original)) {
          console.log(`Skipping duplicate item: ${correction.original}`);
          continue;
        }

        // Process the original item without correction
        const processed = processGroceryItem(correction.original);
        const itemData = {
          text: correction.original, // Use original text, not corrected
          category: processed.category, // But use intelligent categorization
          completed: false
        };

        const result = await apiStorage.addGroceryItem(user._id, currentDateString, itemData);
        if (result.success) {
          setAllLists(prev => ({
            ...prev,
            [currentDateString]: result.list.items
          }));
        } else {
          setError(result.error || 'Failed to add item');
        }
      }
    } catch (error) {
      console.error('Error adding original items:', error);
      setError('Failed to add items. Please try again.');
    } finally {
      setLoading(false);
      setPendingCorrections([]);
    }
  };

  const clearCurrentList = async () => {
    if (!user?._id) return;
    
    setLoading(true);
    try {
      const result = await apiStorage.clearGroceryList(user._id, currentDateString);
      
      if (result.success) {
        setAllLists(prev => ({
          ...prev,
          [currentDateString]: []
        }));
      } else {
        setError(result.error || 'Failed to clear list');
      }
    } catch (error) {
      console.error('Error clearing list:', error);
      setError('Failed to clear list. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const deleteList = async (date) => {
    if (!user?._id) return;
    
    setLoading(true);
    try {
      const result = await apiStorage.deleteGroceryList(user._id, date);
      
      if (result.success) {
        setAllLists(prev => {
          const newLists = { ...prev };
          delete newLists[date];
          return newLists;
        });
        
        // If we deleted the current list, switch to today
        if (date === currentDateString) {
          setCurrentDate(dayjs());
        }
      } else {
        setError(result.error || 'Failed to delete list');
      }
    } catch (error) {
      console.error('Error deleting list:', error);
      setError('Failed to delete list. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDateDisplay = (dateString) => {
    const date = dayjs(dateString);
    const today = dayjs();
    const yesterday = today.subtract(1, 'day');
    const tomorrow = today.add(1, 'day');

    if (date.isSame(today, 'day')) return `Today (${date.format('MM/DD/YYYY')})`;
    if (date.isSame(yesterday, 'day')) return `Yesterday (${date.format('MM/DD/YYYY')})`;
    if (date.isSame(tomorrow, 'day')) return `Tomorrow (${date.format('MM/DD/YYYY')})`;
    
    return date.format('ddd, MMM D, YYYY');
  };

  const createNewListForDate = async (date) => {
    const dateString = dayjs(date).format('YYYY-MM-DD');
    setCurrentDate(dayjs(date));
    
    if (!allLists[dateString] && user?._id) {
      try {
        const result = await apiStorage.getGroceryListByDate(user._id, dateString);
        if (result.success) {
          setAllLists(prev => ({
            ...prev,
            [dateString]: result.list.items
          }));
        }
      } catch (error) {
        console.error('Error creating/loading list:', error);
      }
    }
    
    setShowDatePicker(false);
    setMobileDrawerOpen(false);
  };
  
  const toggleCategoryExpansion = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
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

  const drawerContent = (
    <Box sx={{ width: isMobile ? 280 : 320, p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <CalendarToday />
        Grocery Lists
      </Typography>
      <Divider sx={{ mb: 2 }} />
      
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DatePicker
          label="Select Date"
          value={currentDate}
          onChange={(newDate) => createNewListForDate(newDate)}
          slotProps={{
            textField: {
              fullWidth: true,
              sx: { mb: 2 }
            }
          }}
        />
      </LocalizationProvider>

      <List>
        {sortedDates.length > 0 ? (
          sortedDates.map(date => (
            <ListItem key={date} disablePadding>
              <ListItemButton
                selected={date === currentDateString}
                onClick={() => createNewListForDate(date)}
                sx={{ borderRadius: 1, mb: 0.5 }}
              >
                <ListItemText
                  primary={formatDateDisplay(date)}
                  secondary={`${allLists[date]?.length || 0} items`}
                />
                {date !== currentDateString && (
                  <IconButton
                    edge="end"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteList(date);
                    }}
                    size="small"
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                )}
              </ListItemButton>
            </ListItem>
          ))
        ) : (
          <ListItem>
            <ListItemText primary="No grocery lists yet" />
          </ListItem>
        )}
      </List>
    </Box>
  );

  // Show help page if requested
  if (showHelpPage) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <HelpPage onBack={() => setShowHelpPage(false)} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* Enhanced Correction Dialog */}
      <Dialog
        open={pendingCorrections.length > 0}
        onClose={() => setPendingCorrections([])}
        maxWidth="md"
        fullWidth
        disableRestoreFocus
        keepMounted={false}
        aria-labelledby="correction-dialog-title"
        aria-describedby="correction-dialog-description"
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: '24px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
          },
        }}
      >
        <DialogTitle
          id="correction-dialog-title"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            pb: 1,
            borderBottom: '1px solid rgba(226, 232, 240, 0.6)',
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #F59E0B 0%, #F97316 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
            }}
          >
            <Edit sx={{ color: 'white', fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Smart Auto-corrections
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {pendingCorrections.length} item{pendingCorrections.length > 1 ? 's' : ''} found
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 3, pb: 2 }}>
          <Typography
            id="correction-dialog-description"
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 3,
              p: 2,
              borderRadius: '12px',
              background: 'rgba(99, 102, 241, 0.05)',
              border: '1px solid rgba(99, 102, 241, 0.1)',
            }}
          >
            💡 We detected some items that might have spelling mistakes or could be auto-corrected.
            Review the suggestions below and choose your preferred option.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {pendingCorrections.map((correction, index) => (
              <Card
                key={index}
                sx={{
                  borderRadius: '16px',
                  background: 'rgba(248, 250, 252, 0.8)',
                  border: '1px solid rgba(226, 232, 240, 0.6)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.08)',
                    borderColor: 'rgba(99, 102, 241, 0.2)',
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        color: 'primary.main',
                        px: 1,
                        py: 0.5,
                        borderRadius: '6px',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                      }}
                    >
                      #{index + 1}
                    </Typography>
                    <Chip
                      label={correction.category}
                      size="small"
                      sx={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                        color: 'white',
                        border: 'none',
                      }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {/* Original Text */}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', mb: 0.5, display: 'block' }}>
                        Original
                      </Typography>
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: '8px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            color: 'error.dark',
                            textDecoration: 'line-through',
                            fontWeight: 500,
                            fontSize: '0.875rem',
                          }}
                        >
                          "{correction.original}"
                        </Typography>
                      </Box>
                    </Box>

                    {/* Arrow */}
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Typography variant="body1" sx={{ color: 'white', fontWeight: 'bold' }}>
                        →
                      </Typography>
                    </Box>

                    {/* Corrected Text */}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', mb: 0.5, display: 'block' }}>
                        Suggested
                      </Typography>
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: '8px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid rgba(16, 185, 129, 0.2)',
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            color: 'success.dark',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                          }}
                        >
                          "{correction.corrected}"
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 2, gap: 1 }}>
          <Button
            onClick={rejectCorrections}
            variant="outlined"
            sx={{
              borderRadius: '12px',
              px: 3,
              py: 1,
              borderColor: 'rgba(239, 68, 68, 0.3)',
              color: 'error.main',
              '&:hover': {
                borderColor: 'error.main',
                backgroundColor: 'rgba(239, 68, 68, 0.04)',
              },
            }}
          >
            Keep Original
          </Button>
          <Button
            onClick={acceptCorrections}
            variant="contained"
            sx={{
              borderRadius: '12px',
              px: 3,
              py: 1,
              background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                boxShadow: '0 6px 16px rgba(16, 185, 129, 0.4)',
              },
            }}
          >
            Apply Corrections
          </Button>
        </DialogActions>
      </Dialog>

      {/* Theme Settings Dialog */}
      <ThemeSettings
        open={showThemeSettings}
        onClose={() => setShowThemeSettings(false)}
      />

      <Box sx={{ display: 'flex' }}>
        {/* Modern App Bar */}
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            zIndex: (theme) => theme.zIndex.drawer + 1,
            borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
          }}
        >
          <Toolbar sx={{ minHeight: '72px', px: { xs: 2, sm: 3 } }}>
            {isMobile && (
              <IconButton
                color="inherit"
                edge="start"
                onClick={() => setMobileDrawerOpen(true)}
                sx={{
                  mr: 2,
                  p: 1.5,
                  borderRadius: '12px',
                  '&:hover': {
                    backgroundColor: 'rgba(99, 102, 241, 0.08)',
                  }
                }}
              >
                <MenuIcon />
              </IconButton>
            )}

            {/* Logo and Brand */}
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 3 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 2,
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                }}
              >
                <ShoppingCart sx={{ color: 'white', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography
                  variant="h6"
                  component="div"
                  sx={{
                    fontWeight: 700,
                    fontSize: '1.25rem',
                    background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    lineHeight: 1.2,
                  }}
                >
                  GroceryAI
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    display: { xs: 'none', sm: 'block' }
                  }}
                >
                  Smart Shopping Lists
                </Typography>
              </Box>
            </Box>

            <Box sx={{ flexGrow: 1 }} />

            {/* Current Date Badge */}
            <Chip
              label={formatDateDisplay(currentDateString)}
              variant="outlined"
              sx={{
                display: { xs: 'none', md: 'flex' },
                mr: 2,
                borderColor: 'rgba(99, 102, 241, 0.2)',
                color: 'text.secondary',
                fontWeight: 600,
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'rgba(99, 102, 241, 0.04)',
                }
              }}
            />

            {/* Theme Controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 1 }}>
              {/* Dark/Light Mode Toggle */}
              <IconButton
                onClick={toggleMode}
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  color: 'text.secondary',
                  '&:hover': {
                    backgroundColor: mode === 'dark' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(30, 41, 59, 0.08)',
                    color: mode === 'dark' ? '#F59E0B' : '#1E293B',
                    transform: 'scale(1.05)',
                  },
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {mode === 'dark' ? <LightMode /> : <DarkMode />}
              </IconButton>

              {/* Color Theme Settings */}
              <IconButton
                onClick={() => setShowThemeSettings(true)}
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  color: 'text.secondary',
                  '&:hover': {
                    backgroundColor: 'rgba(139, 92, 246, 0.08)',
                    color: '#8B5CF6',
                    transform: 'scale(1.05)',
                  },
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <Palette />
              </IconButton>
            </Box>

            {/* Help Button */}
            <IconButton
              onClick={() => setShowHelpPage(true)}
              sx={{
                mr: 1,
                width: 44,
                height: 44,
                borderRadius: '12px',
                color: 'text.secondary',
                '&:hover': {
                  backgroundColor: 'rgba(99, 102, 241, 0.08)',
                  color: 'primary.main',
                  transform: 'scale(1.05)',
                },
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <Help />
            </IconButton>

            {/* User Profile Section */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'right' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', lineHeight: 1.2 }}>
                  {user.firstName} {user.lastName}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                  {currentItems.length} items today
                </Typography>
              </Box>
              <IconButton
                onClick={handleUserMenuOpen}
                sx={{
                  p: 0,
                  '&:hover': {
                    transform: 'scale(1.05)',
                  },
                  transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <Avatar
                  sx={{
                    width: 44,
                    height: 44,
                    background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                  }}
                >
                  {user.firstName[0]}{user.lastName[0]}
                </Avatar>
              </IconButton>
            </Box>
            
            <Menu
              anchorEl={userMenuAnchor}
              open={Boolean(userMenuAnchor)}
              onClose={handleUserMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary">
                  Signed in as
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {user.firstName} {user.lastName}
                </Typography>
              </Box>
              <MenuItem onClick={handleLogout} sx={{ gap: 1, mt: 1 }}>
                <Logout fontSize="small" />
                Sign Out
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {/* Navigation Drawer */}
        {!isMobile ? (
          <Drawer
            variant="permanent"
            sx={{
              width: 320,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: 320,
                boxSizing: 'border-box',
              },
            }}
          >
            <Toolbar />
            {drawerContent}
          </Drawer>
        ) : (
          <Drawer
            variant="temporary"
            open={mobileDrawerOpen}
            onClose={() => setMobileDrawerOpen(false)}
            ModalProps={{
              keepMounted: true,
            }}
          >
            {drawerContent}
          </Drawer>
        )}

        {/* Main Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3, md: 4 },
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
          }}
        >
          <Toolbar sx={{ minHeight: '72px' }} />

          <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
            {/* Loading Indicator */}
            {dataLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            )}
            
            {/* Error Display */}
            {error && (
              <Alert 
                severity="error" 
                sx={{ mb: 2 }}
                onClose={() => setError('')}
              >
                {error}
              </Alert>
            )}

            {/* Enhanced Voice Recognition Status */}
            {isListening && (
              <Alert
                severity="info"
                sx={{
                  mb: 2,
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  '& .MuiAlert-icon': {
                    color: 'primary.main',
                  },
                  animation: 'glow 2s ease-in-out infinite alternate',
                  '@keyframes glow': {
                    '0%': {
                      boxShadow: '0 2px 10px rgba(99, 102, 241, 0.2)',
                    },
                    '100%': {
                      boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
                    },
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                      animation: 'pulse 1s infinite',
                      '@keyframes pulse': {
                        '0%, 100%': { opacity: 1 },
                        '50%': { opacity: 0.5 },
                      },
                    }}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    🎤 Listening... Say your grocery items!
                  </Typography>
                </Box>
              </Alert>
            )}

            {/* Enhanced Last Transcript */}
            {transcript && (
              <Alert
                severity="success"
                sx={{
                  mb: 2,
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(52, 211, 153, 0.1) 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  '& .MuiAlert-icon': {
                    color: 'success.main',
                  },
                  animation: 'slideInFromTop 0.3s ease-out',
                  '@keyframes slideInFromTop': {
                    '0%': {
                      opacity: 0,
                      transform: 'translateY(-10px)',
                    },
                    '100%': {
                      opacity: 1,
                      transform: 'translateY(0)',
                    },
                  },
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  <Box component="span" sx={{ color: 'text.secondary', mr: 1 }}>
                    Last heard:
                  </Box>
                  <Box
                    component="span"
                    sx={{
                      fontWeight: 600,
                      color: 'success.dark',
                      background: 'rgba(16, 185, 129, 0.1)',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontStyle: 'italic',
                    }}
                  >
                    "{transcript}"
                  </Box>
                </Typography>
              </Alert>
            )}

            {/* Skipped Duplicates */}
            {skippedDuplicates.length > 0 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Skipped duplicate items: {skippedDuplicates.join(', ')}
              </Alert>
            )}

            {/* Modern Input Section */}
            <Paper
              elevation={2}
              sx={{
                p: { xs: 3, sm: 4 },
                mb: 4,
                borderRadius: '20px',
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(226, 232, 240, 0.6)',
              }}
            >
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    color: 'text.primary',
                    mb: 1,
                    background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Add to Your List
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Type items manually or use voice recognition to add multiple items at once
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                <TextField
                  fullWidth
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addManualItem()}
                  placeholder="e.g., milk, apples, basmati rice, turmeric..."
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '16px',
                      fontSize: '1rem',
                      minHeight: '56px',
                      '&.Mui-focused': {
                        boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.1)',
                      },
                    },
                  }}
                />
                <Button
                  variant="contained"
                  onClick={addManualItem}
                  disabled={!manualInput.trim() || loading}
                  sx={{
                    minHeight: '56px',
                    px: 3,
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                    boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                      boxShadow: '0 6px 20px rgba(99, 102, 241, 0.4)',
                      transform: 'translateY(-1px)',
                    },
                    '&:disabled': {
                      background: 'rgba(148, 163, 184, 0.3)',
                      color: 'rgba(148, 163, 184, 0.8)',
                    },
                  }}
                >
                  {loading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={20} color="inherit" />
                      Adding...
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Add />
                      Add Items
                    </Box>
                  )}
                </Button>
              </Box>
            </Paper>

            {/* List Stats and Controls */}
            {currentItems.length > 0 && (
              <Paper sx={{ p: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    {currentItems.filter(item => !item.completed).length} of {currentItems.length} items remaining
                  </Typography>
                  <Button
                    startIcon={<Clear />}
                    onClick={clearCurrentList}
                    color="error"
                    size="small"
                    disabled={loading}
                  >
                    {loading ? 'Clearing...' : 'Clear List'}
                  </Button>
                </Box>
              </Paper>
            )}

            {/* Modern Grocery List by Categories */}
            <Grid container spacing={3}>
              {Object.entries(groupedItems).map(([category, categoryItems]) => {
                const isExpanded = expandedCategories[category] !== false;
                const completedCount = categoryItems.filter(item => item.completed).length;
                const progress = (completedCount / categoryItems.length) * 100;

                return (
                  <Grid item xs={12} sm={6} lg={4} key={category}>
                    <Card
                      sx={{
                        height: 'fit-content',
                        borderRadius: '20px',
                        background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(226, 232, 240, 0.6)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08)',
                          borderColor: 'rgba(99, 102, 241, 0.3)',
                        },
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        {/* Category Header */}
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  background: category === 'Other'
                                    ? 'linear-gradient(135deg, #F59E0B 0%, #F97316 100%)'
                                    : category === 'Produce'
                                    ? 'linear-gradient(135deg, #10B981 0%, #34D399 100%)'
                                    : category === 'Asian Pantry' || category === 'Indian Pantry'
                                    ? 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)'
                                    : 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                                  boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                                }}
                              />
                              <Typography
                                variant="h6"
                                sx={{
                                  fontWeight: 700,
                                  fontSize: '1.1rem',
                                  color: 'text.primary',
                                }}
                              >
                                {category}
                              </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                label={`${completedCount}/${categoryItems.length}`}
                                size="small"
                                sx={{
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  background: progress === 100
                                    ? 'linear-gradient(135deg, #10B981 0%, #34D399 100%)'
                                    : 'rgba(99, 102, 241, 0.1)',
                                  color: progress === 100 ? 'white' : 'primary.main',
                                  border: 'none',
                                }}
                              />
                              <IconButton
                                size="small"
                                onClick={() => toggleCategoryExpansion(category)}
                                sx={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '8px',
                                  transition: 'all 0.2s ease',
                                  '&:hover': {
                                    backgroundColor: 'rgba(99, 102, 241, 0.08)',
                                    transform: 'scale(1.1)',
                                  },
                                }}
                              >
                                {isExpanded ? (
                                  <ExpandLess sx={{ color: 'primary.main' }} />
                                ) : (
                                  <ExpandMore sx={{ color: 'primary.main' }} />
                                )}
                              </IconButton>
                            </Box>
                          </Box>

                          {/* Progress Bar */}
                          <Box sx={{ width: '100%', mb: 1 }}>
                            <Box
                              sx={{
                                height: 4,
                                borderRadius: 2,
                                backgroundColor: 'rgba(226, 232, 240, 0.6)',
                                overflow: 'hidden',
                              }}
                            >
                              <Box
                                sx={{
                                  height: '100%',
                                  width: `${progress}%`,
                                  background: progress === 100
                                    ? 'linear-gradient(90deg, #10B981 0%, #34D399 100%)'
                                    : 'linear-gradient(90deg, #6366F1 0%, #8B5CF6 100%)',
                                  transition: 'width 0.3s ease',
                                }}
                              />
                            </Box>
                          </Box>

                          <Typography
                            variant="caption"
                            sx={{
                              color: 'text.secondary',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                            }}
                          >
                            {progress === 100 ? 'Complete!' : `${Math.round(progress)}% complete`}
                          </Typography>
                        </Box>

                        {/* Items List */}
                        <Collapse in={isExpanded}>
                          <Box sx={{ mt: 2 }}>
                            {categoryItems.map((item, index) => (
                              <Box
                                key={item.id}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1.5,
                                  p: 1.5,
                                  mb: 1,
                                  borderRadius: '12px',
                                  background: item.completed
                                    ? 'rgba(16, 185, 129, 0.08)'
                                    : 'background.default',
                                  border: '1px solid',
                                  borderColor: item.completed
                                    ? 'rgba(16, 185, 129, 0.2)'
                                    : 'divider',
                                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                  '&:hover': {
                                    transform: 'translateX(4px)',
                                    backgroundColor: item.completed
                                      ? 'rgba(16, 185, 129, 0.12)'
                                      : 'action.hover',
                                    borderColor: item.completed
                                      ? 'rgba(16, 185, 129, 0.3)'
                                      : 'primary.main',
                                  },
                                }}
                              >
                                <Checkbox
                                  checked={item.completed}
                                  onChange={() => toggleItem(item.id)}
                                  size="small"
                                  sx={{
                                    '&.Mui-checked': {
                                      color: 'success.main',
                                    },
                                    '& .MuiSvgIcon-root': {
                                      fontSize: '1.2rem',
                                    },
                                  }}
                                />

                                <Typography
                                  variant="body2"
                                  sx={{
                                    flex: 1,
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    textDecoration: item.completed ? 'line-through' : 'none',
                                    opacity: item.completed ? 0.7 : 1,
                                    color: item.completed ? 'text.secondary' : 'text.primary',
                                    transition: 'all 0.2s ease',
                                  }}
                                >
                                  {item.text}
                                </Typography>

                                {/* Action Buttons */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  {editingCategory === item.id ? (
                                    <FormControl size="small" sx={{ minWidth: 90 }}>
                                      <Select
                                        value={item.category}
                                        onChange={(e) => updateItemCategory(item.id, e.target.value)}
                                        sx={{
                                          borderRadius: '8px',
                                          '& .MuiOutlinedInput-notchedOutline': {
                                            borderColor: 'divider',
                                          },
                                        }}
                                      >
                                        {categoryList.map(cat => (
                                          <MenuItem key={cat} value={cat}>
                                            <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                              {cat}
                                            </Typography>
                                          </MenuItem>
                                        ))}
                                      </Select>
                                    </FormControl>
                                  ) : (
                                    <IconButton
                                      size="small"
                                      onClick={() => setEditingCategory(item.id)}
                                      sx={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: '8px',
                                        color: item.category === 'Other' ? 'warning.main' : 'text.secondary',
                                        '&:hover': {
                                          backgroundColor: item.category === 'Other'
                                            ? 'rgba(245, 158, 11, 0.1)'
                                            : 'rgba(99, 102, 241, 0.08)',
                                          color: item.category === 'Other' ? 'warning.dark' : 'primary.main',
                                        },
                                      }}
                                    >
                                      <Edit sx={{ fontSize: '1rem' }} />
                                    </IconButton>
                                  )}

                                  <IconButton
                                    size="small"
                                    onClick={() => removeItem(item.id)}
                                    sx={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: '8px',
                                      color: 'text.secondary',
                                      '&:hover': {
                                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                        color: 'error.main',
                                      },
                                    }}
                                  >
                                    <Delete sx={{ fontSize: '1rem' }} />
                                  </IconButton>
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        </Collapse>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>

            {/* Enhanced Empty State */}
            {currentItems.length === 0 && (
              <Paper
                sx={{
                  p: 6,
                  textAlign: 'center',
                  borderRadius: '20px',
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(226, 232, 240, 0.6)',
                  animation: 'fadeInUp 0.6s ease-out',
                  '@keyframes fadeInUp': {
                    '0%': {
                      opacity: 0,
                      transform: 'translateY(20px)',
                    },
                    '100%': {
                      opacity: 1,
                      transform: 'translateY(0)',
                    },
                  },
                }}
              >
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 3,
                    border: '2px solid rgba(99, 102, 241, 0.2)',
                    animation: 'float 3s ease-in-out infinite',
                    '@keyframes float': {
                      '0%, 100%': {
                        transform: 'translateY(0px)',
                      },
                      '50%': {
                        transform: 'translateY(-8px)',
                      },
                    },
                  }}
                >
                  <ShoppingCart
                    sx={{
                      fontSize: 40,
                      background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  />
                </Box>

                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    mb: 1,
                    background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Your list is empty
                </Typography>

                <Typography variant="body1" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                  for {formatDateDisplay(currentDateString)}
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Start adding items using voice recognition or manual input to create your smart grocery list
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      px: 2,
                      py: 1,
                      borderRadius: '12px',
                      background: 'rgba(99, 102, 241, 0.08)',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                    }}
                  >
                    <Mic sx={{ fontSize: 16, color: 'primary.main' }} />
                    <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
                      Voice Recognition
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      px: 2,
                      py: 1,
                      borderRadius: '12px',
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                    }}
                  >
                    <Edit sx={{ fontSize: 16, color: 'success.main' }} />
                    <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600 }}>
                      Auto-correction
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            )}

          </Container>
        </Box>

        {/* Enhanced Voice FAB with Animations */}
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
      </Box>
    </ThemeProvider>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <CustomThemeProvider>
        <VoiceGroceryListApp />
      </CustomThemeProvider>
    </AuthProvider>
  );
};

export default App;