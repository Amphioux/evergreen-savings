'use client';

import { useState, useMemo } from 'react';
import IssueLoanForm from './IssueLoanForm';
import RecordRepaymentForm from './RecordRepaymentForm';
import RepaymentReceiptModal from './RepaymentReceiptModal';
import EditLoanModal from './EditLoanModal';
import EditPaymentModal from './EditPaymentModal';
import PrintLoansReportModal from './PrintLoansReportModal';
import PrintRepaymentsReportModal from './PrintRepaymentsReportModal';
import LoanDetailsModal from './LoanDetailsModal';
import { Banknote, Receipt, ListFilter, ShieldCheck, History, Search, Filter, Calendar, RotateCcw, Lock, UserCheck } from 'lucide-react';

interface LoansTabContainerProps {
  currentUserId?: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  profiles: any[];
  loanList: any[];
  paymentList: any[];
  activeLoans: any[];
  repaymentHistory: any[];
}

export default function LoansTabContainer({
  currentUserId = '',
  isAdmin,
  isSuperAdmin,
  profiles = [],
  loanList = [],
  paymentList = [],
  activeLoans = [],
  repaymentHistory = [],
}: LoansTabContainerProps) {
  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'HISTORY' | 'DISBURSE' | 'REPAYMENT'>('DIRECTORY');

  // Resolve current logged-in Admin Profile for auto-populating loan approvals
  const currentAdmin = useMemo(() => {
    return profiles.find((p) => String(p.id) === String(currentUserId));
  }, [profiles, currentUserId]);

  // Directory Filter States
  const [directorySearch, setDirectorySearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PAID_OFF'>('ALL');
  const [dirStartDate, setDirStartDate] = useState('');
  const [dirEndDate, setDirEndDate] = useState('');

  // History Filter States
  const [historySearch, setHistorySearch] = useState('');
  const [histStartDate, setHistStartDate] = useState('');
  const [histEndDate, setHistEndDate] = useState('');

  // Enriched Loans
  const enrichedLoanList = useMemo(() => {
    return loanList.map((loan) => {
      const borrower = profiles.find((p) => p.id === loan.borrower_id) || {
        full_name: 'Unknown',
        user_type: 'MEMBER',
        account_id: '',
      };
      const guarantor = profiles.find((p) => p.id === loan.guarantor_id);

      const loanPayments = paymentList.filter((p) => String(p.loan_id) === String(loan.id));
      const totalRepaid = loanPayments.reduce((sum, p) => sum + Number(p.principal_paid || 0), 0);
      const remainingBalance = Math.max(0, Number(loan.principal_amount || 0) - totalRepaid);
      const isPaidOff = remainingBalance <= 0 || loan.status === 'SETTLED' || loan.status === 'PAID_OFF';

      return {
        ...loan,
        borrower,
        guarantor,
        loanPayments,
        totalRepaid,
        remainingBalance,
        isPaidOff,
      };
    });
  }, [loanList, paymentList, profiles]);

  // Filtered & Sorted Disbursed Loans Directory
  const filteredLoanList = useMemo(() => {
    return enrichedLoanList
      .filter((loan) => {
        if (statusFilter === 'ACTIVE' && loan.isPaidOff) return false;
        if (statusFilter === 'PAID_OFF' && !loan.isPaidOff) return false;

        if (dirStartDate && loan.issue_date < dirStartDate) return false;
        if (dirEndDate && loan.issue_date > dirEndDate) return false;

        const q = directorySearch.toLowerCase().trim();
        if (!q) return true;

        const codeMatch = isAdmin && loan.loan_code && loan.loan_code.toLowerCase().includes(q);
        const nameMatch = loan.borrower?.full_name && loan.borrower.full_name.toLowerCase().includes(q);
        const accountMatch = isAdmin && loan.borrower?.account_id && loan.borrower.account_id.toLowerCase().includes(q);
        const guarantorMatch = loan.guarantor?.full_name && loan.guarantor.full_name.toLowerCase().includes(q);

        return codeMatch || nameMatch || accountMatch || guarantorMatch;
      })
      .sort((a, b) => {
        const dateDiff = new Date(b.issue_date || 0).getTime() - new Date(a.issue_date || 0).getTime();
        if (dateDiff !== 0) return dateDiff;
        return Number(b.id || 0) - Number(a.id || 0);
      });
  }, [enrichedLoanList, statusFilter, directorySearch, dirStartDate, dirEndDate, isAdmin]);

  // Filtered & Sorted Repayment History
  const filteredRepaymentHistory = useMemo(() => {
    return (repaymentHistory || [])
      .filter((record) => {
        if (histStartDate && record.payment_date < histStartDate) return false;
        if (histEndDate && record.payment_date > histEndDate) return false;

        const q = historySearch.toLowerCase().trim();
        if (!q) return true;

        const codeMatch = isAdmin && record.payment_code && record.payment_code.toLowerCase().includes(q);
        const loanMatch = isAdmin && record.loan_code && record.loan_code.toLowerCase().includes(q);
        const borrowerMatch = record.borrower_name && record.borrower_name.toLowerCase().includes(q);
        const accountMatch = isAdmin && record.borrower_account_id && record.borrower_account_id.toLowerCase().includes(q);

        return codeMatch || loanMatch || borrowerMatch || accountMatch;
      })
      .sort((a, b) => {
        const dateDiff = new Date(b.payment_date || 0).getTime() - new Date(a.payment_date || 0).getTime();
        if (dateDiff !== 0) return dateDiff;
        return String(b.payment_code || '').localeCompare(String(a.payment_code || ''));
      });
  }, [repaymentHistory, historySearch, histStartDate, histEndDate, isAdmin]);

  const totalPrincipalRepaid = filteredRepaymentHistory.reduce((sum, r) => sum + Number(r?.principal_paid || 0), 0);
  const totalInterestCollected = filteredRepaymentHistory.reduce((sum, r) => sum + Number(r?.interest_paid || 0), 0);

  return (
    <div className="space-y-6 text-left">
      {/* Sub Navigation Tabs (Unified Amber Theme) */}
      <div className="flex border-b border-slate-200 text-xs sm:text-sm font-bold gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('DIRECTORY')}
          className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'DIRECTORY'
              ? 'border-amber-800 text-amber-950 bg-amber-50/50 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ListFilter size={16} /> Disbursed Loans Directory ({loanList.length})
        </button>

        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'HISTORY'
              ? 'border-amber-800 text-amber-950 bg-amber-50/50 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <History size={16} /> Repayment History ({repaymentHistory.length})
        </button>

        {isAdmin && (
          <>
            <button
              onClick={() => setActiveTab('DISBURSE')}
              className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 whitespace-nowrap transition-colors ${
                activeTab === 'DISBURSE'
                  ? 'border-amber-800 text-amber-950 bg-amber-50/50 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Banknote size={16} /> Disburse New Loan
            </button>

            <button
              onClick={() => setActiveTab('REPAYMENT')}
              className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 whitespace-nowrap transition-colors ${
                activeTab === 'REPAYMENT'
                  ? 'border-amber-800 text-amber-950 bg-amber-50/50 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Receipt size={16} /> Record Loan Repayment ({activeLoans.length})
            </button>
          </>
        )}
      </div>

      {/* TAB 1: DISBURSED LOANS DIRECTORY */}
      {activeTab === 'DIRECTORY' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-0">
          <div className="p-4 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <span className="font-semibold text-slate-800 text-sm">
              Group Disbursed Loans ({filteredLoanList.length} of {loanList.length})
            </span>

            <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
              {/* Status Filter Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
                <Filter size={13} className="text-slate-500 ml-1" />
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    statusFilter === 'ALL'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({enrichedLoanList.length})
                </button>
                <button
                  onClick={() => setStatusFilter('ACTIVE')}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    statusFilter === 'ACTIVE'
                      ? 'bg-amber-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Active ({enrichedLoanList.filter((l) => !l.isPaidOff).length})
                </button>
                <button
                  onClick={() => setStatusFilter('PAID_OFF')}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    statusFilter === 'PAID_OFF'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Paid Off ({enrichedLoanList.filter((l) => l.isPaidOff).length})
                </button>
              </div>

              {/* Date Filter Controls */}
              <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200 text-xs">
                <Calendar size={13} className="text-slate-500 ml-1" />
                <input
                  type="date"
                  value={dirStartDate}
                  onChange={(e) => setDirStartDate(e.target.value)}
                  className="px-1.5 py-0.5 border border-slate-300 rounded bg-white text-slate-900 text-xs"
                  title="Issue Date From"
                />
                <span className="text-slate-400 font-bold">to</span>
                <input
                  type="date"
                  value={dirEndDate}
                  onChange={(e) => setDirEndDate(e.target.value)}
                  className="px-1.5 py-0.5 border border-slate-300 rounded bg-white text-slate-900 text-xs"
                  title="Issue Date To"
                />
                {(dirStartDate || dirEndDate) && (
                  <button
                    onClick={() => {
                      setDirStartDate('');
                      setDirEndDate('');
                    }}
                    className="p-1 text-slate-500 hover:text-red-700"
                    title="Clear Date Filter"
                  >
                    <RotateCcw size={12} />
                  </button>
                )}
              </div>

              {/* Search Bar */}
              <div className="relative flex-1 sm:w-48">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={isAdmin ? "Search Loan ID, Name..." : "Search Name..."}
                  value={directorySearch}
                  onChange={(e) => setDirectorySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-700"
                />
              </div>

              {/* Report Printable Modal (Admin Only) */}
              {isAdmin && (
                <PrintLoansReportModal loanList={filteredLoanList} profiles={profiles} paymentList={paymentList} />
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3 font-mono">Loan ID</th>
                  <th className="p-3">Borrower Details</th>
                  <th className="p-3">Disbursed Date</th>
                  <th className="p-3">Tenure & EMI</th>
                  <th className="p-3">Principal Amount</th>
                  <th className="p-3">Remaining Balance</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLoanList.map((loan) => {
                  const isOwnLoan = Boolean(currentUserId) && String(loan.borrower_id) === String(currentUserId);
                  const canAccessDetails = isAdmin || isOwnLoan;

                  return (
                    <tr key={loan.id} className={`hover:bg-slate-50 transition-colors ${isOwnLoan ? 'bg-amber-50/20' : ''}`}>
                      
                      {/* Loan ID (Masked for others) */}
                      <td className="p-3 font-mono text-xs">
                        {canAccessDetails ? (
                          <span className="font-extrabold text-amber-900">{loan.loan_code || `LN-${loan.id}`}</span>
                        ) : (
                          <span className="text-slate-400 font-sans text-xs flex items-center gap-1 select-none" title="Loan ID restricted for privacy">
                            <Lock size={12} className="text-slate-400" /> ••••••
                          </span>
                        )}
                      </td>

                      {/* Borrower Name & Details */}
                      <td className="p-3 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{loan.borrower.full_name}</span>
                          {isOwnLoan && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                              <UserCheck size={11} /> You
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 font-normal mt-0.5">
                          {loan.borrower.user_type === 'NON_MEMBER' ? (
                            <span className="text-amber-700 font-semibold flex items-center gap-1">
                              <ShieldCheck size={12} />
                              Guarantor: {loan.guarantor?.full_name || 'N/A'}
                            </span>
                          ) : (
                            isAdmin && <span className="font-mono">ID: {loan.borrower.account_id || 'N/A'}</span>
                          )}
                        </div>
                      </td>

                      <td className="p-3 font-mono text-xs text-slate-700 font-semibold">{loan.issue_date}</td>
                      <td className="p-3 text-xs">
                        <div className="font-bold text-slate-800">{loan.tenure_months || 12} Months</div>
                        <div className="font-mono text-amber-900 font-semibold">
                          NPR {Number(loan.monthly_emi || 0).toLocaleString('en-IN')}/mo
                        </div>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-800">
                        NPR {Number(loan.principal_amount).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 font-mono font-bold text-amber-900">
                        NPR {loan.remainingBalance.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded ${
                            loan.isPaidOff
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {loan.isPaidOff ? 'PAID OFF' : 'ACTIVE'}
                        </span>
                      </td>

                      {/* Action Column */}
                      <td className="p-3 text-right">
                        {canAccessDetails ? (
                          <div className="flex items-center justify-end gap-1">
                            <LoanDetailsModal loan={loan} />
                            {isSuperAdmin && <EditLoanModal loan={loan} borrowerName={loan.borrower.full_name} />}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-semibold px-2.5 py-1 bg-slate-100 rounded border border-slate-200 inline-flex items-center gap-1 cursor-not-allowed select-none">
                            <Lock size={11} /> Restricted
                          </span>
                        )}
                      </td>

                    </tr>
                  );
                })}
                {filteredLoanList.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400 text-xs">
                      No matching disbursed loans found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: REPAYMENT HISTORY */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-xs font-bold text-emerald-800 uppercase">Group Principal Repaid</span>
              <div className="text-2xl font-extrabold text-emerald-950 font-mono mt-1">
                NPR {totalPrincipalRepaid.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-xs font-bold text-amber-800 uppercase">Group Interest Collected</span>
              <div className="text-2xl font-extrabold text-amber-950 font-mono mt-1">
                NPR {totalInterestCollected.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              <span className="font-semibold text-slate-800 text-sm">
                Repayment Logs ({filteredRepaymentHistory.length} of {repaymentHistory.length})
              </span>

              <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                {/* Date Filter Controls */}
                <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200 text-xs">
                  <Calendar size={13} className="text-slate-500 ml-1" />
                  <input
                    type="date"
                    value={histStartDate}
                    onChange={(e) => setHistStartDate(e.target.value)}
                    className="px-1.5 py-0.5 border border-slate-300 rounded bg-white text-slate-900 text-xs"
                    title="Payment Date From"
                  />
                  <span className="text-slate-400 font-bold">to</span>
                  <input
                    type="date"
                    value={histEndDate}
                    onChange={(e) => setHistEndDate(e.target.value)}
                    className="px-1.5 py-0.5 border border-slate-300 rounded bg-white text-slate-900 text-xs"
                    title="Payment Date To"
                  />
                  {(histStartDate || histEndDate) && (
                    <button
                      onClick={() => {
                        setHistStartDate('');
                        setHistEndDate('');
                      }}
                      className="p-1 text-slate-500 hover:text-red-700"
                      title="Clear Date Filter"
                    >
                      <RotateCcw size={12} />
                    </button>
                  )}
                </div>

                {/* Search Bar */}
                <div className="relative flex-1 sm:w-56">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={isAdmin ? "Search Payment ID, Loan ID, Name..." : "Search Name..."}
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-700"
                  />
                </div>

                {/* Report Printable Modal (Admin Only) */}
                {isAdmin && <PrintRepaymentsReportModal repaymentHistory={filteredRepaymentHistory} />}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Payment ID & Date</th>
                    <th className="p-3">Borrower Name</th>
                    <th className="p-3">Principal Paid</th>
                    <th className="p-3">Interest Paid</th>
                    <th className="p-3">Total Payment</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRepaymentHistory.map((record) => {
                    const isOwnRecord = Boolean(currentUserId) && String(record.borrower_id) === String(currentUserId);
                    const canAccessDetails = isAdmin || isOwnRecord;

                    return (
                      <tr key={record.id} className={`hover:bg-slate-50 transition-colors ${isOwnRecord ? 'bg-amber-50/20' : ''}`}>
                        
                        {/* Payment ID (Masked for others) */}
                        <td className="p-3 text-xs font-mono">
                          {canAccessDetails ? (
                            <>
                              <div className="font-extrabold text-amber-900">{record.payment_code || `PY-${record.id}`}</div>
                              <div className="text-slate-500 font-semibold">{record.payment_date}</div>
                            </>
                          ) : (
                            <>
                              <div className="text-slate-400 font-sans flex items-center gap-1 select-none"><Lock size={12} /> ••••••</div>
                              <div className="text-slate-500 font-semibold">{record.payment_date}</div>
                            </>
                          )}
                        </td>

                        {/* Borrower Name */}
                        <td className="p-3 font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>{record.borrower_name}</span>
                            {isOwnRecord && (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                                <UserCheck size={11} /> You
                              </span>
                            )}
                          </div>
                          {isAdmin && (
                            <div className="text-xs text-slate-400 font-mono">ID: {record.borrower_account_id}</div>
                          )}
                        </td>

                        <td className="p-3 font-mono font-bold text-emerald-800">
                          NPR {Number(record.principal_paid || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 font-mono font-bold text-amber-800">
                          NPR {Number(record.interest_paid || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 font-mono font-extrabold text-slate-900">
                          NPR {Number(record.total_paid || 0).toLocaleString('en-IN')}
                        </td>

                        {/* Receipt Button Column */}
                        <td className="p-3 text-right">
                          {canAccessDetails ? (
                            <div className="flex items-center justify-end gap-1">
                              {isSuperAdmin && <EditPaymentModal record={record} />}
                              <RepaymentReceiptModal receipt={record} />
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-semibold px-2.5 py-1 bg-slate-100 rounded border border-slate-200 inline-flex items-center gap-1 cursor-not-allowed select-none">
                              <Lock size={11} /> Restricted
                            </span>
                          )}
                        </td>

                      </tr>
                    );
                  })}

                  {filteredRepaymentHistory.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400 text-xs">
                        No matching repayment records found for the selected query or filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DISBURSE NEW LOAN */}
      {activeTab === 'DISBURSE' && isAdmin && (
        <div className="max-w-2xl">
          <IssueLoanForm
            profiles={profiles}
            activeLoans={activeLoans}
            currentAdmin={currentAdmin}
          />
        </div>
      )}

      {/* TAB 4: RECORD LOAN REPAYMENT */}
      {activeTab === 'REPAYMENT' && isAdmin && (
        <div className="max-w-2xl">
          <RecordRepaymentForm activeLoans={activeLoans} />
        </div>
      )}
    </div>
  );
}