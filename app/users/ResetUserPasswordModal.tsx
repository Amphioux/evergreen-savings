'use client';

import { useState } from 'react';
import { resetUserPasswordBySuperAdmin } from '@/app/actions';
import { KeyRound, X, CheckCircle2, AlertCircle, Lock, ShieldAlert } from 'lucide-react';

interface ResetUserPasswordModalProps {
  user: {
    id: string;
    full_name: string;
    account_id: string;
    role: string;
  };
}

export default function ResetUserPasswordModal({ user }: ResetUserPasswordModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<{ error?: string; success?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.append('user_id', user.id);

    const newPassword = formData.get('new_password') as string;
    const confirmPassword = formData.get('confirm_password') as string;

    if (newPassword !== confirmPassword) {
      setLoading(false);
      setStatus({ error: 'Passwords do not match. Please verify.' });
      return;
    }

    const res = await resetUserPasswordBySuperAdmin(formData);
    setLoading(false);

    if (res?.error) {
      setStatus({ error: res.error });
    } else if (res?.success) {
      setStatus({ success: res.success });
      setTimeout(() => {
        setIsOpen(false);
        setStatus(null);
      }, 1800);
    }
  }

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(true);
          setStatus(null);
        }}
        className="px-2.5 py-1 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg flex items-center gap-1 transition-colors"
        title="Override Password"
      >
        <KeyRound size={13} /> Reset Pass
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-left">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden p-6 space-y-4 text-xs font-sans">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <div className="p-1.5 bg-amber-100 text-amber-900 rounded-lg">
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Superadmin Password Override</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Set credentials for target account</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Target Account Badge */}
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-mono flex justify-between items-center">
              <div>
                <span className="text-[10px] text-slate-400 block font-sans font-semibold">Target Account</span>
                <strong className="text-slate-900 font-bold text-xs">{user.full_name}</strong>
              </div>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-900 rounded text-[10px] font-extrabold">
                {user.account_id}
              </span>
            </div>

            {/* Alerts */}
            {status?.error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 font-bold rounded-lg flex items-center gap-2">
                <AlertCircle size={15} /> {status.error}
              </div>
            )}

            {status?.success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold rounded-lg flex items-center gap-2">
                <CheckCircle2 size={15} /> {status.success}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">New Password * (Min 6 chars)</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    name="new_password"
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Confirm New Password *</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    name="confirm_password"
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-700"
                  />
                </div>
              </div>

              <button
                disabled={loading}
                type="submit"
                className="w-full bg-amber-800 hover:bg-amber-900 disabled:bg-slate-400 text-white font-bold py-2.5 rounded-lg transition-colors mt-2"
              >
                {loading ? 'Overriding Credentials...' : 'Save New Credentials'}
              </button>
            </form>

          </div>
        </div>
      )}
    </>
  );
}