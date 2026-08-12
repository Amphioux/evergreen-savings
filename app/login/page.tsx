'use client';

import { useState, useRef } from 'react';
import { loginUser } from '@/app/actions';
import { Lock, User, KeyRound } from 'lucide-react';
import ForgotPasswordModal from './ForgotPasswordModal';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);

    const res = await loginUser(formData);
    setLoading(false);

    if (res?.error) {
      setError(res.error);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex p-3 bg-emerald-100 text-emerald-800 rounded-full mb-2">
            <KeyRound size={28} />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Sign In to Portal</h1>
          <p className="text-xs text-slate-500">
            Enter your assigned Account ID or Email address to log in
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg text-center">
            {error}
          </div>
        )}

        <form ref={formRef} action={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Account ID or Email Address
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                name="login_identifier"
                required
                type="text"
                placeholder="Account ID or Email Address"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                name="password"
                required
                type="password"
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full bg-emerald-900 hover:bg-emerald-800 disabled:bg-slate-400 text-white font-bold text-sm py-2.5 rounded-lg transition-colors mt-2"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* FORGOT PASSWORD MODAL PLACED OUTSIDE THE LOGIN FORM */}
        <div className="text-right pt-1">
          <ForgotPasswordModal />
        </div>

      </div>
    </div>
  );
}