'use client';

import { useState, useRef } from 'react';
import { registerSuperAdminBySuperAdmin } from '@/app/actions';
import { EXECUTIVE_POSITIONS } from '@/lib/executivePositions';
import { Crown } from 'lucide-react';

export default function RegisterSuperAdminForm({ nextAccountId }: { nextAccountId: string }) {
  const [status, setStatus] = useState<{ error?: string; success?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    setStatus(null);
    setLoading(true);

    const res = await registerSuperAdminBySuperAdmin(formData);
    setLoading(false);

    if (res?.error) {
      setStatus({ error: res.error });
    } else if (res?.success) {
      setStatus({ success: res.success });
      formRef.current?.reset();
    }
  }

  return (
    <div className="bg-white p-5 rounded-xl border border-purple-300 shadow-xs space-y-4 text-left">
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2 font-bold text-purple-950 text-base">
          <Crown size={20} className="text-purple-700" />
          <h3>Register Superadmin Account</h3>
        </div>
        <div className="bg-purple-100 border border-purple-300 text-purple-950 font-mono text-xs font-bold px-3 py-1 rounded-full">
          Assigned ID: <span className="underline">{nextAccountId}</span>
        </div>
      </div>

      {status?.error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg">
          {status.error}
        </div>
      )}

      {status?.success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg">
          {status.success}
        </div>
      )}

      <form ref={formRef} action={handleSubmit} className="space-y-3 text-xs">
        <div>
          <label className="block font-bold text-slate-700 mb-1">Superadmin Full Name *</label>
          <input
            name="full_name"
            required
            placeholder="e.g. Hari Kumar"
            className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-semibold"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Executive Designation *</label>
            <select
              name="committee_position"
              required
              defaultValue="Chairperson / President"
              className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-semibold"
            >
              {EXECUTIVE_POSITIONS.map((pos) => (
                <option key={pos.value} value={pos.label}>
                  {pos.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Appointment Date</label>
            <input
              name="joined_date"
              type="date"
              defaultValue={new Date().toISOString().split('T')[0]}
              className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
            <input name="phone" placeholder="9800000000" className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900" />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Personal Email (Optional)</label>
            <input name="email" type="email" placeholder="superadmin@gmail.com" className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900" />
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Password * (Min 6 chars)</label>
          <input name="password" required type="password" minLength={6} placeholder="••••••••" className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900" />
        </div>

        <button
          disabled={loading}
          type="submit"
          className="w-full bg-purple-950 hover:bg-purple-900 disabled:bg-slate-400 text-white font-bold py-2.5 rounded-lg transition-colors mt-2"
        >
          {loading ? 'Creating Superadmin Account...' : 'Register Superadmin Account'}
        </button>
      </form>
    </div>
  );
}