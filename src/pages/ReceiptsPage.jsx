import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { CloudUpload, Trash2, FileText, Image as ImageIcon, RefreshCw, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import useReceipts from '../hooks/useReceipts.js';
import ReceiptChatPanel from '../components/receipts/ReceiptChatPanel.jsx';
import SpendingInsights from '../components/receipts/SpendingInsights.jsx';
import { Card } from '../components/ui/card';
import { Button, buttonVariants } from '../components/ui/button';
import { cn } from '../lib/utils';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';

const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/heic', 'image/heif'];

const statusVariantMap = {
  ready: 'default',
  processing: 'outline',
  error: 'destructive'
};

const ReceiptMetadata = ({ label, value }) => (
  <div>
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="font-semibold">{value ?? '—'}</p>
  </div>
);

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
    <div className="flex flex-col gap-4">
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="receipts">Receipts</TabsTrigger>
          <TabsTrigger value="insights">Spending Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="insights">
          <SpendingInsights receipts={receipts} loading={loading} />
        </TabsContent>

        <TabsContent value="receipts" className="flex flex-col gap-4">
          <Card
            className="p-5 border-2 border-dashed flex flex-wrap items-center justify-between gap-4"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              handleFiles(event.dataTransfer.files);
            }}
          >
            <div>
              <h6 className="font-display font-semibold mb-1">Upload grocery receipt</h6>
              <p className="text-sm text-muted-foreground">
                Drop one or more receipt photos (max 10) or choose files to have them stitched, OCR&rsquo;d, and added to your history.
              </p>
              <p className="text-xs text-muted-foreground">
                Tip: Select images in order from top to bottom—the server will stitch them vertically into a single receipt.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={reloadReceipts} disabled={loading}>
                <RefreshCw />
                Refresh
              </Button>
              <label
                className={cn(
                  buttonVariants(),
                  uploading ? 'opacity-50 pointer-events-none cursor-not-allowed' : 'cursor-pointer'
                )}
              >
                <CloudUpload />
                {uploading ? 'Uploading...' : 'Choose Image(s)'}
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
          </Card>

          <div className="grid md:grid-cols-3 gap-4">
            <Card className="p-4 min-h-[420px] md:col-span-1">
              <div className="flex justify-between items-center mb-3">
                <h6 className="font-display font-semibold">Receipts</h6>
                {loading && <Loader2 className="size-4 animate-spin text-primary" />}
              </div>

              {receipts.length === 0 ? (
                <div className="text-center py-10">
                  <FileText className="size-9 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Upload your first receipt to get started.</p>
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {paginatedReceipts.map((receipt) => (
                    <li key={receipt._id}>
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
                        className={`flex items-center gap-3 rounded-xl border p-2.5 cursor-pointer transition-colors ${
                          receipt._id === selectedReceiptId ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
                        }`}
                      >
                        <div className="size-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <FileText className="size-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {receipt.merchant || receipt.originalFilename
                              ? `${receipt.merchant || receipt.originalFilename}${receipt.pageCount > 1 ? ` (${receipt.pageCount} pages)` : ''}`
                              : 'Unknown merchant'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-muted-foreground">{receipt.purchaseDate || 'No date'}</span>
                            <Badge variant={statusVariantMap[receipt.status] || 'outline'} className="capitalize">
                              {receipt.status}
                            </Badge>
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-label="delete receipt"
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteReceipt(receipt._id);
                          }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {pageCount > 1 && (
                <div className="flex justify-center items-center gap-3 mt-4">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-40"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <span className="text-xs text-muted-foreground">{page} / {pageCount}</span>
                  <button
                    type="button"
                    disabled={page >= pageCount}
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-40"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              )}
            </Card>

            <Card className="p-5 min-h-[420px] md:col-span-2">
              {selectedReceipt ? (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-muted-foreground">Merchant</p>
                      <p className="font-display text-xl font-bold">{selectedReceipt.merchant || 'Unknown'}</p>
                    </div>
                    <Badge variant={statusVariantMap[selectedReceipt.status] || 'outline'} className="capitalize">
                      {selectedReceipt.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <ReceiptMetadata label="Purchase Date" value={selectedReceipt.purchaseDate} />
                    <ReceiptMetadata
                      label="Total"
                      value={selectedReceipt.total ? `${selectedReceipt.currency || '$'}${selectedReceipt.total}` : '—'}
                    />
                    <ReceiptMetadata label="Items detected" value={selectedReceipt.items?.length || 0} />
                    <ReceiptMetadata label="Pages combined" value={selectedReceipt.pageCount || 1} />
                  </div>

                  {selectedReceipt.items?.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold mb-1.5">Items</p>
                      <div className="rounded-xl border border-border max-h-44 overflow-y-auto">
                        <ul className="divide-y divide-border">
                          {selectedReceipt.items.map((item) => (
                            <li key={`${selectedReceipt._id}-${item.name}`} className="flex justify-between px-3 py-2 text-sm">
                              <span>{item.name}</span>
                              <span className="text-muted-foreground">
                                {item.price ? `${item.currency || selectedReceipt.currency || '$'}${item.price}` : '—'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {selectedReceipt.sourceImages?.length > 1 && (
                    <div>
                      <p className="text-sm font-semibold mb-1.5">Uploaded images</p>
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
                      <div className="flex-1 rounded-xl border border-border overflow-hidden max-h-80 flex items-center justify-center bg-background">
                        <img
                          src={receiptImageUrl(selectedReceipt._id)}
                          alt="Receipt"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    <div className="flex-1 rounded-xl border border-border p-3 max-h-80 overflow-y-auto">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <ImageIcon className="size-4 text-muted-foreground" />
                        <p className="text-sm font-semibold">OCR Text</p>
                      </div>
                      <p className="text-sm font-mono whitespace-pre-wrap">
                        {selectedReceipt.rawText || 'No OCR output yet.'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10">
                  <ImageIcon className="size-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="font-display font-semibold mb-1">Select a receipt to view details</p>
                  <p className="text-sm text-muted-foreground">
                    Choose a receipt from the list to see OCR output, metadata, and line items.
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
