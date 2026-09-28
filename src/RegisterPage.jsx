import React, { useState } from 'react';
import isEmail from 'validator/lib/isEmail';
import PropTypes from 'prop-types';
import { User, Mail, Lock, UserPlus, Eye, EyeOff, KeyRound, LogIn, Loader2 } from 'lucide-react';
import { useAuth } from './AuthContext';
import PasswordRequirements from './components/PasswordRequirements';
import { validatePassword } from './utils/passwordValidator';
import AuthLayout from './components/AuthLayout';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Button } from './components/ui/button';
import { Alert, AlertDescription } from './components/ui/alert';
import { Checkbox } from './components/ui/checkbox';
import PersonalUseNotice from './components/PersonalUseNotice';
import { useSignupMode } from './hooks/useSignupMode';

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
  const [inviteCode, setInviteCode] = useState('');
  // Local only: never sent to or stored by the server
  const [acknowledged, setAcknowledged] = useState(false);
  const { register } = useAuth();
  const signupMode = useSignupMode();
  // 'unknown' (e.g. offline): show the field and let the server decide
  const showInviteField = signupMode === 'invite' || signupMode === 'unknown';
  const inviteRequired = signupMode === 'invite';

  const handleInputChange = (field) => (e) => {
    setFormData({
      ...formData,
      [field]: e.target.value
    });
  };

  const validateForm = () => {
    const { firstName, lastName, email, password, confirmPassword } = formData;

    if (inviteRequired && !inviteCode.trim()) {
      return 'Invite code is required';
    }

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

    if (!acknowledged) {
      return 'Please confirm you understand this is a personal learning project.';
    }

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
        formData.password,
        showInviteField ? inviteCode.trim() : undefined
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

  if (signupMode === 'closed') {
    return (
      <AuthLayout title="Sign-up is closed" footer={null}>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Sign-up is closed. This is a personal learning project and isn&apos;t taking new accounts.
        </p>
        <Button
          type="button"
          size="lg"
          onClick={onSwitchToLogin}
          className="w-full h-12 rounded-xl btn-gradient border-0 hover:opacity-95 mt-6"
        >
          <LogIn />
          Sign in
        </Button>
      </AuthLayout>
    );
  }

  if (signupMode === 'loading') {
    return (
      <AuthLayout title="Create your account" footer={null}>
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Checking whether sign-up is open…
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Your lists, synced across devices."
      footer={null}
    >

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {showInviteField && (
              <div className="space-y-1.5">
                <Label htmlFor="inviteCode">
                  Invite code{!inviteRequired && <span className="font-normal text-muted-foreground"> (if you have one)</span>}
                </Label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="inviteCode"
                    value={inviteCode}
                    onChange={(event) => setInviteCode(event.target.value)}
                    required={inviteRequired}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="pl-10"
                  />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First name</Label>
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
                <Label htmlFor="lastName">Last name</Label>
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
              <Label htmlFor="email">Email</Label>
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
              <Label htmlFor="confirmPassword">Confirm password</Label>
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

            <PersonalUseNotice variant="full" />

            <div className="flex items-start gap-3">
              <Checkbox
                id="acknowledge"
                checked={acknowledged}
                onCheckedChange={(checked) => setAcknowledged(checked === true)}
                required
                className="mt-0.5"
              />
              <Label htmlFor="acknowledge" className="text-sm font-normal leading-snug cursor-pointer">
                I understand this is a personal learning project, not a public service.
              </Label>
            </div>

            <Button type="submit" size="lg" disabled={loading || !acknowledged} className="w-full h-12 rounded-xl btn-gradient border-0 hover:opacity-95">
              <UserPlus />
              {loading ? 'Creating account…' : 'Create account'}
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
              Sign in
            </button>
          </p>

    </AuthLayout>
  );
};

RegisterPage.propTypes = {
  onSwitchToLogin: PropTypes.func.isRequired,
};

export default RegisterPage;
