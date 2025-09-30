import React, { useState, memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Checkbox,
  IconButton,
  Chip,
  Collapse,
  FormControl,
  Select,
  MenuItem,
  TextField,
} from '@mui/material';
import { ExpandLess, ExpandMore, Edit, Delete, Check, Close } from '@mui/icons-material';

const GroceryListDisplay = memo(({
  groupedItems,
  expandedCategories,
  onToggleCategory,
  onToggleItem,
  onRemoveItem,
  onUpdateCategory,
  onUpdateText,
  categoryList,
  loading = false
}) => {
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingText, setEditingText] = useState(null);
  const [editedTextValue, setEditedTextValue] = useState('');

  const handleUpdateCategory = async (id, newCategory) => {
    await onUpdateCategory(id, newCategory);
    setEditingCategory(null);
  };

  const handleStartEditText = (item) => {
    setEditingText(item.id);
    setEditedTextValue(item.text);
  };

  const handleSaveText = async (id, originalText) => {
    if (editedTextValue.trim() && editedTextValue.trim() !== originalText.trim()) {
      await onUpdateText(id, editedTextValue);
    }
    setEditingText(null);
    setEditedTextValue('');
  };

  const handleCancelEditText = () => {
    setEditingText(null);
    setEditedTextValue('');
  };

  // Memoize the grouped items processing
  const processedGroupedItems = useMemo(() => {
    return Object.entries(groupedItems).map(([category, categoryItems]) => {
      const isExpanded = expandedCategories[category] !== false;
      const completedCount = categoryItems.filter(item => item.completed).length;
      const progress = (completedCount / categoryItems.length) * 100;
      
      return {
        category,
        categoryItems,
        isExpanded,
        completedCount,
        progress
      };
    });
  }, [groupedItems, expandedCategories]);

  return (
    <Grid container spacing={3}>
      {processedGroupedItems.map(({ category, categoryItems, isExpanded, completedCount, progress }) => {
        return (
          <Grid item xs={12} sm={6} lg={4} key={category}>
            <Card
              sx={{
                height: 'fit-content',
                borderRadius: '20px',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(226, 232, 240, 0.6)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08)',
                  borderColor: 'rgba(99, 102, 241, 0.3)',
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                {/* Category Header */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          background: category === 'Other'
                            ? 'linear-gradient(135deg, #F59E0B 0%, #F97316 100%)'
                            : category === 'Produce'
                            ? 'linear-gradient(135deg, #10B981 0%, #34D399 100%)'
                            : category === 'Asian Pantry' || category === 'Indian Pantry'
                            ? 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)'
                            : 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                          boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                        }}
                      />
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                          fontSize: '1.1rem',
                          color: 'text.primary',
                        }}
                      >
                        {category}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={`${completedCount}/${categoryItems.length}`}
                        size="small"
                        sx={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: progress === 100
                            ? 'linear-gradient(135deg, #10B981 0%, #34D399 100%)'
                            : 'rgba(99, 102, 241, 0.1)',
                          color: progress === 100 ? 'white' : 'primary.main',
                          border: 'none',
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => onToggleCategory(category)}
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '8px',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            backgroundColor: 'rgba(99, 102, 241, 0.08)',
                            transform: 'scale(1.1)',
                          },
                        }}
                      >
                        {isExpanded ? (
                          <ExpandLess sx={{ color: 'primary.main' }} />
                        ) : (
                          <ExpandMore sx={{ color: 'primary.main' }} />
                        )}
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Progress Bar */}
                  <Box sx={{ width: '100%', mb: 1 }}>
                    <Box
                      sx={{
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: 'rgba(226, 232, 240, 0.6)',
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          height: '100%',
                          width: `${progress}%`,
                          background: progress === 100
                            ? 'linear-gradient(90deg, #10B981 0%, #34D399 100%)'
                            : 'linear-gradient(90deg, #6366F1 0%, #8B5CF6 100%)',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </Box>
                  </Box>

                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                    }}
                  >
                    {progress === 100 ? 'Complete!' : `${Math.round(progress)}% complete`}
                  </Typography>
                </Box>

                {/* Items List */}
                <Collapse in={isExpanded}>
                  <Box sx={{ mt: 2 }}>
                    {categoryItems.map((item, index) => (
                      <Box
                        key={item.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          p: 1.5,
                          mb: 1,
                          borderRadius: '12px',
                          background: item.completed
                            ? 'rgba(16, 185, 129, 0.08)'
                            : 'background.default',
                          border: '1px solid',
                          borderColor: item.completed
                            ? 'rgba(16, 185, 129, 0.2)'
                            : 'divider',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': {
                            transform: 'translateX(4px)',
                            backgroundColor: item.completed
                              ? 'rgba(16, 185, 129, 0.12)'
                              : 'action.hover',
                            borderColor: item.completed
                              ? 'rgba(16, 185, 129, 0.3)'
                              : 'primary.main',
                          },
                        }}
                      >
                        <Checkbox
                          checked={item.completed}
                          onChange={(e) => {
                            e.stopPropagation();
                            console.log('Checkbox clicked for item:', item.id, 'current completed:', item.completed);
                            onToggleItem(item.id);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          size="small"
                          disabled={loading || editingText === item.id}
                          sx={{
                            '&.Mui-checked': {
                              color: 'success.main',
                            },
                            '& .MuiSvgIcon-root': {
                              fontSize: '1.2rem',
                            },
                          }}
                        />

                        {editingText === item.id ? (
                          <TextField
                            value={editedTextValue}
                            onChange={(e) => setEditedTextValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveText(item.id, item.text);
                              } else if (e.key === 'Escape') {
                                handleCancelEditText();
                              }
                            }}
                            autoFocus
                            size="small"
                            fullWidth
                            disabled={loading}
                            sx={{
                              flex: 1,
                              '& .MuiInputBase-root': {
                                fontSize: '0.875rem',
                                fontWeight: 500,
                              },
                            }}
                          />
                        ) : (
                          <Typography
                            variant="body2"
                            onClick={() => !loading && handleStartEditText(item)}
                            sx={{
                              flex: 1,
                              fontSize: '0.875rem',
                              fontWeight: 500,
                              textDecoration: item.completed ? 'line-through' : 'none',
                              opacity: item.completed ? 0.7 : 1,
                              color: item.completed ? 'text.secondary' : 'text.primary',
                              transition: 'all 0.2s ease',
                              cursor: loading ? 'default' : 'pointer',
                              '&:hover': loading ? {} : {
                                color: 'primary.main',
                                textDecoration: 'underline',
                              },
                            }}
                          >
                            {item.text}
                          </Typography>
                        )}

                        {/* Action Buttons */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {editingText === item.id ? (
                            <>
                              <IconButton
                                size="small"
                                onClick={() => handleSaveText(item.id, item.text)}
                                disabled={loading || !editedTextValue.trim()}
                                sx={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: '8px',
                                  color: 'success.main',
                                  '&:hover': {
                                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                  },
                                }}
                              >
                                <Check sx={{ fontSize: '1rem' }} />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={handleCancelEditText}
                                disabled={loading}
                                sx={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: '8px',
                                  color: 'text.secondary',
                                  '&:hover': {
                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                    color: 'error.main',
                                  },
                                }}
                              >
                                <Close sx={{ fontSize: '1rem' }} />
                              </IconButton>
                            </>
                          ) : (
                            <>
                              {editingCategory === item.id ? (
                                <FormControl size="small" sx={{ minWidth: 90 }}>
                                  <Select
                                    value={item.category}
                                    onChange={(e) => handleUpdateCategory(item.id, e.target.value)}
                                    disabled={loading}
                                    sx={{
                                      borderRadius: '8px',
                                      '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'divider',
                                      },
                                    }}
                                  >
                                    {categoryList.map(cat => (
                                      <MenuItem key={cat} value={cat}>
                                        <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                          {cat}
                                        </Typography>
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              ) : (
                                <IconButton
                                  size="small"
                                  onClick={() => setEditingCategory(item.id)}
                                  disabled={loading}
                                  sx={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: '8px',
                                    color: item.category === 'Other' ? 'warning.main' : 'text.secondary',
                                    '&:hover': {
                                      backgroundColor: item.category === 'Other'
                                        ? 'rgba(245, 158, 11, 0.1)'
                                        : 'rgba(99, 102, 241, 0.08)',
                                      color: item.category === 'Other' ? 'warning.dark' : 'primary.main',
                                    },
                                  }}
                                >
                                  <Edit sx={{ fontSize: '1rem' }} />
                                </IconButton>
                              )}

                              <IconButton
                                size="small"
                                onClick={() => onRemoveItem(item.id)}
                                disabled={loading}
                                sx={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: '8px',
                                  color: 'text.secondary',
                                  '&:hover': {
                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                    color: 'error.main',
                                  },
                                }}
                              >
                                <Delete sx={{ fontSize: '1rem' }} />
                              </IconButton>
                            </>
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
});

GroceryListDisplay.displayName = 'GroceryListDisplay';

// PropTypes validation
GroceryListDisplay.propTypes = {
  groupedItems: PropTypes.object.isRequired,
  expandedCategories: PropTypes.object.isRequired,
  onToggleCategory: PropTypes.func.isRequired,
  onToggleItem: PropTypes.func.isRequired,
  onRemoveItem: PropTypes.func.isRequired,
  onUpdateCategory: PropTypes.func.isRequired,
  onUpdateText: PropTypes.func.isRequired,
  categoryList: PropTypes.array.isRequired,
  loading: PropTypes.bool
};

export default GroceryListDisplay;
