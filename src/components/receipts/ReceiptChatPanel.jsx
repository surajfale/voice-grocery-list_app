import PropTypes from 'prop-types';
import { useCallback, useState } from 'react';
import dayjs from 'dayjs';
import {
  Sparkles,
  Copy,
  ChevronUp,
  ChevronDown,
  Filter,
  History,
  ExternalLink,
  RefreshCw,
  Repeat,
  Loader2,
  X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import useReceiptChat from '../../hooks/useReceiptChat.js';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';
import { Alert, AlertDescription } from '../ui/alert';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { Checkbox } from '../ui/checkbox';

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

const SourceCard = ({ source, onSelectReceipt }) => (
  <Card
    className={`p-3 transition-colors ${onSelectReceipt ? 'cursor-pointer hover:border-primary' : ''}`}
    onClick={() => {
      if (onSelectReceipt && source.receiptId) {
        onSelectReceipt(source.receiptId);
      }
    }}
  >
    <div className="flex items-center justify-between mb-1">
      <p className="text-sm font-semibold">{source.merchant || 'Unknown merchant'}</p>
      {typeof source.score === 'number' && (
        <Badge variant="outline">Score {(source.score * 100).toFixed(0)}%</Badge>
      )}
    </div>
    <p className="text-sm text-muted-foreground">{source.purchaseDate || 'No date available'}</p>
    {typeof source.total === 'number' && (
      <p className="text-sm">Total: ${source.total.toFixed(2)}</p>
    )}
    <div className="flex items-center gap-1.5 mt-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (onSelectReceipt && source.receiptId) {
                onSelectReceipt(source.receiptId);
              }
            }}
            className="p-1 rounded-md hover:bg-accent text-muted-foreground"
          >
            <ExternalLink className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Open receipt</TooltipContent>
      </Tooltip>
      <span className="text-xs text-muted-foreground">Receipt ID: {source.receiptId}</span>
    </div>
  </Card>
);

SourceCard.propTypes = {
  source: PropTypes.shape({
    receiptId: PropTypes.string,
    merchant: PropTypes.string,
    purchaseDate: PropTypes.string,
    total: PropTypes.number,
    score: PropTypes.number
  }).isRequired,
  onSelectReceipt: PropTypes.func
};

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
  const [expandedSources, setExpandedSources] = useState({});
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

  const handleAsk = useCallback(() => {
    askQuestion(question);
  }, [askQuestion, question]);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleAsk();
    }
  }, [handleAsk]);

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

  const toggleSources = useCallback((entryId) => {
    setExpandedSources((prev) => ({ ...prev, [entryId]: !prev[entryId] }));
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

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            <h6 className="font-display text-lg font-bold">AI Insights</h6>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <History className="size-4" />
            {networkStatusMessage}
          </p>
        </div>

        {!isOnline && (
          <Alert variant="warning">
            <AlertDescription>
              You appear to be offline. Connect to the internet to chat about your receipts.
            </AlertDescription>
          </Alert>
        )}

        {error && (
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
        )}

        <Card className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Filters</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Start date</label>
                <Input
                  type="date"
                  max={today}
                  value={dateRange[0] ? dayjs(dateRange[0]).format('YYYY-MM-DD') : ''}
                  onChange={(e) => setDateRange([e.target.value ? dayjs(e.target.value) : null, dateRange[1]])}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">End date</label>
                <Input
                  type="date"
                  max={today}
                  value={dateRange[1] ? dayjs(dateRange[1]).format('YYYY-MM-DD') : ''}
                  onChange={(e) => setDateRange([dateRange[0], e.target.value ? dayjs(e.target.value) : null])}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <MultiSelectPopover
                label="Merchants"
                placeholder="Filter by merchant"
                options={merchantOptions}
                selectedValues={selectedMerchants}
                onToggle={toggleMerchant}
              />
              <MultiSelectPopover
                label="Receipt IDs"
                placeholder="Select specific receipts"
                options={receiptOptions}
                selectedValues={selectedReceiptOptions.map((o) => o.id)}
                onToggle={toggleReceipt}
                getLabel={(o) => o.label}
              />
            </div>

            {hasActiveFilters && (
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>
              </div>
            )}

            {activeFilterChips.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {activeFilterChips.map((chip) => (
                  <Badge key={chip.key} variant="outline" className="gap-1 pr-1">
                    {chip.label}
                    <button
                      type="button"
                      onClick={() => handleChipDelete(chip)}
                      className="rounded-full hover:bg-accent p-0.5"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </Card>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">Ask a question about your receipts</label>
            <Textarea
              placeholder="e.g. How much did I spend on produce last month?"
              rows={3}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleAsk} disabled={!canSubmit}>
              {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {isLoading ? statusMessage : 'Ask'}
            </Button>
            <Button variant="outline" onClick={retryLast} disabled={isLoading}>
              <Repeat />
              Retry last
            </Button>
          </div>
        </div>

        {isLoading && (
          <Card className="p-3">
            <div className="flex items-center gap-3">
              <Loader2 className="size-5 animate-spin text-primary" />
              <p className="text-sm">{statusMessage}</p>
            </div>
          </Card>
        )}

        <Separator />

        {history.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Sparkles className="size-11 text-muted-foreground/40" />
            <h6 className="font-display font-semibold">Ask your first question</h6>
            <p className="text-sm text-muted-foreground max-w-md">
              Once you upload receipts, you can ask questions like &quot;What did I spend on coffee in October?&quot; or &quot;Show me my largest purchases last month.&quot;
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {history.map((entry) => (
              <Card key={entry.id} className="p-4">
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">You asked</p>
                  <p className="font-semibold">{entry.question}</p>
                  <Separator />
                  <p className="text-xs text-muted-foreground">Assistant</p>
                  <MarkdownRenderer>
                    {entry.answer || 'I could not generate an answer with the current receipts.'}
                  </MarkdownRenderer>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopy(entry.id, entry.answer || '')}
                          disabled={!entry.answer}
                          className={copiedEntryId === entry.id ? 'text-success' : ''}
                        >
                          <Copy className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy answer</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => regenerateAnswer(entry.id)}
                          disabled={isLoading}
                        >
                          <Repeat className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Regenerate answer</TooltipContent>
                    </Tooltip>
                  </div>
                  {entry.sources?.length === 0 && (
                    <Alert variant="info">
                      <AlertDescription>
                        No receipts matched this query. Try broadening the date range or removing filters.
                      </AlertDescription>
                    </Alert>
                  )}
                  {entry.sources?.length > 0 && (
                    <div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSources(entry.id)}
                        className="pl-0"
                      >
                        Sources ({entry.sources.length})
                        {expandedSources[entry.id] ? <ChevronUp /> : <ChevronDown />}
                      </Button>
                      {expandedSources[entry.id] && (
                        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 mt-1">
                          {entry.sources.map((source) => (
                            <SourceCard
                              key={`${entry.id}-${source.receiptId}`}
                              source={source}
                              onSelectReceipt={onSelectReceipt}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Card>
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
