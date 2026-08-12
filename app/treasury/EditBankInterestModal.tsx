'use client';

import { useState } from 'react';
import { updateBankInterest } from '@/app/actions';
import { Edit2, X, CheckCircle2, AlertTriangle, Landmark } from 'lucide-react';

export default function EditBankInterestModal({ item }: { item: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ error?: string; success?: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.append('interest_id', String(item.id));

    const res = await updateBankInterest(formData);
    setLoading(false);

    if (res?.error) {
      setStatus({ error: res.error });
    } else if (res?.success) {
      setStatus({ success: res.success });
      setTimeout(() => setIsOpen(false), 1000);
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
        title="Edit Record"
      >
        <Edit2 size={15} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden text-left font-sans">
            
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <Landmark size={18} className="text-emerald-700" /> Edit Bank Interest Record
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {status?.error && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 text-xs font-bold rounded-lg flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0" />{status.error}
                </div>
              )}
              {status?.success && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0" />{status.success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Amount (NPR) *</label>
                    <input name="amount" required type="number" defaultValue={item.amount} className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Credit Date *</label>
                    <input name="credit_date" required type="date" defaultValue={item.credit_date} className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-mono" />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Notes / Source</label>
                  <input name="notes" defaultValue={item.notes || ''} className="w-full p-2 border border-slate-300 rounded-lg text-slate-900" />
                </div>
                <button disabled={loading} type="submit" className="w-full bg-emerald-900 hover:bg-emerald-800 disabled:bg-slate-400 text-white font-bold py-2.5 rounded-xl transition-colors cursor-pointer mt-2">
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
            
          </div>
        </div>
      )}
    </>
  );
}