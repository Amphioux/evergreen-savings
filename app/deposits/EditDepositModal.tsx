'use client';

import { useState } from 'react';
import { updateDeposit } from '@/app/actions';
import { Edit3, X, CheckCircle2 } from 'lucide-react';

export default function EditDepositModal({ deposit }: { deposit: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ error?: string; success?: string } | null>(null);

  const currentMonth = deposit.for_month ? deposit.for_month.slice(0, 7) : new Date().toISOString().slice(0, 7);

  async function handleSubmit(formData: FormData) {
    setStatus(null);
    setLoading(true);
    const res = await updateDeposit(formData);
    setLoading(false);

    if (res?.error) {
      setStatus({ error: res.error });
    } else if (res?.success) {
      setStatus({ success: res.success });
      setTimeout(() => setIsOpen(false), 1200);
    }
  }

  return (
    <>
      <button
        onClick={() => { setIsOpen(true); setStatus(null); }}
        className="p-1.5 text-slate-600 hover:text-blue-800 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center gap-1 font-bold text-xs"
        title="Edit Deposit Entry"
      >
        <Edit3 size={14} /> Edit
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 text-left">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">Edit Deposit Entry</h3>
                <p className="text-xs text-slate-300 font-mono">
                  {deposit.profiles?.full_name} ({deposit.profiles?.account_id || 'N/A'})
                </p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white p-1 transition-colors">
                <X size={18} />
              </button>
            </div>

            <form action={handleSubmit} className="p-5 space-y-4 text-xs">
              <input type="hidden" name="deposit_id" value={deposit.id} />

              {status?.error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 font-semibold rounded-lg">
                  {status.error}
                </div>
              )}
              {status?.success && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold rounded-lg flex items-center gap-2">
                  <CheckCircle2 size={16} /> {status.success}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Contribution Month *</label>
                <input
                  name="for_month"
                  required
                  type="month"
                  defaultValue={currentMonth}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Amount Paid (NPR) *</label>
                <input
                  name="amount_paid"
                  required
                  type="number"
                  defaultValue={deposit.amount_paid}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-mono font-bold"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={loading}
                  type="submit"
                  className="w-1/2 bg-blue-900 hover:bg-blue-800 disabled:bg-slate-400 text-white font-bold py-2 rounded-lg transition-colors"
                >
                  {loading ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </>
  );
}