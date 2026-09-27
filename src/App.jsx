import React, { useState, useMemo, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import {
  Trash2,
  ShoppingBasket,
  Menu as MenuIcon,
  LogOut,
  HelpCircle,
  Palette,
  Share2,
  ImageIcon,
  FileText,
  ChevronDown,
  Trash,
  Receipt,
  ArrowLeftRight,
  Merge,
  Loader2,
  ListChecks,
  MoreHorizontal,
  Eraser,
  Lock,
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
import PredictionChips from './components/PredictionChips';
import StatusAlerts from './components/StatusAlerts';
import ManualInput from './components/ManualInput';
import PrintableList from './components/PrintableList';
import CongratulationsDialog from './components/CongratulationsDialog';
import ErrorBoundary from './components/ErrorBoundary';
import ReceiptsPage from './pages/ReceiptsPage';
import { useGroceryList } from './hooks/useGroceryList';
import { usePurchasePredictions } from './hooks/usePurchasePredictions';
import groceryIntelligence from './services/groceryIntelligence';
import { downloadListAsImage, downloadListAsPDF, shareList } from './utils/downloadList';
import { Button } from './components/ui/button';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import { Skeleton } from './components/ui/skeleton';
import { Checkbox } from './components/ui/checkbox';
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
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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
      <div className="flex justify-center items-center min-h-dvh">
        <Spinner className="size-8" />
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
  const { mode, setMode } = useThemeContext();
  const { deleteAccount } = useAuth();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [showHelpPage, setShowHelpPage] = useState(false);
  const [showThemeSettings, setShowThemeSettings] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showCongratulations, setShowCongratulations] = useState(false);
  const [congratsDismissed, setCongratsDismissed] = useState(false);
  const [isListening, setIsListening] = useState(false);
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

  // "Today" / "Tomorrow" / "Yesterday", else a short weekday date
  const relativeDayLabel = (dateString) => {
    const date = dayjs(dateString);
    const today = dayjs();
    if (date.isSame(today, 'day')) { return 'Today'; }
    if (date.isSame(today.add(1, 'day'), 'day')) { return 'Tomorrow'; }
    if (date.isSame(today.subtract(1, 'day'), 'day')) { return 'Yesterday'; }
    return date.format(date.isSame(today, 'year') ? 'ddd, MMM D' : 'ddd, MMM D, YYYY');
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
  const predictions = usePurchasePredictions(user, currentDateString, currentItems, !isPastDate);

  const completedCount = currentItems.filter(item => item.completed).length;
  const remainingCount = currentItems.length - completedCount;
  const progressPercent = currentItems.length ? (completedCount / currentItems.length) * 100 : 0;

  const todayStart = dayjs().startOf('day');
  const upcomingDates = sortedDates.filter(date => !dayjs(date).isBefore(todayStart)).reverse();
  const pastDates = sortedDates.filter(date => dayjs(date).isBefore(todayStart));

  const renderDateRow = (date) => {
    const isSelected = date === currentDateString;
    const itemCount = allLists[date]?.length || 0;

    const stopAnd = (fn) => ({
      onClick: (e) => {
        e.stopPropagation();
        fn();
      },
      onKeyDown: (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          fn();
        }
      },
    });

    return (
      <li key={date}>
        <button
          type="button"
          onClick={() => (selectMode ? toggleDateSelection(date) : createNewListForDate(date))}
          aria-current={isSelected ? 'date' : undefined}
          className={`group w-full flex items-center gap-2.5 rounded-lg pl-3 pr-1.5 h-10 text-left text-sm transition-colors ${
            isSelected
              ? 'bg-accent text-foreground font-medium'
              : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
          }`}
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
          <span className="flex-1 truncate">{relativeDayLabel(date)}</span>
          <span className="text-xs tabular-nums text-muted-foreground">{itemCount}</span>
          {!selectMode && (
            <span className="flex items-center md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity">
              <span
                role="button"
                tabIndex={0}
                title="Move or merge into another date"
                aria-label={`Move or merge ${relativeDayLabel(date)}`}
                {...stopAnd(() => openMoveDialog([date]))}
                className="p-1.5 rounded-md hover:bg-background text-muted-foreground hover:text-foreground"
              >
                <ArrowLeftRight className="size-3.5" />
              </span>
              {!isSelected && (
                <span
                  role="button"
                  tabIndex={0}
                  title="Delete list"
                  aria-label={`Delete ${relativeDayLabel(date)}`}
                  {...stopAnd(() => deleteList(date))}
                  className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </span>
              )}
            </span>
          )}
        </button>
      </li>
    );
  };

  // Drawer content for date selection and list management
  const drawerContent = (
    <nav aria-label="Grocery lists" className="w-full p-4 space-y-6">
      <div>
        <label htmlFor="list-date" className="section-label block px-1 mb-2">Go to date</label>
        <Input
          id="list-date"
          type="date"
          value={currentDate.format('YYYY-MM-DD')}
          onChange={(e) => e.target.value && createNewListForDate(e.target.value)}
          className="h-10"
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-1 px-1">
          <span className="section-label">Lists</span>
          {sortedDates.length > 1 && (
            <button
              type="button"
              onClick={() => {
                setSelectMode(prev => !prev);
                setSelectedDatesForMove([]);
              }}
              className="text-xs font-medium text-primary hover:underline underline-offset-4"
            >
              {selectMode ? 'Cancel' : 'Select'}
            </button>
          )}
        </div>

        {selectMode && selectedDatesForMove.length > 0 && (
          <Button
            size="sm"
            className="w-full my-2"
            onClick={() => openMoveDialog(selectedDatesForMove)}
          >
            <Merge />
            Merge {selectedDatesForMove.length} list{selectedDatesForMove.length > 1 ? 's' : ''}
          </Button>
        )}

        {sortedDates.length === 0 ? (
          <p className="text-sm text-muted-foreground px-1 py-2">No lists yet</p>
        ) : (
          <div className="space-y-4">
            {upcomingDates.length > 0 && (
              <ul className="space-y-0.5">{upcomingDates.map(renderDateRow)}</ul>
            )}
            {pastDates.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground px-3 mb-1">Past</p>
                <ul className="space-y-0.5">{pastDates.map(renderDateRow)}</ul>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );

  // Show help page if requested
  if (showHelpPage) {
    return <HelpPage onBack={() => setShowHelpPage(false)} />;
  }

  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();

  const composer = (
    <ManualInput
      onAddItems={handleManualItems}
      historicalItems={historicalItems}
      predictions={predictions}
      loading={loading}
      disabled={isPastDate}
      dropUp={isMobile}
      listening={isListening}
      trailing={(
        <VoiceRecognition
          onItemsDetected={handleVoiceItems}
          disabled={loading || isPastDate}
          onListeningChange={setIsListening}
        />
      )}
    />
  );

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
        currentDate={relativeDayLabel(currentDateString)}
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
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{moveDialogDates.length > 1 ? 'Merge lists' : 'Move list'}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {moveDialogDates.length > 1
              ? `Combine ${moveDialogDates.length} lists into one date. Items already on that date won't be duplicated.`
              : 'Pick a new date. If that date already has a list, the items are merged without duplicates.'}
          </p>
          <Input
            type="date"
            value={moveTargetDate.format('YYYY-MM-DD')}
            min={dayjs().format('YYYY-MM-DD')}
            onChange={(e) => e.target.value && setMoveTargetDate(dayjs(e.target.value))}
            aria-label="Target date"
          />
          <DialogFooter>
            <Button variant="outline" onClick={closeMoveDialog}>Cancel</Button>
            <Button onClick={handleConfirmMove} disabled={movingLists}>
              {movingLists ? 'Moving…' : moveDialogDates.length > 1 ? 'Merge' : 'Move'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col min-h-dvh">
        <ProjectDisclaimer />

        <header className="sticky top-0 z-40 h-14 shrink-0 flex items-center gap-2 px-3 sm:px-5 bg-background/80 backdrop-blur-xl border-b border-border">
          {isMobile && !isReceiptsView && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileDrawerOpen(true)}
              className="-ml-1 size-9"
              aria-label="Open lists"
            >
              <MenuIcon />
            </Button>
          )}

          <div className="flex items-center gap-2.5 mr-auto min-w-0">
            <div className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <ShoppingBasket className="size-4.5" />
            </div>
            <span className="hidden sm:block font-semibold tracking-tight truncate">Grocery List</span>
          </div>

          {/* Primary navigation */}
          <nav aria-label="Primary" className="flex items-center rounded-full bg-muted p-0.5">
            {[
              { view: 'lists', label: 'Lists', Icon: ListChecks },
              { view: 'receipts', label: 'Receipts', Icon: Receipt },
            ].map(({ view, label, Icon }) => {
              const isActive = activeView === view;
              return (
                <button
                  key={view}
                  type="button"
                  onClick={() => setActiveView(view)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`h-8 px-3 sm:px-3.5 rounded-full text-sm font-medium inline-flex items-center gap-1.5 transition-[background-color,color,box-shadow] ${
                    isActive ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              );
            })}
          </nav>

          {/* Account + preferences */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Account and settings"
                className="ml-1 rounded-full transition-[box-shadow] hover:ring-2 hover:ring-border data-[state=open]:ring-2 data-[state=open]:ring-ring/40"
              >
                <Avatar className="size-8">
                  <AvatarFallback className="bg-muted text-foreground text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-60">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-semibold text-foreground truncate">{user.firstName} {user.lastName}</p>
                {user.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground py-1">Appearance</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={mode} onValueChange={setMode}>
                <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system">Match system</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuItem onClick={() => setShowThemeSettings(true)}>
                <Palette />
                Accent color…
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowHelpPage(true)}>
                <HelpCircle />
                Help &amp; tips
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut />
                Sign out
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setShowDeleteAccountDialog(true)}
              >
                <Trash />
                Delete account
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <div className="flex flex-1">
          {/* Navigation Drawer */}
          {!isReceiptsView && (
            !isMobile ? (
              <aside className="w-72 shrink-0 border-r border-border sticky top-14 self-start h-[calc(100dvh-3.5rem)] overflow-y-auto">
                {drawerContent}
              </aside>
            ) : (
              <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
                <SheetContent side="left" className="w-80 max-w-[85vw] p-0 pt-10">
                  {drawerContent}
                </SheetContent>
              </Sheet>
            )
          )}

          {/* Main Content */}
          <main
            id="main"
            className={`flex-1 min-w-0 flex flex-col px-4 sm:px-6 ${
              isMobile && !isReceiptsView ? 'pb-32' : 'pb-8'
            }`}
          >
            <div
              className={`w-full mx-auto pt-6 sm:pt-10 flex-1 flex flex-col transition-opacity ${
                displayedView === 'receipts' ? 'max-w-5xl' : 'max-w-2xl'
              }`}
              style={{ opacity: viewContentVisible ? 1 : 0, transitionDuration: viewContentVisible ? '200ms' : '120ms' }}
            >
              {displayedView === 'receipts' ? (
                <ReceiptsPage user={user} />
              ) : (
                <div className="flex-1">
                  {/* List header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => isMobile && setMobileDrawerOpen(true)}
                        className={`flex items-center gap-1.5 text-left ${isMobile ? '' : 'cursor-default'}`}
                        tabIndex={isMobile ? 0 : -1}
                        aria-label={isMobile ? 'Change list date' : undefined}
                      >
                        <h1 className="text-[28px] sm:text-3xl font-semibold tracking-tight leading-tight">
                          {relativeDayLabel(currentDateString)}
                        </h1>
                        {isMobile && <ChevronDown className="size-5 text-muted-foreground mt-1" />}
                      </button>
                      <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <time dateTime={currentDateString}>{currentDate.format('dddd, MMMM D')}</time>
                        {currentItems.length > 0 && (
                          <span className="tabular-nums">
                            · {remainingCount === 0 ? 'all done' : `${remainingCount} of ${currentItems.length} left`}
                          </span>
                        )}
                        {isPastDate && (
                          <span className="inline-flex items-center gap-1">
                            · <Lock className="size-3" /> read-only
                          </span>
                        )}
                      </p>
                    </div>

                    {currentItems.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon" className="size-9 shrink-0" aria-label="List options">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-52">
                          <DropdownMenuCheckboxItem
                            checked={showOnlyRemaining}
                            onCheckedChange={(checked) => setShowOnlyRemaining(Boolean(checked))}
                          >
                            Hide bought items
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={handleShare}>
                            <Share2 />
                            Share as image
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleDownloadImage}>
                            <ImageIcon />
                            Download PNG
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleDownloadPDF}>
                            <FileText />
                            Download PDF
                          </DropdownMenuItem>
                          {!isPastDate && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onClick={clearCurrentList} disabled={loading}>
                                <Eraser />
                                Clear list
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {currentItems.length > 0 && (
                    <div
                      className="h-1 rounded-full bg-muted overflow-hidden mb-6"
                      role="progressbar"
                      aria-label="Items bought"
                      aria-valuemin={0}
                      aria-valuemax={currentItems.length}
                      aria-valuenow={completedCount}
                    >
                      <div
                        className={`h-full rounded-full transition-[width] duration-500 ease-out ${remainingCount === 0 ? 'bg-success' : 'bg-primary'}`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  )}

                  {/* Desktop composer sits inline; mobile gets a bottom bar */}
                  {!isMobile && <div className="mb-6">{composer}</div>}

                  <StatusAlerts
                    isListening={false}
                    transcript={transcript}
                    skippedDuplicates={skippedDuplicates}
                    error={error}
                    onClearError={() => setError('')}
                  />

                  {dataLoading ? (
                    <div className="rounded-xl border border-border bg-card divide-y divide-border" aria-busy="true" aria-label="Loading list">
                      {[70, 45, 60, 35, 55].map((width) => (
                        <div key={width} className="flex items-center gap-3 h-13 px-3.5">
                          <Skeleton className="size-5 rounded-full" />
                          <Skeleton className="h-3.5" style={{ width: `${width}%` }} />
                        </div>
                      ))}
                    </div>
                  ) : currentItems.length > 0 ? (
                    <>
                      {!isPastDate && (
                        <PredictionChips predictions={predictions} onAddItems={handleManualItems} disabled={loading} />
                      )}
                      {filteredItems.length > 0 ? (
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
                        <div className="text-center py-12">
                          <p className="font-medium">Everything&apos;s bought</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Bought items are hidden.{' '}
                            <button
                              type="button"
                              onClick={() => setShowOnlyRemaining(false)}
                              className="text-primary font-medium hover:underline underline-offset-4"
                            >
                              Show them
                            </button>
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <EmptyState
                      predictions={isPastDate ? [] : predictions}
                      onAddItems={handleManualItems}
                      loading={loading}
                      readOnly={isPastDate}
                    />
                  )}
                </div>
              )}

              <Footer />
            </div>
          </main>

          {!isReceiptsView && (
            <>
              {/* Hidden Printable List Component for Export */}
              <div className="absolute -left-[9999px] top-0" aria-hidden="true">
                <PrintableList
                  ref={printableListRef}
                  items={currentItems}
                  dateString={currentDateString}
                  formatDateDisplay={formatDateDisplay}
                />
              </div>

              {/* Mobile: composer pinned to the thumb zone */}
              {isMobile && (
                <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/85 backdrop-blur-xl px-3 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
                  {composer}
                </div>
              )}
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
