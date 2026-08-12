'use client';

import { useState, useRef } from 'react';
import { changeOwnPasswordWithOld } from '@/app/actions';
import { KeyRound, CheckCircle2, AlertCircle, Lock, ShieldCheck, Check, X } from 'lucide-react';

export default function ChangePasswordProfileTab() {
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState<{ error?: string; success?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Real-time password requirement checks
  const checks = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPassword),
  };

  const isPasswordValid = Object.values(checks).every(Boolean);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);

    if (!isPasswordValid) {
      setStatus({ error: 'Please satisfy all password complexity requirements.' });
      return;
    }

    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const confirmPassword = formData.get('confirm_password') as string;

    if (newPassword !== confirmPassword) {
      setLoading(false);
      setStatus({ error: 'New passwords do not match. Please re-type.' });
      return;
    }

    const res = await changeOwnPasswordWithOld(formData);
    setLoading(false);

    if (res?.error) {
      setStatus({ error: res.error });
    } else if (res?.success) {
      setStatus({ success: res.success });
      formRef.current?.reset();
      setNewPassword('');
    }
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-lg space-y-4 text-left font-sans">
      <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
        <div className="p-2 bg-blue-50 text-blue-800 rounded-xl">
          <KeyRound size={20} />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Security & Credentials</h3>
          <p className="text-xs text-slate-500">Change your account login password</p>
        </div>
      </div>

      {status?.error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{status.error}</span>
        </div>
      )}

      {status?.success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
          <span>{status.success}</span>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        {/* Old / Current Password */}
        <div>
          <label className="block font-bold text-slate-700 mb-1">Current Password *</label>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              name="current_password"
              type="password"
              required
              placeholder="Enter current password"
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-700"
            />
          </div>
        </div>

        {/* New Password */}
        <div>
          <label className="block font-bold text-slate-700 mb-1">New Password *</label>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              name="new_password"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-700"
            />
          </div>
        </div>

        {/* Dynamic Password Policy Checklist */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-[11px]">
          <span className="font-bold text-slate-700 block mb-1">Password Requirements:</span>
          
          <div className={`flex items-center gap-1.5 font-medium ${checks.length ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
            {checks.length ? <Check size={14} className="text-emerald-600 shrink-0" /> : <X size={14} className="text-slate-400 shrink-0" />}
            <span>At least 8 characters long</span>
          </div>

          <div className={`flex items-center gap-1.5 font-medium ${checks.uppercase ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
            {checks.uppercase ? <Check size={14} className="text-emerald-600 shrink-0" /> : <X size={14} className="text-slate-400 shrink-0" />}
            <span>At least one capital letter (A-Z)</span>
          </div>

          <div className={`flex items-center gap-1.5 font-medium ${checks.number ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
            {checks.number ? <Check size={14} className="text-emerald-600 shrink-0" /> : <X size={14} className="text-slate-400 shrink-0" />}
            <span>At least one number (0-9)</span>
          </div>

          <div className={`flex items-center gap-1.5 font-medium ${checks.special ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
            {checks.special ? <Check size={14} className="text-emerald-600 shrink-0" /> : <X size={14} className="text-slate-400 shrink-0" />}
            <span>At least one special character (!@#$%...)</span>
          </div>
        </div>

        {/* Confirm New Password */}
        <div>
          <label className="block font-bold text-slate-700 mb-1">Confirm New Password *</label>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              name="confirm_password"
              type="password"
              required
              placeholder="Re-enter new password"
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-700"
            />
          </div>
        </div>

        <button
          disabled={loading || !isPasswordValid}
          type="submit"
          className="w-full bg-blue-900 hover:bg-blue-800 disabled:bg-slate-300 text-white font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5 mt-2 shadow-sm cursor-pointer disabled:cursor-not-allowed"
        >
          <ShieldCheck size={16} />
          {loading ? 'Verifying & Updating...' : 'Save New Password'}
        </button>
      </form>
    </div>
  );
}