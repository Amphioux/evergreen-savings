'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { recordLoanRepayment } from '@/app/actions';
import { calculateIndustryLoanDues } from '@/lib/loanUtils';
import RepaymentReceiptModal from './RepaymentReceiptModal';
import { 
  Receipt, 
  CheckCircle2, 
  Zap, 
  ArrowRightLeft, 
  X, 
  AlertTriangle, 
  FileText, 
  ShieldAlert, 
  ArrowRight,
  Clock
} from 'lucide-react';

interface RecordRepaymentFormProps {
  activeLoans: any[];
  profiles?: any[];
  paymentList?: any[];
  fineRules?: any[];
  preSelectedLoanId?: string | number;
  onNavigateToLateFeeTerminal?: (loanId: string | number) => void;
}

export default function RecordRepaymentForm({ 
  activeLoans = [], 
  profiles = [],
  paymentList = [],
  fineRules = [],
  preSelectedLoanId,
  onNavigateToLateFeeTerminal
}: RecordRepaymentFormProps) {
  const today = useMemo(() => new Date(), []);
  const [selectedLoanId, setSelectedLoanId] = useState(preSelectedLoanId ? String(preSelectedLoanId) : '');
  const [totalPayment, setTotalPayment] = useState('');
  const [paymentDate, setPaymentDate] = useState(today.toISOString().split('T')[0]);
  const [paymentNote, setPaymentNote] = useState('');
  const [status, setStatus] = useState<{ error?: string; success?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);

  // Auto-select loan if pre-selected ID is passed
  useEffect(() => {
    if (preSelectedLoanId) {
      setSelectedLoanId(String(preSelectedLoanId));
      const loan = activeLoans.find((l) => String(l.id) === String(preSelectedLoanId));
      if (loan) {
        setTotalPayment(String(Number(loan.monthly_emi || 0)));
      }
    }
  }, [preSelectedLoanId, activeLoans]);

  const selectedLoan = activeLoans.find((l) => String(l.id) === selectedLoanId);

  // Check Overdue Status & Accrued Fines for the Selected Borrower
  const loanDuesCalculation = useMemo(() => {
    if (!selectedLoan) return null;
    const loanPayments = paymentList.filter((p) => String(p.loan_id) === String(selectedLoan.id));
    return calculateIndustryLoanDues(selectedLoan, loanPayments, fineRules, today);
  }, [selectedLoan, paymentList, fineRules, today]);

  // Calculate total calendar age of the loan since disbursement
  const loanAgeDays = useMemo(() => {
    if (!selectedLoan?.issue_date) return 0;
    const issueDateObj = new Date(selectedLoan.issue_date);
    const ageInMs = today.getTime() - issueDateObj.getTime();
    return Math.max(0, Math.floor(ageInMs / (1000 * 60 * 60 * 24)));
  }, [selectedLoan, today]);

  const isBorrowerOverdue = Boolean(
    loanDuesCalculation && (
      loanDuesCalculation.unpaidMonthsCount > 0 ||
      loanDuesCalculation.accruedFineTotal > 0 ||
      loanDuesCalculation.daysOverdue >= 30
    )
  );

  const remainingPrincipal = Number(selectedLoan?.remaining_balance || selectedLoan?.principal_amount || 0);
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
    setStatus(null);
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
    if (!selectedLoan || paymentNum <= 0 || isBorrowerOverdue) return;
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
    formData.append('payment_note', paymentNote);

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
      setPaymentNote('');
    }
  }

  // Handle redirecting admin to overdue collection terminal
  function handleGoToOverdueTerminal() {
    if (onNavigateToLateFeeTerminal && selectedLoanId) {
      onNavigateToLateFeeTerminal(selectedLoanId);
    } else {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'LATE_FEE_COLLECTION');
      url.searchParams.set('loan_id', String(selectedLoanId));
      window.location.href = url.toString();
    }
  }

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 text-left font-sans">
      <div className="flex items-center gap-2 font-bold text-slate-900 text-sm border-b pb-2">
        <Receipt size={18} className="text-emerald-700" />
        <h3>Record Standard Loan Repayment</h3>
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
            className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-semibold cursor-pointer"
          >
            <option value="">-- Choose Loan ({activeLoans.length} Active) --</option>
            {activeLoans.map((loan) => (
              <option key={loan.id} value={loan.id}>
                {loan.loan_code} - {loan.borrower_name} (Bal: NPR {Number(loan.remaining_balance || 0).toLocaleString('en-IN')})
              </option>
            ))}
          </select>
        </div>

        {/* OVERDUE GUARDRAIL WARNING CARD */}
        {selectedLoan && isBorrowerOverdue && loanDuesCalculation && (
          <div className="p-4 bg-amber-50 border-2 border-amber-300 text-amber-950 rounded-2xl space-y-3 font-sans">
            <div className="flex items-center gap-2 font-black text-sm text-amber-950">
              <ShieldAlert size={18} className="text-red-700 shrink-0" />
              Standard EMI Blocked — Overdue Dues & Fines Detected
            </div>

            <p className="text-xs text-amber-900 font-medium leading-relaxed">
              <strong>{selectedLoan.borrower_name}</strong> ({selectedLoan.loan_code}) took this loan{' '}
              <strong className="text-slate-900 font-mono font-bold">
                <Clock size={12} className="inline text-slate-600 mr-0.5" /> {loanAgeDays} Days Ago
              </strong>{' '}
              and currently has an overdue backlog of{' '}
              <strong className="text-red-900 font-mono font-bold">{loanDuesCalculation.unpaidMonthsCount} Month(s) Unpaid</strong> with{' '}
              <strong className="text-red-900 font-mono font-bold">NPR {loanDuesCalculation.accruedFineTotal.toLocaleString('en-IN')}</strong> in accrued late penalty fines.
            </p>

            <div className="p-3 bg-white/90 rounded-xl border border-amber-200 font-mono text-[11px] text-slate-800 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-sans">Loan Lifespan Age:</span>
                <strong className="text-slate-900">{loanAgeDays} Days Old</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-sans">Overdue Backlog:</span>
                <strong className="text-red-900">{loanDuesCalculation.unpaidMonthsCount} Month(s) Unpaid</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-sans">Accrued Late Fine:</span>
                <strong className="text-red-900">NPR {loanDuesCalculation.accruedFineTotal.toLocaleString('en-IN')}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-sans">Accrued Interest Due:</span>
                <strong className="text-purple-900">NPR {loanDuesCalculation.accruedInterestTotal.toLocaleString('en-IN')}</strong>
              </div>
              <div className="flex justify-between items-center border-t border-amber-200 pt-1.5 font-bold text-xs">
                <span className="font-sans text-slate-900">Total Cash Due Now:</span>
                <strong className="text-red-950 font-black">NPR {loanDuesCalculation.totalCashDueNow.toLocaleString('en-IN')}</strong>
              </div>
            </div>

            <p className="text-[11px] text-amber-800 italic">
              Per financial compliance standards, overdue fines and interest must be processed through the waterfall terminal first.
            </p>

            <button
              type="button"
              onClick={handleGoToOverdueTerminal}
              className="w-full py-2.5 bg-red-900 hover:bg-red-800 text-white font-black text-xs rounded-xl inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
            >
              Go to Overdue Settlement Terminal <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* NORMAL REPAYMENT INPUTS (UNLOCKED ONLY WHEN NOT OVERDUE) */}
        {selectedLoan && !isBorrowerOverdue && (
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
              className="w-full py-1.5 px-3 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-lg text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <Zap size={14} /> Full Payoff Amount: NPR {(remainingPrincipal + monthlyInterestDue).toLocaleString('en-IN')}
            </button>
          </div>
        )}

        {!isBorrowerOverdue && (
          <>
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
                className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <FileText size={12} /> Payment / Reference Note (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Paid via eSewa / Bank Transfer / Cash receipt in monthly meeting"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-medium"
              />
            </div>

            <button
              disabled={loading || !selectedLoanId || paymentNum <= 0}
              type="submit"
              className="w-full bg-emerald-900 hover:bg-emerald-800 disabled:bg-slate-400 text-white font-bold py-2.5 rounded-xl transition-colors mt-2 cursor-pointer shadow-xs"
            >
              {loading ? 'Processing Repayment...' : 'Submit Loan Payment'}
            </button>
          </>
        )}
      </form>

      {/* CONFIRMATION POPUP MODAL */}
      {showConfirmModal && selectedLoan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-left font-sans">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden space-y-0">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-400" />
                <h3 className="font-bold text-sm">Confirm Repayment Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-white p-1 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

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
                {paymentNote && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-sans">Reference Note:</span>
                    <span className="text-slate-800 font-sans font-medium italic">{paymentNote}</span>
                  </div>
                )}

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

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleConfirmedSubmit}
                  className="w-1/2 bg-emerald-900 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  {loading ? 'Recording...' : 'Confirm & Record'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}