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
  CalendarDays,
  Sun,
  Moon,
  Monitor,
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
import DialogHero from './components/DialogHero';
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
import { downloadListAsImage, downloadListAsPDF, generateListText, renderListImage, shareList } from './utils/downloadList';
import { Button } from './components/ui/button';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import { Skeleton } from './components/ui/skeleton';
import { Checkbox } from './components/ui/checkbox';
import { Input } from './components/ui/input';
import { Sheet, SheetContent } from './components/ui/sheet';
import { Dialog, DialogContent } from './components/ui/dialog';
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
import { toast } from 'sonner';

// Twelve dots fanned left/up/down from the progress bar's end (the bar ends at the
// card's right edge, so dots flying right would just be clipped)
// Wait for the progress fill (700ms ease-out) to mostly arrive before bursting
const BURST_DELAY_MS = 380;
// High contrast on the accent gradient in both modes
const BURST_COLORS = ['var(--primary-foreground)', 'oklch(0.93 0.16 95)', 'var(--primary-foreground)', 'oklch(0.97 0.05 95)'];
const BURST_DOTS = Array.from({ length: 12 }, (_, i) => {
  const angle = (Math.PI * (100 + (160 * i) / 11)) / 180; // 100°..260°
  const distance = 34 + (i % 3) * 14;
  return {
    dx: Math.round(Math.cos(angle) * distance),
    dy: Math.round(Math.sin(angle) * distance),
    color: BURST_COLORS[i % BURST_COLORS.length],
  };
});

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

  // Header gets a soft accent shadow once the page scrolls
  const [hasScrolled, setHasScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setHasScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Ref for the printable list component
  const printableListRef = useRef(null);
  // Image render started when the list menu opens, so Share can call
  // navigator.share() while the tap still counts as a user gesture
  const pendingExportRef = useRef(null);

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
      // Let the progress fill + burst play (~1.2s) before the dialog covers them
      const timer = setTimeout(() => setShowCongratulations(true), 1300);
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
   * Renders the export image, reusing the render started when the menu opened
   */
  const getExportImage = () => {
    if (!pendingExportRef.current && printableListRef.current) {
      pendingExportRef.current = renderListImage(printableListRef.current);
    }
    return pendingExportRef.current;
  };

  const handleListMenuOpenChange = (open) => {
    // Items can't change while the menu is open, so a render started now is
    // exactly what gets exported; drop it on close so edits re-render
    pendingExportRef.current = null;
    if (open && currentItems.length > 0) { getExportImage()?.catch(() => {}); }
  };

  /**
   * Handle share action (Web Share API on mobile, download on desktop)
   */
  const handleShare = async () => {
    const image = getExportImage();
    if (!image) { return; }
    try {
      const title = `Grocery list · ${formatDateDisplay(currentDateString)}`;
      const result = await shareList(image, {
        dateString: currentDateString,
        title,
        text: generateListText(currentItems, title),
      });
      if (result === 'downloaded') { toast.success('Sharing isn’t available here, so the image was downloaded'); }
    } catch {
      setError('Failed to share list. Please try downloading instead.');
    }
  };

  /**
   * Handle download as image
   */
  const handleDownloadImage = async () => {
    const image = getExportImage();
    if (!image) { return; }
    try {
      await downloadListAsImage(image, currentDateString);
      toast.success('Image downloaded');
    } catch {
      setError('Failed to download image. Please try again.');
    }
  };

  /**
   * Handle download as PDF
   */
  const handleDownloadPDF = async () => {
    if (!printableListRef.current) { return; }
    const id = toast.loading('Preparing PDF…');
    try {
      await downloadListAsPDF(printableListRef.current, currentDateString);
      toast.success('PDF downloaded', { id });
    } catch {
      toast.dismiss(id);
      setError('Failed to download PDF. Please try again.');
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

  // Completion burst: bump a key only when the list goes from "some left" to "all done"
  const [burstKey, setBurstKey] = useState(0);
  const prevRemainingRef = useRef(null);
  useEffect(() => {
    const prev = prevRemainingRef.current;
    prevRemainingRef.current = { date: currentDateString, remaining: remainingCount };
    if (prev && prev.date === currentDateString && prev.remaining > 0 && remainingCount === 0 && currentItems.length > 0) {
      setBurstKey((key) => key + 1);
    }
  }, [remainingCount, currentDateString, currentItems.length]);

  const todayStart = dayjs().startOf('day');
  const upcomingDates = sortedDates.filter(date => !dayjs(date).isBefore(todayStart)).reverse();
  const pastDates = sortedDates.filter(date => dayjs(date).isBefore(todayStart));

  const renderDateRow = (date, index) => {
    const isSelected = date === currentDateString;
    const dateObj = dayjs(date);
    const isPast = dateObj.isBefore(todayStart);
    const isToday = dateObj.isSame(todayStart, 'day');
    const items = allLists[date] || [];
    const doneCount = items.filter(item => item.completed).length;
    const leftCount = items.length - doneCount;
    const listProgress = items.length ? (doneCount / items.length) * 100 : 0;
    let status = 'Empty';
    if (items.length > 0) {
      status = leftCount === 0 ? 'All done' : `${leftCount} of ${items.length} left`;
    }

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

    let tileClass = isPast ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary';
    if (isSelected || isToday) {tileClass = 'btn-gradient';}

    return (
      <li key={date} className="rise-in" style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
        <button
          type="button"
          onClick={() => (selectMode ? toggleDateSelection(date) : createNewListForDate(date))}
          aria-current={isSelected ? 'date' : undefined}
          className={`group w-full flex items-center gap-3 rounded-2xl p-2 pr-1.5 text-left transition-[background-color,box-shadow] ${
            isSelected
              ? 'bg-primary/10 ring-1 ring-primary/20'
              : 'hover:bg-accent/70'
          }`}
        >
          {selectMode && (
            <Checkbox
              checked={selectedDatesForMove.includes(date)}
              onClick={(e) => {
                e.stopPropagation();
                toggleDateSelection(date);
              }}
              aria-label={`Select ${relativeDayLabel(date)}`}
            />
          )}

          {/* Calendar-style date tile */}
          <span className={`size-11 rounded-xl flex flex-col items-center justify-center shrink-0 leading-none ${tileClass}`}>
            <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{dateObj.format('ddd')}</span>
            <span className="text-base font-bold tabular-nums mt-0.5">{dateObj.format('D')}</span>
          </span>

          <span className="flex-1 min-w-0">
            <span className={`block text-sm truncate ${isSelected ? 'font-semibold text-foreground' : 'font-medium'}`}>
              {relativeDayLabel(date)}
            </span>
            <span className={`block text-xs tabular-nums ${leftCount === 0 && items.length > 0 ? 'text-success' : 'text-muted-foreground'}`}>
              {status}
            </span>
            {items.length > 0 && (
              <span className="block h-1 mt-1.5 rounded-full bg-muted overflow-hidden">
                <span
                  className={`block h-full rounded-full transition-[width] duration-500 ${leftCount === 0 ? 'bg-success' : 'btn-gradient'}`}
                  style={{ width: `${listProgress}%`, boxShadow: 'none' }}
                />
              </span>
            )}
          </span>

          {!selectMode && (
            <span className="flex flex-col md:flex-row items-center md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity">
              <span
                role="button"
                tabIndex={0}
                title="Move or merge into another date"
                aria-label={`Move or merge ${relativeDayLabel(date)}`}
                {...stopAnd(() => openMoveDialog([date]))}
                className="p-1.5 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground"
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
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
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

  const todayItems = allLists[todayStart.format('YYYY-MM-DD')] || [];
  const todayLeft = todayItems.filter(item => !item.completed).length;
  const quickJumps = [
    { label: 'Today', date: todayStart },
    { label: 'Tomorrow', date: todayStart.add(1, 'day') },
  ];

  // Drawer content for date selection and list management
  const drawerContent = (
    <nav aria-label="Grocery lists" className="w-full p-4 space-y-6">
      {/* Summary + quick jumps on the accent gradient */}
      <div className="hero-gradient rounded-3xl p-4" style={{ boxShadow: '0 14px 30px -18px color-mix(in oklch, var(--primary) 70%, transparent)' }}>
        <div className="relative z-10">
          <p className="text-lg font-semibold tracking-tight">Your lists</p>
          <p className="text-xs opacity-85 tabular-nums">
            {sortedDates.length} {sortedDates.length === 1 ? 'list' : 'lists'}
            {todayItems.length > 0 && ` · ${todayLeft === 0 ? 'today’s all done' : `${todayLeft} left today`}`}
          </p>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {quickJumps.map(({ label, date }) => {
              const isActive = date.isSame(currentDate, 'day');
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => createNewListForDate(date)}
                  aria-pressed={isActive}
                  className={`h-9 rounded-xl text-sm font-medium transition-[background-color,color,transform] active:scale-[0.97] ${
                    isActive
                      ? 'bg-primary-foreground text-primary'
                      : 'bg-[color-mix(in_oklch,var(--primary-foreground)_16%,transparent)] hover:bg-[color-mix(in_oklch,var(--primary-foreground)_26%,transparent)]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="list-date" className="section-label block px-1 mb-2">Pick a date</label>
        <div className="relative">
          <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-primary pointer-events-none" />
          <Input
            id="list-date"
            type="date"
            value={currentDate.format('YYYY-MM-DD')}
            onChange={(e) => e.target.value && createNewListForDate(e.target.value)}
            className="h-11 rounded-xl pl-10"
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2 px-1">
          <span className="section-label">{upcomingDates.length > 0 ? 'Upcoming' : 'Lists'}</span>
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
            className="w-full mb-3 h-10 rounded-xl btn-gradient border-0 hover:opacity-95"
            onClick={() => openMoveDialog(selectedDatesForMove)}
          >
            <Merge />
            Merge {selectedDatesForMove.length} list{selectedDatesForMove.length > 1 ? 's' : ''}
          </Button>
        )}

        {sortedDates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-center">
            <p className="text-sm font-medium">No lists yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">Add an item to start today&apos;s list.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {upcomingDates.length > 0 && (
              <ul className="space-y-1">{upcomingDates.map(renderDateRow)}</ul>
            )}
            {pastDates.length > 0 && (
              <div>
                {upcomingDates.length > 0 && <p className="section-label px-1 mb-2">Past</p>}
                <ul className="space-y-1">{pastDates.map((date, i) => renderDateRow(date, i + upcomingDates.length))}</ul>
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

  const renderComposer = ({ floating = false } = {}) => (
    <ManualInput
      onAddItems={handleManualItems}
      historicalItems={historicalItems}
      predictions={predictions}
      loading={loading}
      disabled={isPastDate}
      dropUp={isMobile}
      listening={isListening}
      floating={floating}
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
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-sm p-0 gap-0 overflow-hidden focus-visible:outline-none"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            event.currentTarget?.focus?.();
          }}
        >
          <DialogHero
            icon={moveDialogDates.length > 1 ? Merge : ArrowLeftRight}
            title={moveDialogDates.length > 1 ? 'Merge lists' : 'Move list'}
            description={moveDialogDates.length > 1
              ? 'Combine them into one date. Items already there won’t be duplicated.'
              : 'Pick a new date. If it already has a list, items merge without duplicates.'}
          />
          <div className="px-6 pt-5 pb-6 space-y-4">
            {/* From → To */}
            <div>
              <p className="section-label mb-2 px-1">From</p>
              <div className="flex flex-wrap gap-1.5">
                {[...moveDialogDates].sort().map((date) => (
                  <span key={date} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 pl-1 pr-3 py-1 text-xs font-medium">
                    <span className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold tabular-nums">
                      {dayjs(date).format('D')}
                    </span>
                    {relativeDayLabel(date)}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="move-target-date" className="section-label block mb-2 px-1">To</label>
              <div className="relative">
                <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-primary pointer-events-none" />
                <Input
                  id="move-target-date"
                  type="date"
                  value={moveTargetDate.format('YYYY-MM-DD')}
                  min={dayjs().format('YYYY-MM-DD')}
                  onChange={(e) => e.target.value && setMoveTargetDate(dayjs(e.target.value))}
                  className="h-11 rounded-xl pl-10"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button variant="outline" onClick={closeMoveDialog} className="h-11 rounded-xl">Cancel</Button>
              <Button onClick={handleConfirmMove} disabled={movingLists} className="h-11 rounded-xl btn-gradient border-0 hover:opacity-95">
                {movingLists && <Loader2 className="animate-spin" />}
                {movingLists ? 'Moving…' : moveDialogDates.length > 1 ? 'Merge' : 'Move'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col min-h-dvh">
        <ProjectDisclaimer />

        <header
          className={`sticky top-0 z-40 h-14 shrink-0 flex items-center gap-2 px-3 sm:px-5 bg-background/75 backdrop-blur-xl transition-shadow duration-300 ${
            hasScrolled ? 'shadow-[0_8px_24px_-16px_color-mix(in_oklch,var(--primary)_45%,transparent)]' : ''
          }`}
        >
          {/* Accent hairline instead of a flat border */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_oklch,var(--primary)_45%,transparent),transparent)]"
          />

          {isMobile && !isReceiptsView && (
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="-ml-1 size-9 rounded-xl flex items-center justify-center hover:bg-primary/10 transition-colors"
              aria-label="Open lists"
            >
              <MenuIcon className="size-5" />
            </button>
          )}

          <div className="flex items-center gap-2.5 mr-auto min-w-0">
            <div className="btn-gradient size-9 rounded-xl flex items-center justify-center shrink-0">
              <ShoppingBasket className="size-5" />
            </div>
            <span className="hidden sm:block font-bold tracking-tight truncate bg-clip-text text-transparent bg-[linear-gradient(135deg,var(--foreground)_30%,var(--primary))]">
              Grocery List
            </span>
          </div>

          {/* Primary navigation: a gradient pill slides to the active tab */}
          <nav aria-label="Primary" className="relative grid grid-cols-2 rounded-full bg-muted p-1">
            <span
              aria-hidden="true"
              className="btn-gradient absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full transition-transform duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)]"
              style={{ transform: activeView === 'receipts' ? 'translateX(100%)' : 'translateX(0)' }}
            />
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
                  className={`relative z-10 h-8 px-3 sm:px-4 rounded-full text-sm font-medium inline-flex items-center justify-center gap-1.5 transition-colors duration-200 ${
                    isActive ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
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
                className="ml-1 rounded-full p-[2px] btn-gradient transition-transform hover:scale-105 active:scale-95 data-[state=open]:scale-105"
              >
                <Avatar className="size-8 border-2 border-background">
                  <AvatarFallback className="bg-card text-foreground text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-64 p-0 overflow-hidden">
              {/* Profile banner */}
              <div className="hero-gradient px-4 py-3.5" style={{ boxShadow: 'none' }}>
                <div className="relative z-10 flex items-center gap-3">
                  <span className="size-10 rounded-full flex items-center justify-center text-sm font-bold bg-[color-mix(in_oklch,var(--primary-foreground)_20%,transparent)]">
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{user.firstName} {user.lastName}</p>
                    {user.email && <p className="text-xs opacity-85 truncate">{user.email}</p>}
                  </div>
                </div>
              </div>
              <div className="p-1.5">
                <DropdownMenuLabel className="text-xs font-medium text-muted-foreground py-1">Appearance</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={mode} onValueChange={setMode}>
                  <DropdownMenuRadioItem value="light"><Sun className="size-4 text-muted-foreground" />Light</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark"><Moon className="size-4 text-muted-foreground" />Dark</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system"><Monitor className="size-4 text-muted-foreground" />Match system</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuItem onClick={() => setShowThemeSettings(true)}>
                  <Palette />
                  Accent color…
                  <span aria-hidden="true" className="ml-auto size-4 rounded-full btn-gradient" style={{ boxShadow: 'none' }} />
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
              </div>
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
                  {/* Hero: date, progress and list actions on an accent gradient */}
                  <div className="hero-gradient rounded-[28px] px-5 pt-5 pb-5 mb-6">
                    <div className="relative z-10">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => isMobile && setMobileDrawerOpen(true)}
                            className={`flex items-center gap-1.5 text-left ${isMobile ? '' : 'cursor-default'}`}
                            tabIndex={isMobile ? 0 : -1}
                            aria-label={isMobile ? 'Change list date' : undefined}
                          >
                            <h1 className="text-[30px] sm:text-4xl font-semibold tracking-tight leading-tight">
                              {relativeDayLabel(currentDateString)}
                            </h1>
                            {isMobile && <ChevronDown className="size-5 opacity-80 mt-1" />}
                          </button>
                          <p className="text-sm mt-1 flex items-center gap-1.5 flex-wrap opacity-85">
                            <time dateTime={currentDateString}>{currentDate.format('dddd, MMMM D')}</time>
                            {currentItems.length > 0 && (
                              <span className="tabular-nums">
                                ·{' '}
                                <span key={completedCount} className="count-bump inline-block">
                                  {remainingCount === 0 ? 'all done' : `${remainingCount} of ${currentItems.length} left`}
                                </span>
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
                          <DropdownMenu onOpenChange={handleListMenuOpenChange}>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                aria-label="List options"
                                className="size-9 shrink-0 rounded-xl flex items-center justify-center border border-[color-mix(in_oklch,var(--primary-foreground)_25%,transparent)] bg-[color-mix(in_oklch,var(--primary-foreground)_14%,transparent)] hover:bg-[color-mix(in_oklch,var(--primary-foreground)_24%,transparent)] transition-colors"
                              >
                                <MoreHorizontal className="size-4" />
                              </button>
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
                          className="relative mt-5 h-2 rounded-full bg-[color-mix(in_oklch,var(--primary-foreground)_24%,transparent)]"
                          role="progressbar"
                          aria-label="Items bought"
                          aria-valuemin={0}
                          aria-valuemax={currentItems.length}
                          aria-valuenow={completedCount}
                        >
                          <div
                            className="h-full rounded-full bg-primary-foreground transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                            style={{ width: `${progressPercent}%` }}
                          />
                          {/* One-shot burst when the last item gets checked off */}
                          {burstKey > 0 && (
                            <span key={burstKey} aria-hidden="true" className="absolute right-0 top-1/2">
                              {BURST_DOTS.map(({ dx, dy, color }, i) => (
                                <span
                                  key={i}
                                  className="burst-dot"
                                  style={{ '--dx': `${dx}px`, '--dy': `${dy}px`, backgroundColor: color, animationDelay: `${BURST_DELAY_MS + i * 12}ms` }}
                                />
                              ))}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Desktop composer sits inline; mobile gets a bottom bar */}
                  {!isMobile && <div className="mb-6">{renderComposer()}</div>}

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
                          key={currentDateString}
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
                />
              </div>

              {/* Mobile: composer pinned to the thumb zone */}
              {isMobile && (
                <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-background via-background/90 to-transparent px-3 pt-6 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                  {renderComposer({ floating: true })}
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
