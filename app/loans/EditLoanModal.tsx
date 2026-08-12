'use client';

import { useState } from 'react';
import { updateLoan } from '@/app/actions';
import { Edit3, X, CheckCircle2, Save } from 'lucide-react';

export default function EditLoanModal({ loan, borrowerName }: { loan: any; borrowerName: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [principal, setPrincipal] = useState(String(loan.principal_amount || ''));
  const [rate, setRate] = useState(String(loan.current_rate || '12.0'));
  const [tenure, setTenure] = useState(String(loan.tenure_months || '12'));
  const [issueDate, setIssueDate] = useState(loan.issue_date || '');
  const [status, setStatus] = useState(loan.status || 'ACTIVE');
  const [result, setResult] = useState<{ error?: string; success?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setResult(null);
    setLoading(true);
    const res = await updateLoan(formData);
    setLoading(false);

    if (res?.error) {
      setResult({ error: res.error });
    } else if (res?.success) {
      setResult({ success: res.success });
      setTimeout(() => {
        setIsOpen(false);
        setResult(null);
      }, 1200);
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-1 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded transition-colors"
        title="Edit Loan Info"
      >
        <Edit3 size={15} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 text-left">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Edit3 size={16} className="text-blue-400" />
                <h3 className="font-bold text-sm">Edit Loan Record ({loan.loan_code})</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            <form action={handleSubmit} className="p-5 space-y-3.5 text-xs text-slate-800">
              <input type="hidden" name="loan_id" value={loan.id} />

              {result?.error && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 font-semibold rounded-lg">
                  {result.error}
                </div>
              )}

              {result?.success && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold rounded-lg flex items-center gap-2">
                  <CheckCircle2 size={16} /> {result.success}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Borrower</label>
                <input
                  disabled
                  value={borrowerName}
                  className="w-full p-2 border border-slate-200 bg-slate-100 rounded-lg text-slate-600 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Principal Amount (NPR) *</label>
                <input
                  name="principal_amount"
                  type="number"
                  required
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Interest Rate (% p.a.) *</label>
                  <input
                    name="current_rate"
                    type="number"
                    step="0.1"
                    required
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tenure (Months) *</label>
                  <input
                    name="tenure_months"
                    type="number"
                    required
                    value={tenure}
                    onChange={(e) => setTenure(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Disbursement Date *</label>
                  <input
                    name="issue_date"
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Loan Status *</label>
                  <select
                    name="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-semibold"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
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
                  className="w-1/2 bg-blue-900 hover:bg-blue-800 disabled:bg-slate-400 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <Save size={14} /> {loading ? 'Saving...' : 'Update Loan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}