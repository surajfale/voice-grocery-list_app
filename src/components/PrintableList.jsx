import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';

/**
 * PrintableList Component
 * Renders a styled grocery list suitable for export as image or PDF
 * This component is rendered off-screen for capturing
 */
const PrintableList = React.forwardRef(({ items, dateString, formatDateDisplay, theme: _theme }, ref) => {
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
    <Box
      ref={ref}
      sx={{
        width: '800px',
        padding: '40px',
        backgroundColor: '#ffffff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 4, pb: 3, borderBottom: '3px solid #e5e7eb' }}>
        <Typography
          sx={{
            fontSize: '32px',
            fontWeight: 700,
            color: '#1f2937',
            mb: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          🛒 Grocery List
        </Typography>
        <Typography sx={{ fontSize: '18px', color: '#6b7280', fontWeight: 500 }}>
          {formatDateDisplay(dateString)}
        </Typography>
      </Box>

      {/* Progress Summary */}
      <Box
        sx={{
          mb: 4,
          p: 3,
          backgroundColor: progressPercent === 100 ? '#d1fae5' : '#eff6ff',
          borderRadius: '12px',
          border: `2px solid ${progressPercent === 100 ? '#10B981' : '#3B82F6'}`,
        }}
      >
        <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#1f2937', mb: 1 }}>
          Progress: {completedCount} / {totalCount} items ({progressPercent}%)
        </Typography>
        <Box
          sx={{
            width: '100%',
            height: '12px',
            backgroundColor: '#e5e7eb',
            borderRadius: '6px',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              width: `${progressPercent}%`,
              height: '100%',
              backgroundColor: progressPercent === 100 ? '#10B981' : '#3B82F6',
              transition: 'width 0.3s ease',
            }}
          />
        </Box>
      </Box>

      {/* Items by Category */}
  {Object.entries(groupedItems).map(([category, categoryItems], _categoryIndex) => (
        <Box key={category} sx={{ mb: 4 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              mb: 2,
              pb: 1,
              borderBottom: '2px solid #e5e7eb',
            }}
          >
            <Box
              sx={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: getCategoryColor(category),
              }}
            />
            <Typography
              sx={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#1f2937',
              }}
            >
              {category}
            </Typography>
            <Typography
              sx={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#6b7280',
                ml: 'auto',
              }}
            >
              {categoryItems.filter(item => item.completed).length}/{categoryItems.length}
            </Typography>
          </Box>

          <Box sx={{ pl: 3 }}>
            {categoryItems.map((item, itemIndex) => (
              <Box
                key={item.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  py: 1.5,
                  borderBottom: itemIndex < categoryItems.length - 1 ? '1px solid #f3f4f6' : 'none',
                }}
              >
                <Box
                  sx={{
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
                  {item.completed && (
                    <Typography sx={{ fontSize: '16px', color: '#ffffff' }}>✓</Typography>
                  )}
                </Box>
                {item.count && item.count > 1 && (
                  <Box
                    sx={{
                      minWidth: '32px',
                      height: '24px',
                      px: 1,
                      backgroundColor: '#eff6ff',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '14px',
                        fontWeight: 700,
                        color: '#3B82F6',
                      }}
                    >
                      ×{item.count}
                    </Typography>
                  </Box>
                )}
                <Typography
                  sx={{
                    fontSize: '16px',
                    fontWeight: 500,
                    color: item.completed ? '#9ca3af' : '#1f2937',
                    textDecoration: item.completed ? 'line-through' : 'none',
                  }}
                >
                  {item.text}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      ))}

      {/* Footer */}
      <Box sx={{ mt: 5, pt: 3, borderTop: '2px solid #e5e7eb', textAlign: 'center' }}>
        <Typography sx={{ fontSize: '12px', color: '#9ca3af', mb: 0.5 }}>
          Generated by Voice Grocery List App
        </Typography>
        <Typography sx={{ fontSize: '11px', color: '#d1d5db' }}>
          {new Date().toLocaleString()}
        </Typography>
      </Box>
    </Box>
  );
});

PrintableList.displayName = 'PrintableList';

PrintableList.propTypes = {
  items: PropTypes.array.isRequired,
  dateString: PropTypes.string.isRequired,
  formatDateDisplay: PropTypes.func.isRequired,
  theme: PropTypes.object,
};

export default PrintableList;