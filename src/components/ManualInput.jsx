import React, { useState, useMemo, memo } from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Autocomplete,
  Chip,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import Fuse from 'fuse.js';

const ManualInput = memo(({ onAddItems, historicalItems = [], loading = false, disabled = false }) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [inputValue, setInputValue] = useState('');

  const fuse = useMemo(() => new Fuse(historicalItems, {
    threshold: 0.3,
    distance: 100,
    minMatchCharLength: 2,
  }), [historicalItems]);

  const filterOptions = (options, params) => {
    const { inputValue } = params;
    
    let filtered = [];

    if (inputValue === '') {
      // Show top 5 suggestions when empty if available, or nothing
      return options.slice(0, 5);
    }
    
    const results = fuse.search(inputValue);
    filtered = results.map(result => result.item);

    // Suggest the exact input if it's not in the list (and not empty)
    // Case insensitive check
    const isExisting = filtered.some((option) => option.toLowerCase() === inputValue.toLowerCase());
    if (inputValue !== '' && !isExisting) {
      filtered.push(inputValue);
    }

    return filtered;
  };

  const handleAddItems = () => {
    if (selectedItems.length > 0 && !disabled) {
      onAddItems(selectedItems);
      setSelectedItems([]);
      setInputValue('');
    }
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: { xs: 3, sm: 4 },
        mb: 4,
        borderRadius: '20px',
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(226, 232, 240, 0.6)',
      }}
    >
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: 'text.primary',
            mb: 1,
            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Add to Your List
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Type items manually or use voice recognition to add multiple items at once
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <Autocomplete
          multiple
          freeSolo
          fullWidth
          options={historicalItems}
          value={selectedItems}
          onChange={(event, newValue) => {
            setSelectedItems(newValue);
          }}
          inputValue={inputValue}
          onInputChange={(event, newInputValue) => {
            setInputValue(newInputValue);
          }}
          filterOptions={filterOptions}
          disabled={loading || disabled}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => {
              const { key, ...tagProps } = getTagProps({ index });
              return (
                <Chip
                  key={key}
                  variant="outlined"
                  label={option}
                  {...tagProps}
                />
              );
            })
          }
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={disabled ? "Cannot add items to past dates" : "e.g., milk, apples, basmati rice..."}
              variant="outlined"
              onKeyDown={(e) => {
                // If user hits Enter and input is empty, trigger add
                if (e.key === 'Enter' && !inputValue && selectedItems.length > 0) {
                  handleAddItems();
                  e.preventDefault();
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '16px',
                  fontSize: '1rem',
                  minHeight: '56px',
                  '&.Mui-focused': {
                    boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.1)',
                  },
                },
              }}
            />
          )}
        />
        <Button
          variant="contained"
          onClick={handleAddItems}
          disabled={selectedItems.length === 0 || loading || disabled}
          sx={{
            minHeight: '56px',
            px: 3,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
            boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
            '&:hover': {
              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
              boxShadow: '0 6px 20px rgba(99, 102, 241, 0.4)',
              transform: 'translateY(-1px)',
            },
            '&:disabled': {
              background: 'rgba(148, 163, 184, 0.3)',
              color: 'rgba(148, 163, 184, 0.8)',
            },
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} color="inherit" />
              Adding...
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Add />
              Add Items
            </Box>
          )}
        </Button>
      </Box>
    </Paper>
  );
});

ManualInput.displayName = 'ManualInput';

// PropTypes validation
ManualInput.propTypes = {
  onAddItems: PropTypes.func.isRequired,
  historicalItems: PropTypes.arrayOf(PropTypes.string),
  loading: PropTypes.bool,
  disabled: PropTypes.bool
};

export default ManualInput;