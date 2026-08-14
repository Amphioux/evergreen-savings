'use client';

import { useState } from 'react';
import { deleteLoanPayment } from '@/app/actions';
import { Trash2, X, AlertTriangle, Receipt, FileText, CheckCircle2 } from 'lucide-react';

interface DeleteFinePaymentModalProps {
  payment: any;
  onDeleteStart?: (payment: any) => void;
  onDeleteComplete?: (paymentId: string | number) => void;
}

export default function DeleteFinePaymentModal({ 
  payment,
  onDeleteStart,
  onDeleteComplete
}: DeleteFinePaymentModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [isDeleted, setIsDeleted] = useState(false);

  if (!payment) return null;

  // Robust field extraction & numeric coercion
  const voucherCode = payment.payment_code || `PY-${payment.id}`;
  const paymentDate = payment.payment_date || 'N/A';
  const borrowerName = payment.borrower_name || payment.borrower?.full_name || 'Unknown Borrower';
  const accountId = payment.borrower_account_id || payment.borrower?.account_id || 'N/A';
  const loanCode = payment.loan_code || payment.loan?.loan_code || `LN-${payment.loan_id}`;

  const finePaid = Number(payment.finePaid ?? payment.fine_paid ?? 0);
  const interestPaid = Number(payment.interestPaid ?? payment.interest_paid ?? 0);
  const principalPaid = Number(payment.principalPaid ?? payment.principal_paid ?? 0);
  
  // Calculate total cash collected
  const totalCashCollected = Number(payment.totalPaid ?? payment.total_paid ?? (finePaid + interestPaid + principalPaid));

  const fineWaived = Number(payment.fineWaived ?? payment.fine_discount_amount ?? 0);
  const interestWaived = Number(payment.interestWaived ?? payment.interest_waived ?? 0);
  const totalReliefWaived = fineWaived + interestWaived;

  function handleOpenModal() {
    setIsDeleted(false);
    setError(null);
    setReason('');
    setIsOpen(true);
    onDeleteStart?.(payment);
  }

  function handleCloseModal() {
    setIsOpen(false);
    setIsDeleted(false);
    setError(null);
    setReason('');
    onDeleteComplete?.(payment.id);
  }

  // 1. EXECUTE ACTUAL SERVER DELETION ON FORM SUBMIT ("Confirm & Delete")
  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('payment_id', String(payment.id));
    formData.append('reason', reason);

    const res = await deleteLoanPayment(formData);
    setLoading(false);

    if (res?.error) {
      setError(res.error);
    } else {
      // 2. SHOW SUCCESS CONFIRMATION VIEW
      setIsDeleted(true);
    }
  }

  return (
    <>
      {/* TRIGGER BUTTON (ALWAYS RENDERED IN ROW) */}
      <button
        type="button"
        onClick={handleOpenModal}
        className="p-1 text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
        title="Delete Fine Settlement Voucher"
      >
        <Trash2 size={14} />
      </button>

      {/* MODAL OVERLAY */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-left font-sans">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden space-y-0">
            
            {/* 3. SUCCESS CONFIRMATION VIEW (DISPLAYS AFTER DELETION) */}
            {isDeleted ? (
              <div className="p-6 space-y-4 text-center font-sans">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 size={28} />
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-slate-900">
                    Voucher Record Deleted Successfully
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Settlement voucher <strong className="text-blue-900 font-mono text-sm px-1.5 py-0.5 bg-blue-50 border border-blue-200 rounded-md">{voucherCode}</strong> has been permanently deleted and reversed from the audit ledger.
                  </p>
                </div>

                {/* DELETED VOUCHER SUMMARY BOX */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-left space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span className="font-sans">Receipt Code:</span>
                    <strong className="text-blue-900 font-extrabold">{voucherCode}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span className="font-sans">Borrower Name:</span>
                    <strong className="text-slate-900 font-sans">{borrowerName} ({accountId})</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span className="font-sans">Loan Code:</span>
                    <strong className="text-slate-900">{loanCode}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600 border-t border-slate-200 pt-1.5">
                    <span className="font-sans">Reversed Cash:</span>
                    <strong className="text-red-700">NPR {totalCashCollected.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px] pt-0.5 italic font-sans">
                    <span>Audit Reason:</span>
                    <span className="font-medium text-slate-800">"{reason}"</span>
                  </div>
                </div>

                {/* 4. CLICK DONE TO DISMISS MODAL */}
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  Done
                </button>
              </div>
            ) : (
              /* DELETION CONFIRMATION FORM */
              <>
                {/* Header */}
                <div className="p-4 bg-red-950 text-white flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={18} className="text-amber-400" />
                    <h3 className="font-bold text-sm">Delete Fine Settlement Voucher</h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="text-slate-400 hover:text-white p-1 transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleDelete} className="p-5 space-y-4 text-xs text-slate-800">
                  
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 font-semibold rounded-lg">
                      {error}
                    </div>
                  )}

                  <p className="text-slate-600 font-medium leading-relaxed">
                    You are about to permanently delete this settlement voucher. This action will reverse the cash collection and reinstate the borrower's overdue backlog in the ledger.
                  </p>

                  {/* VOUCHER & STATEMENT DETAILS BOX */}
                  <div className="p-3.5 bg-red-50 rounded-xl border border-red-200 space-y-2 font-mono text-[11px]">
                    <div className="flex justify-between items-center border-b border-red-200 pb-1.5 font-sans">
                      <span className="font-bold text-red-950 flex items-center gap-1">
                        <Receipt size={13} className="text-red-700" /> Receipt Code:
                      </span>
                      <strong className="text-blue-900 font-mono text-xs">{voucherCode}</strong>
                    </div>

                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-500 font-sans">Payment Date:</span>
                      <strong className="text-slate-900">{paymentDate}</strong>
                    </div>

                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-500 font-sans">Borrower:</span>
                      <strong className="text-slate-900 font-sans">{borrowerName} ({accountId})</strong>
                    </div>

                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-500 font-sans">Loan Code:</span>
                      <strong className="text-slate-800">{loanCode}</strong>
                    </div>

                    {/* CASH BREAKDOWN */}
                    <div className="pt-1.5 border-t border-red-200 space-y-1 font-sans text-[10px]">
                      <div className="flex justify-between text-red-900">
                        <span>1. Fine Cash Portion:</span>
                        <strong className="font-mono">NPR {finePaid.toLocaleString('en-IN')}</strong>
                      </div>
                      <div className="flex justify-between text-purple-900">
                        <span>2. Interest Cash Portion:</span>
                        <strong className="font-mono">NPR {interestPaid.toLocaleString('en-IN')}</strong>
                      </div>
                      <div className="flex justify-between text-emerald-900">
                        <span>3. Principal Portion:</span>
                        <strong className="font-mono">NPR {principalPaid.toLocaleString('en-IN')}</strong>
                      </div>
                      <div className="flex justify-between text-amber-900">
                        <span>Executive Relief Waived:</span>
                        <strong className="font-mono">NPR {totalReliefWaived.toLocaleString('en-IN')}</strong>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t-2 border-red-900 font-bold text-xs font-sans">
                      <span className="text-red-950">Total Cash Received:</span>
                      <strong className="text-red-950 font-mono text-sm font-black">
                        NPR {totalCashCollected.toLocaleString('en-IN')}
                      </strong>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-red-950 mb-1 flex items-center gap-1">
                      <FileText size={12} /> Reason for Deletion (Mandatory Audit Trail) *
                    </label>
                    <input
                      type="text"
                      required
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Teller cash entry error / Voucher duplicated"
                      className="w-full p-2 border border-red-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !reason.trim()}
                      className="w-1/2 py-2.5 bg-red-900 hover:bg-red-800 disabled:bg-slate-300 text-white font-bold rounded-xl cursor-pointer shadow-xs"
                    >
                      {loading ? 'Deleting...' : 'Confirm & Delete'}
                    </button>
                  </div>

                </form>
              </>
            )}

          </div>
        </div>
      )}
    </>
  );
}