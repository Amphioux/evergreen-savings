'use client';

import { useState } from 'react';
import { loginUser } from '@/app/actions';
import { LogIn, Lock } from 'lucide-react';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    const res = await loginUser(formData);
    if (res?.error) setError(res.error);
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-md w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-full bg-emerald-100 text-emerald-900 mb-1">
            <Lock size={28} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Evergreen Portal</h2>
          <p className="text-xs text-slate-600 font-medium">Sign in with your member credentials</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-800 text-xs font-semibold rounded-lg border border-red-200 text-center">
            {error}
          </div>
        )}

        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Account Email / ID</label>
            <input 
              name="email" 
              required 
              type="email" 
              placeholder="member@evergreen.com" 
              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-600 outline-none" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
            <input 
              name="password" 
              required 
              type="password" 
              placeholder="••••••••" 
              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-600 outline-none" 
            />
          </div>

          <button type="submit" className="w-full bg-emerald-900 hover:bg-emerald-800 text-white font-bold text-sm py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
            <LogIn size={18} /> Sign In
          </button>
        </form>
      </div>
    </div>
  );
}