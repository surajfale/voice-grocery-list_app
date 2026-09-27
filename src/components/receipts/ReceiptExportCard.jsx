import React from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { useThemeContext, colorThemes } from '../../contexts/ThemeContext';
import { hueFromString } from '../../utils/categoryStyles';
import { formatMoney } from '../../utils/money';

// Light-only palette, matching PrintableList: exports should read the same
// in a chat app or on paper regardless of the app's current theme.
const INK = '#1c1917';
const MUTED = '#78716c';
const LINE = '#ece9e6';
const FONT = '"Geist Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const gradient = (accent) =>
  `linear-gradient(135deg, ${accent} 0%, color-mix(in oklch, ${accent} 58%, oklch(0.76 0.16 62)) 100%)`;

/**
 * Off-screen, export-only rendering of one receipt, captured by
 * modern-screenshot for "Share" and "Download image" on the receipt details.
 */
const ReceiptExportCard = React.forwardRef(({ receipt }, ref) => {
  const { colorTheme } = useThemeContext();
  const { primary: accent, foreground: onAccent } = (colorThemes[colorTheme] ?? colorThemes.indigo).light;

  const store = receipt.merchant?.trim() || 'Unknown store';
  const hue = hueFromString(store.toLowerCase());
  const date = receipt.purchaseDate ? dayjs(receipt.purchaseDate) : null;
  const items = (receipt.items || []).filter((item) => item?.name);
  const itemCount = items.length; // line items, matching the details panel

  return (
    <div
      ref={ref}
      style={{
        width: '560px',
        padding: '24px',
        boxSizing: 'border-box',
        background: `color-mix(in oklch, ${accent} 7%, #ffffff)`,
        fontFamily: FONT,
        color: INK,
        lineHeight: 1.35,
      }}
    >
      <div style={{ background: '#ffffff', borderRadius: '26px', overflow: 'hidden', boxShadow: `0 24px 48px -28px color-mix(in oklch, ${accent} 55%, transparent)` }}>
        {/* Hero */}
        <div style={{ position: 'relative', overflow: 'hidden', padding: '24px 28px', background: gradient(accent), color: onAccent }}>
          <div style={{ position: 'absolute', right: '-60px', top: '-90px', width: '220px', height: '220px', borderRadius: '9999px', background: 'rgba(255,255,255,0.14)' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ width: '52px', height: '52px', borderRadius: '16px', background: `oklch(0.935 0.055 ${hue})`, color: `oklch(0.45 0.12 ${hue})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 700, flexShrink: 0 }}>
              {store.charAt(0).toUpperCase()}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15 }}>{store}</div>
              <div style={{ fontSize: '14px', opacity: 0.9, marginTop: '2px' }}>
                {date?.isValid() ? date.format('dddd, MMMM D, YYYY') : 'No purchase date'}
              </div>
            </div>
          </div>
          <div style={{ position: 'relative', marginTop: '20px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>
              {itemCount ? `${itemCount} item${itemCount === 1 ? '' : 's'}` : 'Receipt'}
            </div>
            <div style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {formatMoney(receipt.total, receipt.currency)}
            </div>
          </div>
        </div>

        {/* Line items */}
        <div style={{ padding: '18px 28px 6px' }}>
          {items.length === 0 ? (
            <div style={{ padding: '16px 0 20px', fontSize: '14px', color: MUTED }}>No line items were read from this receipt.</div>
          ) : (
            items.map((item, index) => (
              <div
                key={`${item.name}-${index}`}
                style={{ display: 'flex', alignItems: 'baseline', gap: '12px', padding: '10px 0', borderBottom: index < items.length - 1 ? `1px solid ${LINE}` : 'none', fontSize: '15px' }}
              >
                <span style={{ flex: 1, minWidth: 0 }}>
                  {item.name}
                  {item.quantity > 1 && <span style={{ color: MUTED }}> ×{item.quantity}</span>}
                </span>
                <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {typeof item.price === 'number' ? formatMoney(item.price, item.currency || receipt.currency) : '—'}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Total */}
        <div style={{ margin: '6px 28px 0', padding: '14px 16px', borderRadius: '14px', background: `color-mix(in oklch, ${accent} 9%, #ffffff)`, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: accent }}>Total</span>
          <span style={{ fontSize: '20px', fontWeight: 700, color: accent, fontVariantNumeric: 'tabular-nums' }}>
            {formatMoney(receipt.total, receipt.currency)}
          </span>
        </div>

        {/* Footer */}
        <div style={{ margin: '18px 28px 0', padding: '12px 0 18px', borderTop: `1px solid ${LINE}`, display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: MUTED }}>
          <span style={{ fontWeight: 600 }}>Made with Grocery List</span>
          <span>{dayjs().format('MMM D, YYYY')}</span>
        </div>
      </div>
    </div>
  );
});

ReceiptExportCard.displayName = 'ReceiptExportCard';

ReceiptExportCard.propTypes = {
  receipt: PropTypes.shape({
    merchant: PropTypes.string,
    purchaseDate: PropTypes.string,
    total: PropTypes.number,
    currency: PropTypes.string,
    items: PropTypes.array,
  }).isRequired,
};

export default ReceiptExportCard;
