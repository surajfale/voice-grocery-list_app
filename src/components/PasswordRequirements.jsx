import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  CheckCircle,
  RadioButtonUnchecked,
} from '@mui/icons-material';
import { validatePassword } from '../utils/passwordValidator';

/**
 * Password Requirements Component
 * Displays password requirements and validates in real-time
 */
const PasswordRequirements = ({ password, showStrength = true }) => {
  const validation = validatePassword(password || '');
  const { requirements, strength } = validation;

  return (
    <Box sx={{ mt: 2, mb: 2 }}>
      {/* Password Strength Meter */}
      {showStrength && password && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              Password Strength:
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: strength.color,
                textTransform: 'uppercase'
              }}
            >
              {strength.level}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={strength.percentage}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: '#e0e0e0',
              '& .MuiLinearProgress-bar': {
                backgroundColor: strength.color,
                borderRadius: 4,
              }
            }}
          />
        </Box>
      )}

      {/* Requirements List */}
      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 1 }}>
        Password must contain:
      </Typography>
      <List dense sx={{ py: 0 }}>
        {requirements.map((req) => (
          <ListItem key={req.id} sx={{ py: 0.5, px: 0 }}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              {req.met ? (
                <CheckCircle sx={{ fontSize: 18, color: '#4caf50' }} />
              ) : (
                <RadioButtonUnchecked sx={{ fontSize: 18, color: '#9e9e9e' }} />
              )}
            </ListItemIcon>
            <ListItemText
              primary={req.text}
              primaryTypographyProps={{
                variant: 'caption',
                sx: {
                  color: req.met ? 'text.primary' : 'text.secondary',
                  fontWeight: req.met ? 600 : 400,
                }
              }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

PasswordRequirements.propTypes = {
  password: PropTypes.string,
  showStrength: PropTypes.bool,
};

export default PasswordRequirements;
