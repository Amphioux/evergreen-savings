'use client';

import { useState } from 'react';
import { deleteDeposit } from '@/app/actions';
import { Trash2, AlertTriangle, X, ShieldAlert } from 'lucide-react';

interface DeleteDepositModalProps {
  deposit: any;
}

export default function DeleteDepositModal({ deposit }: DeleteDepositModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!deposit) return null;

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) {
      setError('Please enter a valid audit deletion reason (min 5 chars).');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('deposit_id', String(deposit.id));
    formData.append('reason', reason);

    const res = await deleteDeposit(formData);
    setLoading(false);

    if (res?.error) {
      setError(res.error);
    } else {
      setIsOpen(false);
      setReason('');
    }
  }

  const depositCode = deposit.deposit_code || `DP-${deposit.id}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
        title="Delete Accidental Voucher"
      >
        <Trash2 size={13} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-left font-sans">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden space-y-4 p-5 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Trash2 size={18} className="text-red-700" /> Delete Deposit Voucher
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 text-red-950 rounded-xl space-y-1">
              <div className="font-extrabold flex items-center gap-1.5 text-red-900">
                <AlertTriangle size={16} /> Permanent Removal Warning
              </div>
              <p className="text-[11px] text-red-800">
                You are about to delete voucher <strong className="font-mono">{depositCode}</strong> for member{' '}
                <strong>{deposit.profiles?.full_name || 'Member'}</strong>. This action will be permanently recorded in the audit trail.
              </p>
            </div>

            {error && (
              <div className="p-2.5 bg-red-100 border border-red-300 text-red-800 font-bold rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleDelete} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Reason for Deletion (Audit Trail) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Accidental duplicate entry during meeting"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-medium"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setIsOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-1/2 py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl flex justify-center items-center gap-1.5"
                >
                  <ShieldAlert size={15} />
                  {loading ? 'Deleting...' : 'Confirm & Audit Delete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}