'use client';

import { useState } from 'react';
import { deleteLoan, deleteLoanPayment } from '@/app/actions';
import { Trash2, X, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';

interface DeleteLoanConfirmModalProps {
  type: 'LOAN' | 'REPAYMENT';
  recordId: number;
  code: string;
  summaryText: string;
}

export default function DeleteLoanConfirmModal({
  type,
  recordId,
  code,
  summaryText,
}: DeleteLoanConfirmModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) {
      setError('Please provide a valid deletion reason (min 5 characters).');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    if (type === 'LOAN') {
      formData.append('loan_id', String(recordId));
      formData.append('reason', reason);
      const res = await deleteLoan(formData);
      setLoading(false);

      if (res?.error) setError(res.error);
      else if (res?.success) {
        setSuccessMsg(res.success);
      }
    } else {
      formData.append('payment_id', String(recordId));
      formData.append('reason', reason);
      const res = await deleteLoanPayment(formData);
      setLoading(false);

      if (res?.error) setError(res.error);
      else if (res?.success) {
        setSuccessMsg(res.success);
      }
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="p-1 bg-red-100 hover:bg-red-200 text-red-800 rounded transition-colors"
        title={`Delete Accidental ${type === 'LOAN' ? 'Loan Record' : 'Repayment Entry'}`}
      >
        <Trash2 size={14} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-left font-sans">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-red-200 overflow-hidden space-y-4 p-5 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Trash2 size={18} className="text-red-700" /> Delete {type === 'LOAN' ? 'Disbursed Loan' : 'Repayment Log'} ({code})
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="p-2.5 bg-red-50 text-red-700 text-xs font-bold rounded-lg border border-red-200">
                {error}
              </div>
            )}

            {successMsg ? (
              <div className="p-6 text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={28} />
                </div>
                <h4 className="font-black text-slate-900 text-sm flex items-center justify-center gap-1">
                  <Sparkles size={16} className="text-emerald-600" /> Permanent Deletion Audited!
                </h4>
                <p className="text-slate-700 text-xs">{successMsg}</p>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-full py-2 bg-emerald-900 text-white font-bold rounded-xl"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleDelete} className="space-y-3">
                <div className="p-3 bg-red-50 border border-red-200 text-red-950 rounded-xl space-y-1">
                  <div className="font-extrabold flex items-center gap-1.5 text-red-900">
                    <AlertTriangle size={16} /> Permanent Removal Warning
                  </div>
                  <p className="text-[11px] text-red-800 leading-relaxed">
                    You are permanently deleting <strong>{code}</strong> ({summaryText}). This action cannot be undone and will be logged directly into the immutable system audit trail.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Audit Deletion Reason (Min 5 chars) *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Accidental duplicate loan disbursement log"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    minLength={5}
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-medium"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setIsOpen(false)}
                    className="w-1/2 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-1/2 py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl flex justify-center items-center"
                  >
                    {loading ? 'Deleting...' : 'Confirm & Audit Delete'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}