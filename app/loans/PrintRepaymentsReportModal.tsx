'use client';

import { useState } from 'react';
import { Printer, X, FileText, CheckCircle2, Eye } from 'lucide-react';

interface PrintRepaymentsReportModalProps {
  repaymentHistory: any[];
}

function getKathmanduPrintTimestamp() {
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

export default function PrintRepaymentsReportModal({
  repaymentHistory = [],
}: PrintRepaymentsReportModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const totalPrincipal = repaymentHistory.reduce(
    (sum, r) => sum + Number(r.principal_paid || 0),
    0
  );
  const totalInterest = repaymentHistory.reduce(
    (sum, r) => sum + Number(r.interest_paid || 0),
    0
  );
  const totalCollected = totalPrincipal + totalInterest;

  function handleOpenDedicatedPrintPage() {
    const queryParams = new URLSearchParams();
    queryParams.set('type', 'repayments');

    window.open(`/loans/ledger-print?${queryParams.toString()}`, '_blank', 'width=1000,height=800,scrollbars=yes');
  }

  return (
    <>
      {/* 1. Directory Button Renamed to "See Details" */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer shadow-xs"
      >
        <Eye size={14} /> See Details
      </button>

      {/* 2. Detailed Report Window Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-left font-sans">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden">
            {/* Modal Controls Bar */}
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-purple-400" />
                <h3 className="font-bold text-sm">Loan Repayments Detailed Report</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenDedicatedPrintPage}
                  className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  title="Print report on dedicated printable page"
                >
                  <Printer size={14} /> Print Report
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

            {/* Detailed Preview Body */}
            <div className="p-6 space-y-5 text-slate-900 font-mono text-xs max-h-[80vh] overflow-y-auto">
              {/* Header */}
              <div className="text-center border-b border-slate-300 pb-3 space-y-1">
                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                  EVERGREEN SAVINGS GROUP
                </h1>
                <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">
                  Official Loan Repayment Audit Ledger
                </p>
                <div className="inline-flex items-center gap-1 px-3 py-0.5 bg-purple-100 text-purple-900 font-sans text-[10px] font-bold rounded-full mt-1">
                  <CheckCircle2 size={11} /> Verified Treasury Output
                </div>
              </div>

              {/* KPI Summary Block */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl font-sans">
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">
                    Total Principal Repaid
                  </span>
                  <strong className="text-emerald-900 font-mono text-sm font-extrabold">
                    NPR {totalPrincipal.toLocaleString('en-IN')}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">
                    Total Interest Collected
                  </span>
                  <strong className="text-purple-900 font-mono text-sm font-extrabold">
                    NPR {totalInterest.toLocaleString('en-IN')}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">
                    Gross Treasury Recovery
                  </span>
                  <strong className="text-slate-900 font-mono text-sm font-black">
                    NPR {totalCollected.toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>

              {/* Repayments Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Payment ID</th>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5 font-sans">Loan & Borrower</th>
                      <th className="p-2.5 text-right">Principal</th>
                      <th className="p-2.5 text-right">Interest</th>
                      <th className="p-2.5 text-right">Total Paid</th>
                      <th className="p-2.5 font-sans">Authorized By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {repaymentHistory.map((record) => (
                      <tr key={record.id}>
                        <td className="p-2.5 font-bold text-blue-900">
                          {record.payment_code || `PY-${record.id}`}
                        </td>
                        <td className="p-2.5">{record.payment_date}</td>
                        <td className="p-2.5 font-sans">
                          <strong className="font-mono text-slate-800">
                            {record.loan_code}
                          </strong>
                          <div className="text-[10px] text-slate-500">
                            {record.borrower_name} ({record.borrower_account_id})
                          </div>
                        </td>
                        <td className="p-2.5 text-right font-bold text-emerald-900">
                          NPR {Number(record.principal_paid || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5 text-right font-bold text-purple-900">
                          NPR {Number(record.interest_paid || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5 text-right font-black text-slate-900">
                          NPR {Number(record.total_paid || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5 text-slate-600 font-sans text-[11px]">
                          {record.recorded_by_name || 'Admin'}
                        </td>
                      </tr>
                    ))}
                    {repaymentHistory.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400 font-sans text-xs">
                          No repayment records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Signature Footer */}
              <div className="pt-8 border-t-2 border-slate-900 mt-8 grid grid-cols-2 gap-8 text-xs font-mono font-sans">
                <div className="space-y-1">
                  <div className="font-bold text-slate-900 uppercase">Audit Trail Details:</div>
                  <div>Generated Date: <strong>{getKathmanduPrintTimestamp()}</strong></div>
                  <div>Total Transactions: <strong>{repaymentHistory.length} Logged Payments</strong></div>
                </div>

                <div className="text-center flex flex-col justify-end items-center">
                  <div className="border-b border-slate-400 w-56 mb-1 h-10"></div>
                  <span className="font-bold text-slate-900 uppercase text-[11px]">
                    Authorized Executive Seal & Signature
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}