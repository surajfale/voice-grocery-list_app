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
  Menu,
  TextField,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { ExpandLess, ExpandMore, Edit, Delete, Check, Close } from '@mui/icons-material';

const getCategoryAccent = (category, palette) => {
  if (category === 'Other') { return palette.warning.main; }
  if (category === 'Produce') { return palette.success.main; }
  if (category === 'Asian Pantry' || category === 'Indian Pantry') { return palette.secondary.main; }
  return palette.primary.main;
};

const GroceryListDisplay = memo(({
  groupedItems,
  expandedCategories,
  onToggleCategory,
  onToggleItem,
  onRemoveItem,
  onUpdateCategory,
  onUpdateText,
  onUpdateCount,
  categoryList,
  loading = false
}) => {
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingText, setEditingText] = useState(null);
  const [editedTextValue, setEditedTextValue] = useState('');
  const [countMenuAnchor, setCountMenuAnchor] = useState(null);
  const [countMenuItemId, setCountMenuItemId] = useState(null);
  const theme = useTheme();
  const { palette } = theme;

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

  const handleOpenCountMenu = (event, itemId) => {
    setCountMenuAnchor(event.currentTarget);
    setCountMenuItemId(itemId);
  };

  const handleCloseCountMenu = () => {
    setCountMenuAnchor(null);
    setCountMenuItemId(null);
  };

  const handleCountChange = async (newCount) => {
    if (newCount === 0) {
      // Remove item when count is 0
      await onRemoveItem(countMenuItemId);
    } else {
      await onUpdateCount(countMenuItemId, newCount);
    }
    handleCloseCountMenu();
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
    <>
    <Grid container spacing={3}>
      {processedGroupedItems.map(({ category, categoryItems, isExpanded, completedCount, progress }) => {
        const accent = getCategoryAccent(category, palette);
        return (
          <Grid item xs={12} md={6} key={category}>
            <Card
              sx={{
                height: 'fit-content',
                borderRadius: '20px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  borderColor: alpha(accent, 0.3),
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
                          backgroundColor: accent,
                          boxShadow: `0 2px 8px ${alpha(accent, 0.35)}`,
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
                          backgroundColor: progress === 100
                            ? alpha(palette.success.main, 0.16)
                            : alpha(accent, 0.1),
                          color: progress === 100 ? palette.success.main : accent,
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
                            backgroundColor: alpha(accent, 0.08),
                            transform: 'scale(1.1)',
                          },
                        }}
                      >
                        {isExpanded ? (
                          <ExpandLess sx={{ color: accent }} />
                        ) : (
                          <ExpandMore sx={{ color: accent }} />
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
                        backgroundColor: 'divider',
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          height: '100%',
                          width: `${progress}%`,
                          backgroundColor: progress === 100 ? palette.success.main : accent,
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
                    {categoryItems.map((item, _index) => (
                      <Box
                        key={item.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.75,
                          p: 1.25,
                          mb: 1,
                          borderRadius: '12px',
                          backgroundColor: item.completed
                            ? alpha(palette.success.main, 0.08)
                            : 'background.default',
                          border: '1px solid',
                          borderColor: item.completed
                            ? alpha(palette.success.main, 0.2)
                            : 'divider',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': {
                            transform: 'translateX(4px)',
                            backgroundColor: item.completed
                              ? alpha(palette.success.main, 0.12)
                              : 'action.hover',
                            borderColor: item.completed
                              ? alpha(palette.success.main, 0.3)
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
                            flexShrink: 0,
                            '&.Mui-checked': {
                              color: 'success.main',
                            },
                            '& .MuiSvgIcon-root': {
                              fontSize: '1.2rem',
                            },
                          }}
                        />

                        {/* Count Chip */}
                        <Box
                          onClick={(e) => !loading && handleOpenCountMenu(e, item.id)}
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            height: '28px',
                            minWidth: '42px',
                            px: 1.5,
                            borderRadius: '14px',
                            cursor: loading || editingText === item.id ? 'default' : 'pointer',
                            backgroundColor: alpha(palette.primary.main, 0.1),
                            color: 'primary.main',
                            flexShrink: 0,
                            transition: 'background-color 0.2s ease',
                            userSelect: 'none',
                            opacity: loading || editingText === item.id ? 0.5 : 1,
                            pointerEvents: loading || editingText === item.id ? 'none' : 'auto',
                            '&:hover': loading || editingText === item.id ? {} : {
                              backgroundColor: alpha(palette.primary.main, 0.2),
                            },
                          }}
                        >
                          ×{item.count || 1}
                        </Box>

                        <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
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
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                textDecoration: item.completed ? 'line-through' : 'none',
                                opacity: item.completed ? 0.7 : 1,
                                color: item.completed ? 'text.secondary' : 'text.primary',
                                transition: 'all 0.2s ease',
                                cursor: loading ? 'default' : 'pointer',
                                wordBreak: 'break-word',
                                '&:hover': loading ? {} : {
                                  color: 'primary.main',
                                  textDecoration: 'underline',
                                },
                              }}
                            >
                              {item.text}
                            </Typography>
                          )}
                        </Box>

                        {/* Action Buttons */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0, ml: 0.5 }}>
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
                                    backgroundColor: alpha(palette.success.main, 0.1),
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
                                    backgroundColor: alpha(palette.error.main, 0.1),
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
                                        ? alpha(palette.warning.main, 0.1)
                                        : alpha(palette.primary.main, 0.08),
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
                                    backgroundColor: alpha(palette.error.main, 0.1),
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

    {/* Count Selection Menu */}
    <Menu
      anchorEl={countMenuAnchor}
      open={Boolean(countMenuAnchor)}
      onClose={handleCloseCountMenu}
      PaperProps={{
        sx: {
          mt: 1,
          borderRadius: '12px',
        }
      }}
    >
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
        <MenuItem
          key={num}
          onClick={() => handleCountChange(num)}
          sx={{
            fontSize: '0.875rem',
            fontWeight: num === 0 ? 600 : 500,
            color: num === 0 ? 'error.main' : 'text.primary',
            minWidth: '120px',
          }}
        >
          {num === 0 ? '🗑️ Remove Item' : `×${num}`}
        </MenuItem>
      ))}
    </Menu>
    </>
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
  onUpdateCount: PropTypes.func.isRequired,
  categoryList: PropTypes.array.isRequired,
  loading: PropTypes.bool
};

export default GroceryListDisplay;
