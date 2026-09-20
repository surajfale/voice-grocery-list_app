import React, { useState } from 'react';
import isEmail from 'validator/lib/isEmail';
import PropTypes from 'prop-types';
import { ShoppingCart, User, Mail, Lock, UserPlus, Eye, EyeOff, Info } from 'lucide-react';
import { useAuth } from './AuthContext';
import PasswordRequirements from './components/PasswordRequirements';
import { validatePassword } from './utils/passwordValidator';
import { Card } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Button } from './components/ui/button';
import { Alert, AlertDescription } from './components/ui/alert';

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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="p-8 shadow-lg">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <ShoppingCart className="size-10 text-primary" strokeWidth={2.25} />
              <h1 className="font-display text-3xl font-bold text-primary">
                Grocery List
              </h1>
            </div>
            <h2 className="font-display text-xl font-semibold mb-1">Create Your Account</h2>
            <p className="text-sm text-muted-foreground">
              Join us to start organizing your grocery shopping
            </p>
          </div>

          {/* Project Disclaimer Alert */}
          <Alert variant="info" className="mb-4">
            <Info />
            <AlertDescription>
              <strong className="text-foreground">Note:</strong> This is a personal learning project. Service availability is not guaranteed and data may be reset.
            </AlertDescription>
          </Alert>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First Name</Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange('firstName')}
                    required
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last Name</Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange('lastName')}
                    required
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange('email')}
                  required
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  required
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <PasswordRequirements password={formData.password} />

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleInputChange('confirmPassword')}
                  required
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" size="lg" disabled={loading} className="w-full">
              <UserPlus />
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          {/* Switch to Login */}
          <p className="text-center text-sm text-muted-foreground mt-5">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="font-semibold text-primary hover:underline"
            >
              Sign In
            </button>
          </p>

          {/* Privacy Note */}
          <p className="text-center text-xs text-muted-foreground mt-4">
            Your data is securely encrypted and stored in the cloud.
            <br />
            We never share your personal information.
          </p>
        </Card>
      </div>
    </div>
  );
};

RegisterPage.propTypes = {
  onSwitchToLogin: PropTypes.func.isRequired,
};

export default RegisterPage;
