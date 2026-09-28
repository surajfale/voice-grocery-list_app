import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Mail, Lock, LogIn, Eye, EyeOff, } from 'lucide-react';
import { useAuth } from './AuthContext';
import AuthLayout from './components/AuthLayout';
import PersonalUseNotice from './components/PersonalUseNotice';
import { useSignupMode } from './hooks/useSignupMode';
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
  const signupMode = useSignupMode();
  // No sign-up link while loading (avoids a flash) or when sign-up is closed
  const canSignUp = signupMode !== 'loading' && signupMode !== 'closed';

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
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to see your lists on any device."
      footer={<PersonalUseNotice variant="short" />}
    >

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
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
                Forgot password?
              </button>
            </div>

            <Button type="submit" size="lg" disabled={loading} className="w-full h-12 rounded-xl btn-gradient border-0 hover:opacity-95">
              <LogIn />
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          {/* Switch to Register (hidden when sign-up is closed) */}
          {canSignUp && (
            <p className="text-center text-sm text-muted-foreground mt-5">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="font-semibold text-primary hover:underline"
              >
                Create account
              </button>
            </p>
          )}

    </AuthLayout>
  );
};

LoginPage.propTypes = {
  onSwitchToRegister: PropTypes.func.isRequired,
  onSwitchToForgotPassword: PropTypes.func.isRequired,
};

export default LoginPage;
