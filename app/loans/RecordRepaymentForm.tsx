'use client';

import { useState, useRef } from 'react';
import { recordLoanRepayment } from '@/app/actions';
import RepaymentReceiptModal from './RepaymentReceiptModal';
import { Receipt, CheckCircle2, Zap, ArrowRightLeft, X, AlertTriangle } from 'lucide-react';

export default function RecordRepaymentForm({ activeLoans }: { activeLoans: any[] }) {
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [totalPayment, setTotalPayment] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<{ error?: string; success?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);

  const selectedLoan = activeLoans.find((l) => String(l.id) === selectedLoanId);

  const remainingPrincipal = Number(selectedLoan?.remaining_balance || 0);
  const annualRate = Number(selectedLoan?.current_rate || 12);
  const monthlyInterestDue = selectedLoan
    ? Math.round((remainingPrincipal * (annualRate / 100)) / 12)
    : 0;

  const paymentNum = Number(totalPayment) || 0;

  let calculatedInterest = 0;
  let calculatedPrincipal = 0;

  if (paymentNum > 0 && selectedLoan) {
    if (paymentNum <= monthlyInterestDue) {
      calculatedInterest = paymentNum;
      calculatedPrincipal = 0;
    } else {
      calculatedInterest = monthlyInterestDue;
      calculatedPrincipal = Math.min(remainingPrincipal, paymentNum - monthlyInterestDue);
    }
  }

  function handleSelectLoan(id: string) {
    setSelectedLoanId(id);
    setLastReceipt(null);
    const loan = activeLoans.find((l) => String(l.id) === id);
    if (loan) {
      setTotalPayment(String(Number(loan.monthly_emi || 0)));
    } else {
      setTotalPayment('');
    }
  }

  function handleEarlyPayoff() {
    if (!selectedLoan) return;
    const fullPayoff = remainingPrincipal + monthlyInterestDue;
    setTotalPayment(String(fullPayoff));
  }

  function handlePreSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLoan || paymentNum <= 0) return;
    setStatus(null);
    setShowConfirmModal(true);
  }

  async function handleConfirmedSubmit() {
    setShowConfirmModal(false);
    setLoading(true);

    const formData = new FormData();
    formData.append('loan_id', selectedLoanId);
    formData.append('principal_paid', String(calculatedPrincipal));
    formData.append('interest_paid', String(calculatedInterest));
    formData.append('payment_date', paymentDate);

    const res = await recordLoanRepayment(formData);
    setLoading(false);

    if (res?.error) {
      setStatus({ error: res.error });
    } else if (res?.success) {
      setStatus({ success: res.success });
      if (res.receipt) {
        setLastReceipt(res.receipt);
      }
      setSelectedLoanId('');
      setTotalPayment('');
    }
  }

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 text-left">
      <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
        <Receipt size={18} className="text-emerald-700" />
        <h3>Record Loan Repayment</h3>
      </div>

      {status?.error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg">
          {status.error}
        </div>
      )}

      {status?.success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold rounded-xl space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-700" /> {status.success}
          </div>

          {/* Instant Receipt Print Prompt */}
          {lastReceipt && (
            <div className="pt-2 border-t border-emerald-200 flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-800">Print receipt proof now?</span>
              <RepaymentReceiptModal receipt={lastReceipt} />
            </div>
          )}
        </div>
      )}

      <form ref={formRef} onSubmit={handlePreSubmit} className="space-y-3 text-xs">
        <div>
          <label className="block font-bold text-slate-700 mb-1">Select Active Loan *</label>
          <select
            name="loan_id"
            required
            value={selectedLoanId}
            onChange={(e) => handleSelectLoan(e.target.value)}
            className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-semibold"
          >
            <option value="">-- Choose Loan ({activeLoans.length} Active) --</option>
            {activeLoans.map((loan) => (
              <option key={loan.id} value={loan.id}>
                {loan.loan_code} - {loan.borrower_name} (Bal: NPR {Number(loan.remaining_balance || 0).toLocaleString('en-IN')})
              </option>
            ))}
          </select>
        </div>

        {selectedLoan && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-slate-500 block text-[10px] font-sans">Outstanding Principal:</span>
                <strong className="text-slate-900 font-extrabold text-sm">
                  NPR {remainingPrincipal.toLocaleString('en-IN')}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-sans">Monthly Interest Due:</span>
                <strong className="text-amber-900 font-extrabold text-sm">
                  NPR {monthlyInterestDue.toLocaleString('en-IN')}
                </strong>
              </div>
            </div>

            <button
              type="button"
              onClick={handleEarlyPayoff}
              className="w-full py-1.5 px-3 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-lg text-xs flex items-center justify-center gap-1 transition-colors"
            >
              <Zap size={14} /> Full Payoff Amount: NPR {(remainingPrincipal + monthlyInterestDue).toLocaleString('en-IN')}
            </button>
          </div>
        )}

        <div>
          <label className="block font-bold text-slate-700 mb-1">Payment Amount (NPR) *</label>
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

        {selectedLoan && paymentNum > 0 && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5">
            <div className="font-bold text-emerald-900 text-xs flex items-center gap-1">
              <ArrowRightLeft size={14} /> Auto-Split Breakdown
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs pt-1">
              <div className="p-2 bg-white rounded border border-emerald-100">
                <span className="text-[10px] text-slate-500 font-sans block">Interest Paid</span>
                <strong className="text-purple-900 font-bold">NPR {calculatedInterest.toLocaleString('en-IN')}</strong>
              </div>
              <div className="p-2 bg-white rounded border border-emerald-100">
                <span className="text-[10px] text-slate-500 font-sans block">Principal Reduced</span>
                <strong className="text-emerald-900 font-bold">NPR {calculatedPrincipal.toLocaleString('en-IN')}</strong>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block font-bold text-slate-700 mb-1">Payment Date *</label>
          <input
            type="date"
            required
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
          />
        </div>

        <button
          disabled={loading || !selectedLoanId || paymentNum <= 0}
          type="submit"
          className="w-full bg-emerald-900 hover:bg-emerald-800 disabled:bg-slate-400 text-white font-bold py-2.5 rounded-lg transition-colors mt-2"
        >
          {loading ? 'Processing Repayment...' : 'Submit Loan Payment'}
        </button>
      </form>

      {/* CUSTOM CONFIRMATION POPUP MODAL */}
      {showConfirmModal && selectedLoan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 text-left">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden space-y-0">
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-400" />
                <h3 className="font-bold text-sm">Confirm Repayment Details</h3>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-white p-1 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 text-xs text-slate-800">
              <p className="text-slate-600 font-medium">
                Please review the financial breakdown below before confirming this loan repayment entry:
              </p>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-sans">Loan Code:</span>
                  <strong className="text-blue-900 font-extrabold">{selectedLoan.loan_code}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-sans">Borrower:</span>
                  <strong className="text-slate-900 font-bold font-sans">{selectedLoan.borrower_name}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-sans">Payment Date:</span>
                  <strong className="text-slate-900 font-bold">{paymentDate}</strong>
                </div>

                <div className="border-t border-slate-200 pt-2 space-y-1">
                  <div className="flex justify-between items-center text-purple-900">
                    <span className="font-sans text-[11px]">Interest Portion:</span>
                    <strong className="font-bold">NPR {calculatedInterest.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="flex justify-between items-center text-emerald-900">
                    <span className="font-sans text-[11px]">Principal Portion:</span>
                    <strong className="font-bold">NPR {calculatedPrincipal.toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                <div className="border-t-2 border-slate-900 pt-2 flex justify-between items-center text-sm">
                  <span className="font-bold font-sans text-slate-900">Total Payment:</span>
                  <strong className="text-emerald-950 font-black">
                    NPR {paymentNum.toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmedSubmit}
                  className="w-1/2 bg-emerald-900 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-lg transition-colors"
                >
                  Confirm & Record
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}