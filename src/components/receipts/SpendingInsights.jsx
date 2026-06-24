import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import {
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
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

const SpendingInsights = ({ receipts, loading }) => {
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
      <Paper sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          No spending data yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Upload receipts to see monthly trends and spend breakdowns by store and category.
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={3}>
      <Paper sx={{ p: 2, borderRadius: 3 }}>
        <TextField
          select
          label="Store"
          size="small"
          value={selectedStore}
          onChange={(event) => setSelectedStore(event.target.value)}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="all">All stores</MenuItem>
          {storeOptions.map((store) => (
            <MenuItem key={store} value={store}>
              {store}
            </MenuItem>
          ))}
        </TextField>
      </Paper>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="caption" color="text.secondary">Total spent</Typography>
            <Typography variant="h5" fontWeight={700}>{formatCurrency(totalSpent)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="caption" color="text.secondary">Avg per receipt</Typography>
            <Typography variant="h5" fontWeight={700}>{formatCurrency(avgPerReceipt)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="caption" color="text.secondary">Top store</Typography>
            <Typography variant="h5" fontWeight={700} noWrap title={topStore}>{topStore}</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" gutterBottom>
          Monthly spend trend{selectedStore !== 'all' ? ` — ${selectedStore}` : ''}
        </Typography>
        {monthlyTrend.length > 0 ? (
          <LineChart
            height={300}
            xAxis={[{ scaleType: 'point', data: monthlyTrend.map((entry) => entry.month) }]}
            series={[{ data: monthlyTrend.map((entry) => entry.total), label: 'Spend', color: '#6366F1' }]}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            Not enough dated receipts to chart a trend yet.
          </Typography>
        )}
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Spend by store
            </Typography>
            {storeTotals.length > 0 ? (
              <BarChart
                height={320}
                layout="horizontal"
                yAxis={[{ scaleType: 'band', data: storeTotals.map((entry) => entry.store) }]}
                series={[{ data: storeTotals.map((entry) => entry.total), label: 'Total', color: '#22C55E' }]}
                margin={{ left: 110 }}
              />
            ) : (
              <Typography variant="body2" color="text.secondary">No store data yet.</Typography>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Spend by category{selectedStore !== 'all' ? ` — ${selectedStore}` : ''}
            </Typography>
            {categoryTotals.length > 0 ? (
              <BarChart
                height={320}
                layout="horizontal"
                yAxis={[{ scaleType: 'band', data: categoryTotals.map((entry) => entry.category) }]}
                series={[{ data: categoryTotals.map((entry) => entry.total), label: 'Total', color: '#F59E0B' }]}
                margin={{ left: 130 }}
              />
            ) : (
              <Typography variant="body2" color="text.secondary">
                No itemized prices detected yet for this selection.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Stack>
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

SpendingInsights.defaultProps = {
  loading: false
};

export default SpendingInsights;
