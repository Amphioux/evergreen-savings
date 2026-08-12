'use client';

import { useState, useMemo } from 'react';
import { formatMonthLabel } from '@/lib/formatters';
import DepositReceiptModal from './DepositReceiptModal';
import { PiggyBank, Search, Filter, RotateCcw, ArrowUpDown, Printer } from 'lucide-react';

interface MyDepositsLedgerProps {
  myDeposits: any[];
  isAdmin: boolean;
}

// Helper: Clean raw recorded name (removes "(Admin)" or "(Superadmin)" tags)
function cleanRecordedName(name?: string): string {
  if (!name) return 'System Admin';
  return name.replace(/\s*\((Admin|Superadmin)\)/gi, '').trim();
}

export default function MyDepositsLedger({ myDeposits = [], isAdmin }: MyDepositsLedgerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [sortOption, setSortOption] = useState('recorded_desc');

  // Safe Guarded Deposits Array
  const safeDeposits = useMemo(() => (Array.isArray(myDeposits) ? myDeposits : []), [myDeposits]);

  // Extract available years dynamically from deposits
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    safeDeposits.forEach((d) => {
      const year = d.for_month?.slice(0, 4);
      if (year) yearsSet.add(year);
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [safeDeposits]);

  // Filter and Sort personal deposits
  const filteredAndSortedDeposits = useMemo(() => {
    let filtered = safeDeposits.filter((dep) => {
      const depIdStr = dep.id ? String(dep.id).padStart(4, '0') : '0000';
      const code = (dep.deposit_code || `DP-${depIdStr}`).toLowerCase();
      
      const rawMonth = dep.for_month?.slice(0, 7) || '';
      const rawYear = rawMonth.slice(0, 4);
      const formattedMonth = formatMonthLabel(rawMonth).toLowerCase();
      const depositedBy = (dep.deposited_by_name || '').toLowerCase();
      const recordedBy = cleanRecordedName(dep.recorded_by_name).toLowerCase();
      const query = searchTerm.toLowerCase().trim();

      // 1. Search Filter
      if (
        query && 
        !code.includes(query) && 
        !formattedMonth.includes(query) && 
        !rawMonth.includes(query) &&
        !depositedBy.includes(query) &&
        !recordedBy.includes(query)
      ) {
        return false;
      }

      // 2. Year Filter
      if (selectedYear && rawYear !== selectedYear) {
        return false;
      }

      return true;
    });

    // Sort Logic
    filtered.sort((a, b) => {
      if (sortOption.startsWith('recorded')) {
        const dateA = new Date(a.created_at || a.for_month || 0).getTime();
        const dateB = new Date(b.created_at || b.for_month || 0).getTime();
        return sortOption === 'recorded_desc' ? dateB - dateA : dateA - dateB;
      } else {
        const valA = a.for_month || '';
        const valB = b.for_month || '';
        return sortOption === 'month_desc' ? valB.localeCompare(valA) : valA.localeCompare(valB);
      }
    });

    return filtered;
  }, [safeDeposits, searchTerm, selectedYear, sortOption]);

  const totalFilteredSavings = useMemo(() => {
    return filteredAndSortedDeposits.reduce((sum, d) => sum + Number(d.amount_paid || 0), 0);
  }, [filteredAndSortedDeposits]);

  function handleResetFilters() {
    setSearchTerm('');
    setSelectedYear('');
    setSortOption('recorded_desc');
  }

  return (
    <div className="personal-ledger-section bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden text-left print:border-none print:shadow-none">
      
      {/* Hide the Ledger during print if a single receipt is open */}
      <style type="text/css" media="print">
        {`
          body:has([id^="single-receipt-print-zone"]) .personal-ledger-section {
            display: none !important;
          }
          tfoot {
            display: table-row-group !important;
            break-inside: avoid !important;
          }
        `}
      </style>

      {/* Printable Title Banner for Print Mode */}
      <div className="hidden print:block text-center border-b border-slate-300 pb-3 mb-4 space-y-1">
        <h1 className="text-xl font-black text-slate-900 uppercase">EVERGREEN SAVINGS GROUP</h1>
        <p className="text-xs font-bold text-slate-600 uppercase">Personal Savings Ledger Report</p>
        {selectedYear && <p className="text-xs text-slate-500 font-mono font-bold">Filtered Year: {selectedYear}</p>}
      </div>

      {/* Header Banner */}
      <div className="p-4 bg-emerald-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-3 print:bg-slate-100 print:text-slate-900 print:border-b print:border-slate-300">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-800 rounded-lg print:hidden">
            <PiggyBank size={20} className="text-emerald-300" />
          </div>
          <div>
            <h3 className="font-bold text-base">My Personal Savings Ledger</h3>
            <p className="text-xs text-emerald-200 print:text-slate-600">Personal contribution history and receipt vouchers</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors print:hidden"
          >
            <Printer size={15} /> Print Ledger
          </button>

          <div className="bg-emerald-800/80 border border-emerald-700 px-3.5 py-1.5 rounded-xl font-mono text-xs print:bg-white print:border-slate-300 print:text-slate-900">
            <span className="text-emerald-200 print:text-slate-500 block text-[10px] font-sans font-semibold">Total Filtered Savings</span>
            <strong className="text-white print:text-emerald-950 text-base font-extrabold">NPR {totalFilteredSavings.toLocaleString('en-IN')}</strong>
          </div>
        </div>
      </div>

      {/* Search & Date Filter Bar */}
      <div className="p-3.5 bg-emerald-50/50 border-b border-emerald-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 print:hidden">
        
        {/* Deposit ID Search Bar */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Deposit ID, Month, or Representative Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-700 font-medium"
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

        {/* Year Dropdown & Sort Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-700">
          
          <div className="flex items-center gap-1.5 bg-white px-2 py-1.5 rounded-xl border border-slate-300">
            <Filter size={13} className="text-emerald-700" />
            <span className="text-[11px] text-slate-500 font-sans">Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent font-mono text-[11px] font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="">All Years ({availableYears.length})</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-white px-2 py-1.5 rounded-xl border border-slate-300">
            <ArrowUpDown size={13} className="text-emerald-700" />
            <span className="text-[11px] text-slate-500 font-sans">Sort:</span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="bg-transparent font-mono text-[11px] font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="recorded_desc">Recorded (Newest)</option>
              <option value="recorded_asc">Recorded (Oldest)</option>
              <option value="month_desc">Month (Newest)</option>
              <option value="month_asc">Month (Oldest)</option>
            </select>
          </div>

          {(searchTerm || selectedYear || sortOption !== 'recorded_desc') && (
            <button
              onClick={handleResetFilters}
              className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>

      </div>

      {/* Personal Deposits Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-emerald-50/60 text-emerald-950 text-xs uppercase font-semibold border-b border-emerald-100 print:bg-slate-100 print:text-slate-600 print:border-slate-300">
            <tr>
              <th className="p-3 font-mono">Deposit ID</th>
              <th className="p-3">Contribution Month</th>
              <th className="p-3 text-right">Amount Deposited</th>
              <th className="p-3">Recorded Date</th>
              <th className="p-3">Recorded By</th>
              <th className="p-3 text-right print:hidden">Receipt Voucher</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 print:divide-slate-200">
            {filteredAndSortedDeposits.map((dep: any) => {
              const depIdStr = dep.id ? String(dep.id).padStart(4, '0') : '0000';
              const deposit_code = dep.deposit_code || `DP-${depIdStr}`;
              const rawMonth = dep.for_month?.slice(0, 7) || '';
              const cleanName = cleanRecordedName(dep.recorded_by_name);

              // Normalize profiles object / array from Supabase
              const profileObj = Array.isArray(dep.profiles) ? dep.profiles[0] : dep.profiles;

              return (
                <tr key={dep.id || deposit_code} className="hover:bg-emerald-50/40 transition-colors">
                  <td className="p-3 font-mono font-bold text-emerald-900 text-xs print:text-slate-900">{deposit_code}</td>
                  <td className="p-3 font-bold text-slate-800">
                    <div>{formatMonthLabel(rawMonth)}</div>
                    {dep.deposited_by_name ? (
                      <div className="text-[10px] text-amber-900 font-semibold font-sans mt-0.5 print:text-slate-600">
                        Via Rep: {dep.deposited_by_name}
                      </div>
                    ) : (
                      <div className="text-[10px] text-emerald-700 font-normal font-sans mt-0.5 print:text-slate-600">
                        Paid: Self (In Person)
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-900 print:text-slate-900">
                    NPR {Number(dep.amount_paid || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-xs text-slate-500 font-mono">
                    {dep.created_at ? new Date(dep.created_at).toLocaleString('en-CA', { timeZone: 'Asia/Kathmandu' }) : dep.for_month || 'N/A'}
                  </td>
                  <td className="p-3 text-xs text-slate-700 font-sans">
                    <div className="font-bold">{cleanName}</div>
                    {dep.recorded_by_designation && (
                      <div className="text-[10px] text-slate-400">{dep.recorded_by_designation}</div>
                    )}
                  </td>
                  <td className="p-3 text-right print:hidden">
                    <DepositReceiptModal receipt={{
                      deposit_code,
                      for_month: rawMonth,
                      amount_paid: Number(dep.amount_paid || 0),
                      created_at: dep.created_at ? dep.created_at.slice(0, 10) : undefined,
                      member_name: profileObj?.full_name || 'Member',
                      member_account_id: profileObj?.account_id || 'N/A',
                      deposited_by_name: dep.deposited_by_name,
                      recorded_by_name: cleanName,
                      recorded_by_designation: dep.recorded_by_designation,
                    }} />
                  </td>
                </tr>
              );
            })}

            {filteredAndSortedDeposits.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400 text-xs font-medium">
                  No personal savings records found matching the applied filters.
                </td>
              </tr>
            )}
          </tbody>
          
          {filteredAndSortedDeposits.length > 0 && (
            <tfoot className="bg-slate-100/90 text-slate-900 border-t-2 border-slate-300 font-bold print:border-t-2 print:border-slate-800">
              <tr>
                <td colSpan={2} className="p-3 text-left font-sans uppercase text-xs font-black tracking-wider">
                  Total Saved ({filteredAndSortedDeposits.length} Entries)
                </td>
                <td className="p-3 text-right font-mono text-sm font-black text-emerald-950 print:text-slate-900">
                  NPR {totalFilteredSavings.toLocaleString('en-IN')}
                </td>
                <td colSpan={3} className="p-3 text-slate-400 font-mono text-[10px]">
                  Verified Total
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

    </div>
  );
}