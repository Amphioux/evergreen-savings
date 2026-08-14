'use client';

import { useState } from 'react';
import { updateLoan } from '@/app/actions';
import { Edit3, X, CheckCircle2, Save, AlertTriangle } from 'lucide-react';

export default function EditLoanModal({ loan, borrowerName }: { loan: any; borrowerName: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [principal, setPrincipal] = useState(String(loan.principal_amount || ''));
  const [rate, setRate] = useState(String(loan.current_rate || '12.0'));
  const [tenure, setTenure] = useState(String(loan.tenure_months || '12'));
  const [issueDate, setIssueDate] = useState(loan.issue_date || '');
  const [status, setStatus] = useState(loan.status || 'ACTIVE');

  // Confirmation Step State
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [result, setResult] = useState<{ error?: string; success?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  function resetState() {
    setResult(null);
    setPendingFormData(null);
    setShowConfirmModal(false);
    setLoading(false);
  }

  // Intercept form submit to show confirmation modal first
  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(null);

    const formData = new FormData(e.currentTarget);
    formData.append('loan_id', String(loan.id));

    setPendingFormData(formData);
    setShowConfirmModal(true); // <--- Triggers Popup Confirmation Window
  }

  // Execute actual submission after user confirms in popup
  async function executeConfirmedSave() {
    if (!pendingFormData) return;

    setLoading(true);
    setResult(null);

    const res = await updateLoan(pendingFormData);

    setLoading(false);
    setShowConfirmModal(false);
    setPendingFormData(null);

    if (res?.error) {
      setResult({ error: res.error });
    } else if (res?.success) {
      setResult({ success: res.success });
      setTimeout(() => {
        setIsOpen(false);
        resetState();
      }, 1200);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          resetState();
          setIsOpen(true);
        }}
        className="p-1 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
        title="Edit Loan Info"
      >
        <Edit3 size={15} />
      </button>

      {/* EDIT LOAN FORM MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-left font-sans">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Edit3 size={16} className="text-blue-400" />
                <h3 className="font-bold text-sm">Edit Loan Record ({loan.loan_code || `LN-${loan.id}`})</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsOpen(false)} 
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-3.5 text-xs text-slate-800">
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
                  className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-1/2 bg-blue-900 hover:bg-blue-800 disabled:bg-slate-400 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save size={14} /> Review & Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP CONFIRMATION MODAL BEFORE SAVING */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-left font-sans">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-blue-200 overflow-hidden space-y-4 p-5 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-700" /> Confirm Loan Terms Update
              </h3>
              <button 
                type="button" 
                onClick={() => setShowConfirmModal(false)} 
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-950 rounded-xl space-y-2">
              <div className="font-extrabold text-amber-900 text-xs">
                Modifying Disbursed Loan ({loan.loan_code || `#${loan.id}`})
              </div>
              <ul className="space-y-1 font-mono text-[11px] text-amber-950">
                <li>• Borrower: <strong>{borrowerName}</strong></li>
                <li>• Principal Amount: <strong>NPR {Number(principal).toLocaleString('en-IN')}</strong></li>
                <li>• Rate & Tenure: <strong>{rate}% p.a. for {tenure} Months</strong></li>
                <li>• Disbursement Date: <strong>{issueDate}</strong></li>
                <li>• Status: <strong>{status}</strong></li>
              </ul>
              <p className="text-[10px] text-amber-800 pt-1 border-t border-amber-200 font-sans">
                Updating these loan terms will re-calculate monthly EMI schedules and be permanently logged into the system audit trail.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowConfirmModal(false)}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
              >
                Go Back & Edit
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={executeConfirmedSave}
                className="w-1/2 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl flex justify-center items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {loading ? 'Updating...' : 'Confirm & Audit Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}