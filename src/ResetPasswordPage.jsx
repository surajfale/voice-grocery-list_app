import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { ShoppingCart, Lock, Eye, EyeOff, ArrowLeft, CircleCheck } from 'lucide-react';
import PasswordRequirements from './components/PasswordRequirements';
import { validatePassword } from './utils/passwordValidator';
import { Card } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Button } from './components/ui/button';
import { Alert, AlertDescription } from './components/ui/alert';

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
      } catch {
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
    } catch {
      setError('Failed to reset password. Please try again.');
      setLoading(false);
    }
  };

  if (validatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground font-medium">Validating reset token...</p>
      </div>
    );
  }

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
            <h2 className="font-display text-xl font-semibold mb-1">Reset Password</h2>
            <p className="text-sm text-muted-foreground">
              {success ? 'Password reset successful!' : 'Enter your new password below'}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert variant="success" className="mb-4">
              <CircleCheck />
              <AlertDescription>
                Your password has been successfully reset! You can now log in with your new password.
              </AlertDescription>
            </Alert>
          )}

          {/* Reset Password Form */}
          {!success && tokenValid && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
              <PasswordRequirements password={password} />

              <div className="space-y-1.5">
                <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="confirm-new-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                <CircleCheck />
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </Button>
            </form>
          )}

          {/* Back to Login */}
          <div className="text-center mt-5">
            <button
              type="button"
              onClick={onBackToLogin}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              <ArrowLeft className="size-4" />
              {success ? 'Go to Login' : 'Back to Login'}
            </button>
          </div>

          {/* Privacy Note */}
          <p className="text-center text-xs text-muted-foreground mt-4">
            Your data is securely encrypted and stored in the cloud.
          </p>
        </Card>
      </div>
    </div>
  );
};

ResetPasswordPage.propTypes = {
  token: PropTypes.string,
  onBackToLogin: PropTypes.func.isRequired,
};

export default ResetPasswordPage;
