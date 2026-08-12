'use client';

import { useState } from 'react';
import { getLoanDocSignedUrl } from '@/app/actions';
import {
  Eye,
  X,
  User,
  ShieldCheck,
  Receipt,
  Printer,
  CheckCircle2,
  ShieldAlert,
  FileText,
  UserCheck,
} from 'lucide-react';

interface LoanDetailsModalProps {
  loan: any;
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

export default function LoanDetailsModal({ loan }: LoanDetailsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);

  if (!loan) return null;

  const borrowerData = loan.borrower || loan.profiles || {};
  const loanPayments = loan.loanPayments || [];
  const totalInterestPaid = loanPayments.reduce(
    (sum: number, p: any) => sum + Number(p.interest_paid || 0),
    0
  );
  const totalPrincipalPaid = loan.totalRepaid || 0;

  const sortedPayments = [...loanPayments].sort(
    (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
  );

  const isInternalMember =
    borrowerData.user_type === 'MEMBER' || (!loan.guarantor_id && !loan.guarantor);

  const handleViewPdf = async () => {
    if (!loan.application_doc_path) return;
    setLoadingPdf(true);
    const signedUrl = await getLoanDocSignedUrl(loan.application_doc_path);
    setLoadingPdf(false);

    if (signedUrl) {
      window.open(signedUrl, '_blank');
    } else {
      alert('Unable to generate download link for scanned PDF application.');
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-colors print:hidden"
        title="View Loan Details & Ledger"
      >
        <Eye size={16} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-left print:static print:p-0 print:bg-white print:block">
          
          {/* OPTIMUM MODAL PRINT OVERRIDE */}
          <style type="text/css" media="print">
            {`
              @page { size: auto; margin: 10mm; }
              html, body {
                height: auto !important;
                min-height: 0 !important;
                overflow: visible !important;
                background: white !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              body * { visibility: hidden !important; }
              .printable-modal-zone, .printable-modal-zone * { visibility: visible !important; }
              .printable-modal-zone {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                box-shadow: none !important;
                border: none !important;
                background: white !important;
                overflow: visible !important;
              }
            `}
          </style>

          <div className="printable-modal-zone bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:overflow-visible">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 print:hidden">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-800 rounded-lg">
                  <Receipt size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Loan Ledger: {loan.loan_code}</h3>
                  <p className="text-xs text-slate-500 font-mono">Disbursed on {loan.issue_date}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`px-2.5 py-1 rounded text-xs font-bold ${
                    loan.isPaidOff ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {loan.isPaidOff ? 'PAID OFF' : 'ACTIVE'}
                </span>

                <button
                  onClick={() => window.open(`/loans/ledger-print?type=single&id=${loan.id}`, '_blank')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  <Printer size={14} /> Print
                </button>

                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-slate-700 transition-colors p-1"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Print-Only Header */}
            <div className="hidden print:block text-center border-b border-slate-300 pb-3 mb-3 pt-1">
              <h1 className="text-xl font-black text-slate-900 uppercase">EVERGREEN SAVINGS GROUP</h1>
              <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">
                Official Single Loan Ledger — {loan.loan_code}
              </p>
              <div className="inline-flex items-center gap-1 px-3 py-0.5 bg-blue-100 text-blue-900 font-sans text-[10px] font-bold rounded-full mt-1">
                <CheckCircle2 size={11} /> Verified Treasury Record
              </div>
            </div>

            {/* Scrollable Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 print:overflow-visible print:p-0">

              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print:border-slate-300 print:bg-transparent">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-100 text-amber-800 rounded-lg print:hidden">
                    <UserCheck size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block print:text-slate-500">
                      Loan Approval Authority
                    </span>
                    <strong className="text-slate-900 text-xs font-bold">
                      {loan.approved_by_name || 'Committee Admin'}
                    </strong>
                    <span className="text-[11px] text-slate-500 font-medium block">
                      {loan.approved_by_designation || 'Executive Board'}
                    </span>
                  </div>
                </div>

                {loan.application_doc_path ? (
                  <button
                    onClick={handleViewPdf}
                    disabled={loadingPdf}
                    className="px-3 py-1.5 bg-amber-800 hover:bg-amber-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs print:hidden disabled:opacity-50"
                  >
                    <FileText size={14} />
                    {loadingPdf ? 'Opening PDF...' : 'View Application Scan'}
                  </button>
                ) : (
                  <span className="text-slate-400 text-xs font-semibold px-2.5 py-1 bg-slate-100 rounded border border-slate-200 print:hidden">
                    No Scanned Application
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100 print:border-slate-300 print:bg-transparent">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 print:text-slate-600">
                    Involved Parties
                  </h4>

                  <div className="flex items-start gap-2">
                    <User size={16} className="text-blue-700 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-slate-500 font-semibold">Borrower</div>
                      <div className="font-bold text-slate-900 text-sm">{borrowerData.full_name || 'Borrower'}</div>
                      <div className="font-mono text-xs text-slate-500">
                        {isInternalMember
                          ? `Member ID: ${borrowerData.account_id || 'N/A'}`
                          : 'External Borrower'}
                      </div>
                    </div>
                  </div>

                  {isInternalMember ? (
                    <div className="flex items-start gap-2 mt-2 pt-2 border-t border-slate-200 opacity-60">
                      <ShieldCheck size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-semibold text-slate-400">Guarantor Status</div>
                        <div className="font-bold text-slate-500 text-xs">Not Required</div>
                        <div className="text-[10px] text-slate-400 font-sans">
                          Internal member loan backed by personal cooperative savings
                        </div>
                      </div>
                    </div>
                  ) : loan.guarantor ? (
                    <div className="flex items-start gap-2 mt-2 pt-2 border-t border-slate-200">
                      <ShieldCheck size={16} className="text-amber-700 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs text-amber-800 font-bold">Assigned Guarantor (Member)</div>
                        <div className="font-bold text-slate-900 text-sm">{loan.guarantor.full_name}</div>
                        <div className="font-mono text-xs text-slate-500">
                          Account ID: {loan.guarantor.account_id || 'N/A'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 mt-2 pt-2 border-t border-slate-200 text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                      <ShieldAlert size={16} className="text-amber-700 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-amber-900">Guarantor Missing</div>
                        <div className="text-[10px] text-amber-700">
                          External borrowers require an active member guarantor
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100 print:border-slate-300 print:bg-transparent">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 print:text-slate-600">
                    Loan Terms
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-slate-500">Principal</div>
                      <div className="font-bold font-mono text-slate-900 text-sm">
                        NPR {Number(loan.principal_amount).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Interest Rate</div>
                      <div className="font-bold font-mono text-slate-900 text-sm">{loan.current_rate}% p.a.</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Tenure & Issue Date</div>
                      <div className="font-bold font-mono text-slate-900 text-sm">{loan.tenure_months} Months</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{loan.issue_date}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Monthly EMI</div>
                      <div className="font-bold font-mono text-slate-900 text-sm">
                        NPR {Number(loan.monthly_emi).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 print:text-slate-600">
                  Financial Summary
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg print:border-slate-300 print:bg-transparent">
                    <div className="text-[10px] font-bold text-emerald-700 uppercase print:text-slate-500">
                      Total Principal Repaid
                    </div>
                    <div className="font-mono text-base font-black text-emerald-950">
                      NPR {totalPrincipalPaid.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="p-2.5 bg-purple-50 border border-purple-100 rounded-lg print:border-slate-300 print:bg-transparent">
                    <div className="text-[10px] font-bold text-purple-700 uppercase print:text-slate-500">
                      Total Interest Paid
                    </div>
                    <div className="font-mono text-base font-black text-purple-950">
                      NPR {totalInterestPaid.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-lg print:border-slate-300 print:bg-transparent">
                    <div className="text-[10px] font-bold text-amber-700 uppercase print:text-slate-500">
                      Remaining Principal
                    </div>
                    <div className="font-mono text-base font-black text-amber-950">
                      NPR {loan.remainingBalance.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex justify-between items-end print:text-slate-600">
                  <span>Transaction Ledger ({sortedPayments.length})</span>
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden print:border-slate-300">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] border-b border-slate-200 print:bg-transparent print:border-slate-300">
                      <tr>
                        <th className="p-2">Date</th>
                        <th className="p-2">Payment ID</th>
                        <th className="p-2 text-right">Principal</th>
                        <th className="p-2 text-right">Interest</th>
                        <th className="p-2 text-right">Total</th>
                        <th className="p-2 text-right font-sans">Authorized By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                      {sortedPayments.map((p: any) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="p-2 font-bold text-slate-700">{p.payment_date}</td>
                          <td className="p-2 text-blue-800">{p.payment_code || `PY-${p.id}`}</td>
                          <td className="p-2 text-right text-emerald-800 font-bold">
                            NPR {Number(p.principal_paid || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="p-2 text-right text-purple-800 font-bold">
                            NPR {Number(p.interest_paid || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="p-2 text-right text-slate-900 font-black">
                            NPR {(Number(p.principal_paid || 0) + Number(p.interest_paid || 0)).toLocaleString('en-IN')}
                          </td>
                          <td className="p-2 text-right text-slate-500 font-sans text-[10px] truncate max-w-[100px]">
                            {p.recorded_by_name}
                          </td>
                        </tr>
                      ))}
                      {sortedPayments.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-400 font-sans text-xs">
                            No repayments have been made towards this loan yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="hidden print:grid pt-6 mt-6 grid-cols-2 gap-8 text-xs font-mono border-t-2 border-slate-900">
                <div className="space-y-1 font-sans">
                  <div className="font-bold text-slate-900 uppercase">Ledger Metadata:</div>
                  <div>
                    Printed On: <strong>{getKathmanduPrintTimestamp()}</strong>
                  </div>
                  <div>
                    Status: <strong>{loan.isPaidOff ? 'PAID OFF & SETTLED' : 'ACTIVE'}</strong>
                  </div>
                </div>

                <div className="text-center flex flex-col justify-end items-center font-sans">
                  <div className="border-b border-slate-400 w-48 mb-1 h-8"></div>
                  <span className="font-bold text-slate-900 uppercase text-[10px]">
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