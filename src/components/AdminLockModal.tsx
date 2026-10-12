import React, { useState } from 'react';
import { X, Lock, KeyRound, Check, AlertCircle, Shield } from 'lucide-react';
import { isPinCorrect, setCustomPin } from '../utils/security';

interface AdminLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlockSuccess: () => void;
}

export const AdminLockModal: React.FC<AdminLockModalProps> = ({
  isOpen,
  onClose,
  onUnlockSuccess,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [currentPinForChange, setCurrentPinForChange] = useState('');
  const [newPin, setNewPin] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setError('Please enter your Owner PIN');
      return;
    }

    if (isPinCorrect(pin)) {
      setError(null);
      setPin('');
      onUnlockSuccess();
      onClose();
    } else {
      setError('Incorrect password. Please enter the Owner Password.');
    }
  };

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPinForChange.trim() || !newPin.trim()) {
      setError('Please fill in both password fields');
      return;
    }

    if (!isPinCorrect(currentPinForChange)) {
      setError('Current password is incorrect');
      return;
    }

    if (newPin.trim().length < 4) {
      setError('New password should be at least 4 characters');
      return;
    }

    setCustomPin(newPin.trim());
    setSuccessMsg('Owner password updated successfully!');
    setError(null);
    setCurrentPinForChange('');
    setNewPin('');
    setTimeout(() => {
      setSuccessMsg(null);
      setIsChangingPin(false);
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Owner Security Lock</h3>
              <p className="text-[11px] text-slate-400">
                Protect sheets from unauthorized edits, deletions, or uploads.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {!isChangingPin ? (
            <form onSubmit={handleUnlock} className="space-y-4">
              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center text-emerald-400 mx-auto mb-2">
                  <Lock className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-medium text-slate-200">Enter Owner Password to Unlock</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Only the database owner can toggle locked mode.
                </p>
              </div>

              <div>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter Owner Password"
                  className="w-full text-center tracking-widest text-base font-mono py-2.5 px-4 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                  autoFocus
                />
              </div>

              {error && (
                <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-950/40 border border-red-500/30 p-2.5 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer"
              >
                Unlock Edit Mode
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setIsChangingPin(true);
                  }}
                  className="text-xs text-slate-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Change Owner PIN</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleChangePin} className="space-y-4">
              <div className="text-center py-1">
                <h4 className="text-sm font-medium text-slate-200">Set New Owner PIN</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Choose a secret code only you know.
                </p>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Current PIN:</label>
                <input
                  type="password"
                  value={currentPinForChange}
                  onChange={(e) => setCurrentPinForChange(e.target.value)}
                  placeholder="Enter current PIN"
                  className="w-full text-xs font-mono py-2 px-3 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">New PIN / Password:</label>
                <input
                  type="password"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="Enter new 4+ digit PIN"
                  className="w-full text-xs font-mono py-2 px-3 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              {error && (
                <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-950/40 border border-red-500/30 p-2 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 p-2 rounded-lg">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsChangingPin(false)}
                  className="w-1/2 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer"
                >
                  Save New PIN
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};
