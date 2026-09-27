import React from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { useThemeContext, colorThemes } from '../../contexts/ThemeContext';
import { getCategoryStyle, hueFromString } from '../../utils/categoryStyles';
import { formatMoney } from '../../utils/money';

// Light-only palette, matching the other export cards
const INK = '#1c1917';
const MUTED = '#78716c';
const LINE = '#ece9e6';
const FONT = '"Geist Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const gradient = (accent) =>
  `linear-gradient(135deg, ${accent} 0%, color-mix(in oklch, ${accent} 58%, oklch(0.76 0.16 62)) 100%)`;

const SectionTitle = ({ children }) => (
  <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: MUTED, marginBottom: '10px' }}>
    {children}
  </div>
);

SectionTitle.propTypes = { children: PropTypes.node.isRequired };

/** Horizontal bar list; widths are relative to the largest value */
const BarList = ({ rows, currency }) => {
  const max = Math.max(...rows.map((row) => row.total), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {rows.map((row) => (
        <div key={row.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '14px', marginBottom: '5px' }}>
            <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row.emoji ? `${row.emoji} ` : ''}{row.label}
            </span>
            <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(row.total, currency)}</span>
          </div>
          <div style={{ height: '8px', borderRadius: '9999px', background: '#f5f5f4', overflow: 'hidden' }}>
            <div style={{ width: `${Math.max(4, (row.total / max) * 100)}%`, height: '100%', borderRadius: '9999px', background: `oklch(0.68 0.14 ${row.hue})` }} />
          </div>
        </div>
      ))}
    </div>
  );
};

BarList.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    total: PropTypes.number.isRequired,
    hue: PropTypes.number.isRequired,
    emoji: PropTypes.string,
  })).isRequired,
  currency: PropTypes.string,
};

/**
 * Off-screen, export-only monthly spending summary, captured by
 * modern-screenshot for "Share" / "Download" on the Spending tab.
 */
const SpendingExportCard = React.forwardRef(({ summary, storeFilter = null }, ref) => {
  const { colorTheme } = useThemeContext();
  const { primary: accent, foreground: onAccent } = (colorThemes[colorTheme] ?? colorThemes.indigo).light;
  const { month, total, currency, count, changePct, stores, categories, trend } = summary;
  const trendMax = Math.max(...trend.map((point) => point.total), 1);

  return (
    <div
      ref={ref}
      style={{ width: '600px', padding: '24px', boxSizing: 'border-box', background: `color-mix(in oklch, ${accent} 7%, #ffffff)`, fontFamily: FONT, color: INK, lineHeight: 1.35 }}
    >
      <div style={{ background: '#ffffff', borderRadius: '26px', overflow: 'hidden', boxShadow: `0 24px 48px -28px color-mix(in oklch, ${accent} 55%, transparent)` }}>
        {/* Hero */}
        <div style={{ position: 'relative', overflow: 'hidden', padding: '24px 28px 22px', background: gradient(accent), color: onAccent }}>
          <div style={{ position: 'absolute', right: '-60px', top: '-90px', width: '230px', height: '230px', borderRadius: '9999px', background: 'rgba(255,255,255,0.14)' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, opacity: 0.9 }}>
              Spending · {dayjs(`${month}-01`).format('MMMM YYYY')}{storeFilter ? ` · ${storeFilter}` : ''}
            </div>
            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'flex-end', gap: '14px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '44px', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {formatMoney(total, currency)}
              </div>
              {changePct !== null && (
                <div style={{ marginBottom: '4px', padding: '3px 10px', borderRadius: '9999px', background: 'rgba(255,255,255,0.2)', fontSize: '13px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {changePct > 0 ? '▲' : changePct < 0 ? '▼' : '='} {Math.abs(changePct)}% vs last month
                </div>
              )}
            </div>
            <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
              {[
                ['Receipts', String(count)],
                ['Avg per trip', formatMoney(count ? total / count : 0, currency)],
                ['Top store', stores[0]?.label || '—'],
              ].map(([label, value]) => (
                <div key={label} style={{ flex: 1, minWidth: 0, padding: '9px 12px', borderRadius: '14px', background: 'rgba(255,255,255,0.14)' }}>
                  <div style={{ fontSize: '11px', opacity: 0.85 }}>{label}</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: '22px 28px 4px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* 6-month trend */}
          <div>
            <SectionTitle>Last 6 months</SectionTitle>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '96px' }}>
              {trend.map((point) => {
                const isCurrent = point.month === month;
                return (
                  <div key={point.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                    <div
                      style={{
                        width: '100%',
                        height: `${Math.max(3, (point.total / trendMax) * 72)}px`,
                        borderRadius: '8px',
                        background: isCurrent ? gradient(accent) : `color-mix(in oklch, ${accent} 22%, #ffffff)`,
                      }}
                    />
                    <div style={{ fontSize: '11px', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? INK : MUTED }}>
                      {dayjs(`${point.month}-01`).format('MMM')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {stores.length > 0 && (
            <div>
              <SectionTitle>Top stores</SectionTitle>
              <BarList rows={stores} currency={currency} />
            </div>
          )}

          {categories.length > 0 && (
            <div>
              <SectionTitle>Top categories</SectionTitle>
              <BarList rows={categories} currency={currency} />
            </div>
          )}
        </div>

        <div style={{ margin: '20px 28px 0', padding: '12px 0 18px', borderTop: `1px solid ${LINE}`, display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: MUTED }}>
          <span style={{ fontWeight: 600 }}>Made with Grocery List</span>
          <span>{dayjs().format('MMM D, YYYY')}</span>
        </div>
      </div>
    </div>
  );
});

SpendingExportCard.displayName = 'SpendingExportCard';

SpendingExportCard.propTypes = {
  summary: PropTypes.shape({
    month: PropTypes.string.isRequired,
    total: PropTypes.number.isRequired,
    currency: PropTypes.string,
    count: PropTypes.number.isRequired,
    changePct: PropTypes.number,
    stores: PropTypes.array.isRequired,
    categories: PropTypes.array.isRequired,
    trend: PropTypes.array.isRequired,
  }).isRequired,
  storeFilter: PropTypes.string,
};

export default SpendingExportCard;

// Shared helpers so SpendingInsights builds rows in the card's shape
export const toStoreRow = ([label, total]) => ({ label, total, hue: hueFromString(label.toLowerCase()) });
export const toCategoryRow = ([label, total]) => {
  const { emoji, hue } = getCategoryStyle(label);
  return { label, total, hue, emoji };
};
