import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  TextField,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  CircularProgress,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Close,
  Warning,
  DeleteForever,
  CheckCircle,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useThemeContext } from '../contexts/ThemeContext';

/**
 * Delete Account Dialog Component
 * Multi-step dialog for securely deleting user account with:
 * 1. Warning and confirmation checkboxes
 * 2. Password re-authentication
 * 3. Final confirmation
 */
const DeleteAccountDialog = ({ open, onClose, onDeleteAccount, user, loading }) => {
  const _themeContext = useThemeContext();
  const [step, setStep] = useState(1); // 1: warning, 2: re-auth, 3: final confirmation
  const [confirmChecks, setConfirmChecks] = useState({
    dataLoss: false,
    irreversible: false,
    understood: false,
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const allChecksConfirmed = Object.values(confirmChecks).every(Boolean);

  const handleClose = () => {
    // Reset state
    setStep(1);
    setConfirmChecks({
      dataLoss: false,
      irreversible: false,
      understood: false,
    });
    setPassword('');
    setShowPassword(false);
    setError('');
    onClose();
  };

  const handleCheckChange = (key) => {
    setConfirmChecks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleNextStep = () => {
    setError('');
    setStep(step + 1);
  };

  const handleDeleteAccount = async () => {
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setError('');
    const result = await onDeleteAccount(password);

    if (!result.success) {
      setError(result.error || 'Failed to delete account');
    } else {
      handleClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={!loading ? handleClose : undefined}
      maxWidth="sm"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: '24px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
          borderBottom: '1px solid',
          borderBottomColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
            }}
          >
            <DeleteForever sx={{ color: 'white', fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Delete Account
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {step === 1 && 'Please read carefully'}
              {step === 2 && 'Confirm your identity'}
              {step === 3 && 'Final confirmation'}
            </Typography>
          </Box>
        </Box>

        <IconButton
          onClick={handleClose}
          disabled={loading}
          sx={{
            borderRadius: '12px',
            '&:hover': {
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: 'error.main',
            },
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 2 }}>
        {/* Step 1: Warning and Confirmation */}
        {step === 1 && (
          <Box>
            <Alert severity="error" sx={{ mb: 3 }}>
              <AlertTitle sx={{ fontWeight: 700 }}>⚠️ Warning: This action is permanent</AlertTitle>
              Deleting your account will permanently remove all your data. This action cannot be undone.
            </Alert>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              The following data will be <strong>permanently deleted</strong>:
            </Typography>

            <Box
              sx={{
                p: 2,
                mb: 3,
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid',
                borderColor: 'rgba(239, 68, 68, 0.2)',
              }}
            >
              <List dense>
                <ListItem>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Warning sx={{ color: 'error.main', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="All grocery lists and items"
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Warning sx={{ color: 'error.main', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Account information and settings"
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Warning sx={{ color: 'error.main', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="All user preferences and history"
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                  />
                </ListItem>
              </List>
            </Box>

            <Typography variant="body2" sx={{ mb: 2, fontWeight: 600 }}>
              Please confirm you understand:
            </Typography>

            <Box sx={{ pl: 1 }}>
              <Box
                onClick={() => handleCheckChange('dataLoss')}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  mb: 1,
                  p: 1.5,
                  borderRadius: '8px',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Checkbox checked={confirmChecks.dataLoss} size="small" />
                <Typography variant="body2" sx={{ ml: 1 }}>
                  I understand all my data will be permanently deleted
                </Typography>
              </Box>

              <Box
                onClick={() => handleCheckChange('irreversible')}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  mb: 1,
                  p: 1.5,
                  borderRadius: '8px',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Checkbox checked={confirmChecks.irreversible} size="small" />
                <Typography variant="body2" sx={{ ml: 1 }}>
                  I understand this action cannot be undone
                </Typography>
              </Box>

              <Box
                onClick={() => handleCheckChange('understood')}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  p: 1.5,
                  borderRadius: '8px',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Checkbox checked={confirmChecks.understood} size="small" />
                <Typography variant="body2" sx={{ ml: 1 }}>
                  I want to permanently delete my account
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* Step 2: Re-authentication */}
        {step === 2 && (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              <AlertTitle sx={{ fontWeight: 700 }}>🔐 Security Verification</AlertTitle>
              Please enter your password to confirm your identity.
            </Alert>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Account: <strong>{user?.email}</strong>
            </Typography>

            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              error={!!error}
              helperText={error}
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Alert severity="warning" sx={{ mt: 2 }}>
              After verification, you'll receive a confirmation email before your account is permanently deleted.
            </Alert>
          </Box>
        )}

        {/* Step 3: Final Confirmation */}
        {step === 3 && (
          <Box>
            <Alert severity="error" sx={{ mb: 3 }}>
              <AlertTitle sx={{ fontWeight: 700 }}>⚠️ Final Confirmation</AlertTitle>
              This is your last chance to cancel. Are you absolutely sure you want to delete your account?
            </Alert>

            <Box
              sx={{
                p: 3,
                mb: 2,
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid',
                borderColor: 'rgba(16, 185, 129, 0.2)',
                textAlign: 'center',
              }}
            >
              <CheckCircle sx={{ color: 'success.main', fontSize: 48, mb: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                What happens next?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                1. Your account will be signed out immediately<br />
                2. All your data will be permanently deleted<br />
                3. You'll receive a confirmation email<br />
                4. Your account will be completely removed
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2, gap: 1 }}>
        <Button
          onClick={handleClose}
          disabled={loading}
          variant="outlined"
          sx={{
            borderRadius: '12px',
            px: 3,
            py: 1.5,
            borderColor: 'divider',
          }}
        >
          Cancel
        </Button>

        {step === 1 && (
          <Button
            onClick={handleNextStep}
            disabled={!allChecksConfirmed}
            variant="contained"
            sx={{
              borderRadius: '12px',
              px: 3,
              py: 1.5,
              background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
              },
              '&:disabled': {
                background: 'rgba(239, 68, 68, 0.3)',
              },
            }}
          >
            Continue
          </Button>
        )}

        {step === 2 && (
          <Button
            onClick={handleDeleteAccount}
            disabled={loading || !password.trim()}
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{
              borderRadius: '12px',
              px: 3,
              py: 1.5,
              background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
              },
              '&:disabled': {
                background: 'rgba(239, 68, 68, 0.3)',
              },
            }}
          >
            {loading ? 'Deleting...' : 'Delete My Account'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

DeleteAccountDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onDeleteAccount: PropTypes.func.isRequired,
  user: PropTypes.object.isRequired,
  loading: PropTypes.bool,
};

DeleteAccountDialog.defaultProps = {
  loading: false,
};

export default DeleteAccountDialog;
