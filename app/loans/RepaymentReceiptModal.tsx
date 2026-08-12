'use client';

import { useState } from 'react';
import { Printer, X, Receipt, CheckCircle, ShieldCheck, Award } from 'lucide-react';

interface RepaymentReceiptModalProps {
  receipt?: {
    id?: string | number;
    payment_code?: string;
    payment_date?: string;
    loan_code?: string;
    current_rate?: number;
    borrower_name?: string;
    borrower_account_id?: string;
    guarantor_name?: string;
    guarantor_account_id?: string;
    principal_paid?: number;
    interest_paid?: number;
    total_paid?: number;
    remaining_balance?: number;
    recorded_by_name?: string;
    recorded_by_designation?: string;
  };
}

export default function RepaymentReceiptModal({ receipt }: RepaymentReceiptModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!receipt) return null;

  function handlePrint() {
    window.print();
  }

  const paymentCode = receipt.payment_code || (receipt.id ? `PY-${receipt.id}` : 'N/A');
  const interestRate = receipt.current_rate !== undefined && receipt.current_rate !== null 
    ? receipt.current_rate 
    : 12;

  // Extract Admin Name and Executive Position cleanly from recorded fields or regex fallback
  const rawAdminStr = receipt.recorded_by_name || 'Authorized Admin';
  const positionMatch = rawAdminStr.match(/^(.*?)\s*\((.*?)\)$/);

  let adminFullName = rawAdminStr;
  let adminPosition = receipt.recorded_by_designation || 'Authorized Executive';

  if (positionMatch) {
    adminFullName = positionMatch[1].trim();
    if (!receipt.recorded_by_designation) {
      adminPosition = positionMatch[2].trim();
    }
  } else {
    adminFullName = rawAdminStr.replace(/\s*\((Admin|Superadmin)\)/i, '').trim();
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-2.5 py-1 text-xs font-bold bg-slate-100 text-slate-800 hover:bg-slate-200 rounded-lg flex items-center gap-1 ml-auto transition-colors print:hidden"
      >
        <Receipt size={13} /> Print Slip
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-left">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden print:shadow-none print:border-none print:w-full print:max-w-none">
            
            {/* Header Actions (Hidden when printing) */}
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center print:hidden">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-emerald-400" />
                <h3 className="font-bold text-sm">Official Payment Voucher Slip</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Printer size={14} /> Print / Save PDF
                </button>
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white p-1">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Receipt Body */}
            <div className="p-6 space-y-5 text-slate-900 print:p-0">
              
              {/* Slip Title */}
              <div className="text-center border-b border-slate-200 pb-4 space-y-1">
                <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">EVERGREEN SAVINGS GROUP</h2>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Official Loan Repayment Receipt</p>
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-mono text-xs font-bold rounded-full mt-1">
                  <CheckCircle size={12} /> Payment Verified & Audited
                </div>
              </div>

              {/* Receipt Metadata */}
              <div className="grid grid-cols-2 gap-3 text-xs p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-sans font-bold">Payment ID / Receipt No.</span>
                  <strong className="text-blue-900 text-sm font-extrabold">{paymentCode}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-sans font-bold">Payment Date</span>
                  <strong className="text-slate-900 text-sm font-bold">{receipt.payment_date || 'N/A'}</strong>
                </div>
              </div>

              {/* Borrower & Loan Details */}
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b pb-1">
                  Borrower & Account Details
                </h4>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div>Borrower Name: <strong className="text-slate-900 block font-bold">{receipt.borrower_name || 'N/A'}</strong></div>
                  <div>Account ID: <strong className="text-slate-900 font-mono block font-bold">{receipt.borrower_account_id || 'N/A'}</strong></div>
                  <div>Loan ID: <strong className="text-blue-900 font-mono block font-bold">{receipt.loan_code || 'N/A'}</strong></div>
                  <div>Interest Rate: <strong className="font-mono block font-bold">{interestRate}% p.a.</strong></div>
                  
                  {receipt.guarantor_name && (
                    <div className="col-span-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-900 text-[11px] mt-1">
                      <span className="font-bold flex items-center gap-1">
                        <ShieldCheck size={12} /> Member Guarantor: {receipt.guarantor_name} ({receipt.guarantor_account_id || 'Member'})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Financial Breakdown */}
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b pb-1">
                  Payment Financial Breakdown
                </h4>
                <table className="w-full text-xs font-mono">
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="py-1.5 text-slate-600 font-sans">Interest Portion Paid:</td>
                      <td className="py-1.5 text-right font-bold text-purple-900">
                        NPR {Number(receipt.interest_paid || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-1.5 text-slate-600 font-sans">Principal Portion Reduced:</td>
                      <td className="py-1.5 text-right font-bold text-emerald-900">
                        NPR {Number(receipt.principal_paid || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                    <tr className="border-b-2 border-slate-900 text-sm">
                      <td className="py-2 font-bold font-sans text-slate-900">Total Payment Received:</td>
                      <td className="py-2 text-right font-black text-slate-950">
                        NPR {Number(receipt.total_paid || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Remaining Balance Summary */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex justify-between items-center text-xs font-mono">
                <span className="font-bold font-sans text-emerald-900">Remaining Outstanding Balance:</span>
                <strong className="text-emerald-950 text-base font-extrabold">
                  NPR {Number(receipt.remaining_balance || 0).toLocaleString('en-IN')}
                </strong>
              </div>

              {/* Signatures & Executive Admin Name */}
              <div className="pt-6 grid grid-cols-2 gap-8 text-center text-[11px] text-slate-500 font-semibold border-t border-slate-200 mt-6">
                <div>
                  <div className="border-b border-slate-300 mb-1 h-12 flex items-end justify-center pb-1"></div>
                  <span>Member Borrower Signature</span>
                </div>
                <div>
                  <div className="border-b border-slate-300 mb-1 h-12 flex flex-col justify-end items-center pb-1">
                    <span className="font-black text-slate-900 text-xs uppercase tracking-wide">
                      {adminFullName}
                    </span>
                    <span className="text-[10px] text-amber-900 font-extrabold uppercase tracking-wider flex items-center gap-0.5">
                      <Award size={10} /> {adminPosition}
                    </span>
                  </div>
                  <span>Authorized Executive Seal & Signature</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}