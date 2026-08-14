'use client';

import { useState } from 'react';
import { Printer, X, ShieldAlert, CheckCircle2, Receipt } from 'lucide-react';

interface FineSettlementReceiptModalProps {
  receipt: {
    payment_code?: string;
    payment_date?: string;
    borrower_name?: string;
    borrower_account_id?: string;
    loan_code?: string;
    days_overdue?: number;
    missed_months_count?: number;
    fine_paid?: number;
    interest_paid?: number;
    principal_paid?: number;
    total_paid?: number;
    fine_waived?: number;
    interest_waived?: number;
    waiver_reason?: string;
    new_principal_balance?: number;
    recorded_by?: string;
    payment_note?: string;
  };
  triggerLabel?: string;
}

function getKathmanduTimestamp() {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kathmandu',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(new Date());
}

export default function FineSettlementReceiptModal({
  receipt,
  triggerLabel = 'Print Settlement Slip',
}: FineSettlementReceiptModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  function handlePrint() {
    window.print();
  }

  const finePaid = Number(receipt.fine_paid || 0);
  const interestPaid = Number(receipt.interest_paid || 0);
  const principalPaid = Number(receipt.principal_paid || 0);
  const totalPaid = Number(receipt.total_paid || finePaid + interestPaid + principalPaid);
  
  const fineWaived = Number(receipt.fine_waived || 0);
  const interestWaived = Number(receipt.interest_waived || 0);
  const hasWaiver = fineWaived > 0 || interestWaived > 0;

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3 py-1.5 bg-red-900 hover:bg-red-800 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
      >
        <Receipt size={14} /> {triggerLabel}
      </button>

      {/* Settlement Slip Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 text-left font-sans">
          
          <style type="text/css" media="print">
            {`
              @page {
                size: A4 portrait;
                margin: 10mm;
              }
              html, body {
                background: white !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              body * {
                visibility: hidden !important;
              }
              .printable-fine-slip, .printable-card-zone * {
                visibility: visible !important;
              }
              .printable-fine-slip {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                background: white !important;
                padding: 0 !important;
                box-shadow: none !important;
                border: none !important;
              }
            `}
          </style>

          <div className="printable-fine-slip bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden text-xs">
            
            {/* Modal Controls Bar (Hidden during print) */}
            <div className="p-3.5 bg-red-950 text-white flex justify-between items-center print:hidden">
              <div className="flex items-center gap-2">
                <ShieldAlert size={16} className="text-amber-400" />
                <h3 className="font-bold text-xs">Penalty & Late Fee Settlement Receipt</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer size={14} /> Print Receipt
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* PRINTABLE RECEIPT CONTENT */}
            <div className="p-6 space-y-5 text-slate-900 font-mono">
              
              {/* Institution Header */}
              <div className="text-center border-b-2 border-red-900 pb-3 space-y-1">
                <h1 className="text-xl font-black text-slate-900 uppercase tracking-wide font-sans">
                  EVERGREEN SAVINGS & CREDIT COOPERATIVE
                </h1>
                <p className="text-[10px] text-red-900 font-bold uppercase tracking-widest font-sans">
                  Official Penalty Fee & Overdue Settlement Receipt
                </p>
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-100 text-red-950 text-[10px] font-bold rounded-full font-sans">
                  <CheckCircle2 size={11} className="text-red-700" /> Verified Settlement Voucher
                </div>
              </div>

              {/* Receipt Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-red-50/60 border border-red-200 rounded-xl">
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">Voucher / Receipt Code:</span>
                  <strong className="text-red-950 text-xs font-black">{receipt.payment_code || 'PFN-VOUCHER'}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">Settlement Date:</span>
                  <strong className="text-slate-900 text-xs font-bold">{receipt.payment_date || getKathmanduTimestamp()}</strong>
                </div>

                <div className="pt-1">
                  <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">Borrower Name & Acc:</span>
                  <strong className="text-slate-900 font-sans text-xs">{receipt.borrower_name || 'N/A'}</strong>
                  <span className="text-[10px] text-slate-600 block">Acc ID: {receipt.borrower_account_id || 'N/A'}</span>
                </div>
                <div className="text-right pt-1">
                  <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">Loan Reference:</span>
                  <strong className="text-slate-900 text-xs">{receipt.loan_code || 'N/A'}</strong>
                  {receipt.days_overdue !== undefined && (
                    <span className="text-[10px] text-red-800 font-bold block">
                      Overdue Term: {receipt.days_overdue} Days ({receipt.missed_months_count || 0} Mo Unpaid)
                    </span>
                  )}
                </div>
              </div>

              {/* Breakdown Waterfall Itemization Table */}
              <div className="border border-slate-300 rounded-xl overflow-hidden">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-slate-100 text-slate-800 uppercase font-bold border-b border-slate-300 text-[10px]">
                    <tr>
                      <th className="p-2.5 font-sans">Recovery Head Description</th>
                      <th className="p-2.5 text-right font-sans">Accrued / Due</th>
                      <th className="p-2.5 text-right font-sans">Waiver / Relief</th>
                      <th className="p-2.5 text-right font-sans font-black">Net Cash Collected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-2.5 font-sans font-bold text-slate-900">1. Late Penalty Charges</td>
                      <td className="p-2.5 text-right">NPR {(finePaid + fineWaived).toLocaleString('en-IN')}</td>
                      <td className="p-2.5 text-right text-amber-800">{fineWaived > 0 ? `- NPR ${fineWaived.toLocaleString('en-IN')}` : 'NPR 0'}</td>
                      <td className="p-2.5 text-right font-bold text-red-900">NPR {finePaid.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-sans font-bold text-slate-900">2. Accrued Loan Interest</td>
                      <td className="p-2.5 text-right">NPR {(interestPaid + interestWaived).toLocaleString('en-IN')}</td>
                      <td className="p-2.5 text-right text-amber-800">{interestWaived > 0 ? `- NPR ${interestWaived.toLocaleString('en-IN')}` : 'NPR 0'}</td>
                      <td className="p-2.5 text-right font-bold text-purple-900">NPR {interestPaid.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-sans font-bold text-slate-900">3. Principal Reduction Portion</td>
                      <td className="p-2.5 text-right">NPR {principalPaid.toLocaleString('en-IN')}</td>
                      <td className="p-2.5 text-right text-slate-400">NPR 0</td>
                      <td className="p-2.5 text-right font-bold text-emerald-900">NPR {principalPaid.toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-red-950 text-white font-bold text-sm">
                    <tr>
                      <td colSpan={3} className="p-2.5 font-sans font-black uppercase text-xs">Total Net Cash Received</td>
                      <td className="p-2.5 text-right font-black text-amber-300">NPR {totalPaid.toLocaleString('en-IN')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Relief & Audit Notes (if applicable) */}
              {hasWaiver && receipt.waiver_reason && (
                <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-[11px] space-y-0.5">
                  <strong className="text-amber-950 block font-sans uppercase text-[10px]">Executive Relief Approval Note:</strong>
                  <p className="text-slate-800 font-sans italic">{receipt.waiver_reason}</p>
                </div>
              )}

              {/* Updated Loan Status */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-xs">
                <span className="font-sans text-slate-600 font-bold">New Outstanding Loan Principal Balance:</span>
                <strong className="font-mono font-black text-slate-900 text-sm">
                  NPR {Number(receipt.new_principal_balance || 0).toLocaleString('en-IN')}
                </strong>
              </div>

              {/* Official Signatures */}
              <div className="pt-8 border-t-2 border-slate-900 grid grid-cols-2 gap-8 text-center text-[10px] font-sans font-bold">
                <div>
                  <div className="border-b border-slate-400 w-44 mx-auto mb-1 h-8"></div>
                  <span>Member / Depositor Signature</span>
                </div>
                <div>
                  <div className="border-b border-slate-400 w-44 mx-auto mb-1 h-8"></div>
                  <span>Authorized Teller / Treasury Collector</span>
                  <div className="text-[9px] text-slate-500 font-normal">Officer: {receipt.recorded_by || 'Treasury Admin'}</div>
                </div>
              </div>

              {/* Footer Stamp */}
              <div className="text-center text-[9px] text-slate-400 font-sans pt-2 border-t border-slate-200">
                Printed: {getKathmanduTimestamp()} • System Slip ID: {receipt.payment_code || 'VOUCHER'} • Computer Generated Receipt
              </div>

            </div>

          </div>
        </div>
      )}
    </>
  );
}