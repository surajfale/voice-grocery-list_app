import React, { useState } from 'react';
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
  Link,
} from '@mui/material';
import {
  ShoppingCart,
  Email,
  ArrowBack,
  Send,
} from '@mui/icons-material';

const ForgotPasswordPage = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Basic validation
    if (!email.trim()) {
      setError('Email address is required');
      return;
    }

    setLoading(true);

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiBaseUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to send reset email. Please try again.');
        setLoading(false);
        return;
      }

      setSuccess('An email has been sent with a link to reset your password. You will receive the email if you provided the correct email address. Please check your inbox and spam folder.');
      setEmail('');
      setLoading(false);
    } catch (err) {
      console.error('Forgot password error:', err);
      setError('Failed to send reset email. Please try again.');
      setLoading(false);
    }
  };

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
              Forgot Password?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Enter your email address and we'll send you a link to reset your password
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
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}

          {/* Info Note */}
          {!success && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Note:</strong> For security reasons, we'll send a password reset email only if an account exists with the provided email address. If you don't receive an email within a few minutes, please check your spam folder or verify that you entered the correct email.
              </Typography>
            </Alert>
          )}

          {/* Forgot Password Form */}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color="action" />
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
              startIcon={<Send />}
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
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </Box>

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
              Back to Login
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

ForgotPasswordPage.propTypes = {
  onBackToLogin: PropTypes.func.isRequired,
};

export default ForgotPasswordPage;
