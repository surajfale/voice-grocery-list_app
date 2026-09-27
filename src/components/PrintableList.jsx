import React from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { useThemeContext, colorThemes } from '../contexts/ThemeContext';
import { getCategoryStyle } from '../utils/categoryStyles';

// Always rendered in the light palette: shared images land in chat apps and
// PDFs get printed, so a dark export would waste ink and clash. The accent
// follows the user's chosen color theme.
const INK = '#1c1917';
const MUTED = '#78716c';
const LINE = '#ece9e6';
const FONT = '"Geist Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// Same warm blend as .hero-gradient / .btn-gradient in index.css
const gradient = (accent) =>
  `linear-gradient(135deg, ${accent} 0%, color-mix(in oklch, ${accent} 58%, oklch(0.76 0.16 62)) 100%)`;

const relativeLabel = (date) => {
  const today = dayjs().startOf('day');
  const diff = date.startOf('day').diff(today, 'day');
  if (diff === 0) { return 'Today'; }
  if (diff === 1) { return 'Tomorrow'; }
  if (diff === -1) { return 'Yesterday'; }
  return date.format('YYYY');
};

const CheckIcon = ({ color }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

CheckIcon.propTypes = { color: PropTypes.string.isRequired };

/**
 * PrintableList
 * Off-screen, export-only rendering of the current list, captured by
 * modern-screenshot for "Share as image", "Download PNG" and "Download PDF".
 * Styled inline so the capture never depends on the live theme (light/dark).
 */
const PrintableList = React.forwardRef(({ items, dateString }, ref) => {
  const { colorTheme } = useThemeContext();
  const { primary: accent, foreground: onAccent } = (colorThemes[colorTheme] ?? colorThemes.indigo).light;

  const date = dayjs(dateString);
  const total = items.length;
  const done = items.filter((item) => item.completed).length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  // Group by category, keep first-seen order, remaining items before bought ones
  const groups = items.reduce((acc, item) => {
    const key = item.category || 'Other';
    (acc[key] ??= []).push(item);
    return acc;
  }, {});
  Object.values(groups).forEach((list) => list.sort((a, b) => Number(a.completed) - Number(b.completed)));

  return (
    <div
      ref={ref}
      style={{
        width: '720px',
        padding: '28px',
        boxSizing: 'border-box',
        background: `color-mix(in oklch, ${accent} 7%, #ffffff)`,
        fontFamily: FONT,
        color: INK,
        lineHeight: 1.35,
      }}
    >
      <div style={{ background: '#ffffff', borderRadius: '28px', overflow: 'hidden', boxShadow: `0 24px 48px -28px color-mix(in oklch, ${accent} 55%, transparent)` }}>
        {/* Hero */}
        <div style={{ position: 'relative', overflow: 'hidden', padding: '28px 32px 26px', background: gradient(accent), color: onAccent }}>
          <div style={{ position: 'absolute', right: '-60px', top: '-90px', width: '240px', height: '240px', borderRadius: '9999px', background: 'rgba(255,255,255,0.14)' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: 600, opacity: 0.9 }}>
              <span style={{ width: '30px', height: '30px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🛒</span>
              Grocery List · {relativeLabel(date)}
            </div>
            <div style={{ marginTop: '14px', fontSize: '34px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {date.format('dddd, MMMM D')}
            </div>
            <div style={{ marginTop: '18px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
              <div style={{ fontSize: '15px', opacity: 0.9 }}>
                {total === 0 ? 'Nothing on this list yet' : done === total ? `All ${total} items bought 🎉` : `${total - done} of ${total} left to buy`}
              </div>
              {total > 0 && <div style={{ fontSize: '28px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{percent}%</div>}
            </div>
            <div style={{ marginTop: '10px', height: '8px', borderRadius: '9999px', background: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
              <div style={{ width: `${percent}%`, height: '100%', borderRadius: '9999px', background: onAccent }} />
            </div>
          </div>
        </div>

        {/* Categories */}
        <div style={{ padding: '24px 28px 8px' }}>
          {Object.entries(groups).map(([category, list]) => {
            const { emoji, hue } = getCategoryStyle(category);
            const left = list.filter((item) => !item.completed).length;
            return (
              // data-pdf-break marks where a PDF page may start (see downloadListAsPDF)
              <div key={category} data-pdf-break="" style={{ marginBottom: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span style={{ width: '32px', height: '32px', borderRadius: '10px', background: `oklch(0.935 0.055 ${hue})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px' }}>{emoji}</span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: `oklch(0.45 0.12 ${hue})` }}>{category}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: 600, color: MUTED, fontVariantNumeric: 'tabular-nums' }}>
                    {left === 0 ? 'Done' : `${left} left`}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {list.map((item, index) => (
                    <div
                      key={item.id}
                      // Never break between a category header and its first item
                      data-pdf-break={index > 0 ? '' : undefined}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 14px',
                        borderRadius: '14px',
                        border: `1px solid ${item.completed ? LINE : `oklch(0.9 0.04 ${hue})`}`,
                        background: item.completed ? '#fafaf9' : '#ffffff',
                      }}
                    >
                      <span
                        style={{
                          width: '22px',
                          height: '22px',
                          flexShrink: 0,
                          borderRadius: '9999px',
                          boxSizing: 'border-box',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: item.completed ? accent : '#ffffff',
                          border: item.completed ? 'none' : `2px solid oklch(0.66 0.11 ${hue})`,
                        }}
                      >
                        {item.completed && <CheckIcon color={onAccent} />}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          fontSize: '16px',
                          fontWeight: 500,
                          color: item.completed ? '#a8a29e' : INK,
                          textDecoration: item.completed ? 'line-through' : 'none',
                        }}
                      >
                        {item.text}
                      </span>
                      {item.count > 1 && (
                        <span style={{ padding: '2px 9px', borderRadius: '9999px', fontSize: '13px', fontWeight: 700, color: accent, background: `color-mix(in oklch, ${accent} 12%, #ffffff)`, fontVariantNumeric: 'tabular-nums' }}>
                          ×{item.count}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div data-pdf-break="" style={{ margin: '0 28px', padding: '14px 0 20px', borderTop: `1px solid ${LINE}`, display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: MUTED }}>
          <span style={{ fontWeight: 600 }}>Made with Grocery List</span>
          <span>{dayjs().format('MMM D, YYYY · h:mm A')}</span>
        </div>
      </div>
    </div>
  );
});

PrintableList.displayName = 'PrintableList';

PrintableList.propTypes = {
  items: PropTypes.array.isRequired,
  dateString: PropTypes.string.isRequired,
};

export default PrintableList;
