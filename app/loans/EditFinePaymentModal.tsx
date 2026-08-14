'use client';

import { useState, useMemo } from 'react';
import { updateLoanPayment } from '@/app/actions';
import { allocateRepaymentWaterfall } from '@/lib/loanUtils';
import { 
  Pencil, 
  X, 
  ShieldCheck, 
  Percent, 
  Sparkles, 
  FileText, 
  Banknote,
  Calendar
} from 'lucide-react';

interface EditFinePaymentModalProps {
  payment: any;
}

export default function EditFinePaymentModal({ payment }: EditFinePaymentModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract base numerical values
  const rawFineWaived = Number(payment.fineWaived ?? payment.fine_discount_amount ?? 0);
  const rawInterestWaived = Number(payment.interestWaived ?? payment.interest_waived ?? 0);
  const rawFinePaid = Number(payment.finePaid ?? payment.fine_paid ?? 0);
  const rawInterestPaid = Number(payment.interestPaid ?? payment.interest_paid ?? 0);
  const rawPrincipalPaid = Number(payment.principalPaid ?? payment.principal_paid ?? 0);
  const rawTotalPaid = Number(payment.totalPaid ?? payment.total_paid ?? (rawFinePaid + rawInterestPaid + rawPrincipalPaid));

  // Form Inputs
  const [totalCashInput, setTotalCashInput] = useState<string>(String(rawTotalPaid));
  const [fineDiscountInput, setFineDiscountInput] = useState<string>(String(rawFineWaived));
  const [interestDiscountInput, setInterestDiscountInput] = useState<string>(String(rawInterestWaived));
  const [paymentDate, setPaymentDate] = useState<string>(payment.payment_date || '');
  const [waiverReason, setWaiverReason] = useState<string>(payment.waiver_reason || '');

  // Estimated Accrued Amounts for Waterfall Math (Preserves original claims)
  const accruedFineClaim = rawFinePaid + rawFineWaived;
  const accruedInterestClaim = rawInterestPaid + rawInterestWaived;
  const currentPrincipalBalance = rawPrincipalPaid;

  const fineDiscountNum = Math.max(0, Number(fineDiscountInput) || 0);
  const interestDiscountNum = Math.max(0, Number(interestDiscountInput) || 0);

  // Real-Time Auto Waterfall Calculation
  const waterfall = useMemo(() => {
    return allocateRepaymentWaterfall(
      Number(totalCashInput) || 0,
      accruedFineClaim,
      accruedInterestClaim,
      currentPrincipalBalance,
      fineDiscountNum,
      interestDiscountNum
    );
  }, [totalCashInput, accruedFineClaim, accruedInterestClaim, currentPrincipalBalance, fineDiscountNum, interestDiscountNum]);

  const requiresWaiverReason = fineDiscountNum > 0 || interestDiscountNum > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (waterfall.totalPaid <= 0) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('payment_id', String(payment.id));
    formData.append('fine_paid', String(waterfall.finePaid));
    formData.append('fine_discount_amount', String(fineDiscountNum));
    formData.append('fine_waived', String(fineDiscountNum >= accruedFineClaim && accruedFineClaim > 0));
    formData.append('interest_paid', String(waterfall.interestPaid));
    formData.append('interest_waived', String(interestDiscountNum));
    formData.append('principal_paid', String(waterfall.principalPaid));
    formData.append('payment_date', paymentDate);
    formData.append('waiver_reason', waiverReason);

    const res = await updateLoanPayment(formData);
    setLoading(false);

    if (res?.error) {
      setError(res.error);
    } else {
      setIsOpen(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="p-1 text-blue-700 hover:bg-blue-50 rounded transition-colors cursor-pointer"
        title="Edit Fine Settlement Voucher"
      >
        <Pencil size={14} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-left font-sans">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden space-y-0">
            
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-amber-400" />
                <h3 className="font-bold text-sm">Edit Fine Voucher ({payment.payment_code || `#${payment.id}`})</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs text-slate-800">
              
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 font-semibold rounded-lg">
                  {error}
                </div>
              )}

              {/* Borrower & Loan Info Summary */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Borrower:</span>
                  <strong className="text-slate-900 font-sans">{payment.borrower_name || payment.borrower?.full_name} ({payment.borrower_account_id || payment.borrower?.account_id})</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Loan Code:</span>
                  <strong className="text-blue-900">{payment.loan_code || payment.loan?.loan_code}</strong>
                </div>
              </div>

              {/* SECTION 1: DENSE 2-COLUMN RELIEF DISCOUNTS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* Interest Relief Input */}
                <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-xl space-y-1.5">
                  <label className="font-extrabold text-purple-950 text-[11px] flex items-center gap-1">
                    <Percent size={13} className="text-purple-700" /> Interest Relief / Discount
                  </label>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Relief Granted (NPR)</span>
                    <input
                      type="number"
                      min="0"
                      value={interestDiscountInput}
                      onChange={(e) => setInterestDiscountInput(e.target.value)}
                      className="w-full p-1.5 border border-purple-300 rounded-lg bg-white font-mono font-bold text-purple-950 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Late Fine Relief Input */}
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1.5">
                  <label className="font-extrabold text-amber-950 text-[11px] flex items-center gap-1">
                    <Sparkles size={13} className="text-amber-700" /> Late Fine Relief / Discount
                  </label>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Relief Granted (NPR)</span>
                    <input
                      type="number"
                      min="0"
                      value={fineDiscountInput}
                      onChange={(e) => setFineDiscountInput(e.target.value)}
                      className="w-full p-1.5 border border-amber-300 rounded-lg bg-white font-mono font-bold text-amber-950 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

              </div>

              {/* SECTION 2: TOTAL CASH RECEIVED INPUT */}
              <div className="p-3 bg-emerald-50 border-2 border-emerald-300 rounded-xl space-y-1.5">
                <label className="block font-black text-emerald-950 text-xs flex items-center gap-1.5">
                  <Banknote size={16} className="text-emerald-700" /> Enter Total Cash Received From Member (NPR) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={totalCashInput}
                  onChange={(e) => setTotalCashInput(e.target.value)}
                  className="w-full p-2 border border-emerald-400 rounded-lg bg-white font-mono font-black text-base text-emerald-950 shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {/* SECTION 3: REAL-TIME WATERFALL SPLIT READOUT */}
              <div className="p-3 bg-slate-900 text-white rounded-xl space-y-1.5 font-mono text-xs shadow-md">
                <div className="flex justify-between items-center border-b border-slate-800 pb-1 font-sans">
                  <span className="font-extrabold text-slate-300 text-[10px] flex items-center gap-1">
                    <Sparkles size={13} className="text-amber-400" /> Auto Waterfall Cash Split
                  </span>
                  <span className="text-amber-300 font-mono font-bold text-[11px]">
                    Total Cash: NPR {waterfall.totalPaid.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-0.5 text-center">
                  <div className="p-1.5 bg-slate-800/80 rounded border border-slate-700">
                    <span className="text-[9px] text-slate-400 font-sans block">1. Fine Paid</span>
                    <strong className="text-red-400 text-xs font-bold">NPR {waterfall.finePaid.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="p-1.5 bg-slate-800/80 rounded border border-slate-700">
                    <span className="text-[9px] text-slate-400 font-sans block">2. Interest Paid</span>
                    <strong className="text-purple-300 text-xs font-bold">NPR {waterfall.interestPaid.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="p-1.5 bg-slate-800/80 rounded border border-slate-700">
                    <span className="text-[9px] text-slate-400 font-sans block">3. Principal Reduced</span>
                    <strong className="text-emerald-400 text-xs font-bold">NPR {waterfall.principalPaid.toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              </div>

              {/* Payment Date & Reference */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar size={12} /> Payment Date *
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full p-1.5 border border-slate-300 rounded-lg font-mono text-slate-900"
                />
              </div>

              {/* Executive Waiver Reason */}
              {requiresWaiverReason && (
                <div className="p-2.5 bg-amber-100/70 border border-amber-300 rounded-xl">
                  <label className="block font-bold text-amber-900 text-[11px] mb-0.5 flex items-center gap-1">
                    <FileText size={12} /> Executive Approval / Waiver Reason *
                  </label>
                  <input
                    type="text"
                    required={requiresWaiverReason}
                    value={waiverReason}
                    onChange={(e) => setWaiverReason(e.target.value)}
                    placeholder="e.g. Approved by Executive Board Committee Chair"
                    className="w-full p-1.5 border border-amber-400 rounded-lg bg-white text-slate-900 text-xs font-medium"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || waterfall.totalPaid <= 0}
                  className="w-1/2 py-2.5 bg-emerald-900 hover:bg-emerald-800 text-white font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  {loading ? 'Saving Changes...' : 'Save Fine Voucher Changes'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}
    </>
  );
}