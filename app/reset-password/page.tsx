'use client';

import { useState } from 'react';
import { updatePasswordWithToken } from '@/app/actions';
import { KeyRound, CheckCircle2, AlertCircle, Lock } from 'lucide-react';

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<{ error?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setStatus(null);
    setLoading(true);

    const res = await updatePasswordWithToken(formData);
    setLoading(false);

    if (res?.error) {
      setStatus({ error: res.error });
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full border border-slate-200 space-y-4 text-left">
        
        <div className="flex items-center gap-2 font-bold text-slate-900 text-base border-b border-slate-100 pb-3">
          <div className="p-2 bg-blue-50 text-blue-800 rounded-lg">
            <KeyRound size={20} />
          </div>
          <h2>Set New Password</h2>
        </div>

        {status?.error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-lg flex items-center gap-2">
            <AlertCircle size={15} /> {status.error}
          </div>
        )}

        <form action={handleSubmit} className="space-y-3 text-xs">
          <p className="text-slate-500 font-medium leading-relaxed">
            Please choose a new secure password for your cooperative portal account.
          </p>

          <div>
            <label className="block font-bold text-slate-700 mb-1">New Password * (Min 6 chars)</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                name="password"
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
            className="w-full bg-blue-900 hover:bg-blue-800 disabled:bg-slate-400 text-white font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 mt-2"
          >
            <CheckCircle2 size={16} />
            {loading ? 'Saving Password...' : 'Save Password & Log In'}
          </button>
        </form>

      </div>
    </div>
  );
}