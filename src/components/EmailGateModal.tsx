import React, { useState } from 'react';
import {
  ShieldCheck,
  Mail,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Lock,
  RefreshCw,
  LogOut,
  Sparkles,
  Database,
} from 'lucide-react';
import { AuthSession } from '../types';

interface EmailGateModalProps {
  isOpen: boolean;
  onLoginSuccess: (session: AuthSession) => void;
  pendingEmail?: string | null;
  setPendingEmail?: (email: string | null) => void;
}

export const EmailGateModal: React.FC<EmailGateModalProps> = ({
  isOpen,
  onLoginSuccess,
  pendingEmail,
  setPendingEmail,
}) => {
  const [email, setEmail] = useState(pendingEmail || '');
  const [status, setStatus] = useState<'idle' | 'checking' | 'pending' | 'rejected' | 'approved'>(
    pendingEmail ? 'pending' : 'idle'
  );
  const [sessionData, setSessionData] = useState<AuthSession | null>(
    pendingEmail ? { email: pendingEmail, role: 'user', status: 'pending', approved: false } : null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!isOpen) return null;

  const handleCheckAccess = async (targetEmail: string) => {
    const clean = targetEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@') || !clean.includes('.')) {
      setErrorMsg('Please enter a valid email address (e.g. name@example.com)');
      return;
    }

    setErrorMsg(null);
    setStatus('checking');

    try {
      const res = await fetch('/api/auth/check-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clean }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify email');
      }

      const session: AuthSession = {
        email: data.email,
        role: data.role,
        status: data.status,
        approved: data.approved,
      };

      setSessionData(session);
      setStatus(data.status);

      if (data.status === 'pending') {
        if (setPendingEmail) setPendingEmail(data.email);
      } else if (data.approved) {
        if (setPendingEmail) setPendingEmail(null);
        onLoginSuccess(session);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error. Please try again.');
      setStatus('idle');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCheckAccess(email);
  };

  const handleRefreshStatus = async () => {
    if (!sessionData?.email) return;
    setIsRefreshing(true);
    await handleCheckAccess(sessionData.email);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleSwitchEmail = () => {
    setStatus('idle');
    setSessionData(null);
    setErrorMsg(null);
    setEmail('');
    if (setPendingEmail) setPendingEmail(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Icon */}
        <div className="flex items-center justify-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <Database className="w-7 h-7" />
          </div>
        </div>

        {/* Pending Screen */}
        {status === 'pending' ? (
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>Access Request Submitted</span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Waiting for Admin Approval
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
              Aap ki email <strong className="text-emerald-300 font-mono">{sessionData?.email}</strong> system me darj ho chuki hai.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-left text-xs space-y-2 text-slate-400">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-200">100% Private Workspace:</strong> Aap ki sheets aur searches bilkul mehfooz hain, koi doosra user aap ka data nahi dekh sakta.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Admin (<span className="text-slate-300 font-mono">mikerama845@gmail.com</span>) ke panel me aap ki request pohnch chuki hai. Jaise hi Admin <strong>"Approve"</strong> par click karega, aap foran enter ho sakein gay.
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleRefreshStatus}
                disabled={isRefreshing}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Check Access Status</span>
              </button>

              <button
                type="button"
                onClick={handleSwitchEmail}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 transition-colors cursor-pointer border border-slate-700/60"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Use Different Email</span>
              </button>
            </div>
          </div>
        ) : status === 'rejected' ? (
          /* Rejected Screen */
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Access Denied</span>
            </div>

            <h2 className="text-lg font-bold text-white">Access Not Granted</h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Aap ki email <span className="font-mono text-slate-300">{sessionData?.email}</span> ko access deny kiya gaya hai. Barahe mehrbani Administrator se rabta karein.
            </p>

            <button
              type="button"
              onClick={handleSwitchEmail}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 cursor-pointer"
            >
              <span>Switch Email</span>
            </button>
          </div>
        ) : (
          /* Default Email Entry Form */
          <div>
            <div className="text-center mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                SEO Reseller Site Finder
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Enter your email address to enter the platform or request access.
              </p>
            </div>

            {/* Privacy Promise Badge */}
            <div className="mb-5 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 flex items-start gap-2.5 text-xs text-emerald-300/90 leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-emerald-200">Data Isolation & Complete Privacy:</strong>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Har user ka data aur vendor sheets 100% private hain. Koi doosra shakhs aap ka data nahi dekh sakta, aur na aap kisi aur ka.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Your Business / Personal Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. yourname@gmail.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950/90 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-mono"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'checking'}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {status === 'checking' ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Access...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>Admin Managed Access</span>
              </span>
              <span>Owner: mikerama845@gmail.com</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
