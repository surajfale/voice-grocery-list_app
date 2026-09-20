import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { ShoppingCart, Mail, ArrowLeft, Send, Info } from 'lucide-react';
import { Card } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Button } from './components/ui/button';
import { Alert, AlertDescription } from './components/ui/alert';

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
    } catch {
      setError('Failed to send reset email. Please try again.');
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
            <h2 className="font-display text-xl font-semibold mb-1">Forgot Password?</h2>
            <p className="text-sm text-muted-foreground">
              Enter your email address and we&apos;ll send you a link to reset your password
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
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Info Note */}
          {!success && (
            <Alert variant="info" className="mb-4">
              <Info />
              <AlertDescription>
                <strong className="text-foreground">Note:</strong> For security reasons, we&apos;ll send a password reset email only if an account exists with the provided email address. If you don&apos;t receive an email within a few minutes, please check your spam folder or verify that you entered the correct email.
              </AlertDescription>
            </Alert>
          )}

          {/* Forgot Password Form */}
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

            <Button type="submit" size="lg" disabled={loading} className="w-full">
              <Send />
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>

          {/* Back to Login */}
          <div className="text-center mt-5">
            <button
              type="button"
              onClick={onBackToLogin}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              <ArrowLeft className="size-4" />
              Back to Login
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

ForgotPasswordPage.propTypes = {
  onBackToLogin: PropTypes.func.isRequired,
};

export default ForgotPasswordPage;
