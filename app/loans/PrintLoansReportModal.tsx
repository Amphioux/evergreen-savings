'use client';

import { useState, useMemo } from 'react';
import { Printer, X, FileText, Calendar, RotateCcw, User, Eye } from 'lucide-react';

interface PrintLoansReportModalProps {
  loanList: any[];
  profiles: any[];
  paymentList: any[];
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

export default function PrintLoansReportModal({
  loanList = [],
  profiles = [],
  paymentList = [],
}: PrintLoansReportModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PAID_OFF'>('ALL');
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');

  // Dedicated Print Page Launcher with Active Filters
  function handleOpenDedicatedPrintPage() {
    const queryParams = new URLSearchParams();
    queryParams.set('type', 'portfolio');

    if (selectedMemberId) queryParams.set('member_id', selectedMemberId);
    if (statusFilter !== 'ALL') queryParams.set('status', statusFilter);
    if (reportStartDate) {
      const year = reportStartDate.slice(0, 4);
      queryParams.set('year', year);
    }

    window.open(`/loans/ledger-print?${queryParams.toString()}`, '_blank', 'width=1000,height=800,scrollbars=yes');
  }

  // Active borrowers for the dropdown
  const activeBorrowers = useMemo(() => {
    return profiles
      .filter((p) => p.role !== 'ADMIN' && p.role !== 'SUPER_ADMIN')
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [profiles]);

  // Selected member name
  const selectedMemberName = useMemo(() => {
    if (!selectedMemberId) return null;
    return profiles.find((p) => String(p.id) === String(selectedMemberId))?.full_name || 'Unknown Member';
  }, [selectedMemberId, profiles]);

  // Enrich and Filter Loans
  const filteredLoans = useMemo(() => {
    return loanList
      .map((loan) => {
        const borrower = profiles.find((p) => String(p.id) === String(loan.borrower_id)) || { full_name: 'Unknown', account_id: 'N/A' };
        const guarantor = profiles.find((p) => String(p.id) === String(loan.guarantor_id));
        const loanPayments = paymentList.filter((p) => String(p.loan_id) === String(loan.id));
        const totalRepaid = loanPayments.reduce((sum, p) => sum + Number(p.principal_paid || 0), 0);
        const remainingBalance = Math.max(0, Number(loan.principal_amount || 0) - totalRepaid);
        const isPaidOff = remainingBalance <= 0 || loan.status === 'SETTLED' || loan.status === 'PAID_OFF';

        return {
          ...loan,
          borrower_name: borrower.full_name,
          borrower_account_id: borrower.account_id,
          guarantor_name: guarantor?.full_name,
          guarantor_account_id: guarantor?.account_id,
          remaining_balance: remainingBalance,
          isPaidOff,
        };
      })
      .filter((loan) => {
        if (selectedMemberId && String(loan.borrower_id) !== String(selectedMemberId)) return false;
        if (statusFilter === 'ACTIVE' && loan.isPaidOff) return false;
        if (statusFilter === 'PAID_OFF' && !loan.isPaidOff) return false;
        if (reportStartDate && loan.issue_date < reportStartDate) return false;
        if (reportEndDate && loan.issue_date > reportEndDate) return false;

        return true;
      })
      .sort((a, b) => {
        const dateDiff = new Date(b.issue_date || 0).getTime() - new Date(a.issue_date || 0).getTime();
        if (dateDiff !== 0) return dateDiff;
        return Number(b.id || 0) - Number(a.id || 0);
      });
  }, [loanList, profiles, paymentList, statusFilter, reportStartDate, reportEndDate, selectedMemberId]);

  const totalPrincipalSum = filteredLoans.reduce((sum, l) => sum + Number(l.principal_amount || 0), 0);
  const totalBalanceSum = filteredLoans.reduce((sum, l) => sum + Number(l.remaining_balance || 0), 0);

  return (
    <>
      {/* 1. Directory Button Renamed to "See Details" */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3 py-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg flex items-center gap-1.5 transition-colors border border-slate-900 cursor-pointer shadow-xs"
      >
        <Eye size={14} /> See Details
      </button>

      {/* 2. Detailed Report Window Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 text-left font-sans">
          <div className="bg-white rounded-2xl shadow-2xl max-w-[1400px] w-full border border-slate-200 overflow-hidden">
            
            {/* Modal Controls Bar */}
            <div className="p-4 bg-slate-900 text-white flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-blue-400" />
                <h3 className="font-bold text-sm whitespace-nowrap">Disbursed Loans Detailed Report</h3>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full 2xl:w-auto justify-between 2xl:justify-end">
                
                {/* Member Filter */}
                <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-1 rounded-lg text-xs">
                  <User size={13} className="text-slate-400" />
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="bg-slate-700 text-white border border-slate-600 rounded px-1.5 py-0.5 text-xs focus:outline-none max-w-[150px] truncate cursor-pointer"
                    title="Filter by Member"
                  >
                    <option value="">All Members</option>
                    {activeBorrowers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({p.account_id || 'Ext'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Filter */}
                <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-1 rounded-lg text-xs">
                  <Calendar size={13} className="text-slate-400" />
                  <input
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="bg-slate-700 text-white border border-slate-600 rounded px-1.5 py-0.5 text-xs focus:outline-none"
                    title="Filter Issue Date From"
                  />
                  <span className="text-slate-400 font-bold">to</span>
                  <input
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="bg-slate-700 text-white border border-slate-600 rounded px-1.5 py-0.5 text-xs focus:outline-none"
                    title="Filter Issue Date To"
                  />
                  {(reportStartDate || reportEndDate) && (
                    <button
                      type="button"
                      onClick={() => {
                        setReportStartDate('');
                        setReportEndDate('');
                      }}
                      className="p-1 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                      title="Clear Date Filter"
                    >
                      <RotateCcw size={12} />
                    </button>
                  )}
                </div>

                {/* Status Filter */}
                <div className="flex bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${statusFilter === 'ALL' ? 'bg-blue-800 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ACTIVE')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${statusFilter === 'ACTIVE' ? 'bg-amber-700 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('PAID_OFF')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${statusFilter === 'PAID_OFF' ? 'bg-emerald-800 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    Paid Off
                  </button>
                </div>

                {/* Single Print Action Button */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenDedicatedPrintPage}
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    title="Print report on dedicated printable page"
                  >
                    <Printer size={14} /> Print Report
                  </button>

                  <button 
                    type="button"
                    onClick={() => setIsOpen(false)} 
                    className="text-slate-400 hover:text-white p-1 ml-1 cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Detailed Report Preview Body */}
            <div className="p-6 space-y-4 text-slate-900 max-h-[80vh] overflow-y-auto">
              
              {/* Header */}
              <div className="text-center border-b border-slate-200 pb-3 space-y-0.5">
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight uppercase">EVERGREEN SAVINGS GROUP</h2>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                  Disbursed Loan Audit Report — {statusFilter === 'ALL' ? 'All Loans' : statusFilter === 'ACTIVE' ? 'Active Loans Only' : 'Paid Off Loans Only'}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  Generated Timestamp: {getKathmanduPrintTimestamp()}
                </p>
              </div>

              {/* Active Filters Summary Block */}
              {(reportStartDate || reportEndDate || selectedMemberName) && (
                <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 font-sans text-xs flex flex-wrap gap-4 justify-between items-center">
                  <div className="flex flex-wrap gap-4">
                    {selectedMemberName && (
                      <span>Member Filter: <strong>{selectedMemberName}</strong></span>
                    )}
                    {(reportStartDate || reportEndDate) && (
                      <span>Date Period: <strong>{reportStartDate || 'Beginning'}</strong> to <strong>{reportEndDate || 'Latest'}</strong></span>
                    )}
                  </div>
                  <span className="font-bold">({filteredLoans.length} Loans Filtered)</span>
                </div>
              )}

              {/* KPI Summary Block */}
              <div className="grid grid-cols-3 gap-3 text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <span className="text-slate-500 block text-[10px] font-sans uppercase font-bold">Total Loans</span>
                  <strong className="text-slate-900 text-sm">{filteredLoans.length} Loans</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-sans uppercase font-bold">Total Disbursed Principal</span>
                  <strong className="text-blue-900 text-sm">NPR {totalPrincipalSum.toLocaleString('en-IN')}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-sans uppercase font-bold">Total Outstanding Balance</span>
                  <strong className="text-amber-900 text-sm">NPR {totalBalanceSum.toLocaleString('en-IN')}</strong>
                </div>
              </div>

              {/* Loans Table */}
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-300 text-[10px]">
                  <tr>
                    <th className="p-2">Loan ID</th>
                    <th className="p-2 font-sans">Borrower</th>
                    <th className="p-2">Disbursed Date</th>
                    <th className="p-2 text-right">Principal</th>
                    <th className="p-2 text-right">Rate</th>
                    <th className="p-2 text-right">Remaining Bal.</th>
                    <th className="p-2 text-right font-sans">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredLoans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-slate-50 font-sans">
                      <td className="p-2 font-bold text-blue-900 font-mono">{loan.loan_code || `LN-${loan.id}`}</td>
                      <td className="p-2 font-sans font-semibold text-slate-900">
                        {loan.borrower_name}
                        {loan.guarantor_name && (
                          <span className="block text-[10px] text-amber-800 font-normal font-sans">
                            Guarantor: {loan.guarantor_name}
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-slate-600 font-mono">{loan.issue_date}</td>
                      <td className="p-2 text-right font-bold font-mono">NPR {Number(loan.principal_amount).toLocaleString('en-IN')}</td>
                      <td className="p-2 text-right font-mono">{loan.current_rate}%</td>
                      <td className="p-2 text-right font-bold text-slate-900 font-mono">
                        NPR {loan.remaining_balance.toLocaleString('en-IN')}
                      </td>
                      <td className="p-2 text-right font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          loan.isPaidOff ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {loan.isPaidOff ? 'PAID OFF' : 'ACTIVE'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredLoans.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400 font-sans">
                        No loans match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Signature Footer */}
              <div className="pt-8 grid grid-cols-2 gap-8 text-center text-[11px] text-slate-500 font-semibold border-t border-slate-200 mt-6 font-sans">
                <div>
                  <div className="border-b border-slate-400 mb-1 h-8 w-48 mx-auto"></div>
                  <span>Prepared By / Committee Secretary</span>
                </div>
                <div>
                  <div className="border-b border-slate-400 mb-1 h-8 w-48 mx-auto"></div>
                  <span>Authorized Auditor / Chairman Stamp</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}