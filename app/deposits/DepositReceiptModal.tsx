'use client';

import { useState } from 'react';
import { formatMonthLabel } from '@/lib/formatters';
import { Printer, X, Receipt, CheckCircle, Award } from 'lucide-react';

interface DepositReceiptModalProps {
  receipt?: {
    deposit_code: string;
    for_month: string;
    amount_paid: number;
    created_at?: string;
    member_name: string;
    member_account_id: string;
    recorded_by_name?: string;
    recorded_by_designation?: string;
  };
  triggerLabel?: string;
}

export default function DepositReceiptModal({ receipt, triggerLabel = 'Print Slip' }: DepositReceiptModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!receipt) return null;

  function handlePrint() {
    window.print();
  }

  // Graceful fallback for older records without captured snapshots
  const adminFullName = receipt.recorded_by_name || 'System Admin';
  const adminDesignation = receipt.recorded_by_designation || 'Committee Executive';

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-2.5 py-1 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg flex items-center gap-1 transition-colors print:hidden"
      >
        <Receipt size={13} /> {triggerLabel}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-left">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden print:shadow-none print:border-none print:w-full print:max-w-none">
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center print:hidden">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-emerald-400" />
                <h3 className="font-bold text-sm">Savings Deposit Voucher</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Printer size={14} /> Print Slip
                </button>
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white p-1">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Body */}
            <div className="p-6 space-y-4 text-slate-900 font-mono text-xs print:p-0">
              
              {/* Receipt Header */}
              <div className="text-center border-b border-slate-200 pb-3 space-y-1">
                <h2 className="text-lg font-black text-slate-900 uppercase">EVERGREEN SAVINGS GROUP</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Official Monthly Savings Deposit Slip</p>
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-sans text-[10px] font-bold rounded-full mt-1">
                  <CheckCircle size={11} /> Treasury Verified
                </div>
              </div>

              {/* Transaction Codes */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">Deposit Code / ID</span>
                  <strong className="text-blue-900 text-sm font-extrabold">{receipt.deposit_code}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">Contribution Month</span>
                  <strong className="text-slate-900 text-sm font-bold">{formatMonthLabel(receipt.for_month?.slice(0,7))}</strong>
                </div>
              </div>

              {/* Depositor Info */}
              <div className="space-y-1.5 border-b border-slate-200 pb-3 font-sans">
                <div className="flex justify-between">
                  <span className="text-slate-500">Member Name:</span>
                  <strong className="text-slate-900 font-bold">{receipt.member_name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Account ID:</span>
                  <strong className="font-mono text-blue-900">{receipt.member_account_id}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Record Date:</span>
                  <strong className="font-mono text-slate-700">{receipt.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10)}</strong>
                </div>
              </div>

              {/* Amount Box */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex justify-between items-center">
                <span className="font-bold font-sans text-emerald-900 text-xs">Total Deposit Received:</span>
                <strong className="text-emerald-950 text-base font-extrabold font-mono">
                  NPR {Number(receipt.amount_paid).toLocaleString('en-IN')}
                </strong>
              </div>

              {/* Signature Footer */}
              <div className="pt-6 grid grid-cols-2 gap-6 text-center text-[10px] text-slate-500 font-sans font-semibold border-t border-slate-200 mt-4">
                <div>
                  <div className="border-b border-slate-300 mb-1 h-10 flex items-end justify-center pb-1"></div>
                  <span>Depositor Signature</span>
                </div>
                <div>
                  <div className="border-b border-slate-300 mb-1 h-10 flex flex-col justify-end items-center pb-1">
                    <span className="font-black text-slate-900 text-xs uppercase">{adminFullName}</span>
                    <span className="text-[9px] text-amber-900 font-bold uppercase flex items-center gap-0.5">
                      <Award size={9} /> {adminDesignation}
                    </span>
                  </div>
                  <span>Authorized Committee Seal</span>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}
    </>
  );
}