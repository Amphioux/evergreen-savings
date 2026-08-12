'use client';

import { useState } from 'react';
import { updateLoanPayment } from '@/app/actions';
import { Edit3, X, CheckCircle2, Save, ArrowRightLeft } from 'lucide-react';

export default function EditPaymentModal({ record }: { record: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [totalPayment, setTotalPayment] = useState(String(record.total_paid || '0'));
  const [paymentDate, setPaymentDate] = useState(record.payment_date || '');
  const [result, setResult] = useState<{ error?: string; success?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Determine prior balance before this payment was made
  const prevRemainingBalance = Number(record.remaining_balance || 0) + Number(record.principal_paid || 0);
  const annualRate = Number(record.current_rate || 12);
  const monthlyInterestDue = Math.round((prevRemainingBalance * (annualRate / 100)) / 12);

  const paymentNum = Number(totalPayment) || 0;

  let calculatedInterest = 0;
  let calculatedPrincipal = 0;

  if (paymentNum > 0) {
    if (monthlyInterestDue > 0 && paymentNum <= monthlyInterestDue) {
      calculatedInterest = paymentNum;
      calculatedPrincipal = 0;
    } else if (monthlyInterestDue > 0) {
      calculatedInterest = monthlyInterestDue;
      calculatedPrincipal = Math.max(0, paymentNum - monthlyInterestDue);
    } else {
      calculatedInterest = Number(record.interest_paid || 0);
      calculatedPrincipal = Math.max(0, paymentNum - calculatedInterest);
    }
  }

  async function handleSubmit(formData: FormData) {
    setResult(null);
    setLoading(true);

    formData.set('principal_paid', String(calculatedPrincipal));
    formData.set('interest_paid', String(calculatedInterest));

    const res = await updateLoanPayment(formData);
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
        className="p-1 text-slate-500 hover:text-purple-700 hover:bg-slate-100 rounded transition-colors"
        title="Edit Payment Entry"
      >
        <Edit3 size={15} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 text-left">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Edit3 size={16} className="text-purple-400" />
                <h3 className="font-bold text-sm">Correct Repayment Entry ({record.payment_code})</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            <form action={handleSubmit} className="p-5 space-y-3.5 text-xs text-slate-800">
              <input type="hidden" name="payment_id" value={record.id} />

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

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono space-y-1">
                <div>Loan Code: <strong className="text-blue-900">{record.loan_code}</strong></div>
                <div>Borrower: <strong className="text-slate-900 font-sans">{record.borrower_name}</strong></div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Total Payment Amount (NPR) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={totalPayment}
                  onChange={(e) => setTotalPayment(e.target.value)}
                  placeholder="Enter total amount paid"
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-sm"
                />
              </div>

              {paymentNum > 0 && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5">
                  <div className="font-bold text-emerald-900 text-xs flex items-center gap-1">
                    <ArrowRightLeft size={14} /> Auto-Split Breakdown
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-xs pt-1">
                    <div className="p-2 bg-white rounded border border-emerald-100">
                      <span className="text-[10px] text-slate-500 font-sans block">Interest Portion</span>
                      <strong className="text-purple-900 font-bold">NPR {calculatedInterest.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="p-2 bg-white rounded border border-emerald-100">
                      <span className="text-[10px] text-slate-500 font-sans block">Principal Portion</span>
                      <strong className="text-emerald-900 font-bold">NPR {calculatedPrincipal.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Date *</label>
                <input
                  name="payment_date"
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
                />
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
                  disabled={loading || paymentNum <= 0}
                  type="submit"
                  className="w-1/2 bg-purple-900 hover:bg-purple-800 disabled:bg-slate-400 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <Save size={14} /> {loading ? 'Saving...' : 'Update Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}