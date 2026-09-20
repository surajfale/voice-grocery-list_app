import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { ShoppingCart, Mail, Lock, LogIn, Eye, EyeOff, TriangleAlert } from 'lucide-react';
import { useAuth } from './AuthContext';
import { Card } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Button } from './components/ui/button';
import { Alert, AlertDescription } from './components/ui/alert';

const LoginPage = ({ onSwitchToRegister, onSwitchToForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

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
      const result = await login(email, password);

      if (!result.success) {
        setError(result.error || 'Login failed');
        setLoading(false); // Stop loading immediately when there's an error
        return;
      }

      // If successful, the AuthContext will handle navigation
    } catch {
      setError('Login failed. Please try again.');
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
            <h2 className="font-display text-xl font-semibold mb-1">Welcome Back!</h2>
            <p className="text-sm text-muted-foreground">
              Sign in to access your grocery lists across all devices
            </p>
          </div>

          {/* Project Disclaimer Alert */}
          <Alert variant="warning" className="mb-4">
            <TriangleAlert />
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

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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

            <div className="text-right">
              <button
                type="button"
                onClick={onSwitchToForgotPassword}
                className="text-sm font-medium text-primary hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            <Button type="submit" size="lg" disabled={loading} className="w-full">
              <LogIn />
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          {/* Switch to Register */}
          <p className="text-center text-sm text-muted-foreground mt-5">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="font-semibold text-primary hover:underline"
            >
              Create Account
            </button>
          </p>

          {/* Privacy Note */}
          <p className="text-center text-xs text-muted-foreground mt-4">
            Your data is securely encrypted and stored in the cloud.
            <br />
            Access your lists from any device, anywhere.
          </p>
        </Card>
      </div>
    </div>
  );
};

LoginPage.propTypes = {
  onSwitchToRegister: PropTypes.func.isRequired,
  onSwitchToForgotPassword: PropTypes.func.isRequired,
};

export default LoginPage;
