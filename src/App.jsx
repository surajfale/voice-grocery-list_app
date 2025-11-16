import React, { useState, useMemo, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  ThemeProvider,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Chip,
  Drawer,
  useMediaQuery,
  useTheme,
  Divider,
  CircularProgress,
  Menu,
  MenuItem,
  Avatar,
  Paper,
  Button,
  Alert,
  AlertTitle,
} from '@mui/material';
import {
  Delete,
  CalendarToday,
  ShoppingCart,
  Menu as MenuIcon,
  Clear,
  Logout,
  Help,
  Palette,
  LightMode,
  DarkMode,
  Settings,
  FilterList,
  FilterListOff,
  Download,
  Share,
  Image,
  PictureAsPdf,
  ArrowDropDown,
  DeleteForever,
  ReceiptLong,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { AuthProvider, useAuth } from './AuthContext';
import { CustomThemeProvider, useThemeContext } from './contexts/ThemeContext';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import ForgotPasswordPage from './ForgotPasswordPage';
import ResetPasswordPage from './ResetPasswordPage';
import HelpPage from './components/HelpPage';
import ThemeSettings from './components/ThemeSettings';
import DeleteAccountDialog from './components/DeleteAccountDialog';
import VoiceRecognition from './components/VoiceRecognition';
import GroceryListDisplay from './components/GroceryListDisplay';
import CorrectionDialog from './components/CorrectionDialog';
import CongratulationsDialog from './components/CongratulationsDialog';
import ManualInput from './components/ManualInput';
import StatusAlerts from './components/StatusAlerts';
import EmptyState from './components/EmptyState';
import ErrorBoundary from './components/ErrorBoundary';
import Footer from './components/Footer';
import PrintableList from './components/PrintableList';
import ReceiptsPage from './pages/ReceiptsPage.jsx';
import { useGroceryList } from './hooks/useGroceryList';
import groceryIntelligence from './services/groceryIntelligence.js';
import { shareList, downloadListAsImage, downloadListAsPDF } from './utils/downloadList';

/**
 * Main Voice Grocery List Application Component
 * Handles authentication state and renders appropriate UI based on user login status
 */
const VoiceGroceryListApp = () => {
  const { isAuthenticated, user, logout, loading } = useAuth();
  const { theme } = useThemeContext();
  const [authPage, setAuthPage] = useState('login'); // 'login', 'register', 'forgot-password', 'reset-password'
  const [resetToken, setResetToken] = useState('');

  // Check for reset token in URL on mount
  useEffect(() => {
    const urlParams = new window.URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      setResetToken(token);
      setAuthPage('reset-password');
    }
  }, []);

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
        {authPage === 'register' ? (
          <RegisterPage onSwitchToLogin={() => setAuthPage('login')} />
        ) : authPage === 'forgot-password' ? (
          <ForgotPasswordPage onBackToLogin={() => setAuthPage('login')} />
        ) : authPage === 'reset-password' ? (
          <ResetPasswordPage
            token={resetToken}
            onBackToLogin={() => {
              setAuthPage('login');
              setResetToken('');
              // Clear URL params
              window.history.replaceState({}, document.title, window.location.pathname);
            }}
          />
        ) : (
          <LoginPage
            onSwitchToRegister={() => setAuthPage('register')}
            onSwitchToForgotPassword={() => setAuthPage('forgot-password')}
          />
        )}
      </ThemeProvider>
    );
  }

  return <VoiceGroceryList user={user} logout={logout} />;
};

/**
 * Main Voice Grocery List Component
 * Contains the main application interface with voice recognition, grocery list management,
 * and user interface controls
 * 
 * @param {Object} user - Current authenticated user object
 * @param {Function} logout - Function to handle user logout
 */
const VoiceGroceryList = ({ user, logout }) => {
  // Theme and UI state
  const { theme, mode, toggleMode } = useThemeContext();
  const { deleteAccount } = useAuth();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [showHelpPage, setShowHelpPage] = useState(false);
  const [showThemeSettings, setShowThemeSettings] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showCongratulations, setShowCongratulations] = useState(false);
  const [congratsDismissed, setCongratsDismissed] = useState(false);
  const [isListening, _setIsListening] = useState(false);
  const [transcript, _setTranscript] = useState('');
  const [showOnlyRemaining, setShowOnlyRemaining] = useState(false);
  const [downloadMenuAnchor, setDownloadMenuAnchor] = useState(null);
  const [activeView, setActiveView] = useState('lists');
  const [settingsMenuAnchor, setSettingsMenuAnchor] = useState(null);

  // Ref for the printable list component
  const printableListRef = useRef(null);

  // Responsive design helpers
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const isReceiptsView = activeView === 'receipts';

  // Use the custom hook for grocery list management
  const {
    allLists,
    currentDate,
    setCurrentDate,
    currentDateString,
    currentItems,
    loading,
    dataLoading,
    pendingCorrections,
  skippedDuplicates,
  setPendingCorrections,
    error,
    setError,
    addItemsToList,
    acceptCorrections,
    rejectCorrections,
    toggleItem,
    removeItem,
    updateItemCategory,
    updateItemText,
    updateItemCount,
    clearCurrentList,
    deleteList,
  } = useGroceryList(user);

  // Track previous all-completed state so we only trigger the congratulations
  // dialog on the transition from not-all-complete -> all-complete.
  const prevAllCompletedRef = useRef(false);

  useEffect(() => {
    const hasItems = currentItems.length > 0;
    const allCompleted = hasItems && currentItems.every(item => item.completed);

    // Only trigger when we transition from not-all-complete to all-complete
    if (allCompleted && !prevAllCompletedRef.current && !congratsDismissed) {
      const timer = setTimeout(() => setShowCongratulations(true), 500);
      // Update previous state after scheduling the dialog
      prevAllCompletedRef.current = true;
      return () => clearTimeout(timer);
    }

    // If we move to a non-all-complete state, clear the previous flag so we can
    // detect the next completion transition.
    if (!allCompleted && prevAllCompletedRef.current) {
      prevAllCompletedRef.current = false;
    }
  }, [currentItems, congratsDismissed]);

  useEffect(() => {
    if (isReceiptsView) {
      setMobileDrawerOpen(false);
    }
  }, [isReceiptsView]);

  /**
   * Handle user menu opening
   * Opens the user menu dropdown
   * 
   * @param {Event} event - Click event
   */
  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  /**
   * Handle user menu closing
   * Closes the user menu dropdown
   */
  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  /**
   * Handle user logout
   * Closes user menu and logs out the user
   */
  const handleLogout = () => {
    handleUserMenuClose();
    logout();
  };

  /**
   * Handle download menu opening
   */
  const handleDownloadMenuOpen = (event) => {
    setDownloadMenuAnchor(event.currentTarget);
  };

  /**
   * Handle download menu closing
   */
  const handleDownloadMenuClose = () => {
    setDownloadMenuAnchor(null);
  };

  /**
   * Handle settings menu open/close
   */
  const handleSettingsMenuOpen = (event) => {
    setSettingsMenuAnchor(event.currentTarget);
  };

  const handleSettingsMenuClose = () => {
    setSettingsMenuAnchor(null);
  };

  /**
   * Handle share action (Web Share API on mobile, download on desktop)
   */
  const handleShare = async () => {
    handleDownloadMenuClose();
    if (printableListRef.current) {
      try {
        await shareList(printableListRef.current, currentDateString, formatDateDisplay);
      } catch {
          setError('Failed to share list. Please try downloading instead.');
        }
    }
  };

  /**
   * Handle download as image
   */
  const handleDownloadImage = async () => {
    handleDownloadMenuClose();
    if (printableListRef.current) {
      try {
        await downloadListAsImage(printableListRef.current, currentDateString);
      } catch {
        setError('Failed to download image. Please try again.');
      }
    }
  };

  /**
   * Handle download as PDF
   */
  const handleDownloadPDF = async () => {
    handleDownloadMenuClose();
    if (printableListRef.current) {
      try {
        await downloadListAsPDF(printableListRef.current, currentDateString);
      } catch {
        setError('Failed to download PDF. Please try again.');
      }
    }
  };

  // Get categories from intelligent service
  const categoryList = Object.keys(groceryIntelligence.groceryDatabase);

  /**
   * Handle voice recognition items
   * Processes items detected through voice recognition
   *
   * @param {Array} items - Array of detected grocery items
   */
  const handleVoiceItems = (items) => {
    setShowCongratulations(false); // Reset congratulations when adding new items
    setCongratsDismissed(false);
    // Reset previous completion tracker when items change
    prevAllCompletedRef.current = false;
    addItemsToList(items);
  };

  /**
   * Handle manual input items
   * Processes items added manually by the user
   *
   * @param {Array} items - Array of manually entered grocery items
   */
  const handleManualItems = (items) => {
    setShowCongratulations(false); // Reset congratulations when adding new items
    setCongratsDismissed(false);
    // Reset previous completion tracker when items change
    prevAllCompletedRef.current = false;
    addItemsToList(items);
  };

  /**
   * Handle item toggle (wrapper for useGroceryList toggleItem)
   * 
   * @param {string} itemId - Item ID to toggle
   */
  const handleItemToggle = (itemId) => {
    toggleItem(itemId);
  };

  /**
   * Handle item removal (wrapper for useGroceryList removeItem)
   * 
   * @param {string} itemId - Item ID to remove
   */
  const handleItemRemove = (itemId) => {
    removeItem(itemId);
  };

  /**
   * Handle category change (wrapper for useGroceryList updateItemCategory)
   * 
   * @param {string} itemId - Item ID to update
   * @param {string} newCategory - New category for the item
   */
  const handleCategoryChange = (itemId, newCategory) => {
    updateItemCategory(itemId, newCategory);
  };








  /**
   * Format date for display in the UI
   * Shows relative dates (Today, Yesterday, Tomorrow) or formatted date
   * 
   * @param {string} dateString - Date string to format
   * @returns {string} Formatted date string
   */
  const formatDateDisplay = (dateString) => {
    const date = dayjs(dateString);
    const today = dayjs();
    const yesterday = today.subtract(1, 'day');
    const tomorrow = today.add(1, 'day');

    if (date.isSame(today, 'day')) {return `Today (${date.format('MM/DD/YYYY')})`;}
    if (date.isSame(yesterday, 'day')) {return `Yesterday (${date.format('MM/DD/YYYY')})`;}
    if (date.isSame(tomorrow, 'day')) {return `Tomorrow (${date.format('MM/DD/YYYY')})`;}
    
    return date.format('ddd, MMM D, YYYY');
  };

  /**
   * Create a new list for a specific date
   * Sets the current date and closes mobile drawer
   *
   * @param {string|Date} date - Date to create list for
   */
  const createNewListForDate = (date) => {
    setShowCongratulations(false); // Reset congratulations when switching dates
    setCongratsDismissed(false);
    // Reset previous completion tracker when switching dates/lists
    prevAllCompletedRef.current = false;
    setCurrentDate(dayjs(date));
    setMobileDrawerOpen(false);
  };
  
  /**
   * Toggle category expansion state
   * Expands or collapses a grocery category
   * 
   * @param {string} category - Category name to toggle
   */
  const toggleCategoryExpansion = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  /**
   * Memoized calculation for filtering items based on completion status
   * Filters items to show only remaining (uncompleted) items when filter is active
   *
   * @returns {Array} Array of filtered items
   */
  const filteredItems = useMemo(() => {
    if (showOnlyRemaining) {
      return currentItems.filter(item => !item.completed);
    }
    return currentItems;
  }, [currentItems, showOnlyRemaining]);

  /**
   * Memoized calculation for grouping items by category
   * Groups current items by their category for display
   *
   * @returns {Object} Object with categories as keys and item arrays as values
   */
  const groupedItems = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {});
  }, [filteredItems]);

  /**
   * Memoized calculation for sorting dates
   * Sorts all available dates in descending order (newest first)
   * 
   * @returns {Array} Array of sorted date strings
   */
  const sortedDates = useMemo(() => {
    return Object.keys(allLists).sort((a, b) => new Date(b) - new Date(a));
  }, [allLists]);

  // Drawer content for date selection and list management
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
            },
            day: (dayProps) => {
              // Guard against undefined day
              if (!dayProps || !dayProps.day) {
                return {};
              }

              const dateString = dayProps.day.format('YYYY-MM-DD');
              const today = dayjs().startOf('day');
              const isPast = dayProps.day.isBefore(today);
              const hasExistingList = allLists[dateString] && allLists[dateString].length > 0;
              const isToday = dayProps.day.isSame(today, 'day');

              return {
                sx: {
                  // Grey out past dates without lists
                  ...(isPast && !hasExistingList && {
                    color: 'text.disabled',
                    backgroundColor: 'action.disabledBackground',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                      cursor: 'not-allowed',
                    },
                    opacity: 0.5,
                  }),
                  // Highlight past dates WITH existing lists
                  ...(isPast && hasExistingList && {
                    backgroundColor: 'rgba(33, 150, 243, 0.15)',
                    border: '2px solid #2196f3',
                    fontWeight: 700,
                    color: '#2196f3',
                    '&:hover': {
                      backgroundColor: 'rgba(33, 150, 243, 0.25)',
                    },
                  }),
                  // Highlight today
                  ...(isToday && {
                    backgroundColor: 'rgba(76, 175, 80, 0.15)',
                    border: '2px solid #4caf50',
                    fontWeight: 700,
                    '&:hover': {
                      backgroundColor: 'rgba(76, 175, 80, 0.25)',
                    },
                  }),
                  // Badge indicator for dates with lists
                  ...(hasExistingList && !isPast && !isToday && {
                    position: 'relative',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      bottom: '4px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '4px',
                      height: '4px',
                      borderRadius: '50%',
                      backgroundColor: 'primary.main',
                    },
                  }),
                },
              };
            },
          }}
        />
      </LocalizationProvider>

      {/* Date Legend */}
      <Box sx={{ mb: 2, p: 1.5, backgroundColor: 'background.default', borderRadius: '8px', border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 1 }}>
          Date Legend:
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: 'rgba(76, 175, 80, 0.4)', border: '2px solid #4caf50' }} />
            <Typography variant="caption" color="text.secondary">Today</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: 'rgba(33, 150, 243, 0.4)', border: '2px solid #2196f3' }} />
            <Typography variant="caption" color="text.secondary">Past (with list)</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: 'action.disabledBackground', opacity: 0.5 }} />
            <Typography variant="caption" color="text.secondary">Past (no list)</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: 'primary.main' }} />
            <Typography variant="caption" color="text.secondary">Has items</Typography>
          </Box>
        </Box>
      </Box>

      <List>
        {sortedDates.length > 0 ? (
          sortedDates.map(date => {
            const dateObj = dayjs(date);
            const today = dayjs().startOf('day');
            const isPastDate = dateObj.isBefore(today);
            const hasItems = allLists[date]?.length > 0;

            return (
              <ListItem key={date} disablePadding>
                <ListItemButton
                  selected={date === currentDateString}
                  onClick={() => createNewListForDate(date)}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    // Style past dates with existing lists
                    ...(isPastDate && hasItems && {
                      backgroundColor: date === currentDateString ? 'rgba(33, 150, 243, 0.25)' : 'rgba(33, 150, 243, 0.08)',
                      borderLeft: '4px solid #2196f3',
                      '&:hover': {
                        backgroundColor: 'rgba(33, 150, 243, 0.15)',
                      },
                    }),
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          sx={{
                            fontWeight: date === currentDateString ? 700 : 500,
                            color: isPastDate && hasItems ? '#2196f3' : 'text.primary',
                          }}
                        >
                          {formatDateDisplay(date)}
                        </Typography>
                        {isPastDate && hasItems && (
                          <Chip
                            label="Past"
                            size="small"
                            sx={{
                              height: '18px',
                              fontSize: '0.7rem',
                              backgroundColor: '#2196f3',
                              color: 'white',
                              fontWeight: 600,
                            }}
                          />
                        )}
                      </Box>
                    }
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
            );
          })
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

  // Main component render
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* Correction Dialog */}
      <CorrectionDialog
        open={pendingCorrections.length > 0}
        corrections={pendingCorrections}
        onAccept={acceptCorrections}
        onReject={rejectCorrections}
        onClose={() => setPendingCorrections([])}
      />

      {/* Congratulations Dialog */}
      <CongratulationsDialog
        open={showCongratulations}
        onClose={() => {
          setShowCongratulations(false);
          setCongratsDismissed(true);
        }}
        itemCount={currentItems.length}
        currentDate={formatDateDisplay(currentDateString)}
      />

      {/* Theme Settings Dialog */}
      <ThemeSettings
        open={showThemeSettings}
        onClose={() => setShowThemeSettings(false)}
      />

      {/* Delete Account Dialog */}
      <DeleteAccountDialog
        open={showDeleteAccountDialog}
        onClose={() => setShowDeleteAccountDialog(false)}
        onDeleteAccount={async (password) => {
          setDeletingAccount(true);
          const result = await deleteAccount(password);
          setDeletingAccount(false);
          return result;
        }}
        user={user}
        loading={deletingAccount}
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
          <Toolbar sx={{ minHeight: '72px', px: { xs: 1, sm: 3 } }}>
            {isMobile && !isReceiptsView && (
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
            <Box sx={{ display: 'flex', alignItems: 'center', mr: { xs: 1, sm: 3 } }}>
              <Box
                sx={{
                  width: { xs: 32, sm: 40 },
                  height: { xs: 32, sm: 40 },
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: { xs: 1, sm: 2 },
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                }}
              >
                <ShoppingCart sx={{ color: 'white', fontSize: { xs: 16, sm: 20 } }} />
              </Box>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
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
                  Grocery List
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
            {!isReceiptsView && (
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
            )}

            <Button
              variant={isReceiptsView ? 'contained' : 'outlined'}
              size="small"
              startIcon={<ReceiptLong fontSize="small" />}
              onClick={() => setActiveView(isReceiptsView ? 'lists' : 'receipts')}
              sx={{
                textTransform: 'none',
                borderRadius: 9999,
                mr: 2
              }}
            >
              {isReceiptsView ? 'Back to Lists' : 'Receipts'}
            </Button>

            {/* Settings Menu (theme + help) */}
            <IconButton
              onClick={handleSettingsMenuOpen}
              sx={{
                mr: { xs: 0.5, sm: 1 },
                width: { xs: 36, sm: 44 },
                height: { xs: 36, sm: 44 },
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
              <Settings sx={{ fontSize: { xs: 18, sm: 24 } }} />
            </IconButton>

            {/* User Profile Section */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1.5 } }}>
              <Box sx={{
                display: 'block', // Always show user name
                textAlign: 'right',
                minWidth: 0, // Allow text to shrink
              }}>
                <Typography variant="body2" sx={{
                  fontWeight: 600,
                  color: 'text.primary',
                  lineHeight: 1.2,
                  fontSize: { xs: '0.7rem', sm: '0.875rem' },
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: { xs: '80px', sm: '150px', md: '200px' }
                }}>
                  {user.firstName} {user.lastName}
                </Typography>
                <Typography variant="caption" sx={{
                  color: 'text.secondary',
                  fontSize: { xs: '0.6rem', sm: '0.75rem' },
                  display: { xs: 'none', sm: 'block' } // Hide "Member" text on very small screens
                }}>
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
                    width: { xs: 32, sm: 44 },
                    height: { xs: 32, sm: 44 },
                    background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
                    fontSize: { xs: '0.75rem', sm: '1.1rem' },
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
              <MenuItem
                onClick={() => {
                  setShowDeleteAccountDialog(true);
                  handleUserMenuClose();
                }}
                sx={{ gap: 1, mt: 1, color: 'error.main' }}
              >
                <DeleteForever fontSize="small" />
                Delete Account
              </MenuItem>
              <MenuItem onClick={handleLogout} sx={{ gap: 1 }}>
                <Logout fontSize="small" />
                Sign Out
              </MenuItem>
            </Menu>

            <Menu
              anchorEl={settingsMenuAnchor}
              open={Boolean(settingsMenuAnchor)}
              onClose={handleSettingsMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              PaperProps={{
                sx: {
                  mt: 1,
                  borderRadius: '16px',
                  minWidth: 240,
                }
              }}
            >
              <MenuItem
                onClick={() => {
                  toggleMode();
                  handleSettingsMenuClose();
                }}
                sx={{ gap: 1 }}
              >
                <ListItemIcon>
                  {mode === 'dark' ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
                </ListItemIcon>
                <ListItemText
                  primary={mode === 'dark' ? 'Light mode' : 'Dark mode'}
                  secondary="Toggle base theme"
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setShowThemeSettings(true);
                  handleSettingsMenuClose();
                }}
                sx={{ gap: 1 }}
              >
                <ListItemIcon>
                  <Palette fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Theme settings"
                  secondary="Accent colors & hues"
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
              </MenuItem>
              <Divider sx={{ my: 0.5 }} />
              <MenuItem
                onClick={() => {
                  setShowHelpPage(true);
                  handleSettingsMenuClose();
                }}
                sx={{ gap: 1 }}
              >
                <ListItemIcon>
                  <Help fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Help & tips"
                  secondary="Guides and shortcuts"
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {/* Navigation Drawer */}
        {!isReceiptsView && (
          !isMobile ? (
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
          )
        )}

        {/* Main Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            p: { xs: 2, sm: 3, md: 4 },
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
          }}
        >
          <Toolbar sx={{ minHeight: '72px' }} />

          <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3, md: 4 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ flexGrow: 1, width: '100%' }}>
              {isReceiptsView ? (
                <ReceiptsPage user={user} />
              ) : (
                <>
                  {/* Loading Indicator */}
                  {dataLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress />
                    </Box>
                  )}

                  {/* Status Alerts */}
                  <StatusAlerts
                    isListening={isListening}
                    transcript={transcript}
                    skippedDuplicates={skippedDuplicates}
                    error={error}
                    onClearError={() => setError('')}
                  />

                  {/* Past Date Warning */}
                  {currentDate.isBefore(dayjs().startOf('day')) && (
                    <Alert
                      severity="warning"
                      sx={{
                        mb: 3,
                        borderRadius: '12px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                      }}
                    >
                      <AlertTitle sx={{ fontWeight: 700 }}>📅 Past Date Selected</AlertTitle>
                      You are viewing a past grocery list. You cannot add new items to past dates.
                      {currentItems.length === 0 && ' This date has no existing list.'}
                    </Alert>
                  )}

                  {/* Manual Input Section */}
                  <ManualInput
                    onAddItems={handleManualItems}
                    loading={loading}
                    disabled={currentDate.isBefore(dayjs().startOf('day'))}
                  />

                  {/* List Stats and Controls */}
                  {currentItems.length > 0 && (
                    <Paper sx={{ p: 2, mb: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          {currentItems.filter(item => !item.completed).length} of {currentItems.length} items remaining
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Button
                            startIcon={showOnlyRemaining ? <FilterListOff /> : <FilterList />}
                            onClick={() => setShowOnlyRemaining(!showOnlyRemaining)}
                            variant={showOnlyRemaining ? "contained" : "outlined"}
                            size="small"
                            disabled={loading}
                            sx={{
                              borderRadius: '8px',
                              textTransform: 'none',
                              fontWeight: 600,
                            }}
                          >
                            {showOnlyRemaining ? 'Show All' : 'Remaining Only'}
                          </Button>
                          <Button
                            startIcon={<Download />}
                            endIcon={<ArrowDropDown />}
                            onClick={handleDownloadMenuOpen}
                            variant="outlined"
                            size="small"
                            disabled={loading}
                            sx={{
                              borderRadius: '8px',
                              textTransform: 'none',
                              fontWeight: 600,
                            }}
                          >
                            Download
                          </Button>
                          <Menu
                            anchorEl={downloadMenuAnchor}
                            open={Boolean(downloadMenuAnchor)}
                            onClose={handleDownloadMenuClose}
                            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                            PaperProps={{
                              sx: {
                                mt: 1,
                                borderRadius: '12px',
                                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                              }
                            }}
                          >
                            <MenuItem onClick={handleShare} sx={{ gap: 2, px: 2, py: 1.5 }}>
                              <Share fontSize="small" />
                              <Box>
                                <Typography variant="body2" fontWeight={600}>Share Image</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Best for mobile sharing
                                </Typography>
                              </Box>
                            </MenuItem>
                            <MenuItem onClick={handleDownloadImage} sx={{ gap: 2, px: 2, py: 1.5 }}>
                              <Image fontSize="small" />
                              <Box>
                                <Typography variant="body2" fontWeight={600}>Download Image</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  PNG format
                                </Typography>
                              </Box>
                            </MenuItem>
                            <MenuItem onClick={handleDownloadPDF} sx={{ gap: 2, px: 2, py: 1.5 }}>
                              <PictureAsPdf fontSize="small" />
                              <Box>
                                <Typography variant="body2" fontWeight={600}>Download PDF</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Professional format
                                </Typography>
                              </Box>
                            </MenuItem>
                          </Menu>
                          <Button
                            startIcon={<Clear />}
                            onClick={clearCurrentList}
                            color="error"
                            size="small"
                            disabled={loading}
                            sx={{
                              borderRadius: '8px',
                              textTransform: 'none',
                              fontWeight: 600,
                            }}
                          >
                            {loading ? 'Clearing...' : 'Clear List'}
                          </Button>
                        </Box>
                      </Box>
                    </Paper>
                  )}

                  {/* Grocery List Display */}
                  {currentItems.length > 0 ? (
                    filteredItems.length > 0 ? (
                      <GroceryListDisplay
                        groupedItems={groupedItems}
                        expandedCategories={expandedCategories}
                        onToggleCategory={toggleCategoryExpansion}
                        onToggleItem={handleItemToggle}
                        onRemoveItem={handleItemRemove}
                        onUpdateCategory={handleCategoryChange}
                        onUpdateText={updateItemText}
                        onUpdateCount={updateItemCount}
                        categoryList={categoryList}
                        loading={loading}
                      />
                    ) : (
                      <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '20px' }}>
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          🎉 All items completed!
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          You've checked off all items. Toggle "Show All" to see completed items.
                        </Typography>
                      </Paper>
                    )
                  ) : (
                    <EmptyState
                      currentDateString={currentDateString}
                      formatDateDisplay={formatDateDisplay}
                    />
                  )}
                </>
              )}
            </Box>

            {/* Footer */}
            <Footer />
          </Container>
        </Box>

        {!isReceiptsView && (
          <>
            {/* Hidden Printable List Component for Export */}
            <Box sx={{ position: 'absolute', left: '-9999px', top: 0 }}>
              <PrintableList
                ref={printableListRef}
                items={currentItems}
                dateString={currentDateString}
                formatDateDisplay={formatDateDisplay}
                theme={theme}
              />
            </Box>

            {/* Voice Recognition Component */}
            <VoiceRecognition
              onItemsDetected={handleVoiceItems}
              disabled={loading || currentDate.isBefore(dayjs().startOf('day'))}
            />
          </>
        )}
      </Box>
    </ThemeProvider>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CustomThemeProvider>
          <VoiceGroceryListApp />
        </CustomThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;

// PropTypes for main component
VoiceGroceryList.propTypes = {
  user: PropTypes.object.isRequired,
  logout: PropTypes.func.isRequired,
};