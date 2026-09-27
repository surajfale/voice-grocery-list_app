import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Trash2, Eye, EyeOff, Loader2, Lock, X } from 'lucide-react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import DialogHero from './DialogHero';

/**
 * Delete Account Dialog Component
 * Two-step dialog for securely deleting a user account:
 * 1. Warning and confirmation checkboxes
 * 2. Password re-authentication, then delete
 */
const DeleteAccountDialog = ({ open, onClose, onDeleteAccount, user, loading = false }) => {
  const [step, setStep] = useState(1); // 1: warning, 2: re-auth + delete
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

  const confirmations = [
    { key: 'dataLoss', label: 'I understand all my data will be permanently deleted' },
    { key: 'irreversible', label: 'I understand this action cannot be undone' },
    { key: 'understood', label: 'I want to permanently delete my account' },
  ];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !loading && handleClose()}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md p-0 gap-0 overflow-hidden focus-visible:outline-none"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          event.currentTarget?.focus?.();
        }}
      >
        <DialogHero
          icon={Trash2}
          tone="danger"
          title="Delete account"
          description={step === 1 ? 'Step 1 of 2 · Read this carefully' : 'Step 2 of 2 · Confirm it’s you'}
          showClose={!loading}
        >
          {/* Step progress */}
          <div className="grid grid-cols-2 gap-1.5 mt-4" aria-hidden="true">
            {[1, 2].map((n) => (
              <span
                key={n}
                className={`h-1.5 rounded-full transition-colors duration-300 ${
                  n <= step ? 'bg-[currentColor]' : 'bg-[color-mix(in_oklch,currentColor_25%,transparent)]'
                }`}
              />
            ))}
          </div>
        </DialogHero>

        <div className="px-6 pt-5 pb-6 space-y-5">
          {step === 1 && (
            <div key="step-1" className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="rounded-2xl border border-destructive/25 bg-destructive/[0.06] p-4">
                <p className="text-sm font-semibold mb-2">This permanently deletes:</p>
                <ul className="space-y-1.5">
                  {[
                    'All grocery lists and items',
                    'Account information and settings',
                    'All user preferences and history',
                  ].map((text) => (
                    <li key={text} className="flex items-center gap-2.5 text-sm">
                      <span className="size-5 rounded-full bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
                        <X className="size-3" strokeWidth={3} />
                      </span>
                      {text}
                    </li>
                  ))}
                </ul>
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold mb-2">Please confirm you understand</legend>
                {confirmations.map(({ key, label }) => (
                  <label
                    key={key}
                    className={`flex items-center gap-3 cursor-pointer rounded-xl border px-3 py-2.5 transition-colors ${
                      confirmChecks[key]
                        ? 'border-destructive/40 bg-destructive/[0.06]'
                        : 'border-border hover:bg-accent/60'
                    }`}
                  >
                    <Checkbox
                      checked={confirmChecks[key]}
                      onCheckedChange={() => handleCheckChange(key)}
                      className="data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </fieldset>
            </div>
          )}

          {step === 2 && (
            <div key="step-2" className="space-y-3 animate-in fade-in slide-in-from-right-2 duration-300">
              <p className="text-sm text-muted-foreground">
                Enter the password for <strong className="text-foreground">{user?.email}</strong> to confirm.
              </p>

              <div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && password.trim() && !loading) {
                        handleDeleteAccount();
                      }
                    }}
                    disabled={loading}
                    aria-invalid={!!error}
                    aria-label="Password"
                    autoFocus
                    className="h-11 rounded-xl pl-10 pr-10"
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
                {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
              </div>

              <p className="text-xs text-muted-foreground rounded-xl bg-muted/70 px-3 py-2.5">
                After verification, you&apos;ll receive a confirmation email before your account is permanently deleted.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleClose} disabled={loading} variant="outline" className="h-11 rounded-xl">
              Cancel
            </Button>

            {step === 1 ? (
              <Button
                onClick={handleNextStep}
                disabled={!allChecksConfirmed}
                variant="destructive"
                className="h-11 rounded-xl"
              >
                Continue
              </Button>
            ) : (
              <Button
                onClick={handleDeleteAccount}
                disabled={loading || !password.trim()}
                variant="destructive"
                className="h-11 rounded-xl"
              >
                {loading && <Loader2 className="animate-spin" />}
                {loading ? 'Deleting…' : 'Delete my account'}
              </Button>
            )}
          </div>
        </div>
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
