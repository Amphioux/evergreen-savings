'use client';

import { useState } from 'react';
import { updateUserProfile } from '@/app/actions';
import { Edit2, X } from 'lucide-react';

export default function UserEditModal({ profile, isSuperAdmin }: { profile: any; isSuperAdmin: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setStatus(null);
    const res = await updateUserProfile(formData);
    if (res?.error) {
      setStatus(res.error);
    } else {
      setIsOpen(false);
    }
  }

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded inline-flex items-center gap-1">
        <Edit2 size={12} /> Edit
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 text-left space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="font-bold text-slate-900">Update User Account</h3>
          <button onClick={() => setIsOpen(false)}><X size={18} className="text-slate-400" /></button>
        </div>

        {status && <div className="p-2 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded">{status}</div>}

        <form action={handleSubmit} className="space-y-3">
          <input type="hidden" name="user_id" value={profile.id} />
          
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
            <input name="full_name" defaultValue={profile.full_name} required className="w-full p-2 border rounded text-sm" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
            <input name="phone" defaultValue={profile.phone || ''} className="w-full p-2 border rounded text-sm" />
          </div>

          {isSuperAdmin ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Role Level (Superadmin Setting)</label>
              <select name="role" defaultValue={profile.role} className="w-full p-2 border rounded text-sm bg-purple-50 font-semibold text-purple-950">
                <option value="MEMBER">General Member (Read-Only)</option>
                <option value="ADMIN">Committee Admin (Add Members & Loans)</option>
                <option value="SUPER_ADMIN">Superadmin (Full Control)</option>
              </select>
            </div>
          ) : (
            <div className="text-xs text-slate-400 bg-slate-50 p-2 rounded">
              Role: <strong>{profile.role}</strong> (Only Superadmins can modify access levels).
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsOpen(false)} className="px-3 py-1.5 text-xs text-slate-600 font-semibold">Cancel</button>
            <button type="submit" className="px-4 py-1.5 text-xs bg-slate-900 text-white font-bold rounded">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}