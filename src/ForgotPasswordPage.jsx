import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import AuthLayout from './components/AuthLayout';
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
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset link."
    >

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
            <p className="text-sm text-muted-foreground mb-4">
              If an account exists for that email, a link arrives within a few minutes. Check spam if you don&apos;t see it.
            </p>
          )}

          {/* Forgot Password Form */}
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

            <Button type="submit" size="lg" disabled={loading} className="w-full">
              <Send />
              {loading ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>

          {/* Back to sign in */}
          <div className="text-center mt-5">
            <button
              type="button"
              onClick={onBackToLogin}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              <ArrowLeft className="size-4" />
              Back to sign in
            </button>
          </div>

    </AuthLayout>
  );
};

ForgotPasswordPage.propTypes = {
  onBackToLogin: PropTypes.func.isRequired,
};

export default ForgotPasswordPage;
