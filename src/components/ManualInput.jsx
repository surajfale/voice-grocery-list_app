import React, { useState, memo } from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
} from '@mui/material';
import { Add } from '@mui/icons-material';

const ManualInput = memo(({ onAddItems, loading = false }) => {
  const [manualInput, setManualInput] = useState('');

  const handleAddItems = () => {
    if (manualInput.trim()) {
      // Parse input similar to voice recognition
      const items = manualInput
        .split(/[,;]/)
        .map(item => item.trim())
        .filter(item => item.length > 0);
      
      onAddItems(items);
      setManualInput('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddItems();
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

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
        <TextField
          fullWidth
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="e.g., milk, apples, basmati rice, turmeric..."
          variant="outlined"
          disabled={loading}
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
        <Button
          variant="contained"
          onClick={handleAddItems}
          disabled={!manualInput.trim() || loading}
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
  loading: PropTypes.bool
};

export default ManualInput;
