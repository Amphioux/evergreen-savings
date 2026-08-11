'use client';

import { useState, useRef } from 'react';
import { registerUserByAdmin } from '@/app/actions';
import { UserPlus, Lock } from 'lucide-react';

export default function RegisterMemberForm() {
  const [userType, setUserType] = useState<'MEMBER' | 'NON_MEMBER'>('MEMBER');
  const [status, setStatus] = useState<{ error?: string; success?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    setStatus(null);
    setLoading(true);

    const res = await registerUserByAdmin(formData);
    setLoading(false);

    if (res?.error) {
      setStatus({ error: res.error });
    } else if (res?.success) {
      setStatus({ success: res.success });
      formRef.current?.reset();
    }
  }

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center gap-2 text-emerald-900 font-bold">
        <UserPlus size={20} />
        <h3>Register Member / Borrower</h3>
      </div>

      {status?.error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-semibold rounded-lg">
          {status.error}
        </div>
      )}

      {status?.success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg">
          {status.success}
        </div>
      )}

      <form ref={formRef} action={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Registration Category *</label>
          <select 
            name="user_type" 
            value={userType} 
            onChange={(e) => setUserType(e.target.value as 'MEMBER' | 'NON_MEMBER')}
            className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-slate-50 text-slate-900 font-semibold"
          >
            <option value="MEMBER">Savings Member (Gets Login Account)</option>
            <option value="NON_MEMBER">External Borrower (Third-Party Loan Only)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
          <input 
            name="full_name" 
            required 
            type="text" 
            placeholder="e.g. Ram Bahadur" 
            className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-emerald-600 outline-none" 
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
            <input 
              name="phone" 
              type="text" 
              placeholder="98XXXXXXXX" 
              className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-emerald-600 outline-none" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Join Date *</label>
            <input 
              name="joined_date" 
              required 
              type="date" 
              defaultValue={new Date().toISOString().split('T')[0]} 
              className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-emerald-600 outline-none" 
            />
          </div>
        </div>

        {userType === 'MEMBER' && (
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 space-y-3">
            <div className="text-xs font-bold text-emerald-950 flex items-center gap-1">
              <Lock size={14} /> Member Login Credentials
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email / Account ID *</label>
              <input 
                name="email" 
                required 
                type="email" 
                placeholder="ram@evergreen.com" 
                className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900" 
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password * (Min 6 chars)</label>
                <input 
                  name="password" 
                  required 
                  type="password" 
                  placeholder="••••••••" 
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Portal Access Level</label>
                <select name="role" className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 font-semibold">
                  <option value="MEMBER">General Member (View Only)</option>
                  <option value="ADMIN">Committee Admin (Edit Access)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <button 
          disabled={loading}
          type="submit" 
          className="w-full bg-emerald-900 hover:bg-emerald-800 disabled:bg-slate-400 text-white font-bold text-sm py-2.5 rounded-lg transition-colors"
        >
          {loading ? 'Creating...' : userType === 'MEMBER' ? 'Create Member Account' : 'Save External Borrower'}
        </button>
      </form>
    </div>
  );
}