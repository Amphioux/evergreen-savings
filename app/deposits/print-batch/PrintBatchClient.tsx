'use client';

import { formatMonthLabel, formatNptDateTime } from '@/lib/formatters';
import { Printer, ArrowLeft, Clock } from 'lucide-react';

interface PrintBatchClientProps {
  vouchers: any[];
  monthLabel: string;
}

export default function PrintBatchClient({ vouchers, monthLabel }: PrintBatchClientProps) {
  if (vouchers.length === 0) {
    return (
      <div className="p-8 text-center font-sans text-sm text-slate-600 space-y-3">
        <p>No deposit records found for {monthLabel}.</p>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg"
        >
          Close Window
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-100 min-h-screen text-slate-900 font-mono text-[9px] leading-tight pb-10 print:bg-white print:p-0">
      
      {/* Strict Print Page Setup */}
      <style type="text/css" media="print">
        {`
          @page {
            size: A4 portrait;
            margin: 6mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .batch-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          /* Clean 6-per-page (3 rows) break */
          .batch-card:nth-child(6n) {
            break-after: page !important;
            page-break-after: always !important;
          }
        `}
      </style>

      {/* Top Banner Control Bar (Hidden during printing) */}
      <div className="p-4 bg-slate-900 text-white shadow-md flex justify-between items-center print:hidden font-sans sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.close()}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
            title="Close Preview"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h1 className="font-bold text-sm text-white flex items-center gap-2">
              Batch Voucher Print Preview — <span className="text-emerald-400">{monthLabel}</span>
            </h1>
            <p className="text-[11px] text-slate-400">{vouchers.length} Total Deposit Slips Formatted</p>
          </div>
        </div>

        {/* Manual Print Action Button */}
        <button
          onClick={() => window.print()}
          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2"
        >
          <Printer size={16} /> Print Batch Slips Now
        </button>
      </div>

      {/* Printable 2-Up Grid Area */}
      <div className="max-w-4xl mx-auto p-4 print:p-0 print:max-w-none">
        <div className="grid grid-cols-2 gap-3">
          {vouchers.map((r, i) => (
            <div
              key={i}
              className="batch-card p-3 border border-slate-300 rounded-lg space-y-1.5 bg-white shadow-xs print:shadow-none print:rounded-none"
            >
              {/* Slip Header */}
              <div className="text-center border-b border-slate-200 pb-1 space-y-0.5">
                <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-tight">
                  EVERGREEN SAVINGS GROUP
                </h2>
                <p className="text-[7px] text-slate-500 font-bold uppercase tracking-wider">
                  Official Monthly Savings Deposit Slip
                </p>
              </div>

              {/* Codes Row */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-50 rounded border border-slate-200 text-[8px]">
                <div>
                  <span className="text-slate-500 block text-[6px] uppercase font-sans font-bold">
                    Deposit Code
                  </span>
                  <strong className="text-blue-900 font-extrabold">{r.deposit_code}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[6px] uppercase font-sans font-bold">
                    Contribution Month
                  </span>
                  <strong className="text-slate-900 font-bold">
                    {formatMonthLabel(r.for_month?.slice(0, 7))}
                  </strong>
                </div>
              </div>

              {/* Member & Depositor Info */}
              <div className="space-y-0.5 border-b border-slate-200 pb-1 font-sans text-[8px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Member Name:</span>
                  <strong className="text-slate-900 font-bold truncate max-w-[120px]">
                    {r.member_name}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Account ID:</span>
                  <strong className="font-mono text-blue-900">{r.member_account_id}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Deposited By:</span>
                  <strong className="text-slate-900 font-bold truncate max-w-[120px]">
                    {r.deposited_by_name ? `${r.deposited_by_name} (Representative)` : 'Self (Member)'}
                  </strong>
                </div>

                {/* Added NPT Transaction Time Stamp */}
                <div className="flex justify-between pt-0.5">
                  <span className="text-slate-500 flex items-center gap-0.5">
                    <Clock size={8} className="text-slate-400" /> Txn Time:
                  </span>
                  <strong className="font-mono text-slate-800 text-[7.5px]">
                    {formatNptDateTime(r.created_at)}
                  </strong>
                </div>
              </div>

              {/* Amount Box */}
              <div className="p-1 bg-emerald-50 border border-emerald-200 rounded flex justify-between items-center text-[9px]">
                <span className="font-bold font-sans text-emerald-900 text-[8px]">
                  Total Amount Paid:
                </span>
                <strong className="text-emerald-950 font-extrabold font-mono text-[10px]">
                  NPR {Number(r.amount_paid).toLocaleString('en-IN')}
                </strong>
              </div>

              {/* Signatures */}
              <div className="pt-1 grid grid-cols-2 gap-1 text-center text-[7px] text-slate-500 font-sans font-semibold border-t border-slate-200">
                <div>
                  <div className="border-b border-slate-300 mb-0.5 h-4 flex flex-col justify-end items-center pb-0.5">
                    <span className="font-bold text-slate-800 text-[7px] truncate max-w-[80px]">
                      {r.deposited_by_name || r.member_name}
                    </span>
                  </div>
                  <span>Depositor Signature</span>
                </div>
                <div>
                  <div className="border-b border-slate-300 mb-0.5 h-4 flex flex-col justify-end items-center pb-0.5">
                    <span className="font-black text-slate-900 text-[7px] uppercase truncate max-w-[80px]">
                      {r.recorded_by_name}
                    </span>
                  </div>
                  <span>Authorized Seal</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}