import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Container,
  Alert,
  InputAdornment,
  IconButton,
  Link,
} from '@mui/material';
import {
  ShoppingCart,
  Lock,
  Visibility,
  VisibilityOff,
  ArrowBack,
  CheckCircle,
} from '@mui/icons-material';
import PasswordRequirements from './components/PasswordRequirements';
import { validatePassword } from './utils/passwordValidator';

const ResetPasswordPage = ({ token, onBackToLogin }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  // Validate token on component mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Invalid or missing reset token');
        setValidatingToken(false);
        return;
      }

      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
        const response = await fetch(`${apiBaseUrl}/auth/validate-reset-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          setError(data.error || 'Invalid or expired reset token');
          setTokenValid(false);
        } else {
          setTokenValid(true);
        }
      } catch (err) {
        console.error('Token validation error:', err);
        setError('Failed to validate reset token. Please try again.');
        setTokenValid(false);
      } finally {
        setValidatingToken(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate password
    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setError('Password does not meet security requirements. Please check the requirements below.');
      return;
    }

    /* eslint-disable security/detect-possible-timing-attacks */
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    /* eslint-enable security/detect-possible-timing-attacks */

    setLoading(true);

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiBaseUrl}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to reset password. Please try again.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setPassword('');
      setConfirmPassword('');
      setLoading(false);
    } catch (err) {
      console.error('Password reset error:', err);
      setError('Failed to reset password. Please try again.');
      setLoading(false);
    }
  };

  if (validatingToken) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        }}
      >
        <Typography variant="h6" color="white">
          Validating reset token...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            p: 4,
            borderRadius: 3,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                mb: 2,
              }}
            >
              <ShoppingCart
                sx={{
                  fontSize: 48,
                  color: 'primary.main',
                  mr: 1,
                }}
              />
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontWeight: 'bold',
                  background: 'linear-gradient(45deg, #2196f3, #4caf50)',
                  backgroundClip: 'text',
                  textFillColor: 'transparent',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Grocery List
              </Typography>
            </Box>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              Reset Password
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {success ? 'Password reset successful!' : 'Enter your new password below'}
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert
              severity="success"
              icon={<CheckCircle />}
              sx={{ mb: 3 }}
            >
              Your password has been successfully reset! You can now log in with your new password.
            </Alert>
          )}

          {/* Reset Password Form */}
          {!success && tokenValid && (
            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 2,
                  '& .MuiInputBase-input': {
                    color: '#000000',
                  },
                  '& .MuiInputLabel-root': {
                    color: '#666666',
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#2196f3',
                  },
                }}
              />

              {/* Password Requirements */}
              <PasswordRequirements password={password} />

              <TextField
                fullWidth
                label="Confirm New Password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                margin="normal"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 3,
                  '& .MuiInputBase-input': {
                    color: '#000000',
                  },
                  '& .MuiInputLabel-root': {
                    color: '#666666',
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#2196f3',
                  },
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                startIcon={<CheckCircle />}
                sx={{
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  background: 'linear-gradient(45deg, #2196f3, #4caf50)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #1976d2, #388e3c)',
                  },
                  mb: 2
                }}
              >
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </Button>
            </Box>
          )}

          {/* Back to Login */}
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Link
              component="button"
              variant="body2"
              onClick={onBackToLogin}
              sx={{
                textDecoration: 'none',
                fontWeight: 'bold',
                color: 'primary.main',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              <ArrowBack fontSize="small" />
              {success ? 'Go to Login' : 'Back to Login'}
            </Link>
          </Box>

          {/* Privacy Note */}
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Your data is securely encrypted and stored in the cloud.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

ResetPasswordPage.propTypes = {
  token: PropTypes.string,
  onBackToLogin: PropTypes.func.isRequired,
};

export default ResetPasswordPage;
