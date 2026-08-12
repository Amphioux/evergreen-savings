'use client';

import { useState, useMemo } from 'react';
import LoanDetailsModal from './LoanDetailsModal';
import { Landmark, Search, Filter, RotateCcw, Receipt, Printer, ArrowUpDown } from 'lucide-react';

interface MyLoansLedgerProps {
  myLoans: any[];
  paymentList: any[];
  isAdmin: boolean;
}

export default function MyLoansLedger({ myLoans = [], paymentList = [], isAdmin }: MyLoansLedgerProps) {
  const [printZone, setPrintZone] = useState<'personal-loans' | 'personal-repayments' | null>(null);

  const [loanSearch, setLoanSearch] = useState('');
  const [loanYear, setLoanYear] = useState('');
  const [repaymentSearch, setRepaymentSearch] = useState('');
  const [repaymentYear, setRepaymentYear] = useState('');
  const [repaymentSort, setRepaymentSort] = useState('date_desc');

  const availableLoanYears = useMemo(() => {
    const years = new Set<string>();
    myLoans.forEach(l => {
      const yr = (l.issue_date || l.created_at || '').slice(0, 4);
      if (yr) years.add(yr);
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [myLoans]);

  const personalRepayments = useMemo(() => {
    const loanIds = new Set(myLoans.map(l => String(l.id)));
    return paymentList.filter(p => loanIds.has(String(p.loan_id)));
  }, [myLoans, paymentList]);

  const availableRepaymentYears = useMemo(() => {
    const years = new Set<string>();
    personalRepayments.forEach(p => {
      const yr = (p.payment_date || '').slice(0, 4);
      if (yr) years.add(yr);
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [personalRepayments]);

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

  const filteredPersonalLoans = useMemo(() => {
    return processedLoans.filter((loan) => {
      const code = (loan.loan_code || `LN-${loan.id.toString().padStart(4, '0')}`).toLowerCase();
      const status = (loan.status || 'ACTIVE').toLowerCase();
      const issueDate = loan.issue_date || loan.created_at?.slice(0, 10) || '';
      const lYear = issueDate.slice(0, 4);
      const query = loanSearch.toLowerCase().trim();

      if (query && !code.includes(query) && !status.includes(query)) return false;
      if (loanYear && lYear !== loanYear) return false;

      return true;
    });
  }, [processedLoans, loanSearch, loanYear]);

  const filteredAndSortedRepayments = useMemo(() => {
    let filtered = personalRepayments.filter((p) => {
      const query = repaymentSearch.toLowerCase().trim();
      const code = (p.payment_code || `PY-${p.id}`).toLowerCase();
      const date = p.payment_date || '';
      const rYear = date.slice(0, 4);
      
      if (query && !code.includes(query) && !date.includes(query)) return false;
      if (repaymentYear && rYear !== repaymentYear) return false;
      
      return true;
    });

    filtered.sort((a, b) => {
      const dateA = new Date(a.payment_date).getTime();
      const dateB = new Date(b.payment_date).getTime();
      return repaymentSort === 'date_desc' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [personalRepayments, repaymentSearch, repaymentYear, repaymentSort]);

  const totalActiveBalance = useMemo(() => {
    return filteredPersonalLoans
      .filter((l) => !l.isPaidOff)
      .reduce((sum, l) => sum + l.remainingBalance, 0);
  }, [filteredPersonalLoans]);

  const totalFilteredRepayments = useMemo(() => {
    return filteredAndSortedRepayments.reduce((sum, p) => sum + Number(p.principal_paid || 0) + Number(p.interest_paid || 0), 0);
  }, [filteredAndSortedRepayments]);

  const triggerPrint = (zone: 'personal-loans' | 'personal-repayments') => {
    setPrintZone(zone);
    setTimeout(() => {
      window.print();
      setPrintZone(null);
    }, 100);
  };

  return (
    <div className="space-y-6">

      {/* STRICT ISOLATED SECTION PRINT (ELIMINATES BLANK EXTRA PAGES) */}
      {printZone && (
        <style type="text/css" media="print">
          {`
            @page { size: portrait; margin: 12mm; }
            html, body {
              height: auto !important;
              min-height: 0 !important;
              overflow: visible !important;
              background: white !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            body * { visibility: hidden !important; }
            #${printZone}-print-zone, #${printZone}-print-zone * { visibility: visible !important; }
            #${printZone}-print-zone {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              box-shadow: none !important;
              border: none !important;
            }
            tfoot {
              display: table-row-group !important;
              break-inside: avoid !important;
            }
          `}
        </style>
      )}

      {/* 1. PERSONAL LOANS LEDGER */}
      <div id="personal-loans-print-zone" className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden text-left print:border-none print:shadow-none">
        
        <div className="hidden print:block text-center border-b border-slate-300 pb-3 mb-3 space-y-0.5">
          <h1 className="text-xl font-black text-slate-900 uppercase">EVERGREEN SAVINGS GROUP</h1>
          <p className="text-xs font-bold text-slate-600 uppercase">My Active & Closed Loan Portfolio</p>
          {loanYear && <p className="text-[10px] text-slate-500 font-mono font-bold">Filtered Year: {loanYear}</p>}
        </div>

        <div className="p-4 bg-amber-950 text-white flex flex-col md:flex-row md:items-center justify-between gap-3 print:bg-slate-100 print:text-slate-900 print:border-b print:border-slate-300">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-900 rounded-lg print:hidden">
              <Landmark size={20} className="text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-base">My Personal Loans Ledger</h3>
              <p className="text-xs text-amber-200 print:text-slate-600">Your borrowing history, active balances, and statement ledgers</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const query = new URLSearchParams({ type: 'portfolio' });
                if (loanYear) query.set('year', loanYear);
                window.open(`/loans/ledger-print?${query.toString()}`, '_blank');
              }}
              className="px-3 py-2 bg-amber-800 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors print:hidden"
            >
              <Printer size={15} /> Print Portfolio
            </button>

            <div className="bg-amber-900/80 border border-amber-800 px-3.5 py-1.5 rounded-xl font-mono text-xs print:bg-white print:border-slate-300 print:text-slate-900">
              <span className="text-amber-200 print:text-slate-500 block text-[10px] font-sans font-semibold">Active Outstanding Balance</span>
              <strong className="text-white print:text-amber-950 text-base font-extrabold">NPR {totalActiveBalance.toLocaleString('en-IN')}</strong>
            </div>
          </div>
        </div>

        <div className="p-3.5 bg-amber-50/50 border-b border-amber-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 print:hidden">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Loan ID (e.g. LN2608-001) or Status..."
              value={loanSearch}
              onChange={(e) => setLoanSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-700 font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-white px-2 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-700">
            <Filter size={13} className="text-amber-700" />
            <span className="text-[11px] font-sans">Year:</span>
            <select
              value={loanYear}
              onChange={(e) => setLoanYear(e.target.value)}
              className="bg-transparent font-mono text-[11px] font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="">All ({availableLoanYears.length})</option>
              {availableLoanYears.map(yr => <option key={yr} value={yr}>{yr}</option>)}
            </select>
          </div>

          {(loanSearch || loanYear) && (
            <button
              onClick={() => { setLoanSearch(''); setLoanYear(''); }}
              className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-amber-50/60 text-amber-950 text-xs uppercase font-semibold border-b border-amber-100 print:bg-slate-100 print:text-slate-600 print:border-slate-300">
              <tr>
                <th className="p-3 font-mono">Loan ID</th>
                <th className="p-3">Disbursed Date</th>
                <th className="p-3 text-right">Principal Issued</th>
                <th className="p-3 text-right">Remaining Balance</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right print:hidden">Detailed Ledger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-50 print:divide-slate-200">
              {filteredPersonalLoans.map((loan) => {
                const loan_code = loan.loan_code || `LN-${loan.id.toString().padStart(4, '0')}`;

                return (
                  <tr key={loan.id} className="hover:bg-amber-50/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-amber-900 text-xs print:text-slate-900">{loan_code}</td>
                    <td className="p-3 text-xs font-mono text-slate-700 font-semibold">
                      {loan.issue_date || loan.created_at?.slice(0, 10) || 'N/A'}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-800">
                      NPR {Number(loan.principal_amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-amber-900 print:text-slate-900">
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
                    <td className="p-3 text-right print:hidden">
                      <LoanDetailsModal loan={loan} />
                    </td>
                  </tr>
                );
              })}

              {filteredPersonalLoans.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400 text-xs font-medium">
                    No personal loan records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. PERSONAL REPAYMENT HISTORY */}
      <div id="personal-repayments-print-zone" className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden text-left print:border-none print:shadow-none">
        
        <div className="hidden print:block text-center border-b border-slate-300 pb-3 mb-3 space-y-0.5">
          <h1 className="text-xl font-black text-slate-900 uppercase">EVERGREEN SAVINGS GROUP</h1>
          <p className="text-xs font-bold text-slate-600 uppercase">My Consolidated Repayment History</p>
          {repaymentYear && <p className="text-[10px] text-slate-500 font-mono font-bold">Filtered Year: {repaymentYear}</p>}
        </div>

        <div className="p-4 bg-blue-950 text-white flex flex-col md:flex-row md:items-center justify-between gap-3 print:bg-slate-100 print:text-slate-900 print:border-b print:border-slate-300">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-900 rounded-lg print:hidden">
              <Receipt size={20} className="text-blue-300" />
            </div>
            <div>
              <h3 className="font-bold text-base">My Repayment History</h3>
              <p className="text-xs text-blue-200 print:text-slate-600">All EMI payments made towards your loans</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const query = new URLSearchParams({ type: 'repayments' });
                if (repaymentYear) query.set('year', repaymentYear);
                if (repaymentSort) query.set('sort', repaymentSort);
                window.open(`/loans/ledger-print?${query.toString()}`, '_blank');
              }}
              className="px-3 py-2 bg-blue-800 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors print:hidden"
            >
              <Printer size={15} /> Print Repayments
            </button>

            <div className="bg-blue-900/80 border border-blue-800 px-3.5 py-1.5 rounded-xl font-mono text-xs print:bg-white print:border-slate-300 print:text-slate-900">
              <span className="text-blue-200 print:text-slate-500 block text-[10px] font-sans font-semibold">Total Paid (Filtered)</span>
              <strong className="text-white print:text-blue-950 text-base font-extrabold">NPR {totalFilteredRepayments.toLocaleString('en-IN')}</strong>
            </div>
          </div>
        </div>

        <div className="p-3.5 bg-blue-50/50 border-b border-blue-100 flex flex-col lg:flex-row items-stretch lg:items-center gap-3 print:hidden">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Payment ID or Date..."
              value={repaymentSearch}
              onChange={(e) => setRepaymentSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-700 font-medium"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white px-2 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-700">
              <Filter size={13} className="text-blue-700" />
              <span className="text-[11px] font-sans">Year:</span>
              <select
                value={repaymentYear}
                onChange={(e) => setRepaymentYear(e.target.value)}
                className="bg-transparent font-mono text-[11px] font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="">All ({availableRepaymentYears.length})</option>
                {availableRepaymentYears.map(yr => <option key={yr} value={yr}>{yr}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-white px-2 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-700">
              <ArrowUpDown size={13} className="text-blue-700" />
              <span className="text-[11px] font-sans">Sort:</span>
              <select
                value={repaymentSort}
                onChange={(e) => setRepaymentSort(e.target.value)}
                className="bg-transparent font-mono text-[11px] font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="date_desc">Latest First</option>
                <option value="date_asc">Oldest First</option>
              </select>
            </div>
            
            {(repaymentSearch || repaymentYear || repaymentSort !== 'date_desc') && (
              <button
                onClick={() => { setRepaymentSearch(''); setRepaymentYear(''); setRepaymentSort('date_desc'); }}
                className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <RotateCcw size={12} /> Reset
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-blue-50/60 text-blue-950 text-xs uppercase font-semibold border-b border-blue-100 print:bg-slate-100 print:text-slate-600 print:border-slate-300">
              <tr>
                <th className="p-3 font-mono">Payment ID</th>
                <th className="p-3">Payment Date</th>
                <th className="p-3 font-mono">Loan Ref</th>
                <th className="p-3 text-right">Principal Paid</th>
                <th className="p-3 text-right">Interest Paid</th>
                <th className="p-3 text-right">Total Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50 print:divide-slate-200">
              {filteredAndSortedRepayments.map((p) => {
                const payment_code = p.payment_code || `PY-${p.id}`;
                const loan = myLoans.find(l => String(l.id) === String(p.loan_id));
                const loan_code = loan?.loan_code || `LN-${p.loan_id}`;
                const totalPaid = Number(p.principal_paid || 0) + Number(p.interest_paid || 0);

                return (
                  <tr key={p.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-blue-900 text-xs print:text-slate-900">{payment_code}</td>
                    <td className="p-3 text-xs font-mono text-slate-700 font-bold">{p.payment_date}</td>
                    <td className="p-3 text-[10px] font-mono text-slate-500 font-bold">{loan_code}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-800 print:text-slate-900">
                      NPR {Number(p.principal_paid || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-purple-800 print:text-slate-900">
                      NPR {Number(p.interest_paid || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-right font-mono font-black text-slate-900">
                      NPR {totalPaid.toLocaleString('en-IN')}
                    </td>
                  </tr>
                );
              })}

              {filteredAndSortedRepayments.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400 text-xs font-medium">
                    No repayment records found.
                  </td>
                </tr>
              )}
            </tbody>
            {filteredAndSortedRepayments.length > 0 && (
              <tfoot className="bg-slate-100/90 text-slate-900 border-t-2 border-slate-300 font-bold print:border-t-2 print:border-slate-800">
                <tr>
                  <td colSpan={3} className="p-3 text-left font-sans uppercase text-xs font-black tracking-wider">
                    Total Filtered Repayments
                  </td>
                  <td className="p-3 text-right font-mono text-sm font-black text-emerald-800 print:text-slate-900">
                    NPR {filteredAndSortedRepayments.reduce((sum, p) => sum + Number(p.principal_paid || 0), 0).toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-right font-mono text-sm font-black text-purple-800 print:text-slate-900">
                    NPR {filteredAndSortedRepayments.reduce((sum, p) => sum + Number(p.interest_paid || 0), 0).toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-right font-mono text-sm font-black text-slate-900">
                    NPR {totalFilteredRepayments.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

    </div>
  );
}