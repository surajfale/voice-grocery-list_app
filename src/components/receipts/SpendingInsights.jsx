import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Card } from '../ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import groceryIntelligence from '../../services/groceryIntelligence.js';

const UNKNOWN_STORE = 'Unknown store';
const TOP_STORE_LIMIT = 8;
const TOP_CATEGORY_LIMIT = 8;

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

const SpendingInsights = ({ receipts, loading = false }) => {
  const [selectedStore, setSelectedStore] = useState('all');

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

  if (!loading && readyReceipts.length === 0) {
    return (
      <Card className="p-8 text-center">
        <h6 className="font-display font-semibold mb-1">No spending data yet</h6>
        <p className="text-sm text-muted-foreground">
          Upload receipts to see monthly trends and spend breakdowns by store and category.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <Select value={selectedStore} onValueChange={setSelectedStore}>
          <SelectTrigger className="min-w-[220px]">
            <SelectValue placeholder="Store" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stores</SelectItem>
            {storeOptions.map((store) => (
              <SelectItem key={store} value={store}>{store}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      <div className="grid sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total spent</p>
          <p className="font-display text-xl font-bold">{formatCurrency(totalSpent)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Avg per receipt</p>
          <p className="font-display text-xl font-bold">{formatCurrency(avgPerReceipt)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Top store</p>
          <p className="font-display text-xl font-bold truncate" title={topStore}>{topStore}</p>
        </Card>
      </div>

      <Card className="p-5">
        <h6 className="font-display font-semibold mb-3">
          Monthly spend trend{selectedStore !== 'all' ? ` — ${selectedStore}` : ''}
        </h6>
        {monthlyTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrend} margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => formatCurrency(value)} />
              <Line type="monotone" dataKey="total" name="Spend" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground">Not enough dated receipts to chart a trend yet.</p>
        )}
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h6 className="font-display font-semibold mb-3">Spend by store</h6>
          {storeTotals.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={storeTotals} layout="vertical" margin={{ left: 16, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                <YAxis dataKey="store" type="category" width={110} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="total" name="Total" fill="var(--success)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">No store data yet.</p>
          )}
        </Card>
        <Card className="p-5">
          <h6 className="font-display font-semibold mb-3">
            Spend by category{selectedStore !== 'all' ? ` — ${selectedStore}` : ''}
          </h6>
          {categoryTotals.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={categoryTotals} layout="vertical" margin={{ left: 16, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                <YAxis dataKey="category" type="category" width={130} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="total" name="Total" fill="var(--warning)" radius={[0, 6, 6, 0]} />
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
