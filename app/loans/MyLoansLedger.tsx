'use client';

import { useState, useMemo } from 'react';
import LoanDetailsModal from './LoanDetailsModal';
import { Landmark, Search, Calendar, RotateCcw } from 'lucide-react';

interface MyLoansLedgerProps {
  myLoans: any[];
  paymentList: any[];
  isAdmin: boolean;
}

export default function MyLoansLedger({ myLoans = [], paymentList = [], isAdmin }: MyLoansLedgerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Process loans with payments & active balance
  const processedLoans = useMemo(() => {
    return myLoans.map((loan) => {
      const loanPayments = paymentList.filter((p) => String(p.loan_id) === String(loan.id));
      const totalRepaid = loanPayments.reduce((sum, p) => sum + Number(p.principal_paid || 0), 0);
      const remainingBalance = Math.max(0, Number(loan.principal_amount || 0) - totalRepaid);
      const isPaidOff = remainingBalance <= 0 || loan.status === 'SETTLED' || loan.status === 'PAID_OFF';

      return {
        ...loan,
        loanPayments,
        totalRepaid,
        remainingBalance,
        isPaidOff,
      };
    });
  }, [myLoans, paymentList]);

  // Filter personal loans by Loan Code, Status, and Date Range
  const filteredPersonalLoans = useMemo(() => {
    return processedLoans.filter((loan) => {
      const code = (loan.loan_code || `LN-${loan.id.toString().padStart(4, '0')}`).toLowerCase();
      const status = (loan.status || 'ACTIVE').toLowerCase();
      const issueDate = loan.issue_date || loan.created_at?.slice(0, 10) || '';
      const query = searchTerm.toLowerCase().trim();

      // 1. Search Filter (Matches Loan Code or Status)
      if (query && !code.includes(query) && !status.includes(query)) {
        return false;
      }

      // 2. From Date Range Filter
      if (fromDate && issueDate < fromDate) {
        return false;
      }

      // 3. To Date Range Filter
      if (toDate && issueDate > toDate) {
        return false;
      }

      return true;
    });
  }, [processedLoans, searchTerm, fromDate, toDate]);

  // Calculate total active balance across personal loans
  const totalActiveBalance = useMemo(() => {
    return filteredPersonalLoans
      .filter((l) => !l.isPaidOff)
      .reduce((sum, l) => sum + l.remainingBalance, 0);
  }, [filteredPersonalLoans]);

  function handleResetFilters() {
    setSearchTerm('');
    setFromDate('');
    setToDate('');
  }

  return (
    <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden text-left">
      
      {/* Header Banner */}
      <div className="p-4 bg-amber-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-900 rounded-lg">
            <Landmark size={20} className="text-amber-300" />
          </div>
          <div>
            <h3 className="font-bold text-base">My Personal Loans Ledger</h3>
            <p className="text-xs text-amber-200">Your borrowing history, active balances, and statement ledgers</p>
          </div>
        </div>

        <div className="bg-amber-900/80 border border-amber-800 px-3.5 py-1.5 rounded-xl font-mono text-xs">
          <span className="text-amber-200 block text-[10px] font-sans font-semibold">Active Outstanding Balance</span>
          <strong className="text-white text-base font-extrabold">NPR {totalActiveBalance.toLocaleString('en-IN')}</strong>
        </div>
      </div>

      {/* Search & Date Filter Bar */}
      <div className="p-3.5 bg-amber-50/50 border-b border-amber-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Loan ID Search Bar */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Loan ID (e.g. LN2608-001) or Status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-700 font-medium"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <RotateCcw size={12} />
            </button>
          )}
        </div>

        {/* Date Range Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-700">
          <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-300">
            <Calendar size={13} className="text-amber-700" />
            <span className="text-[11px] text-slate-500">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="font-mono text-xs text-slate-900 focus:outline-none bg-transparent"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-300">
            <Calendar size={13} className="text-amber-700" />
            <span className="text-[11px] text-slate-500">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="font-mono text-xs text-slate-900 focus:outline-none bg-transparent"
            />
          </div>

          {(searchTerm || fromDate || toDate) && (
            <button
              onClick={handleResetFilters}
              className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>

      </div>

      {/* Personal Loans Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-amber-50/60 text-amber-950 text-xs uppercase font-semibold border-b border-amber-100">
            <tr>
              <th className="p-3 font-mono">Loan ID</th>
              <th className="p-3">Disbursed Date</th>
              <th className="p-3 text-right">Principal Issued</th>
              <th className="p-3 text-right">Remaining Balance</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-right">Ledger Statement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-50">
            {filteredPersonalLoans.map((loan) => {
              const loan_code = loan.loan_code || `LN-${loan.id.toString().padStart(4, '0')}`;

              return (
                <tr key={loan.id} className="hover:bg-amber-50/40 transition-colors">
                  <td className="p-3 font-mono font-bold text-amber-900 text-xs">{loan_code}</td>
                  <td className="p-3 text-xs font-mono text-slate-700 font-semibold">
                    {loan.issue_date || loan.created_at?.slice(0, 10) || 'N/A'}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-slate-800">
                    NPR {Number(loan.principal_amount || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-amber-900">
                    NPR {loan.remainingBalance.toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${
                      loan.isPaidOff 
                        ? 'bg-slate-100 text-slate-700 border border-slate-300' 
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}>
                      {loan.isPaidOff ? 'PAID OFF' : 'ACTIVE'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <LoanDetailsModal loan={loan} />
                  </td>
                </tr>
              );
            })}

            {filteredPersonalLoans.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400 text-xs font-medium">
                  No personal loan records found matching the applied filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}