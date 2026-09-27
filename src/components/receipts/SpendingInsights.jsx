import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Wallet, ReceiptText, Store, Share2, Download } from 'lucide-react';
import { Card } from '../ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import groceryIntelligence from '../../services/groceryIntelligence.js';
import { getCategoryStyle, hueFromString } from '../../utils/categoryStyles';
import SpendingExportCard, { toCategoryRow, toStoreRow } from './SpendingExportCard.jsx';
import { renderImage, saveBlob, shareImage } from '../../utils/downloadList';
import { formatMoney } from '../../utils/money';

// Mid lightness/chroma reads well on both light and dark chart backgrounds
const barColor = (hue) => `oklch(0.68 0.14 ${hue})`;

const UNKNOWN_STORE = 'Unknown store';
const TOP_STORE_LIMIT = 8;
const TOP_CATEGORY_LIMIT = 8;
const SHARE_STORE_LIMIT = 4;
const SHARE_CATEGORY_LIMIT = 5;
const SHARE_TREND_MONTHS = 6;

const formatCurrency = (value, currency = '$') => `${currency}${value.toFixed(2)}`;

const getMonthKey = (receipt) => {
  const source = receipt.purchaseDate || receipt.createdAt;
  const parsed = dayjs(source);
  return parsed.isValid() ? parsed.format('YYYY-MM') : 'Unknown';
};

const getStoreName = (receipt) => receipt.merchant?.trim() || UNKNOWN_STORE;

const chartTooltipStyle = {
  backgroundColor: 'var(--popover)',
  color: 'var(--popover-foreground)',
  border: '1px solid var(--border)',
  borderRadius: '0.75rem',
  fontSize: '0.8rem',
};

const sumBy = (entries, keyOf, valueOf) => {
  const totals = new Map();
  entries.forEach((entry) => {
    const key = keyOf(entry);
    if (key) { totals.set(key, (totals.get(key) || 0) + valueOf(entry)); }
  });
  return [...totals.entries()].sort((a, b) => b[1] - a[1]);
};

const SpendingInsights = ({ receipts, loading = false }) => {
  const [selectedStore, setSelectedStore] = useState('all');
  const exportCardRef = useRef(null);
  const pendingExportRef = useRef(null);

  const readyReceipts = useMemo(
    () => receipts.filter((receipt) => typeof receipt.total === 'number'),
    [receipts]
  );

  const storeOptions = useMemo(() => {
    const totals = new Map();
    readyReceipts.forEach((receipt) => {
      const store = getStoreName(receipt);
      totals.set(store, (totals.get(store) || 0) + receipt.total);
    });
    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([store]) => store);
  }, [readyReceipts]);

  const filteredReceipts = useMemo(() => {
    if (selectedStore === 'all') {
      return readyReceipts;
    }
    return readyReceipts.filter((receipt) => getStoreName(receipt) === selectedStore);
  }, [readyReceipts, selectedStore]);

  const totalSpent = useMemo(
    () => filteredReceipts.reduce((sum, receipt) => sum + receipt.total, 0),
    [filteredReceipts]
  );

  const receiptCount = filteredReceipts.length;
  const avgPerReceipt = receiptCount > 0 ? totalSpent / receiptCount : 0;
  const topStore = storeOptions[0] || '—';

  const monthlyTrend = useMemo(() => {
    const totals = new Map();
    filteredReceipts.forEach((receipt) => {
      const month = getMonthKey(receipt);
      totals.set(month, (totals.get(month) || 0) + receipt.total);
    });
    return Array.from(totals.entries())
      .filter(([month]) => month !== 'Unknown')
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, total]) => ({ month, total: Math.round(total * 100) / 100 }));
  }, [filteredReceipts]);

  const storeTotals = useMemo(() => {
    const totals = new Map();
    readyReceipts.forEach((receipt) => {
      const store = getStoreName(receipt);
      totals.set(store, (totals.get(store) || 0) + receipt.total);
    });
    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_STORE_LIMIT)
      .map(([store, total]) => ({ store, total: Math.round(total * 100) / 100 }));
  }, [readyReceipts]);

  const categoryTotals = useMemo(() => {
    const totals = new Map();
    filteredReceipts.forEach((receipt) => {
      (receipt.items || []).forEach((item) => {
        if (typeof item.price !== 'number' || !item.name) {
          return;
        }
        const category = groceryIntelligence.categorizeItem(item.name) || 'Other';
        totals.set(category, (totals.get(category) || 0) + item.price);
      });
    });
    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_CATEGORY_LIMIT)
      .map(([category, total]) => ({ category, total: Math.round(total * 100) / 100 }));
  }, [filteredReceipts]);

  // Shareable summary of the most recent month with receipts (respects the
  // store filter)
  const shareSummary = useMemo(() => {
    if (!monthlyTrend.length) { return null; }
    const month = monthlyTrend[monthlyTrend.length - 1].month;
    const inMonth = filteredReceipts.filter((receipt) => getMonthKey(receipt) === month);
    const total = inMonth.reduce((sum, receipt) => sum + receipt.total, 0);

    const previousMonth = dayjs(`${month}-01`).subtract(1, 'month').format('YYYY-MM');
    const previousTotal = monthlyTrend.find((point) => point.month === previousMonth)?.total;
    const changePct = previousTotal ? Math.round(((total - previousTotal) / previousTotal) * 100) : null;

    const byMonth = new Map(monthlyTrend.map((point) => [point.month, point.total]));
    const trend = Array.from({ length: SHARE_TREND_MONTHS }, (_, index) => {
      const key = dayjs(`${month}-01`).subtract(SHARE_TREND_MONTHS - 1 - index, 'month').format('YYYY-MM');
      return { month: key, total: byMonth.get(key) || 0 };
    });

    const items = inMonth.flatMap((receipt) => receipt.items || []).filter((item) => item?.name && typeof item.price === 'number');
    return {
      month,
      total,
      currency: inMonth.find((receipt) => receipt.currency)?.currency,
      count: inMonth.length,
      changePct,
      trend,
      stores: sumBy(inMonth, getStoreName, (receipt) => receipt.total).slice(0, SHARE_STORE_LIMIT).map(toStoreRow),
      categories: sumBy(items, (item) => groceryIntelligence.categorizeItem(item.name) || 'Other', (item) => item.price)
        .filter(([, value]) => value > 0)
        // "Other" says nothing on a shared card; keep it, but after real categories
        .sort((a, b) => Number(a[0] === 'Other') - Number(b[0] === 'Other'))
        .slice(0, SHARE_CATEGORY_LIMIT)
        .map(toCategoryRow),
    };
  }, [monthlyTrend, filteredReceipts]);

  const storeFilterLabel = selectedStore === 'all' ? null : selectedStore;
  const exportKey = shareSummary ? JSON.stringify([shareSummary, storeFilterLabel]) : null;

  // Pre-render so Share runs within the tap's user activation (iOS Safari)
  useEffect(() => {
    pendingExportRef.current = null;
    if (!exportKey) { return undefined; }
    const timer = setTimeout(() => {
      if (exportCardRef.current) {
        pendingExportRef.current = renderImage(exportCardRef.current);
        pendingExportRef.current.catch(() => {});
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [exportKey]);

  const getSummaryImage = () => {
    if (!pendingExportRef.current && exportCardRef.current) {
      pendingExportRef.current = renderImage(exportCardRef.current);
    }
    return pendingExportRef.current;
  };

  const summaryFileName = () => `spending-${shareSummary.month}${storeFilterLabel ? `-${storeFilterLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}` : ''}.png`;

  const handleShareSummary = async () => {
    const image = getSummaryImage();
    if (!image || !shareSummary) { return; }
    const monthLabel = dayjs(`${shareSummary.month}-01`).format('MMMM YYYY');
    try {
      const result = await shareImage(image, {
        fileName: summaryFileName(),
        title: `Spending · ${monthLabel}`,
        text: [
          `Spending · ${monthLabel}${storeFilterLabel ? ` · ${storeFilterLabel}` : ''}: ${formatMoney(shareSummary.total, shareSummary.currency)} across ${shareSummary.count} receipt${shareSummary.count === 1 ? '' : 's'}`,
          ...shareSummary.stores.map((row) => `• ${row.label}: ${formatMoney(row.total, shareSummary.currency)}`),
        ].join('\n'),
      });
      if (result === 'downloaded') { toast.success('Sharing isn’t available here, so the image was downloaded'); }
    } catch {
      toast.error('Couldn’t share the summary. Try downloading it instead.');
    }
  };

  const handleDownloadSummary = async () => {
    const image = getSummaryImage();
    if (!image || !shareSummary) { return; }
    try {
      saveBlob(await image, summaryFileName());
      toast.success('Summary image downloaded');
    } catch {
      toast.error('Couldn’t create the summary image. Please try again.');
    }
  };

  if (!loading && readyReceipts.length === 0) {
    return (
      <Card className="p-8 text-center rounded-2xl">
        <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
          <Wallet className="size-7" />
        </div>
        <h6 className="font-semibold mb-1">No spending data yet</h6>
        <p className="text-sm text-muted-foreground">
          Upload receipts to see monthly trends and spend breakdowns by store and category.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={selectedStore} onValueChange={setSelectedStore}>
          <SelectTrigger className="min-w-[220px] rounded-xl" aria-label="Filter by store">
            <SelectValue placeholder="Store" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stores</SelectItem>
            {storeOptions.map((store) => (
              <SelectItem key={store} value={store}>{store}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {shareSummary && (
          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              onClick={handleShareSummary}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl btn-gradient text-sm font-medium transition-transform active:scale-[0.97]"
              style={{ boxShadow: 'none' }}
            >
              <Share2 className="size-4" />
              Share summary
            </button>
            <button
              type="button"
              onClick={handleDownloadSummary}
              aria-label="Download summary image"
              title="Download summary image"
              className="size-9 rounded-xl border border-border bg-card flex items-center justify-center hover:bg-accent transition-[background-color,transform] active:scale-[0.97]"
            >
              <Download className="size-4" />
            </button>
          </div>
        )}
      </div>

      {/* Hidden export card for Share / Download */}
      {shareSummary && (
        <div className="absolute -left-[9999px] top-0" aria-hidden="true">
          <SpendingExportCard ref={exportCardRef} summary={shareSummary} storeFilter={storeFilterLabel} />
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-3">
        {[
          { label: 'Total spent', value: formatCurrency(totalSpent), Icon: Wallet, hue: 150 },
          { label: 'Avg per receipt', value: formatCurrency(avgPerReceipt), Icon: ReceiptText, hue: 250 },
          { label: 'Top store', value: topStore, Icon: Store, hue: 40 },
        ].map(({ label, value, Icon, hue }, index) => (
          <Card
            key={label}
            className="p-4 rounded-2xl flex-row items-center gap-3 rise-in"
            style={{ '--cat-h': hue, animationDelay: `${index * 60}ms` }}
          >
            <span className="cat-tile cat-label size-11 rounded-xl flex items-center justify-center shrink-0">
              <Icon className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-semibold tracking-tight tabular-nums truncate" title={String(value)}>{value}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5 rounded-2xl gap-0">
        <h6 className="font-medium mb-3">
          Monthly spend trend{selectedStore !== 'all' ? ` — ${selectedStore}` : ''}
        </h6>
        {monthlyTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyTrend} margin={{ left: 8, right: 16, top: 8 }}>
              <defs>
                <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => formatCurrency(value)} />
              <Area
                type="monotone"
                dataKey="total"
                name="Spend"
                stroke="var(--primary)"
                strokeWidth={2.5}
                fill="url(#spendFill)"
                dot={{ r: 4, fill: 'var(--card)', stroke: 'var(--primary)', strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground">Not enough dated receipts to chart a trend yet.</p>
        )}
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5 rounded-2xl gap-0">
          <h6 className="font-medium mb-3">Spend by store</h6>
          {storeTotals.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={storeTotals} layout="vertical" margin={{ left: 16, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                <YAxis dataKey="store" type="category" width={110} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="total" name="Total" radius={[0, 8, 8, 0]}>
                  {storeTotals.map(({ store }) => (
                    <Cell key={store} fill={barColor(hueFromString(store.toLowerCase()))} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">No store data yet.</p>
          )}
        </Card>
        <Card className="p-5 rounded-2xl gap-0">
          <h6 className="font-medium mb-3">
            Spend by category{selectedStore !== 'all' ? ` — ${selectedStore}` : ''}
          </h6>
          {categoryTotals.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={categoryTotals} layout="vertical" margin={{ left: 16, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                <YAxis
                  dataKey="category"
                  type="category"
                  width={140}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  tickFormatter={(category) => `${getCategoryStyle(category).emoji} ${category}`}
                />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="total" name="Total" radius={[0, 8, 8, 0]}>
                  {categoryTotals.map(({ category }) => (
                    <Cell key={category} fill={barColor(getCategoryStyle(category).hue)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">No itemized prices detected yet for this selection.</p>
          )}
        </Card>
      </div>
    </div>
  );
};

SpendingInsights.propTypes = {
  receipts: PropTypes.arrayOf(PropTypes.shape({
    merchant: PropTypes.string,
    purchaseDate: PropTypes.string,
    createdAt: PropTypes.string,
    total: PropTypes.number,
    items: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string,
      price: PropTypes.number
    }))
  })).isRequired,
  loading: PropTypes.bool
};

export default SpendingInsights;
