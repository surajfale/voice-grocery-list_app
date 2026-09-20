import React, { useState, useMemo, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import {
  Trash2,
  CalendarDays,
  ShoppingCart,
  Menu as MenuIcon,
  X,
  LogOut,
  HelpCircle,
  Palette,
  Sun,
  Moon,
  Settings,
  ListFilter,
  ListX,
  Download,
  Share2,
  ImageIcon,
  FileText,
  ChevronDown,
  Trash,
  Receipt,
  ArrowLeftRight,
  Merge,
  Loader2,
} from 'lucide-react';
import { AuthProvider, useAuth } from './AuthContext';
import { CustomThemeProvider, useThemeContext } from './contexts/ThemeContext';
import { useIsMobile } from './hooks/useIsMobile';
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
import ProjectDisclaimer from './components/ProjectDisclaimer';
import Footer from './components/Footer';
import EmptyState from './components/EmptyState';
import StatusAlerts from './components/StatusAlerts';
import ManualInput from './components/ManualInput';
import PrintableList from './components/PrintableList';
import CongratulationsDialog from './components/CongratulationsDialog';
import ErrorBoundary from './components/ErrorBoundary';
import ReceiptsPage from './pages/ReceiptsPage';
import { useGroceryList } from './hooks/useGroceryList';
import groceryIntelligence from './services/groceryIntelligence';
import { downloadListAsImage, downloadListAsPDF, shareList } from './utils/downloadList';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import { Card } from './components/ui/card';
import { Checkbox } from './components/ui/checkbox';
import { Separator } from './components/ui/separator';
import { Alert, AlertTitle, AlertDescription } from './components/ui/alert';
import { Input } from './components/ui/input';
import { Sheet, SheetContent } from './components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from './components/ui/dropdown-menu';
import { Toaster } from './components/ui/sonner';

const Spinner = ({ className = 'size-8' }) => (
  <Loader2 className={`${className} animate-spin text-primary`} />
);

Spinner.propTypes = {
  className: PropTypes.string,
};

/**
 * Main Voice Grocery List Application Component
 * Handles authentication state and renders appropriate UI based on user login status
 */
const VoiceGroceryListApp = () => {
  const { isAuthenticated, user, logout, loading } = useAuth();
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
      <div className="flex justify-center items-center h-screen">
        <Spinner className="size-12" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return authPage === 'register' ? (
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
  const { mode, toggleMode } = useThemeContext();
  const { deleteAccount } = useAuth();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [showHelpPage, setShowHelpPage] = useState(false);
  const [showThemeSettings, setShowThemeSettings] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showCongratulations, setShowCongratulations] = useState(false);
  const [congratsDismissed, setCongratsDismissed] = useState(false);
  const [isListening, _setIsListening] = useState(false);
  const [transcript, _setTranscript] = useState('');
  const [showOnlyRemaining, setShowOnlyRemaining] = useState(false);
  const [activeView, setActiveView] = useState('lists');
  const [displayedView, setDisplayedView] = useState('lists');
  const [viewContentVisible, setViewContentVisible] = useState(true);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedDatesForMove, setSelectedDatesForMove] = useState([]);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveDialogDates, setMoveDialogDates] = useState([]);
  const [moveTargetDate, setMoveTargetDate] = useState(() => dayjs());
  const [movingLists, setMovingLists] = useState(false);

  // Ref for the printable list component
  const printableListRef = useRef(null);

  // Responsive design helpers
  const isMobile = useIsMobile(900);
  const isReceiptsView = activeView === 'receipts';

  // Cross-fade the main content when switching between Lists and Receipts
  useEffect(() => {
    if (activeView === displayedView) { return undefined; }
    setViewContentVisible(false);
    const timeout = setTimeout(() => {
      setDisplayedView(activeView);
      setViewContentVisible(true);
    }, 120);
    return () => clearTimeout(timeout);
  }, [activeView, displayedView]);

  // Use the custom hook for grocery list management
  const {
    allLists,
    historicalItems,
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
    moveListsToDate,
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

  const handleLogout = () => {
    logout();
  };

  /**
   * Handle share action (Web Share API on mobile, download on desktop)
   */
  const handleShare = async () => {
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

    if (date.isSame(today, 'day')) { return `Today (${date.format('MM/DD/YYYY')})`; }
    if (date.isSame(yesterday, 'day')) { return `Yesterday (${date.format('MM/DD/YYYY')})`; }
    if (date.isSame(tomorrow, 'day')) { return `Tomorrow (${date.format('MM/DD/YYYY')})`; }

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
   * Toggle selection of a date for bulk move/merge
   *
   * @param {string} date - Date string to toggle selection for
   */
  const toggleDateSelection = (date) => {
    setSelectedDatesForMove(prev =>
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
    );
  };

  /**
   * Open the move/merge dialog for the given list date(s)
   *
   * @param {string[]} dates - Date strings of the lists to move/merge
   */
  const openMoveDialog = (dates) => {
    setMoveDialogDates(dates);
    setMoveTargetDate(dayjs());
    setMoveDialogOpen(true);
  };

  const closeMoveDialog = () => {
    setMoveDialogOpen(false);
  };

  /**
   * Confirm moving/merging the selected list(s) into the chosen target date
   */
  const handleConfirmMove = async () => {
    setMovingLists(true);
    await moveListsToDate(moveDialogDates, moveTargetDate.format('YYYY-MM-DD'));
    setMovingLists(false);
    setMoveDialogOpen(false);
    setSelectedDatesForMove([]);
    setSelectMode(false);
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

  const isPastDate = currentDate.isBefore(dayjs().startOf('day'));

  // Drawer content for date selection and list management
  const drawerContent = (
    <div className="w-full p-4">
      <h6 className="flex items-center gap-2 text-base font-display font-semibold mb-3">
        <CalendarDays className="size-4.5" />
        Grocery Lists
      </h6>
      <Separator className="mb-4" />

      <Input
        type="date"
        value={currentDate.format('YYYY-MM-DD')}
        onChange={(e) => e.target.value && createNewListForDate(e.target.value)}
        className="mb-4"
        aria-label="Select date"
      />

      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-semibold text-muted-foreground">Your Lists</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectMode(prev => !prev);
            setSelectedDatesForMove([]);
          }}
        >
          {selectMode ? 'Cancel' : 'Select'}
        </Button>
      </div>

      {selectMode && selectedDatesForMove.length > 0 && (
        <Button
          className="w-full mb-2"
          onClick={() => openMoveDialog(selectedDatesForMove)}
        >
          <Merge />
          Move/Merge {selectedDatesForMove.length} list{selectedDatesForMove.length > 1 ? 's' : ''}
        </Button>
      )}

      <ul className="space-y-1">
        {sortedDates.length > 0 ? (
          sortedDates.map(date => {
            const dateObj = dayjs(date);
            const today = dayjs().startOf('day');
            const isPast = dateObj.isBefore(today);
            const hasItems = allLists[date]?.length > 0;
            const isSelected = date === currentDateString;

            return (
              <li key={date}>
                <button
                  type="button"
                  onClick={() => (selectMode ? toggleDateSelection(date) : createNewListForDate(date))}
                  className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors group ${
                    isSelected ? 'bg-primary/10' : 'hover:bg-accent'
                  } ${isPast && hasItems ? 'border-l-4 border-l-primary/60' : ''}`}
                >
                  {selectMode && (
                    <Checkbox
                      checked={selectedDatesForMove.includes(date)}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDateSelection(date);
                      }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm truncate ${isSelected ? 'font-bold' : 'font-medium'} ${isPast && hasItems ? 'text-primary' : ''}`}>
                        {formatDateDisplay(date)}
                      </span>
                      {isPast && hasItems && (
                        <Badge variant="soft" className="text-[10px] h-4 px-1.5">Past</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{allLists[date]?.length || 0} items</span>
                  </div>
                  {!selectMode && (
                    <span
                      role="button"
                      tabIndex={0}
                      title="Move/merge to another date"
                      onClick={(e) => {
                        e.stopPropagation();
                        openMoveDialog([date]);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          openMoveDialog([date]);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-background text-muted-foreground"
                    >
                      <ArrowLeftRight className="size-3.5" />
                    </span>
                  )}
                  {!selectMode && !isSelected && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteList(date);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          deleteList(date);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-destructive/10 text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </span>
                  )}
                </button>
              </li>
            );
          })
        ) : (
          <li className="text-sm text-muted-foreground px-2.5 py-2">No grocery lists yet</li>
        )}
      </ul>
    </div>
  );

  // Show help page if requested
  if (showHelpPage) {
    return <HelpPage onBack={() => setShowHelpPage(false)} />;
  }

  // Main component render
  return (
    <>
      <Toaster />

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

      {/* Move/Merge Lists Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={(open) => !open && closeMoveDialog()}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Move/Merge to Date</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {moveDialogDates.length > 1
              ? `Merge ${moveDialogDates.length} lists into one date. Items already on the target date won't be duplicated.`
              : 'Move this list to a new date. If the target date already has a list, items will be merged without duplicates.'}
          </p>
          <Input
            type="date"
            value={moveTargetDate.format('YYYY-MM-DD')}
            min={dayjs().format('YYYY-MM-DD')}
            onChange={(e) => e.target.value && setMoveTargetDate(dayjs(e.target.value))}
          />
          <DialogFooter>
            <Button variant="outline" onClick={closeMoveDialog}>Cancel</Button>
            <Button onClick={handleConfirmMove} disabled={movingLists}>
              {movingLists ? 'Moving...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col min-h-screen">
        <ProjectDisclaimer />
        {/* Modern App Bar */}
        <header className="sticky top-0 z-40 h-[72px] shrink-0 flex items-center px-3 sm:px-6 bg-card/85 backdrop-blur-xl border-b border-border">
            {isMobile && !isReceiptsView && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileDrawerOpen(true)}
                className="mr-2"
                aria-label="Open menu"
              >
                <MenuIcon />
              </Button>
            )}

            {/* Logo and Brand */}
            <div className="flex items-center mr-2 sm:mr-6">
              <div className="size-8 sm:size-10 rounded-xl bg-primary flex items-center justify-center mr-2 sm:mr-3 shadow-[0_4px_12px_-2px_var(--primary)]">
                <ShoppingCart className="text-white size-4 sm:size-5" />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-display font-bold text-xl text-primary leading-tight">
                  Grocery List
                </h1>
                <p className="text-xs text-muted-foreground font-medium">Smart Shopping Lists</p>
              </div>
            </div>

            <div className="flex-1" />

            {/* Current Date Badge */}
            {!isReceiptsView && (
              <Badge variant="outline" className="hidden md:flex mr-3 h-8 px-3 font-semibold text-muted-foreground">
                {formatDateDisplay(currentDateString)}
              </Badge>
            )}

            <Button
              variant={isReceiptsView ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveView(isReceiptsView ? 'lists' : 'receipts')}
              className="rounded-full mr-2"
            >
              <Receipt className="size-4" />
              {isReceiptsView ? 'Back to Lists' : 'Receipts'}
            </Button>

            {/* Settings Menu (theme + help) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="mr-1 sm:mr-2 text-muted-foreground">
                  <Settings />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-60">
                <DropdownMenuItem onClick={toggleMode}>
                  {mode === 'dark' ? <Sun /> : <Moon />}
                  <div>
                    <div className="font-semibold">{mode === 'dark' ? 'Light mode' : 'Dark mode'}</div>
                    <div className="text-xs text-muted-foreground">Toggle base theme</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowThemeSettings(true)}>
                  <Palette />
                  <div>
                    <div className="font-semibold">Theme settings</div>
                    <div className="text-xs text-muted-foreground">Accent colors &amp; hues</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowHelpPage(true)}>
                  <HelpCircle />
                  <div>
                    <div className="font-semibold">Help &amp; tips</div>
                    <div className="text-xs text-muted-foreground">Guides and shortcuts</div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Profile Section */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              <div className="text-right min-w-0 hidden xs:block">
                <p className="font-semibold text-foreground leading-tight text-xs sm:text-sm truncate max-w-[80px] sm:max-w-[150px] md:max-w-[200px]">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-muted-foreground text-[0.6rem] sm:text-xs hidden sm:block">
                  {currentItems.length} items today
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="rounded-full hover:scale-105 transition-transform">
                    <Avatar className="size-8 sm:size-11 shadow-[0_4px_12px_-2px_var(--secondary)]">
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-xs sm:text-base">
                        {user.firstName[0]}{user.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="font-normal">
                    <p className="text-xs text-muted-foreground">Signed in as</p>
                    <p className="text-sm font-bold text-foreground">{user.firstName} {user.lastName}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setShowDeleteAccountDialog(true)}
                  >
                    <Trash />
                    Delete Account
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
        </header>

        <div className="flex flex-1">
          {/* Navigation Drawer */}
          {!isReceiptsView && (
            !isMobile ? (
              <aside className="w-80 shrink-0 border-r border-border bg-card/60 hidden md:block">
                {drawerContent}
              </aside>
            ) : (
              <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
                <SheetContent side="left" className="w-80 p-0 pt-4">
                  {drawerContent}
                </SheetContent>
              </Sheet>
            )
          )}

          {/* Main Content */}
          <main className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 bg-background">
            <div className="max-w-5xl w-full mx-auto py-4 sm:py-6 md:py-8 flex-1 flex flex-col">
              <div
                className="flex-1 w-full transition-opacity"
                style={{ opacity: viewContentVisible ? 1 : 0, transitionDuration: viewContentVisible ? '200ms' : '120ms' }}
              >
                {displayedView === 'receipts' ? (
                  <ReceiptsPage user={user} />
                ) : (
                  <>
                    {/* Loading Indicator */}
                    {dataLoading && (
                      <div className="flex justify-center py-8">
                        <Spinner />
                      </div>
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
                    {isPastDate && (
                      <Alert variant="warning" className="mb-4">
                        <AlertTitle>📅 Past Date Selected</AlertTitle>
                        <AlertDescription>
                          You are viewing a past grocery list. You cannot add new items to past dates.
                          {currentItems.length === 0 && ' This date has no existing list.'}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Manual Input Section */}
                    <ManualInput
                      onAddItems={handleManualItems}
                      historicalItems={historicalItems}
                      loading={loading}
                      disabled={isPastDate}
                    />

                    {/* List Stats and Controls */}
                    {currentItems.length > 0 && (
                      <Card className="p-4 mb-4">
                        <div className="flex justify-between items-center flex-wrap gap-3">
                          <p className="text-sm text-muted-foreground">
                            {currentItems.filter(item => !item.completed).length} of {currentItems.length} items remaining
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              variant={showOnlyRemaining ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setShowOnlyRemaining(!showOnlyRemaining)}
                              disabled={loading}
                            >
                              {showOnlyRemaining ? <ListX /> : <ListFilter />}
                              {showOnlyRemaining ? 'Show All' : 'Remaining Only'}
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" disabled={loading}>
                                  <Download />
                                  Download
                                  <ChevronDown />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={handleShare}>
                                  <Share2 />
                                  <div>
                                    <div className="font-semibold">Share Image</div>
                                    <div className="text-xs text-muted-foreground">Best for mobile sharing</div>
                                  </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadImage}>
                                  <ImageIcon />
                                  <div>
                                    <div className="font-semibold">Download Image</div>
                                    <div className="text-xs text-muted-foreground">PNG format</div>
                                  </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadPDF}>
                                  <FileText />
                                  <div>
                                    <div className="font-semibold">Download PDF</div>
                                    <div className="text-xs text-muted-foreground">Professional format</div>
                                  </div>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={clearCurrentList}
                              disabled={loading}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <X />
                              {loading ? 'Clearing...' : 'Clear List'}
                            </Button>
                          </div>
                        </div>
                      </Card>
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
                        <Card className="p-8 text-center">
                          <p className="font-display text-lg font-semibold text-muted-foreground mb-1">
                            🎉 All items completed!
                          </p>
                          <p className="text-sm text-muted-foreground">
                            You&apos;ve checked off all items. Toggle &quot;Show All&quot; to see completed items.
                          </p>
                        </Card>
                      )
                    ) : (
                      <EmptyState
                        currentDateString={currentDateString}
                        formatDateDisplay={formatDateDisplay}
                      />
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <Footer />
            </div>
          </main>

          {!isReceiptsView && (
            <>
              {/* Hidden Printable List Component for Export */}
              <div className="absolute -left-[9999px] top-0">
                <PrintableList
                  ref={printableListRef}
                  items={currentItems}
                  dateString={currentDateString}
                  formatDateDisplay={formatDateDisplay}
                />
              </div>

              {/* Voice Recognition Component */}
              <VoiceRecognition
                onItemsDetected={handleVoiceItems}
                disabled={loading || isPastDate}
              />
            </>
          )}
        </div>
      </div>
    </>
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
