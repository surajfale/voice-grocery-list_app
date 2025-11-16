import PropTypes from 'prop-types';
import { useCallback, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import {
  AutoAwesome as AutoAwesomeIcon,
  ContentCopy as ContentCopyIcon,
  FilterAlt as FilterAltIcon,
  History as HistoryIcon,
  OpenInNew as OpenInNewIcon,
  Refresh as RefreshIcon,
  Replay as ReplayIcon
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateRangePicker } from '@mui/x-date-pickers/DateRangePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import useReceiptChat from '../../hooks/useReceiptChat.js';

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
  >
    {children}
  </ReactMarkdown>
);

MarkdownRenderer.propTypes = {
  children: PropTypes.string.isRequired
};

const SourceCard = ({ source, onSelectReceipt }) => (
  <Paper
    variant="outlined"
    sx={{
      p: 2,
      borderRadius: 2,
      transition: 'border-color 0.2s ease',
      cursor: onSelectReceipt ? 'pointer' : 'default',
      '&:hover': {
        borderColor: onSelectReceipt ? 'primary.main' : 'divider'
      }
    }}
    onClick={() => {
      if (onSelectReceipt && source.receiptId) {
        onSelectReceipt(source.receiptId);
      }
    }}
  >
    <Stack spacing={0.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="subtitle2">
          {source.merchant || 'Unknown merchant'}
        </Typography>
        {typeof source.score === 'number' && (
          <Chip
            size="small"
            label={`Score ${(source.score * 100).toFixed(0)}%`}
            color="primary"
            variant="outlined"
          />
        )}
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {source.purchaseDate || 'No date available'}
      </Typography>
      {typeof source.total === 'number' && (
        <Typography variant="body2">
          Total: ${source.total.toFixed(2)}
        </Typography>
      )}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
        <Tooltip title="Open receipt">
          <IconButton
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              if (onSelectReceipt && source.receiptId) {
                onSelectReceipt(source.receiptId);
              }
            }}
          >
            <OpenInNewIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
        <Typography variant="caption" color="text.secondary">
          Receipt ID: {source.receiptId}
        </Typography>
      </Stack>
    </Stack>
  </Paper>
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

SourceCard.defaultProps = {
  onSelectReceipt: null
};

const ReceiptChatPanel = ({ userId, receipts, onSelectReceipt }) => {
  const [copiedEntryId, setCopiedEntryId] = useState(null);
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
    topK,
    setTopK,
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

  const canSubmit = question.trim().length >= 3 && !isLoading && isOnline;

  return (
    <Paper sx={{ p: 3, borderRadius: 3 }}>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center">
            <AutoAwesomeIcon color="primary" />
            <Typography variant="h6">AI Insights</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon fontSize="small" />
            {networkStatusMessage}
          </Typography>
        </Stack>

        {!isOnline && (
          <Alert severity="warning">
            You appear to be offline. Connect to the internet to chat about your receipts.
          </Alert>
        )}

        {error && (
          <Alert
            severity="error"
            action={(
              <Stack direction="row" spacing={1}>
                <Button color="inherit" size="small" onClick={retryLast} startIcon={<RefreshIcon fontSize="small" />}>
                  Retry
                </Button>
                <Button color="inherit" size="small" onClick={clearError}>
                  Dismiss
                </Button>
              </Stack>
            )}
          >
            {error}
          </Alert>
        )}

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <FilterAltIcon color="action" />
              <Typography variant="subtitle2">Filters</Typography>
            </Stack>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateRangePicker
                value={dateRange}
                onChange={(newRange) => setDateRange(newRange)}
                disableFuture
                slotProps={{
                  textField: {
                    size: 'small',
                    helperText: 'Limit the date range for retrieval',
                    fullWidth: true
                  }
                }}
              />
            </LocalizationProvider>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  multiple
                  options={merchantOptions}
                  value={selectedMerchants}
                  onChange={(_event, value) => setSelectedMerchants(value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Merchants"
                      placeholder="Filter by merchant"
                      size="small"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  multiple
                  options={receiptOptions}
                  value={selectedReceiptOptions}
                  onChange={(_event, newValue) => setSelectedReceiptIds(newValue.map((option) => option.id))}
                  getOptionLabel={(option) => option.label}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Receipt IDs"
                      placeholder="Select specific receipts"
                      size="small"
                    />
                  )}
                />
              </Grid>
            </Grid>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <TextField
                label="Top K"
                type="number"
                size="small"
                value={topK}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isNaN(value)) {
                    setTopK(5);
                  } else {
                    setTopK(Math.min(Math.max(value, 1), 15));
                  }
                }}
                inputProps={{ min: 1, max: 15 }}
                helperText="How many chunks to retrieve"
                sx={{ width: 160 }}
              />
              <Box sx={{ flexGrow: 1 }} />
              {hasActiveFilters && (
                <Button color="inherit" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </Stack>
            {activeFilterChips.length > 0 && (
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {activeFilterChips.map((chip) => (
                  <Chip
                    key={chip.key}
                    label={chip.label}
                    onDelete={() => handleChipDelete(chip)}
                    sx={{ mb: 1 }}
                  />
                ))}
              </Stack>
            )}
          </Stack>
        </Paper>

        <Stack spacing={2}>
          <TextField
            label="Ask a question about your receipts"
            placeholder="e.g. How much did I spend on produce last month?"
            multiline
            minRows={3}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              variant="contained"
              onClick={handleAsk}
              disabled={!canSubmit}
              startIcon={isLoading ? <CircularProgress size={18} /> : <AutoAwesomeIcon />}
            >
              {isLoading ? statusMessage : 'Ask'}
            </Button>
            <Button
              variant="outlined"
              onClick={retryLast}
              startIcon={<ReplayIcon />}
              disabled={isLoading}
            >
              Retry last
            </Button>
          </Stack>
        </Stack>

        {isLoading && (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <CircularProgress size={24} />
              <Typography variant="body2">{statusMessage}</Typography>
            </Stack>
          </Paper>
        )}

        <Divider />

        {history.length === 0 ? (
          <Stack spacing={2} alignItems="center" sx={{ py: 6 }}>
            <AutoAwesomeIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
            <Typography variant="h6">Ask your first question</Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              Once you upload receipts, you can ask questions like &quot;What did I spend on coffee in October?&quot; or &quot;Show me my largest purchases last month.&quot;
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={2}>
            {history.map((entry) => (
              <Paper key={entry.id} variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Stack spacing={1.5}>
                  <Typography variant="caption" color="text.secondary">
                    You asked
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {entry.question}
                  </Typography>
                  <Divider />
                  <Typography variant="caption" color="text.secondary">
                    Assistant
                  </Typography>
                  <MarkdownRenderer>
                    {entry.answer || 'I could not generate an answer with the current receipts.'}
                  </MarkdownRenderer>
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="Copy answer">
                      <span>
                        <IconButton
                          onClick={() => handleCopy(entry.id, entry.answer || '')}
                          disabled={!entry.answer}
                          size="small"
                        >
                          <ContentCopyIcon fontSize="inherit" color={copiedEntryId === entry.id ? 'success' : 'inherit'} />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Regenerate answer">
                      <span>
                        <IconButton
                          onClick={() => regenerateAnswer(entry.id)}
                          disabled={isLoading}
                          size="small"
                        >
                          <ReplayIcon fontSize="inherit" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                  {entry.sources?.length === 0 && (
                    <Alert severity="info">
                      No receipts matched this query. Try broadening the date range or removing filters.
                    </Alert>
                  )}
                  {entry.sources?.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Sources
                      </Typography>
                      <Grid container spacing={2}>
                        {entry.sources.map((source) => (
                          <Grid item xs={12} sm={6} md={4} key={`${entry.id}-${source.receiptId}`}>
                            <SourceCard source={source} onSelectReceipt={onSelectReceipt} />
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Stack>
    </Paper>
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

ReceiptChatPanel.defaultProps = {
  onSelectReceipt: null
};

export default ReceiptChatPanel;

