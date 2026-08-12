'use client';

import { useState } from 'react';
import { requestPasswordReset } from '@/app/actions';
import { KeyRound, X, CheckCircle2, AlertCircle, Mail } from 'lucide-react';

export default function ForgotPasswordModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<{ error?: string; success?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setStatus(null);
    setLoading(true);

    const res = await requestPasswordReset(formData);
    setLoading(false);

    if (res?.error) {
      setStatus({ error: res.error });
    } else if (res?.success) {
      setStatus({ success: res.success });
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setStatus(null);
        }}
        className="text-xs text-blue-700 hover:text-blue-900 font-bold transition-colors"
      >
        Forgot Password?
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-left">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden space-y-4 p-6 text-xs">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <div className="p-1.5 bg-blue-50 text-blue-800 rounded-md">
                  <KeyRound size={16} />
                </div>
                <span>Recover Account Password</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {status?.error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 font-bold rounded-lg flex items-center gap-2">
                <AlertCircle size={16} /> {status.error}
              </div>
            )}

            {status?.success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold rounded-lg flex items-center gap-2">
                <CheckCircle2 size={16} /> {status.success}
              </div>
            )}

            <form action={handleSubmit} className="space-y-3">
              <p className="text-slate-500 font-medium leading-relaxed">
                Enter your registered personal email address below. We will send you a secure link to reset your portal password.
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Registered Email Address *</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="e.g. member@gmail.com"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-700"
                  />
                </div>
              </div>

              <button
                disabled={loading}
                type="submit"
                className="w-full bg-blue-900 hover:bg-blue-800 disabled:bg-slate-400 text-white font-bold py-2.5 rounded-lg transition-colors mt-1"
              >
                {loading ? 'Sending Recovery Link...' : 'Send Recovery Link'}
              </button>
            </form>

          </div>
        </div>
      )}
    </>
  );
}