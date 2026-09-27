import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import {
  Sparkles,
  Copy,
  Check,
  SlidersHorizontal,
  RefreshCw,
  Repeat,
  X,
  ArrowUp,
  WifiOff,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import useReceiptChat from '../../hooks/useReceiptChat.js';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { Checkbox } from '../ui/checkbox';
import { hueFromString } from '../../utils/categoryStyles';
import { formatMoney } from '../../utils/money';

const MarkdownRenderer = ({ children }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      code({ inline, className, children: codeChildren, ...props }) {
        const match = /language-(\w+)/.exec(className || '');
        if (!inline && match) {
          return (
            <SyntaxHighlighter
              style={materialLight}
              language={match[1]}
              PreTag="div"
              {...props}
            >
              {String(codeChildren).replace(/\n$/, '')}
            </SyntaxHighlighter>
          );
        }
        return <code className={className} {...props}>{codeChildren}</code>;
      }
    }}
    className="prose prose-sm dark:prose-invert max-w-none"
  >
    {children}
  </ReactMarkdown>
);

MarkdownRenderer.propTypes = {
  children: PropTypes.string.isRequired
};

const EXAMPLE_QUESTIONS = [
  'How much did I spend this month?',
  'Where do I shop most?',
  'What was my biggest purchase?',
  'How much did I spend on produce?',
];

/** Tappable store chip for a receipt the answer was grounded in. */
const SourceChip = ({ source, onSelectReceipt }) => {
  const name = source.merchant || 'Unknown store';
  const canOpen = Boolean(onSelectReceipt && source.receiptId);
  return (
    <button
      type="button"
      disabled={!canOpen}
      onClick={() => canOpen && onSelectReceipt(source.receiptId)}
      title={canOpen ? 'Open receipt' : undefined}
      className="cat-card inline-flex items-center gap-2 rounded-full border bg-card pl-1 pr-3 py-1 text-xs transition-[transform,background-color] enabled:hover:bg-accent enabled:active:scale-[0.97] disabled:cursor-default"
      style={{ '--cat-h': hueFromString(name.toLowerCase()) }}
    >
      <span className="cat-tile cat-label size-6 rounded-full flex items-center justify-center font-semibold">
        {name.charAt(0).toUpperCase()}
      </span>
      <span className="font-medium">{name}</span>
      {source.purchaseDate && <span className="text-muted-foreground tabular-nums">{source.purchaseDate}</span>}
      {typeof source.total === 'number' && (
        <span className="font-semibold tabular-nums">{formatMoney(source.total, source.currency)}</span>
      )}
    </button>
  );
};

SourceChip.propTypes = {
  source: PropTypes.shape({
    receiptId: PropTypes.string,
    merchant: PropTypes.string,
    purchaseDate: PropTypes.string,
    total: PropTypes.number,
    currency: PropTypes.string
  }).isRequired,
  onSelectReceipt: PropTypes.func
};

/** Gradient sparkle avatar for assistant messages. */
const AssistantAvatar = () => (
  <span aria-hidden="true" className="btn-gradient size-8 rounded-full flex items-center justify-center shrink-0">
    <Sparkles className="size-4" />
  </span>
);

const MultiSelectPopover = ({ label, placeholder, options, selectedValues, onToggle, getLabel = (o) => o }) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" className="w-full justify-start font-normal">
        <span className="truncate">
          {selectedValues.length > 0 ? `${label} (${selectedValues.length})` : placeholder}
        </span>
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-72 max-h-64 overflow-y-auto p-2">
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground p-2">No options available</p>
      ) : (
        options.map((option) => {
          const value = typeof option === 'string' ? option : option.id;
          const checked = selectedValues.includes(value);
          return (
            <label
              key={value}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent cursor-pointer text-sm"
            >
              <Checkbox checked={checked} onCheckedChange={() => onToggle(value)} />
              {getLabel(option)}
            </label>
          );
        })
      )}
    </PopoverContent>
  </Popover>
);

MultiSelectPopover.propTypes = {
  label: PropTypes.string.isRequired,
  placeholder: PropTypes.string.isRequired,
  options: PropTypes.array.isRequired,
  selectedValues: PropTypes.array.isRequired,
  onToggle: PropTypes.func.isRequired,
  getLabel: PropTypes.func
};

const ReceiptChatPanel = ({ userId, receipts, onSelectReceipt }) => {
  const [copiedEntryId, setCopiedEntryId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  // The question in flight, shown as a bubble until the answer arrives
  const [pendingQuestion, setPendingQuestion] = useState('');
  const scrollRef = useRef(null);
  const {
    question,
    setQuestion,
    askQuestion,
    retryLast,
    regenerateAnswer,
    history,
    isLoading,
    statusMessage,
    error,
    clearError,
    selectedMerchants,
    setSelectedMerchants,
    merchantOptions,
    selectedReceiptOptions,
    setSelectedReceiptIds,
    receiptOptions,
    dateRange,
    setDateRange,
    activeFilterChips,
    clearFilters,
    hasActiveFilters,
    isOnline,
    networkStatusMessage
  } = useReceiptChat({ userId, receipts });

  const sendQuestion = useCallback((text) => {
    setPendingQuestion(text.trim());
    askQuestion(text);
  }, [askQuestion]);

  const handleAsk = useCallback(() => {
    sendQuestion(question);
  }, [sendQuestion, question]);

  // Chat convention: Enter sends, Shift+Enter adds a line (Ctrl/Cmd+Enter still sends)
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (question.trim().length >= 3 && !isLoading && isOnline) {
        handleAsk();
      }
    }
  }, [handleAsk, question, isLoading, isOnline]);

  const handleChipDelete = useCallback((chip) => {
    if (chip.type === 'dateStart') {
      setDateRange([null, dateRange[1]]);
    } else if (chip.type === 'dateEnd') {
      setDateRange([dateRange[0], null]);
    } else if (chip.type === 'merchant') {
      setSelectedMerchants((prev) => prev.filter((merchant) => merchant !== chip.value));
    } else if (chip.type === 'receipt') {
      setSelectedReceiptIds((prev) => prev.filter((id) => id !== chip.value));
    }
  }, [dateRange, setDateRange, setSelectedMerchants, setSelectedReceiptIds]);

  const handleCopy = useCallback(async (entryId, text) => {
    if (!navigator?.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(text);
    setCopiedEntryId(entryId);
    setTimeout(() => setCopiedEntryId(null), 2000);
  }, []);


  const toggleMerchant = useCallback((merchant) => {
    setSelectedMerchants((prev) => (
      prev.includes(merchant) ? prev.filter((m) => m !== merchant) : [...prev, merchant]
    ));
  }, [setSelectedMerchants]);

  const toggleReceipt = useCallback((id) => {
    setSelectedReceiptIds((prev) => (
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    ));
  }, [setSelectedReceiptIds]);

  const canSubmit = question.trim().length >= 3 && !isLoading && isOnline;
  const today = dayjs().format('YYYY-MM-DD');
  // History is newest-first; a conversation reads oldest-first
  const conversation = useMemo(() => [...history].reverse(), [history]);
  const filterCount = activeFilterChips.length;

  // Keep the newest message in view
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [history.length, isLoading]);

  return (
    <section
      aria-labelledby="receipt-chat-heading"
      className="rounded-3xl border border-border bg-card overflow-hidden shadow-[0_18px_40px_-24px_color-mix(in_oklch,var(--primary)_55%,transparent)]"
    >
      {/* Header */}
      <div className="hero-gradient px-5 py-4" style={{ boxShadow: 'none' }}>
        <div className="relative z-10 flex items-center gap-3">
          <span className="size-10 rounded-2xl flex items-center justify-center shrink-0 bg-[color-mix(in_oklch,var(--primary-foreground)_18%,transparent)]">
            <Sparkles className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="receipt-chat-heading" className="font-semibold tracking-tight">Ask about your receipts</h2>
            <p className="text-xs opacity-85 flex items-center gap-1.5">
              {isOnline ? (
                <span className="size-1.5 rounded-full bg-[oklch(0.85_0.18_150)]" />
              ) : (
                <WifiOff className="size-3" />
              )}
              {isOnline ? 'Answers use only the receipts you’ve uploaded' : networkStatusMessage}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((open) => !open)}
            aria-expanded={showFilters}
            aria-controls="receipt-chat-filters"
            aria-label={filterCount > 0 ? `Filters (${filterCount} active)` : 'Filters'}
            className="relative h-9 px-3 rounded-xl inline-flex items-center gap-1.5 text-sm font-medium border border-[color-mix(in_oklch,var(--primary-foreground)_25%,transparent)] bg-[color-mix(in_oklch,var(--primary-foreground)_14%,transparent)] hover:bg-[color-mix(in_oklch,var(--primary-foreground)_24%,transparent)] transition-colors"
          >
            <SlidersHorizontal className="size-4" />
            <span className="hidden sm:inline">Filters</span>
            {filterCount > 0 && (
              <span className="min-w-5 h-5 px-1 rounded-full bg-primary-foreground text-primary text-[11px] font-bold flex items-center justify-center tabular-nums">
                {filterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filters (collapsible) */}
      <div
        id="receipt-chat-filters"
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: showFilters ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="px-5 py-4 bg-primary/[0.04] border-b border-border flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="chat-start-date" className="block text-xs text-muted-foreground mb-1">From</label>
                <Input
                  id="chat-start-date"
                  type="date"
                  max={today}
                  value={dateRange[0] ? dayjs(dateRange[0]).format('YYYY-MM-DD') : ''}
                  onChange={(e) => setDateRange([e.target.value ? dayjs(e.target.value) : null, dateRange[1]])}
                  className="h-10 rounded-xl"
                />
              </div>
              <div>
                <label htmlFor="chat-end-date" className="block text-xs text-muted-foreground mb-1">To</label>
                <Input
                  id="chat-end-date"
                  type="date"
                  max={today}
                  value={dateRange[1] ? dayjs(dateRange[1]).format('YYYY-MM-DD') : ''}
                  onChange={(e) => setDateRange([dateRange[0], e.target.value ? dayjs(e.target.value) : null])}
                  className="h-10 rounded-xl"
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <MultiSelectPopover
                label="Stores"
                placeholder="All stores"
                options={merchantOptions}
                selectedValues={selectedMerchants}
                onToggle={toggleMerchant}
              />
              <MultiSelectPopover
                label="Receipts"
                placeholder="All receipts"
                options={receiptOptions}
                selectedValues={selectedReceiptOptions.map((o) => o.id)}
                onToggle={toggleReceipt}
                getLabel={(o) => o.label}
              />
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="self-start text-xs font-medium text-primary hover:underline underline-offset-4"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Active filter chips stay visible when the panel is closed */}
      {!showFilters && filterCount > 0 && (
        <div className="flex flex-wrap gap-1.5 px-5 pt-3">
          {activeFilterChips.map((chip) => (
            <span key={chip.key} className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 pl-2.5 pr-1 py-0.5 text-xs">
              {chip.label}
              <button
                type="button"
                onClick={() => handleChipDelete(chip)}
                aria-label={`Remove filter ${chip.label}`}
                className="rounded-full hover:bg-primary/15 p-0.5"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Conversation */}
      <div ref={scrollRef} className="max-h-[520px] min-h-[260px] overflow-y-auto px-4 sm:px-5 py-5 space-y-5" aria-live="polite">
        {conversation.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center text-center py-4">
            <span className="btn-gradient size-14 rounded-2xl flex items-center justify-center mb-3">
              <Sparkles className="size-7" />
            </span>
            <p className="font-semibold">What would you like to know?</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Ask anything about your spending. Try one of these:
            </p>
            <div className="grid sm:grid-cols-2 gap-2 mt-4 w-full max-w-lg">
              {EXAMPLE_QUESTIONS.map((example, index) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => sendQuestion(example)}
                  disabled={!isOnline}
                  className="rise-in text-left rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-medium hover:bg-primary/10 hover:border-primary/35 active:scale-[0.98] transition-[background-color,border-color,transform] disabled:opacity-50"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : (
          conversation.map((entry) => (
            <div key={entry.id} className="space-y-3">
              {/* You */}
              <div className="flex justify-end animate-in fade-in slide-in-from-bottom-1 duration-300">
                <p className="btn-gradient max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm">
                  {entry.question}
                </p>
              </div>

              {/* Assistant */}
              <div className="flex gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <AssistantAvatar />
                <div className="min-w-0 flex-1">
                  <div className="rounded-2xl rounded-tl-md border border-border bg-background/60 px-4 py-3">
                    <MarkdownRenderer>
                      {entry.answer || 'I could not generate an answer with the current receipts.'}
                    </MarkdownRenderer>
                  </div>

                  {entry.sources?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[11px] font-medium text-muted-foreground mb-1.5 px-1">Based on</p>
                      <div className="flex flex-wrap gap-1.5">
                        {entry.sources.map((source) => (
                          <SourceChip
                            key={`${entry.id}-${source.receiptId}`}
                            source={source}
                            onSelectReceipt={onSelectReceipt}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {entry.sources?.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-2 px-1">
                      No receipts matched. Try a wider date range or fewer filters.
                    </p>
                  )}

                  <div className="flex items-center gap-0.5 mt-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => handleCopy(entry.id, entry.answer || '')}
                          disabled={!entry.answer}
                          aria-label="Copy answer"
                          className={`size-8 rounded-lg flex items-center justify-center hover:bg-accent disabled:opacity-40 ${copiedEntryId === entry.id ? 'text-success' : 'text-muted-foreground'}`}
                        >
                          {copiedEntryId === entry.id ? <Check className="size-4 check-pop-in" /> : <Copy className="size-4" />}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{copiedEntryId === entry.id ? 'Copied' : 'Copy answer'}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => regenerateAnswer(entry.id)}
                          disabled={isLoading}
                          aria-label="Regenerate answer"
                          className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent disabled:opacity-40"
                        >
                          <Repeat className="size-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Regenerate answer</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Pending: the question stays in the box until the answer lands */}
        {isLoading && (
          <div className="space-y-3">
            {pendingQuestion && (
              <div className="flex justify-end animate-in fade-in duration-200">
                <p className="btn-gradient max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm opacity-90">{pendingQuestion}</p>
              </div>
            )}
            <div className="flex gap-2.5 items-center" role="status">
              <AssistantAvatar />
              <div className="rounded-2xl rounded-tl-md border border-border bg-background/60 px-4 py-3 flex items-center gap-3">
                <span className="typing-dots" aria-hidden="true"><span /><span /><span /></span>
                <span className="text-xs text-muted-foreground">{statusMessage}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mx-4 sm:mx-5 mb-3">
          <Alert variant="destructive">
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="flex-1">{error}</span>
              <span className="flex gap-2 shrink-0">
                <Button variant="ghost" size="sm" onClick={retryLast}>
                  <RefreshCw />
                  Retry
                </Button>
                <Button variant="ghost" size="sm" onClick={clearError}>
                  Dismiss
                </Button>
              </span>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Composer */}
      <div className="border-t border-border px-4 sm:px-5 py-3 bg-background/40">
        {conversation.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
            {EXAMPLE_QUESTIONS.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setQuestion(example)}
                disabled={isLoading}
                className="shrink-0 h-7 px-3 rounded-full border border-primary/25 bg-primary/10 text-xs font-medium hover:bg-primary/15 active:scale-[0.97] transition-[background-color,transform] disabled:opacity-50"
              >
                {example}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 rounded-2xl border border-input bg-card pl-4 pr-1.5 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20 transition-[border-color,box-shadow]">
          <label htmlFor="receipt-question" className="sr-only">Your question</label>
          <Textarea
            id="receipt-question"
            placeholder={isOnline ? 'Ask about your spending…' : 'You’re offline'}
            rows={1}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading || !isOnline}
            className="min-h-9 max-h-32 flex-1 resize-none border-0 bg-transparent shadow-none px-0 py-2 focus-visible:ring-0 focus-visible:border-0"
          />
          <button
            type="button"
            onClick={handleAsk}
            disabled={!canSubmit}
            aria-label="Send question"
            className="btn-gradient size-9 shrink-0 rounded-xl flex items-center justify-center transition-[opacity,transform] active:scale-95 disabled:opacity-40 disabled:shadow-none"
          >
            <ArrowUp className="size-4" />
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5 px-1">Enter to send · Shift+Enter for a new line</p>
      </div>
    </section>
  );
};

ReceiptChatPanel.propTypes = {
  userId: PropTypes.string.isRequired,
  receipts: PropTypes.arrayOf(PropTypes.shape({
    _id: PropTypes.string.isRequired,
    merchant: PropTypes.string,
    purchaseDate: PropTypes.string,
    total: PropTypes.number,
    currency: PropTypes.string
  })).isRequired,
  onSelectReceipt: PropTypes.func
};

export default ReceiptChatPanel;
