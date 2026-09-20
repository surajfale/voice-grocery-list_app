import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { TriangleAlert, Trash2, CircleCheck, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';

/**
 * Delete Account Dialog Component
 * Multi-step dialog for securely deleting user account with:
 * 1. Warning and confirmation checkboxes
 * 2. Password re-authentication
 * 3. Final confirmation
 */
const DeleteAccountDialog = ({ open, onClose, onDeleteAccount, user, loading = false }) => {
  const [step, setStep] = useState(1); // 1: warning, 2: re-auth, 3: final confirmation
  const [confirmChecks, setConfirmChecks] = useState({
    dataLoss: false,
    irreversible: false,
    understood: false,
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const allChecksConfirmed = Object.values(confirmChecks).every(Boolean);

  const handleClose = () => {
    // Reset state
    setStep(1);
    setConfirmChecks({
      dataLoss: false,
      irreversible: false,
      understood: false,
    });
    setPassword('');
    setShowPassword(false);
    setError('');
    onClose();
  };

  const handleCheckChange = (key) => {
    setConfirmChecks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleNextStep = () => {
    setError('');
    setStep(step + 1);
  };

  const handleDeleteAccount = async () => {
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setError('');
    const result = await onDeleteAccount(password);

    if (!result.success) {
      setError(result.error || 'Failed to delete account');
    } else {
      handleClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !loading && handleClose()}>
      <DialogContent showCloseButton={!loading} className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-destructive flex items-center justify-center shrink-0 shadow-[0_4px_12px_-2px_var(--destructive)]">
              <Trash2 className="text-white size-5" />
            </div>
            <div>
              <DialogTitle>Delete Account</DialogTitle>
              <p className="text-xs text-muted-foreground">
                {step === 1 && 'Please read carefully'}
                {step === 2 && 'Confirm your identity'}
                {step === 3 && 'Final confirmation'}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Step 1: Warning and Confirmation */}
        {step === 1 && (
          <div>
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>⚠️ Warning: This action is permanent</AlertTitle>
              <AlertDescription>
                Deleting your account will permanently remove all your data. This action cannot be undone.
              </AlertDescription>
            </Alert>

            <p className="text-sm text-muted-foreground mb-2">
              The following data will be <strong className="text-foreground">permanently deleted</strong>:
            </p>

            <div className="p-3 mb-4 rounded-xl bg-destructive/5 border border-destructive/20">
              <ul className="space-y-2">
                {[
                  'All grocery lists and items',
                  'Account information and settings',
                  'All user preferences and history',
                ].map((text) => (
                  <li key={text} className="flex items-center gap-2.5">
                    <TriangleAlert className="size-4 text-destructive shrink-0" />
                    <span className="text-sm font-medium">{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-sm font-semibold mb-2">Please confirm you understand:</p>

            <div className="space-y-1">
              {[
                { key: 'dataLoss', label: 'I understand all my data will be permanently deleted' },
                { key: 'irreversible', label: 'I understand this action cannot be undone' },
                { key: 'understood', label: 'I want to permanently delete my account' },
              ].map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center gap-2.5 cursor-pointer p-2.5 rounded-lg hover:bg-accent"
                >
                  <Checkbox checked={confirmChecks[key]} onCheckedChange={() => handleCheckChange(key)} />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Re-authentication */}
        {step === 2 && (
          <div>
            <Alert variant="info" className="mb-4">
              <AlertTitle>🔐 Security Verification</AlertTitle>
              <AlertDescription>Please enter your password to confirm your identity.</AlertDescription>
            </Alert>

            <p className="text-sm text-muted-foreground mb-2">
              Account: <strong className="text-foreground">{user?.email}</strong>
            </p>

            <div className="relative mb-1">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                aria-invalid={!!error}
                className="pr-10"
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
            {error && <p className="text-xs text-destructive mb-2">{error}</p>}

            <Alert variant="warning" className="mt-3">
              <AlertDescription>
                After verification, you&apos;ll receive a confirmation email before your account is permanently deleted.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Step 3: Final Confirmation */}
        {step === 3 && (
          <div>
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>⚠️ Final Confirmation</AlertTitle>
              <AlertDescription>
                This is your last chance to cancel. Are you absolutely sure you want to delete your account?
              </AlertDescription>
            </Alert>

            <div className="p-5 mb-2 rounded-xl bg-success/5 border border-success/20 text-center">
              <CircleCheck className="size-12 text-success mx-auto mb-2" />
              <p className="font-semibold mb-1">What happens next?</p>
              <p className="text-sm text-muted-foreground">
                1. Your account will be signed out immediately<br />
                2. All your data will be permanently deleted<br />
                3. You&apos;ll receive a confirmation email<br />
                4. Your account will be completely removed
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={handleClose} disabled={loading} variant="outline">
            Cancel
          </Button>

          {step === 1 && (
            <Button
              onClick={handleNextStep}
              disabled={!allChecksConfirmed}
              className="bg-destructive text-white hover:bg-destructive/90 disabled:bg-destructive/30"
            >
              Continue
            </Button>
          )}

          {step === 2 && (
            <Button
              onClick={handleDeleteAccount}
              disabled={loading || !password.trim()}
              className="bg-destructive text-white hover:bg-destructive/90 disabled:bg-destructive/30"
            >
              {loading && <Loader2 className="animate-spin" />}
              {loading ? 'Deleting...' : 'Delete My Account'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

DeleteAccountDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onDeleteAccount: PropTypes.func.isRequired,
  user: PropTypes.object.isRequired,
  loading: PropTypes.bool,
};

export default DeleteAccountDialog;
