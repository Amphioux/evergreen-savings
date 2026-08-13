'use client';

import { useState } from 'react';
import { FileText, Printer, X } from 'lucide-react';

interface DividendReceipt {
  distribution_code: string;
  title: string;
  distributed_at: string;
  cutoff_month?: string;
  member_name: string;
  member_account_id: string;
  savings_snapshot: number;
  share_percentage: number;
  dividend_amount: number;
  payment_method: string;
  deposit_note?: string;
  recorded_by_name?: string;
  recorded_by_designation?: string; // <-- Added designation prop
}

export default function DividendReceiptModal({ receipt }: { receipt: DividendReceipt }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
        title="View Official Voucher"
      >
        <FileText size={14} /> Voucher
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-slate-900 text-left space-y-4 border border-purple-100 relative print:p-0 print:border-none">
            
            {/* Modal Actions */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 print:hidden">
              <span className="text-xs font-mono font-bold text-purple-900 bg-purple-50 px-2 py-1 rounded">
                Voucher Code: {receipt.distribution_code}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-purple-900 hover:bg-purple-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Printer size={14} /> Print
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Voucher Body */}
            <div className="space-y-4 font-sans print:p-4">
              <div className="text-center border-b border-slate-200 pb-3">
                <h2 className="text-lg font-black uppercase tracking-wider text-slate-900">Evergreen Savings Group</h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Official Dividend Payout Receipt</p>
                <p className="text-[10px] font-mono text-purple-900 font-bold mt-1">Receipt ID: {receipt.distribution_code}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Member Name</span>
                  <strong className="text-slate-900 font-sans font-bold">{receipt.member_name}</strong>
                  <span className="text-[10px] text-slate-500 block">Acc: {receipt.member_account_id}</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Payout Date</span>
                  <strong className="text-slate-900">{receipt.distributed_at}</strong>
                </div>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-sans">Profit Event:</span>
                  <strong className="text-slate-900 font-sans">{receipt.title}</strong>
                </div>
                {receipt.cutoff_month && (
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-sans">Savings Cutoff:</span>
                    <strong className="text-slate-900">{receipt.cutoff_month}</strong>
                  </div>
                )}
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-sans">Eligible Savings Snapshot:</span>
                  <span>NPR {receipt.savings_snapshot.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-sans">Ownership Share:</span>
                  <strong className="text-purple-900">{receipt.share_percentage}%</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-sans">Payment Method:</span>
                  <strong className="text-slate-900">{receipt.payment_method}</strong>
                </div>
                {receipt.deposit_note && (
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-sans">Note / Ref:</span>
                    <span className="text-slate-800 font-sans">{receipt.deposit_note}</span>
                  </div>
                )}
                <div className="flex justify-between py-2.5 bg-purple-50 px-3 rounded-xl border border-purple-100 mt-2 font-black text-sm">
                  <span className="font-sans text-purple-950">Net Dividend Paid:</span>
                  <span className="text-purple-950">NPR {receipt.dividend_amount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Author & Verification Footer */}
              <div className="pt-6 grid grid-cols-2 text-[10px] font-mono border-t border-slate-200 mt-4">
                <div>
                  <span className="text-[9px] text-slate-400 font-sans uppercase font-bold block">Recorded By (Author):</span>
                  <strong className="text-slate-900 font-sans block">{receipt.recorded_by_name || 'System Admin'}</strong>
                  <small className="text-slate-500 font-sans block">{receipt.recorded_by_designation || 'Executive Officer'}</small>
                </div>
                <div className="text-center">
                  <div className="border-b border-slate-300 w-28 mx-auto mb-1 h-5"></div>
                  <span className="text-slate-500 font-sans font-bold uppercase">Executive Signature</span>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}
    </>
  );
}