import React from 'react';
import PropTypes from 'prop-types';

/**
 * PrintableList Component
 * Renders a styled grocery list suitable for export as image or PDF
 * This component is rendered off-screen for capturing.
 *
 * Deliberately uses plain inline styles (not Tailwind/CSS variables): html2canvas
 * rasterizes computed styles and can choke on modern color functions like oklch()
 * or color-mix(), so this keeps fixed hex values for reliable, pixel-stable export.
 */
const PrintableList = React.forwardRef(({ items, dateString, formatDateDisplay }, ref) => {
  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  // Category color mapping
  const getCategoryColor = (category) => {
    switch (category) {
      case 'Produce': return '#10B981';
      case 'Dairy': return '#3B82F6';
      case 'Meat & Seafood': return '#EF4444';
      case 'Bakery': return '#F59E0B';
      case 'Frozen': return '#06B6D4';
      case 'Snacks': return '#8B5CF6';
      case 'Beverages': return '#EC4899';
      case 'Canned Goods': return '#F97316';
      case 'Condiments & Sauces': return '#84CC16';
      case 'Asian Pantry': return '#8B5CF6';
      case 'Indian Pantry': return '#8B5CF6';
      case 'Household': return '#6B7280';
      case 'Personal Care': return '#EC4899';
      default: return '#F59E0B';
    }
  };

  return (
    <div
      ref={ref}
      style={{
        width: '800px',
        padding: '40px',
        backgroundColor: '#ffffff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '32px', paddingBottom: '24px', borderBottom: '3px solid #e5e7eb' }}>
        <div style={{ fontSize: '32px', fontWeight: 700, color: '#1f2937', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          🛒 Grocery List
        </div>
        <div style={{ fontSize: '18px', color: '#6b7280', fontWeight: 500 }}>
          {formatDateDisplay(dateString)}
        </div>
      </div>

      {/* Progress Summary */}
      <div
        style={{
          marginBottom: '32px',
          padding: '24px',
          backgroundColor: progressPercent === 100 ? '#d1fae5' : '#eff6ff',
          borderRadius: '12px',
          border: `2px solid ${progressPercent === 100 ? '#10B981' : '#3B82F6'}`,
        }}
      >
        <div style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937', marginBottom: '8px' }}>
          Progress: {completedCount} / {totalCount} items ({progressPercent}%)
        </div>
        <div style={{ width: '100%', height: '12px', backgroundColor: '#e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${progressPercent}%`,
              height: '100%',
              backgroundColor: progressPercent === 100 ? '#10B981' : '#3B82F6',
            }}
          />
        </div>
      </div>

      {/* Items by Category */}
      {Object.entries(groupedItems).map(([category, categoryItems]) => (
        <div key={category} style={{ marginBottom: '32px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '16px',
              paddingBottom: '8px',
              borderBottom: '2px solid #e5e7eb',
            }}
          >
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getCategoryColor(category) }} />
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937' }}>{category}</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#6b7280', marginLeft: 'auto' }}>
              {categoryItems.filter(item => item.completed).length}/{categoryItems.length}
            </div>
          </div>

          <div style={{ paddingLeft: '24px' }}>
            {categoryItems.map((item, itemIndex) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '12px 0',
                  borderBottom: itemIndex < categoryItems.length - 1 ? '1px solid #f3f4f6' : 'none',
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    border: item.completed ? 'none' : '2px solid #d1d5db',
                    backgroundColor: item.completed ? '#10B981' : '#ffffff',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {item.completed && <span style={{ fontSize: '16px', color: '#ffffff' }}>✓</span>}
                </div>
                {item.count && item.count > 1 && (
                  <div
                    style={{
                      minWidth: '32px',
                      height: '24px',
                      padding: '0 8px',
                      backgroundColor: '#eff6ff',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#3B82F6' }}>×{item.count}</span>
                  </div>
                )}
                <span
                  style={{
                    fontSize: '16px',
                    fontWeight: 500,
                    color: item.completed ? '#9ca3af' : '#1f2937',
                    textDecoration: item.completed ? 'line-through' : 'none',
                  }}
                >
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Footer */}
      <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '2px solid #e5e7eb', textAlign: 'center' }}>
        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
          Generated by Voice Grocery List App
        </div>
        <div style={{ fontSize: '11px', color: '#d1d5db' }}>{new Date().toLocaleString()}</div>
      </div>
    </div>
  );
});

PrintableList.displayName = 'PrintableList';

PrintableList.propTypes = {
  items: PropTypes.array.isRequired,
  dateString: PropTypes.string.isRequired,
  formatDateDisplay: PropTypes.func.isRequired,
};

export default PrintableList;
