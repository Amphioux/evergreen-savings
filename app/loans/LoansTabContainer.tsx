'use client';

import { useState, useMemo } from 'react';
import IssueLoanForm from './IssueLoanForm';
import RecordRepaymentForm from './RecordRepaymentForm';
import LoanLateFeeCollectionTab from './LoanLateFeeCollectionTab';
import FineRepaymentsLedgerTable from './FineRepaymentsLedgerTable';
import GroupLoansLedgerTable from './GroupLoansLedgerTable';
import RepaymentReceiptModal from './RepaymentReceiptModal';
import EditLoanModal from './EditLoanModal';
import EditPaymentModal from './EditPaymentModal';
import PrintLoansReportModal from './PrintLoansReportModal';
import PrintRepaymentsReportModal from './PrintRepaymentsReportModal';
import LoanDetailsModal from './LoanDetailsModal';
import DeleteLoanConfirmModal from './DeleteLoanConfirmModal';
import { 
  Banknote, 
  Receipt, 
  ListFilter, 
  ShieldCheck, 
  History, 
  Search, 
  Filter, 
  Calendar, 
  RotateCcw, 
  Lock, 
  UserCheck, 
  ChevronLeft, 
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Briefcase,
  Wallet,
  Users,
  ArrowRight
} from 'lucide-react';

interface LoansTabContainerProps {
  currentUserId?: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  profiles: any[];
  loanList: any[];
  paymentList: any[];
  activeLoans: any[];
  repaymentHistory: any[];
  fineRules?: any[];
  selectedLoanIdForRepayment?: string | number;
  initialActiveTab?: string;
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
  fineRules = [],
  selectedLoanIdForRepayment,
  initialActiveTab = 'DIRECTORY',
}: LoansTabContainerProps) {
  
  // PARENT TAB STATE: 'PORTFOLIO' | 'REPAYMENTS'
  const [parentTab, setParentTab] = useState<'PORTFOLIO' | 'REPAYMENTS'>(
    initialActiveTab === 'REPAYMENT' || initialActiveTab === 'LATE_FEE_COLLECTION' || initialActiveTab === 'HISTORY' || initialActiveTab === 'FINE_REPAYMENTS_LEDGER'
      ? 'REPAYMENTS'
      : 'PORTFOLIO'
  );

  // SUB-TAB STATES
  const [portfolioSubTab, setPortfolioSubTab] = useState<'DIRECTORY' | 'DISBURSE' | 'GROUP_LEDGER'>(
    initialActiveTab === 'DISBURSE' ? 'DISBURSE' : 'DIRECTORY'
  );

  const [repaymentSubTab, setRepaymentSubTab] = useState<'HISTORY' | 'REPAYMENT' | 'LATE_FEE_COLLECTION' | 'FINE_REPAYMENTS_LEDGER'>(
    initialActiveTab === 'LATE_FEE_COLLECTION' ? 'LATE_FEE_COLLECTION' : (initialActiveTab as any) || 'HISTORY'
  );

  const currentAdmin = useMemo(() => {
    return profiles.find((p) => String(p.id) === String(currentUserId));
  }, [profiles, currentUserId]);

  // Directory Filter & Pagination States
  const [directorySearch, setDirectorySearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PAID_OFF'>('ALL');
  const [dirStartDate, setDirStartDate] = useState('');
  const [dirEndDate, setDirEndDate] = useState('');
  const [dirPage, setDirPage] = useState(1);
  const [dirPageSize, setDirPageSize] = useState(5);

  // History Filter & Pagination States
  const [historySearch, setHistorySearch] = useState('');
  const [histStartDate, setHistStartDate] = useState('');
  const [histEndDate, setHistEndDate] = useState('');
  const [histPage, setHistPage] = useState(1);
  const [histPageSize, setHistPageSize] = useState(5);

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

  // Filtered Loans
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

  // Paginated Directory Loans
  const totalDirPages = Math.ceil(filteredLoanList.length / dirPageSize) || 1;
  const paginatedDirectoryLoans = useMemo(() => {
    const start = (dirPage - 1) * dirPageSize;
    return filteredLoanList.slice(start, start + dirPageSize);
  }, [filteredLoanList, dirPage, dirPageSize]);

  // Filtered Repayment History
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

  // Paginated Repayments
  const totalHistPages = Math.ceil(filteredRepaymentHistory.length / histPageSize) || 1;
  const paginatedRepayments = useMemo(() => {
    const start = (histPage - 1) * histPageSize;
    return filteredRepaymentHistory.slice(start, start + histPageSize);
  }, [filteredRepaymentHistory, histPage, histPageSize]);

  const totalPrincipalRepaid = filteredRepaymentHistory.reduce((sum, r) => sum + Number(r?.principal_paid || 0), 0);
  const totalInterestCollected = filteredRepaymentHistory.reduce((sum, r) => sum + Number(r?.interest_paid || 0), 0);

  return (
    <div className="space-y-6 text-left font-sans">
      
      {/* LEVEL 1: MAIN PARENT TAB BAR */}
      <div className="flex border-b-2 border-slate-200 text-sm font-black space-x-2">
        
        {/* Parent Tab 1: Loan Portfolio Management */}
        <button
          type="button"
          onClick={() => setParentTab('PORTFOLIO')}
          className={`flex items-center gap-2 px-5 py-3 border-b-4 transition-all cursor-pointer ${
            parentTab === 'PORTFOLIO'
              ? 'border-blue-700 text-blue-950 bg-blue-50/70'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Briefcase size={18} className={parentTab === 'PORTFOLIO' ? 'text-blue-700' : 'text-slate-400'} />
          <span>LOAN DISBURSEMENT & PORTFOLIO</span>
          <span className="text-xs font-mono font-bold px-2 py-0.5 bg-blue-200 text-blue-950 rounded-full">
            {loanList.length}
          </span>
        </button>

        {/* Parent Tab 2: Loan Repayments & Treasury */}
        <button
          type="button"
          onClick={() => setParentTab('REPAYMENTS')}
          className={`flex items-center gap-2 px-5 py-3 border-b-4 transition-all cursor-pointer ${
            parentTab === 'REPAYMENTS'
              ? 'border-emerald-700 text-emerald-950 bg-emerald-50/70'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wallet size={18} className={parentTab === 'REPAYMENTS' ? 'text-emerald-700' : 'text-slate-400'} />
          <span>LOAN REPAYMENT & TREASURY</span>
          <span className="text-xs font-mono font-bold px-2 py-0.5 bg-emerald-200 text-emerald-950 rounded-full">
            {paymentList.length}
          </span>
        </button>

      </div>

      {/* LEVEL 2: PORTFOLIO SUB-BAR */}
      {parentTab === 'PORTFOLIO' && (
        <div className="p-1.5 bg-blue-900/90 text-white rounded-xl flex items-center gap-1.5 text-xs font-bold font-sans w-fit">
          <button
            type="button"
            onClick={() => setPortfolioSubTab('DIRECTORY')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
              portfolioSubTab === 'DIRECTORY'
                ? 'bg-white text-blue-950 font-extrabold shadow-xs'
                : 'text-blue-100 hover:bg-blue-800'
            }`}
          >
            <ListFilter size={14} /> Disbursed Loans Directory ({loanList.length})
          </button>

          <button
            type="button"
            onClick={() => setPortfolioSubTab('GROUP_LEDGER')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
              portfolioSubTab === 'GROUP_LEDGER'
                ? 'bg-white text-blue-950 font-extrabold shadow-xs'
                : 'text-blue-100 hover:bg-blue-800'
            }`}
          >
            <Users size={14} /> Group Loans Ledger (Lifetime)
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setPortfolioSubTab('DISBURSE')}
              className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                portfolioSubTab === 'DISBURSE'
                  ? 'bg-white text-blue-950 font-extrabold shadow-xs'
                  : 'text-blue-100 hover:bg-blue-800'
              }`}
            >
              <Banknote size={14} /> Disburse New Loan
            </button>
          )}
        </div>
      )}

      {/* LEVEL 2: REPAYMENTS SUB-BAR */}
      {parentTab === 'REPAYMENTS' && (
        <div className="p-1.5 bg-emerald-950 text-white rounded-xl flex flex-wrap items-center gap-1 text-xs font-bold font-sans">
          
          <button
            type="button"
            onClick={() => setRepaymentSubTab('HISTORY')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
              repaymentSubTab === 'HISTORY'
                ? 'bg-white text-emerald-950 font-extrabold shadow-xs'
                : 'text-emerald-100 hover:bg-emerald-900'
            }`}
          >
            <History size={14} /> Repayment History ({repaymentHistory.length})
          </button>

          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => setRepaymentSubTab('REPAYMENT')}
                className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                  repaymentSubTab === 'REPAYMENT'
                    ? 'bg-white text-emerald-950 font-extrabold shadow-xs'
                    : 'text-emerald-100 hover:bg-emerald-900'
                }`}
              >
                <Receipt size={14} /> Standard EMI Repayment ({activeLoans.length})
              </button>

              <button
                type="button"
                onClick={() => setRepaymentSubTab('LATE_FEE_COLLECTION')}
                className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                  repaymentSubTab === 'LATE_FEE_COLLECTION'
                    ? 'bg-red-800 text-white font-extrabold shadow-xs'
                    : 'text-red-200 hover:bg-emerald-900'
                }`}
              >
                <ShieldAlert size={14} className="text-amber-400" /> Overdue Fine Collection Terminal
              </button>

              <button
                type="button"
                onClick={() => setRepaymentSubTab('FINE_REPAYMENTS_LEDGER')}
                className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                  repaymentSubTab === 'FINE_REPAYMENTS_LEDGER'
                    ? 'bg-purple-800 text-white font-extrabold shadow-xs'
                    : 'text-purple-200 hover:bg-emerald-900'
                }`}
              >
                <Sparkles size={14} className="text-amber-300" /> Fine Vouchers Ledger
              </button>
            </>
          )}

        </div>
      )}

      {/* PORTFOLIO: DIRECTORY */}
      {parentTab === 'PORTFOLIO' && portfolioSubTab === 'DIRECTORY' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-0">
          <div className="p-4 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-800 text-sm">
                Group Disbursed Loans ({filteredLoanList.length} Total)
              </span>
              <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                <span>View:</span>
                <select
                  value={dirPageSize}
                  onChange={(e) => {
                    setDirPageSize(Number(e.target.value));
                    setDirPage(1);
                  }}
                  className="bg-transparent font-mono font-bold text-slate-900 cursor-pointer"
                >
                  <option value={5}>5 Per Page</option>
                  <option value={10}>10 Per Page</option>
                  <option value={25}>25 Per Page</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
                <Filter size={13} className="text-slate-500 ml-1" />
                <button
                  type="button"
                  onClick={() => { setStatusFilter('ALL'); setDirPage(1); }}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({enrichedLoanList.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setStatusFilter('ACTIVE'); setDirPage(1); }}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    statusFilter === 'ACTIVE' ? 'bg-amber-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Active ({enrichedLoanList.filter((l) => !l.isPaidOff).length})
                </button>
                <button
                  type="button"
                  onClick={() => { setStatusFilter('PAID_OFF'); setDirPage(1); }}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    statusFilter === 'PAID_OFF' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Paid Off ({enrichedLoanList.filter((l) => l.isPaidOff).length})
                </button>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200 text-xs">
                <Calendar size={13} className="text-slate-500 ml-1" />
                <input
                  type="date"
                  value={dirStartDate}
                  onChange={(e) => { setDirStartDate(e.target.value); setDirPage(1); }}
                  className="px-1.5 py-0.5 border border-slate-300 rounded bg-white text-slate-900 text-xs"
                />
                <span className="text-slate-400 font-bold">to</span>
                <input
                  type="date"
                  value={dirEndDate}
                  onChange={(e) => { setDirEndDate(e.target.value); setDirPage(1); }}
                  className="px-1.5 py-0.5 border border-slate-300 rounded bg-white text-slate-900 text-xs"
                />
                {(dirStartDate || dirEndDate) && (
                  <button
                    type="button"
                    onClick={() => { setDirStartDate(''); setDirEndDate(''); setDirPage(1); }}
                    className="p-1 text-slate-500 hover:text-red-700 cursor-pointer"
                  >
                    <RotateCcw size={12} />
                  </button>
                )}
              </div>

              <div className="relative flex-1 sm:w-48">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={isAdmin ? "Search Loan ID, Name..." : "Search Name..."}
                  value={directorySearch}
                  onChange={(e) => { setDirectorySearch(e.target.value); setDirPage(1); }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-700"
                />
              </div>

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
                {paginatedDirectoryLoans.map((loan) => {
                  const isOwnLoan = Boolean(currentUserId) && String(loan.borrower_id) === String(currentUserId);
                  const canAccessDetails = isAdmin || isOwnLoan;

                  return (
                    <tr key={loan.id} className={`hover:bg-slate-50 transition-colors ${isOwnLoan ? 'bg-amber-50/20' : ''}`}>
                      <td className="p-3 font-mono text-xs">
                        {canAccessDetails ? (
                          <span className="font-extrabold text-amber-900">{loan.loan_code || `LN-${loan.id}`}</span>
                        ) : (
                          <span className="text-slate-400 font-sans text-xs flex items-center gap-1 select-none">
                            <Lock size={12} className="text-slate-400" /> ••••••
                          </span>
                        )}
                      </td>

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

                      <td className="p-3 text-right">
                        {canAccessDetails ? (
                          <div className="flex items-center justify-end gap-1">
                            <LoanDetailsModal loan={loan} />
                            {isSuperAdmin && (
                              <>
                                <EditLoanModal loan={loan} borrowerName={loan.borrower.full_name} />
                                <DeleteLoanConfirmModal
                                  type="LOAN"
                                  recordId={loan.id}
                                  code={loan.loan_code || `LN-${loan.id}`}
                                  summaryText={`Principal NPR ${Number(loan.principal_amount).toLocaleString('en-IN')} issued to ${loan.borrower.full_name}`}
                                />
                              </>
                            )}
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
              </tbody>
            </table>
          </div>

          {totalDirPages > 1 && (
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs font-bold font-mono">
              <span className="text-slate-600">
                Page {dirPage} of {totalDirPages} ({filteredLoanList.length} Total Loans)
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={dirPage === 1}
                  onClick={() => setDirPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 bg-white border border-slate-300 text-slate-800 disabled:opacity-40 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft size={13} /> Prev
                </button>
                <button
                  type="button"
                  disabled={dirPage === totalDirPages}
                  onClick={() => setDirPage((p) => Math.min(totalDirPages, p + 1))}
                  className="px-3 py-1 bg-white border border-slate-300 text-slate-800 disabled:opacity-40 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  Next <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PORTFOLIO: GROUP LOANS LEDGER */}
      {parentTab === 'PORTFOLIO' && portfolioSubTab === 'GROUP_LEDGER' && (
        <GroupLoansLedgerTable
          loanList={loanList}
          paymentList={paymentList}
          profiles={profiles}
          fineRules={fineRules}
        />
      )}

      {/* PORTFOLIO: DISBURSE NEW LOAN */}
      {parentTab === 'PORTFOLIO' && portfolioSubTab === 'DISBURSE' && isAdmin && (
        <div className="max-w-2xl">
          <IssueLoanForm
            profiles={profiles}
            activeLoans={activeLoans}
            currentAdmin={currentAdmin}
          />
        </div>
      )}

      {/* REPAYMENTS: HISTORY */}
      {parentTab === 'REPAYMENTS' && repaymentSubTab === 'HISTORY' && (
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
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-800 text-sm">
                  Repayment Logs ({filteredRepaymentHistory.length} Total)
                </span>
                <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                  <span>View:</span>
                  <select
                    value={histPageSize}
                    onChange={(e) => {
                      setHistPageSize(Number(e.target.value));
                      setHistPage(1);
                    }}
                    className="bg-transparent font-mono font-bold text-slate-900 cursor-pointer"
                  >
                    <option value={5}>5 Per Page</option>
                    <option value={10}>10 Per Page</option>
                    <option value={25}>25 Per Page</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200 text-xs">
                  <Calendar size={13} className="text-slate-500 ml-1" />
                  <input
                    type="date"
                    value={histStartDate}
                    onChange={(e) => { setHistStartDate(e.target.value); setHistPage(1); }}
                    className="px-1.5 py-0.5 border border-slate-300 rounded bg-white text-slate-900 text-xs"
                  />
                  <span className="text-slate-400 font-bold">to</span>
                  <input
                    type="date"
                    value={histEndDate}
                    onChange={(e) => { setHistEndDate(e.target.value); setHistPage(1); }}
                    className="px-1.5 py-0.5 border border-slate-300 rounded bg-white text-slate-900 text-xs"
                  />
                </div>

                <div className="relative flex-1 sm:w-56">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={isAdmin ? "Search Payment ID, Loan ID, Name..." : "Search Name..."}
                    value={historySearch}
                    onChange={(e) => { setHistorySearch(e.target.value); setHistPage(1); }}
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-700"
                  />
                </div>

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
                  {paginatedRepayments.map((record) => {
                    const isOwnRecord = Boolean(currentUserId) && String(record.borrower_id) === String(currentUserId);
                    const canAccessDetails = isAdmin || isOwnRecord;

                    // Check if payment is an Overdue Fine Settlement Voucher
                    const isOverdueSettlement = Number(record.fine_paid || 0) > 0 || 
                                                 Number(record.fine_discount_amount || 0) > 0 || 
                                                 Number(record.interest_waived || 0) > 0 ||
                                                 Boolean(record.fine_waived);

                    return (
                      <tr key={record.id} className={`hover:bg-slate-50 transition-colors ${isOwnRecord ? 'bg-amber-50/20' : ''}`}>
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

                        {/* ACTIONS COLUMN: SEPARATED LOGIC FOR OVERDUE SETTLEMENT VS STANDARD REPAYMENT */}
                        <td className="p-3 text-right">
                          {canAccessDetails ? (
                            <div className="flex items-center justify-end gap-1.5 font-sans">
                              {isOverdueSettlement ? (
                                <>
                                  {/* Print Fine Voucher Receipt with profiles lookup */}
                                  <RepaymentReceiptModal receipt={record} profiles={profiles} />

                                  {/* Direct Badge to Fine Ledger for Audited Management */}
                                  {isAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => setRepaymentSubTab('FINE_REPAYMENTS_LEDGER')}
                                      className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 rounded-lg text-[10px] font-extrabold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                                      title="Fine vouchers must be managed & deleted in the Fine Repayments Ledger"
                                    >
                                      <span>Manage in Fine Ledger</span>
                                      <ArrowRight size={11} />
                                    </button>
                                  )}
                                </>
                              ) : (
                                <>
                                  {/* Standard EMI Repayment Modal Options */}
                                  {isSuperAdmin && (
                                    <>
                                      <EditPaymentModal record={record} />
                                      <DeleteLoanConfirmModal
                                        type="REPAYMENT"
                                        recordId={record.id}
                                        code={record.payment_code || `PY-${record.id}`}
                                        summaryText={`Repayment NPR ${(Number(record.principal_paid || 0) + Number(record.interest_paid || 0)).toLocaleString('en-IN')} on ${record.payment_date}`}
                                      />
                                    </>
                                  )}
                                  <RepaymentReceiptModal receipt={record} profiles={profiles} />
                                </>
                              )}
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
                </tbody>
              </table>
            </div>

            {totalHistPages > 1 && (
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs font-bold font-mono">
                <span className="text-slate-600">
                  Page {histPage} of {totalHistPages} ({filteredRepaymentHistory.length} Total Repayments)
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={histPage === 1}
                    onClick={() => setHistPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 bg-white border border-slate-300 text-slate-800 disabled:opacity-40 rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft size={13} /> Prev
                  </button>
                  <button
                    type="button"
                    disabled={histPage === totalHistPages}
                    onClick={() => setHistPage((p) => Math.min(totalHistPages, p + 1))}
                    className="px-3 py-1 bg-white border border-slate-300 text-slate-800 disabled:opacity-40 rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    Next <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REPAYMENTS: STANDARD EMI REPAYMENT */}
      {parentTab === 'REPAYMENTS' && repaymentSubTab === 'REPAYMENT' && isAdmin && (
        <div className="max-w-2xl">
          <RecordRepaymentForm 
            activeLoans={activeLoans} 
            profiles={profiles}
            paymentList={paymentList}
            fineRules={fineRules}
            preSelectedLoanId={selectedLoanIdForRepayment}
            onNavigateToLateFeeTerminal={(loanId) => {
              setRepaymentSubTab('LATE_FEE_COLLECTION');
            }}
          />
        </div>
      )}

      {/* REPAYMENTS: OVERDUE FINE COLLECTION TERMINAL */}
      {parentTab === 'REPAYMENTS' && repaymentSubTab === 'LATE_FEE_COLLECTION' && isAdmin && (
        <LoanLateFeeCollectionTab
          activeLoans={activeLoans}
          profiles={profiles}
          paymentList={paymentList}
          fineRules={fineRules}
        />
      )}

      {/* REPAYMENTS: FINE REPAYMENTS VOUCHERS LEDGER */}
      {parentTab === 'REPAYMENTS' && repaymentSubTab === 'FINE_REPAYMENTS_LEDGER' && isAdmin && (
        <FineRepaymentsLedgerTable
          paymentList={paymentList}
          loanList={loanList}
          activeLoans={activeLoans}
          profiles={profiles}
          isSuperAdmin={isSuperAdmin}
        />
      )}

    </div>
  );
}