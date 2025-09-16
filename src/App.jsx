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
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import theme from './theme';

const VoiceGroceryList = () => {
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
  const recognitionRef = useRef(null);
  
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

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
  const currentDateString = currentDate.format('YYYY-MM-DD');
  const currentItems = allLists[currentDateString] || [];

  // Auto-categorize items
  const categorizeItem = useCallback((item) => {
    const itemLower = item.toLowerCase();
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => itemLower.includes(keyword))) {
        return category;
      }
    }
    return 'Other';
  }, []);

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

  const addItemsToList = useCallback((newItems) => {
    const itemsWithData = newItems.map(item => ({
      id: Date.now() + Math.random(),
      text: item,
      category: categorizeItem(item),
      completed: false
    }));
    
    setAllLists(prev => ({
      ...prev,
      [currentDateString]: [...(prev[currentDateString] || []), ...itemsWithData]
    }));
  }, [currentDateString, categorizeItem]);

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
  }, [addItemsToList]);

  // Initialize today's list if it doesn't exist
  useEffect(() => {
    const today = dayjs().format('YYYY-MM-DD');
    if (!allLists[today]) {
      setAllLists(prev => ({ ...prev, [today]: [] }));
    }
  }, [allLists]);

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
      [currentDateString]: prev[currentDateString].map(item => 
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    }));
  };

  const removeItem = (id) => {
    setAllLists(prev => ({
      ...prev,
      [currentDateString]: prev[currentDateString].filter(item => item.id !== id)
    }));
  };

  const updateItemCategory = (id, newCategory) => {
    setAllLists(prev => ({
      ...prev,
      [currentDateString]: prev[currentDateString].map(item => 
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
      [currentDateString]: []
    }));
  };

  const deleteList = (date) => {
    setAllLists(prev => {
      const newLists = { ...prev };
      delete newLists[date];
      return newLists;
    });
    
    // If we deleted the current list, switch to today
    if (date === currentDateString) {
      setCurrentDate(dayjs());
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

  const createNewListForDate = (date) => {
    const dateString = dayjs(date).format('YYYY-MM-DD');
    setCurrentDate(dayjs(date));
    if (!allLists[dateString]) {
      setAllLists(prev => ({ ...prev, [dateString]: [] }));
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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        {/* App Bar */}
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          <Toolbar>
            {isMobile && (
              <IconButton
                color="inherit"
                edge="start"
                onClick={() => setMobileDrawerOpen(true)}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <ShoppingCart sx={{ mr: 1 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Voice Grocery List
            </Typography>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {formatDateDisplay(currentDateString)}
            </Typography>
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
        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          <Toolbar />
          
          <Container maxWidth="md">
            {/* Error Display */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* Voice Recognition Status */}
            {isListening && (
              <Alert severity="info" sx={{ mb: 2 }}>
                🎤 Listening... Say your grocery items!
              </Alert>
            )}

            {/* Last Transcript */}
            {transcript && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Last heard: "{transcript}"
              </Alert>
            )}

            {/* Manual Input */}
            <Paper sx={{ p: 2, mb: 3 }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  fullWidth
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addManualItem()}
                  placeholder="Type items manually (e.g., apples, milk, bread)"
                  variant="outlined"
                  size="small"
                />
                <Button
                  variant="contained"
                  onClick={addManualItem}
                  startIcon={<Add />}
                  disabled={!manualInput.trim()}
                >
                  Add
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
                  >
                    Clear List
                  </Button>
                </Box>
              </Paper>
            )}

            {/* Grocery List by Categories */}
            <Grid container spacing={2}>
              {Object.entries(groupedItems).map(([category, categoryItems]) => {
                const isExpanded = expandedCategories[category] !== false;
                return (
                  <Grid item xs={12} sm={6} md={4} key={category}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="h6" component="div">
                            {category}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip 
                              label={categoryItems.length} 
                              size="small" 
                              color={category === 'Other' ? 'warning' : 'primary'} 
                            />
                            <IconButton
                              size="small"
                              onClick={() => toggleCategoryExpansion(category)}
                            >
                              {isExpanded ? <ExpandLess /> : <ExpandMore />}
                            </IconButton>
                          </Box>
                        </Box>
                        
                        <Collapse in={isExpanded}>
                          <List dense>
                            {categoryItems.map(item => (
                              <ListItem
                                key={item.id}
                                sx={{
                                  bgcolor: item.completed ? 'action.hover' : 'transparent',
                                  borderRadius: 1,
                                  mb: 0.5,
                                }}
                              >
                                <ListItemIcon>
                                  <Checkbox
                                    checked={item.completed}
                                    onChange={() => toggleItem(item.id)}
                                    size="small"
                                  />
                                </ListItemIcon>
                                <ListItemText
                                  primary={item.text}
                                  sx={{
                                    '& .MuiListItemText-primary': {
                                      textDecoration: item.completed ? 'line-through' : 'none',
                                      opacity: item.completed ? 0.6 : 1,
                                    }
                                  }}
                                />
                                
                                {/* Category Edit */}
                                {editingCategory === item.id ? (
                                  <FormControl size="small" sx={{ minWidth: 80 }}>
                                    <Select
                                      value={item.category}
                                      onChange={(e) => updateItemCategory(item.id, e.target.value)}
                                      autoWidth
                                    >
                                      {categoryList.map(cat => (
                                        <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                                      ))}
                                    </Select>
                                  </FormControl>
                                ) : (
                                  <IconButton
                                    size="small"
                                    onClick={() => setEditingCategory(item.id)}
                                    color={item.category === 'Other' ? 'warning' : 'default'}
                                  >
                                    <Edit fontSize="small" />
                                  </IconButton>
                                )}
                                
                                <IconButton
                                  size="small"
                                  onClick={() => removeItem(item.id)}
                                  color="error"
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </ListItem>
                            ))}
                          </List>
                        </Collapse>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>

            {/* Empty State */}
            {currentItems.length === 0 && (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <ShoppingCart sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  No items in your grocery list
                </Typography>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  for {formatDateDisplay(currentDateString)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Use voice recognition or type items manually to get started.
                </Typography>
              </Paper>
            )}

            {/* Usage Instructions */}
            <Paper sx={{ p: 3, mt: 4, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
              <Typography variant="h6" gutterBottom>
                How to use:
              </Typography>
              <Typography variant="body2" component="ul" sx={{ listStyle: 'none', p: 0 }}>
                <li>• Each date gets its own separate grocery list</li>
                <li>• Use voice recognition or type items manually</li>
                <li>• Items are auto-categorized - click edit to recategorize</li>
                <li>• Use the sidebar to switch between lists</li>
                <li>• Check off items as you shop</li>
              </Typography>
            </Paper>
          </Container>
        </Box>

        {/* Floating Action Button for Voice */}
        <Fab
          color={isListening ? "error" : "primary"}
          onClick={isListening ? stopListening : startListening}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1000,
          }}
        >
          {isListening ? <MicOff /> : <Mic />}
        </Fab>
      </Box>
    </ThemeProvider>
  );
};

export default VoiceGroceryList;