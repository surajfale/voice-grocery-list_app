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
  IconButton,
  Link,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  ShoppingCart,
  Email,
  Lock,
  Login,
} from '@mui/icons-material';
import { useAuth } from './AuthContext';

const LoginPage = ({ onSwitchToRegister, onSwitchToForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  // Debug: Log whenever error state changes
  React.useEffect(() => {
    console.log('🔍 Error state changed:', error);
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Basic validation
    if (!email.trim()) {
      setError('Email address is required');
      return;
    }
    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    setLoading(true);

    try {
      console.log('🔑 Attempting login for:', email);
      const result = await login(email, password);
      console.log('🔑 Login result:', result);

      if (!result.success) {
        const errorMessage = result.error || 'Login failed';
        console.log('🔑 Setting error message:', errorMessage);
        setError(errorMessage);
        setLoading(false); // Stop loading immediately when there's an error
        return;
      }

      // If successful, the AuthContext will handle navigation
      console.log('🔑 Login successful - AuthContext will handle navigation');
    } catch (err) {
      console.error('🔑 Login error caught:', err);
      setError('Login failed. Please try again.');
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
              Welcome Back!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sign in to access your grocery lists across all devices
            </Typography>
          </Box>

          {/* Project Disclaimer Alert */}
          <Alert
            severity="info"
            sx={{
              mb: 3,
              border: '1px solid #29b6f6',
              backgroundColor: 'rgba(41, 182, 246, 0.1)'
            }}
          >
            <Typography variant="body2">
              <strong>Note:</strong> This is a personal learning project. Service availability is not guaranteed and data may be reset.
            </Typography>
          </Alert>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Login Form */}
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

            <TextField
              fullWidth
              label="Password"
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
                mb: 1,
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

            {/* Forgot Password Link */}
            <Box sx={{ textAlign: 'right', mb: 2 }}>
              <Link
                component="button"
                type="button"
                variant="body2"
                onClick={onSwitchToForgotPassword}
                sx={{
                  textDecoration: 'none',
                  color: 'primary.main',
                  fontSize: '0.875rem',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                Forgot Password?
              </Link>
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              startIcon={<Login />}
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
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </Box>

          {/* Switch to Register */}
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Don't have an account?{' '}
              <Link
                component="button"
                variant="body2"
                onClick={onSwitchToRegister}
                sx={{
                  textDecoration: 'none',
                  fontWeight: 'bold',
                  color: 'primary.main',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                Create Account
              </Link>
            </Typography>
          </Box>

          {/* Privacy Note */}
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Your data is securely encrypted and stored in the cloud.
              <br />
              Access your lists from any device, anywhere.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

LoginPage.propTypes = {
  onSwitchToRegister: PropTypes.func.isRequired,
  onSwitchToForgotPassword: PropTypes.func.isRequired,
};

export default LoginPage;