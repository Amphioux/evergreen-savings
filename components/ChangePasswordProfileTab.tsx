'use client';

import { useState, useRef } from 'react';
import { changeOwnPassword } from '@/app/actions';
import { KeyRound, CheckCircle2, AlertCircle, Lock } from 'lucide-react';

export default function ChangePasswordProfileTab() {
  const [status, setStatus] = useState<{ error?: string; success?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    setStatus(null);
    setLoading(true);

    const res = await changeOwnPassword(formData);
    setLoading(false);

    if (res?.error) {
      setStatus({ error: res.error });
    } else if (res?.success) {
      setStatus({ success: res.success });
      formRef.current?.reset();
    }
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-lg space-y-4 text-left">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <div className="p-2 bg-blue-50 text-blue-800 rounded-lg">
          <KeyRound size={18} />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Security & Credentials</h3>
          <p className="text-xs text-slate-500">Update your account login password</p>
        </div>
      </div>

      {status?.error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-lg flex items-center gap-2">
          <AlertCircle size={15} /> {status.error}
        </div>
      )}

      {status?.success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-2">
          <CheckCircle2 size={15} /> {status.success}
        </div>
      )}

      <form ref={formRef} action={handleSubmit} className="space-y-3 text-xs">
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
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-700"
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
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-700"
            />
          </div>
        </div>

        <button
          disabled={loading}
          type="submit"
          className="w-full bg-blue-900 hover:bg-blue-800 disabled:bg-slate-400 text-white font-bold py-2.5 rounded-lg transition-colors mt-2"
        >
          {loading ? 'Updating Password...' : 'Save New Password'}
        </button>
      </form>
    </div>
  );
}