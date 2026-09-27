import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { CloudUpload, Trash2, Image as ImageIcon, RefreshCw, ChevronLeft, ChevronRight, Loader2, ReceiptText } from 'lucide-react';
import useReceipts from '../hooks/useReceipts.js';
import ReceiptChatPanel from '../components/receipts/ReceiptChatPanel.jsx';
import SpendingInsights from '../components/receipts/SpendingInsights.jsx';
import { Card } from '../components/ui/card';
import { buttonVariants } from '../components/ui/button';
import { cn } from '../lib/utils';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { hueFromString } from '../utils/categoryStyles';
import { formatMoney } from '../utils/money';

const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/heic', 'image/heif'];

const statusVariantMap = {
  ready: 'secondary',
  processing: 'outline',
  error: 'destructive'
};

const ReceiptMetadata = ({ label, value }) => (
  <div className="rounded-xl bg-muted/70 px-3 py-2.5">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-semibold tabular-nums mt-0.5">{value ?? '—'}</p>
  </div>
);

/** Colored initial tile for a store; the hue is derived from the name. */
const StoreTile = ({ name, className = '' }) => {
  const label = (name || '?').trim();
  return (
    <span
      aria-hidden="true"
      className={`cat-tile cat-label rounded-xl flex items-center justify-center font-semibold shrink-0 ${className}`}
      style={{ '--cat-h': hueFromString(label.toLowerCase()) }}
    >
      {label.charAt(0).toUpperCase()}
    </span>
  );
};

StoreTile.propTypes = {
  name: PropTypes.string,
  className: PropTypes.string
};

ReceiptMetadata.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const formatted = value >= 10 || unitIndex === 0
    ? Math.round(value)
    : value.toFixed(1);

  return `${formatted} ${units[unitIndex]}`;
};

const RECEIPTS_PER_PAGE = 5;

const ReceiptsPage = ({ user }) => {
  const fileInputRef = useRef(null);
  const [localError, setLocalError] = useState('');
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState('receipts');
  const [isDragging, setIsDragging] = useState(false);

  const {
    receipts,
    selectedReceipt,
    selectedReceiptId,
    loading,
    uploading,
    error,
    clearError,
    uploadReceipt,
    deleteReceipt,
    selectReceipt,
    receiptImageUrl,
    reloadReceipts
  } = useReceipts(user);

  const displayError = localError || error;

  // Hero stats: this month's spend, receipt count and most-visited store
  const stats = useMemo(() => {
    const monthKey = dayjs().format('YYYY-MM');
    let monthTotal = 0;
    let currency;
    const visits = new Map();
    receipts.forEach((receipt) => {
      const when = dayjs(receipt.purchaseDate || receipt.createdAt);
      if (typeof receipt.total === 'number' && when.isValid() && when.format('YYYY-MM') === monthKey) {
        monthTotal += receipt.total;
        currency = currency || receipt.currency;
      }
      const store = receipt.merchant?.trim();
      if (store) {visits.set(store, (visits.get(store) || 0) + 1);}
    });
    const topStore = [...visits.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    return { monthTotal: formatMoney(monthTotal, currency), count: receipts.length, topStore };
  }, [receipts]);

  const pageCount = Math.max(1, Math.ceil(receipts.length / RECEIPTS_PER_PAGE));

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  const paginatedReceipts = useMemo(() => {
    const start = (page - 1) * RECEIPTS_PER_PAGE;
    return receipts.slice(start, start + RECEIPTS_PER_PAGE);
  }, [receipts, page]);

  const handleFiles = (fileList) => {
    const files = Array.from(fileList || []).filter(Boolean);
    if (!files.length) {
      return;
    }

    if (files.length > 10) {
      setLocalError('Please select 10 images or fewer per receipt.');
      return;
    }

    const invalidFile = files.find((file) => !ALLOWED_FILE_TYPES.includes(file.type));
    if (invalidFile) {
      setLocalError('Unsupported file type. Please upload PNG, JPG, WEBP, or HEIC images only.');
      return;
    }

    uploadReceipt(files);
  };

  const handleFileChange = (event) => {
    handleFiles(event.target.files);
    event.target.value = '';
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Hero: title + live stats on the accent gradient */}
      <div className="hero-gradient rounded-[28px] px-5 pt-5 pb-5">
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[30px] sm:text-4xl font-semibold tracking-tight leading-tight">Receipts</h1>
              <p className="text-sm mt-1 opacity-85">Upload receipt photos, then ask about your spending.</p>
            </div>
            <button
              type="button"
              onClick={reloadReceipts}
              disabled={loading}
              aria-label="Refresh receipts"
              title="Refresh"
              className="size-9 shrink-0 rounded-xl flex items-center justify-center border border-[color-mix(in_oklch,var(--primary-foreground)_25%,transparent)] bg-[color-mix(in_oklch,var(--primary-foreground)_14%,transparent)] hover:bg-[color-mix(in_oklch,var(--primary-foreground)_24%,transparent)] transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <dl className="grid grid-cols-3 gap-2 mt-5">
            {[
              { label: 'This month', value: stats.monthTotal },
              { label: 'Receipts', value: stats.count },
              { label: 'Top store', value: stats.topStore },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-2xl px-3 py-2.5 bg-[color-mix(in_oklch,var(--primary-foreground)_14%,transparent)] min-w-0"
              >
                <dt className="text-[11px] font-medium opacity-80">{label}</dt>
                <dd key={value} className="count-bump text-base sm:text-lg font-semibold tabular-nums truncate" title={String(value)}>
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {displayError && (
        <Alert variant="destructive" className="pr-10">
          <AlertDescription>{displayError}</AlertDescription>
          <button
            type="button"
            onClick={() => {
              setLocalError('');
              clearError();
            }}
            aria-label="Dismiss"
            className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-5">
        <TabsList className="self-start">
          <TabsTrigger value="receipts">Receipts</TabsTrigger>
          <TabsTrigger value="insights">Spending</TabsTrigger>
        </TabsList>

        <TabsContent value="insights">
          <SpendingInsights receipts={receipts} loading={loading} />
        </TabsContent>

        <TabsContent value="receipts" className="flex flex-col gap-5">
          {/* Upload drop zone */}
          <div
            role="region"
            aria-label="Receipt upload drop zone"
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              handleFiles(event.dataTransfer.files);
            }}
            className={`rounded-3xl border-2 border-dashed p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-[background-color,border-color,transform] duration-200 ${
              isDragging ? 'border-primary bg-primary/12 scale-[1.01]' : 'border-primary/30 bg-primary/5'
            }`}
          >
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="btn-gradient size-12 rounded-2xl flex items-center justify-center shrink-0">
                <CloudUpload className="size-6" />
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold">{isDragging ? 'Drop to upload' : 'Add a receipt'}</h2>
                <p className="text-sm text-muted-foreground mt-0.5 max-w-prose">
                  Drop up to 10 photos here. For a long receipt, pick them top to bottom and they&rsquo;re stitched into one.
                </p>
              </div>
            </div>
            <label
              className={cn(
                buttonVariants(),
                'w-full sm:w-auto shrink-0 shadow-[0_10px_24px_-10px_color-mix(in_oklch,var(--primary)_80%,transparent)]',
                uploading ? 'opacity-50 pointer-events-none cursor-not-allowed' : 'cursor-pointer'
              )}
            >
              {uploading ? <Loader2 className="animate-spin" /> : <CloudUpload />}
              {uploading ? 'Uploading…' : 'Upload photos'}
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={uploading}
              />
            </label>
          </div>

          <div className="grid md:grid-cols-5 gap-5">
            {/* History */}
            <section aria-labelledby="receipt-history" className="md:col-span-2">
              <div className="flex justify-between items-center px-1 mb-2.5">
                <h2 id="receipt-history" className="section-label">History</h2>
                {loading && <Loader2 className="size-4 animate-spin text-primary" />}
              </div>

              {receipts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border text-center py-12 px-6">
                  <ReceiptText className="size-8 text-muted-foreground/60 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Upload your first receipt to get started.</p>
                </div>
              ) : (
                <ul className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
                  {paginatedReceipts.map((receipt, index) => {
                    const isSelected = receipt._id === selectedReceiptId;
                    const name = receipt.merchant || receipt.originalFilename || 'Unknown merchant';
                    return (
                      <li
                        key={receipt._id}
                        className="rise-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => selectReceipt(receipt._id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              selectReceipt(receipt._id);
                            }
                          }}
                          aria-current={isSelected ? 'true' : undefined}
                          className={`group relative flex items-center gap-3 px-3.5 py-3 cursor-pointer transition-colors ${
                            isSelected ? 'bg-primary/8' : 'hover:bg-accent/60'
                          }`}
                        >
                          {isSelected && <span aria-hidden="true" className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary" />}
                          <StoreTile name={name} className="size-10 text-base" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[15px] font-medium truncate">
                              {name}{receipt.pageCount > 1 ? ` · ${receipt.pageCount} pages` : ''}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-xs text-muted-foreground tabular-nums">{receipt.purchaseDate || 'No date'}</span>
                              {receipt.status !== 'ready' && (
                                <Badge variant={statusVariantMap[receipt.status] || 'outline'} className="capitalize">
                                  {receipt.status}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <span className="text-sm font-semibold tabular-nums">{formatMoney(receipt.total, receipt.currency)}</span>
                          <button
                            type="button"
                            aria-label={`Delete receipt from ${name}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              deleteReceipt(receipt._id);
                            }}
                            className="p-1.5 -mr-1 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {pageCount > 1 && (
                <div className="flex justify-center items-center gap-3 mt-3">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="Previous page"
                    className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-40"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <span className="text-xs text-muted-foreground tabular-nums">{page} / {pageCount}</span>
                  <button
                    type="button"
                    disabled={page >= pageCount}
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    aria-label="Next page"
                    className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-40"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              )}
            </section>

            {/* Details */}
            <Card className="md:col-span-3 p-5 rounded-2xl min-h-[360px] gap-0">
              {selectedReceipt ? (
                <div key={selectedReceipt._id} className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-1 duration-300">
                  <div className="flex items-center gap-3">
                    <StoreTile name={selectedReceipt.merchant || 'Unknown'} className="size-12 text-lg" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xl font-semibold tracking-tight truncate">{selectedReceipt.merchant || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground tabular-nums">{selectedReceipt.purchaseDate || 'No date'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold tracking-tight tabular-nums">
                        {formatMoney(selectedReceipt.total, selectedReceipt.currency)}
                      </p>
                      {selectedReceipt.status !== 'ready' && (
                        <Badge variant={statusVariantMap[selectedReceipt.status] || 'outline'} className="capitalize mt-1">
                          {selectedReceipt.status}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <ReceiptMetadata label="Items" value={selectedReceipt.items?.length || 0} />
                    <ReceiptMetadata label="Pages" value={selectedReceipt.pageCount || 1} />
                    <ReceiptMetadata label="Purchased" value={selectedReceipt.purchaseDate ? dayjs(selectedReceipt.purchaseDate).format('MMM D') : '—'} />
                  </div>

                  {selectedReceipt.items?.length > 0 && (
                    <div>
                      <p className="section-label mb-2 px-1">Items</p>
                      <ul className="rounded-xl border border-border divide-y divide-border max-h-52 overflow-y-auto">
                        {selectedReceipt.items.map((item, index) => (
                          <li key={`${selectedReceipt._id}-${item.name}-${index}`} className="flex justify-between gap-3 px-3.5 py-2.5 text-sm">
                            <span className="min-w-0 truncate">
                              {item.name}
                              {item.quantity > 1 && <span className="text-muted-foreground"> ×{item.quantity}</span>}
                            </span>
                            <span className="font-medium tabular-nums">
                              {typeof item.price === 'number' ? formatMoney(item.price, item.currency || selectedReceipt.currency) : '—'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedReceipt.sourceImages?.length > 1 && (
                    <div>
                      <p className="section-label mb-2 px-1">Uploaded images</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedReceipt.sourceImages.map((image, index) => (
                          <Badge key={`${selectedReceipt._id}-source-${image.filename || index}`} variant="outline">
                            {image.filename || `Image ${index + 1}`} {formatBytes(image.size) ? `(${formatBytes(image.size)})` : ''}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div className="flex flex-col md:flex-row gap-3">
                    {receiptImageUrl(selectedReceipt._id) && (
                      <div className="flex-1 rounded-xl border border-border overflow-hidden max-h-80 flex items-center justify-center bg-muted/50">
                        <img
                          src={receiptImageUrl(selectedReceipt._id)}
                          alt={`Receipt from ${selectedReceipt.merchant || 'unknown store'}`}
                          className="w-full h-full object-contain"
                          // Missing/expired image: drop the box rather than show a broken icon
                          onError={(event) => { event.currentTarget.parentElement.hidden = true; }}
                        />
                      </div>
                    )}
                    <div className="flex-1 rounded-xl bg-muted/50 p-3 max-h-80 overflow-y-auto">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <ImageIcon className="size-4 text-muted-foreground" />
                        <p className="text-sm font-medium">Scanned text</p>
                      </div>
                      <p className="text-xs font-mono whitespace-pre-wrap text-muted-foreground">
                        {selectedReceipt.rawText || 'No OCR output yet.'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-10">
                  <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                    <ReceiptText className="size-7" />
                  </div>
                  <p className="font-medium mb-1">Select a receipt</p>
                  <p className="text-sm text-muted-foreground">
                    Its line items, totals and scanned text show up here.
                  </p>
                </div>
              )}
            </Card>
          </div>

          <ReceiptChatPanel
            userId={user._id}
            receipts={receipts}
            onSelectReceipt={selectReceipt}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

ReceiptsPage.propTypes = {
  user: PropTypes.shape({
    _id: PropTypes.string.isRequired
  }).isRequired
};

export default ReceiptsPage;
