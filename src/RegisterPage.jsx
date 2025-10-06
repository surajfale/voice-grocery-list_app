import React, { useState } from 'react';
import isEmail from 'validator/lib/isEmail';
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
  Grid,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  ShoppingCart,
  Person,
  Lock,
  Email,
  PersonAdd,
} from '@mui/icons-material';
import { useAuth } from './AuthContext';
import PasswordRequirements from './components/PasswordRequirements';
import { validatePassword } from './utils/passwordValidator';

const RegisterPage = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleInputChange = (field) => (e) => {
    setFormData({
      ...formData,
      [field]: e.target.value
    });
  };

  const validateForm = () => {
    const { firstName, lastName, email, password, confirmPassword } = formData;

    if (!firstName.trim()) {
      return 'First name is required';
    }

    if (!lastName.trim()) {
      return 'Last name is required';
    }

    if (!email.trim()) {
      return 'Email is required';
    }

    // Use validator's isEmail for robust validation (small, well-known library)
    if (!isEmail(email)) {
      return 'Please enter a valid email address';
    }

    if (!password) {
      return 'Password is required';
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return 'Password does not meet security requirements. Please check the requirements below.';
    }

    /* eslint-disable security/detect-possible-timing-attacks */
    if (password !== confirmPassword) {
      return 'Passwords do not match';
    }
    /* eslint-enable security/detect-possible-timing-attacks */

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const result = await register(
        formData.firstName,
        formData.lastName,
        formData.email,
        formData.password
      );

      if (!result.success) {
        setError(result.error);
      }
      // If successful, AuthContext will handle navigation
    } catch {
      setError('Registration failed. Please try again.');
    } finally {
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
              Create Your Account
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Join us to start organizing your grocery shopping
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Registration Form */}
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={formData.firstName}
                  onChange={handleInputChange('firstName')}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person color="action" />
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
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={formData.lastName}
                  onChange={handleInputChange('lastName')}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person color="action" />
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
              </Grid>
            </Grid>

            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
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
              value={formData.password}
              onChange={handleInputChange('password')}
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
            <PasswordRequirements password={formData.password} />

            <TextField
              fullWidth
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
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
              startIcon={<PersonAdd />}
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
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </Box>

          {/* Switch to Login */}
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Link
                component="button"
                variant="body2"
                onClick={onSwitchToLogin}
                sx={{
                  textDecoration: 'none',
                  fontWeight: 'bold',
                  color: 'primary.main',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                Sign In
              </Link>
            </Typography>
          </Box>

          {/* Privacy Note */}
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Your data is securely encrypted and stored in the cloud.
              <br />
              We never share your personal information.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

RegisterPage.propTypes = {
  onSwitchToLogin: PropTypes.func.isRequired,
};

export default RegisterPage;