'use client';

import { useState, useMemo } from 'react';
import { formatMonthLabel } from '@/lib/formatters';
import DepositReceiptModal from './DepositReceiptModal';
import { PiggyBank, Search, Calendar, RotateCcw } from 'lucide-react';

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
  const [fromMonth, setFromMonth] = useState('');
  const [toMonth, setToMonth] = useState('');

  // Safe Guarded Deposits Array
  const safeDeposits = useMemo(() => (Array.isArray(myDeposits) ? myDeposits : []), [myDeposits]);

  // Filter personal deposits by Deposit ID, Month Name, Representative Name, and Date/Month Range
  const filteredPersonalDeposits = useMemo(() => {
    return safeDeposits.filter((dep) => {
      // Safe guard for deposit code generation
      const depIdStr = dep.id ? String(dep.id).padStart(4, '0') : '0000';
      const code = (dep.deposit_code || `DP-${depIdStr}`).toLowerCase();
      
      const rawMonth = dep.for_month?.slice(0, 7) || '';
      const formattedMonth = formatMonthLabel(rawMonth).toLowerCase();
      const depositedBy = (dep.deposited_by_name || '').toLowerCase();
      const recordedBy = cleanRecordedName(dep.recorded_by_name).toLowerCase();
      const query = searchTerm.toLowerCase().trim();

      // 1. Search Filter (Matches Deposit ID, Month Name, Representative, or Collector)
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

      // 2. From Month Range Filter
      if (fromMonth && rawMonth < fromMonth) {
        return false;
      }

      // 3. To Month Range Filter
      if (toMonth && rawMonth > toMonth) {
        return false;
      }

      return true;
    });
  }, [safeDeposits, searchTerm, fromMonth, toMonth]);

  const totalFilteredSavings = useMemo(() => {
    return filteredPersonalDeposits.reduce((sum, d) => sum + Number(d.amount_paid || 0), 0);
  }, [filteredPersonalDeposits]);

  function handleResetFilters() {
    setSearchTerm('');
    setFromMonth('');
    setToMonth('');
  }

  return (
    <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden text-left">
      
      {/* Header Banner */}
      <div className="p-4 bg-emerald-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-800 rounded-lg">
            <PiggyBank size={20} className="text-emerald-300" />
          </div>
          <div>
            <h3 className="font-bold text-base">My Personal Savings Ledger</h3>
            <p className="text-xs text-emerald-200">Personal contribution history and receipt vouchers</p>
          </div>
        </div>

        <div className="bg-emerald-800/80 border border-emerald-700 px-3.5 py-1.5 rounded-xl font-mono text-xs">
          <span className="text-emerald-200 block text-[10px] font-sans font-semibold">Total Savings Accumulated</span>
          <strong className="text-white text-base font-extrabold">NPR {totalFilteredSavings.toLocaleString('en-IN')}</strong>
        </div>
      </div>

      {/* Search & Date Filter Bar */}
      <div className="p-3.5 bg-emerald-50/50 border-b border-emerald-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Deposit ID Search Bar */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Deposit ID, Month, or Representative Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-700 font-medium"
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

        {/* Date / Month Range Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-700">
          <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-300">
            <Calendar size={13} className="text-emerald-700" />
            <span className="text-[11px] text-slate-500">From:</span>
            <input
              type="month"
              value={fromMonth}
              onChange={(e) => setFromMonth(e.target.value)}
              className="font-mono text-xs text-slate-900 focus:outline-none bg-transparent"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-300">
            <Calendar size={13} className="text-emerald-700" />
            <span className="text-[11px] text-slate-500">To:</span>
            <input
              type="month"
              value={toMonth}
              onChange={(e) => setToMonth(e.target.value)}
              className="font-mono text-xs text-slate-900 focus:outline-none bg-transparent"
            />
          </div>

          {(searchTerm || fromMonth || toMonth) && (
            <button
              onClick={handleResetFilters}
              className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>

      </div>

      {/* Personal Deposits Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-emerald-50/60 text-emerald-950 text-xs uppercase font-semibold border-b border-emerald-100">
            <tr>
              <th className="p-3 font-mono">Deposit ID</th>
              <th className="p-3">Contribution Month</th>
              <th className="p-3 text-right">Amount Deposited</th>
              <th className="p-3">Recorded Date</th>
              <th className="p-3">Recorded By</th>
              <th className="p-3 text-right">Receipt Voucher</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50">
            {filteredPersonalDeposits.map((dep: any) => {
              const depIdStr = dep.id ? String(dep.id).padStart(4, '0') : '0000';
              const deposit_code = dep.deposit_code || `DP-${depIdStr}`;
              const rawMonth = dep.for_month?.slice(0, 7) || '';
              const cleanName = cleanRecordedName(dep.recorded_by_name);

              // Normalize profiles object / array from Supabase
              const profileObj = Array.isArray(dep.profiles) ? dep.profiles[0] : dep.profiles;

              return (
                <tr key={dep.id || deposit_code} className="hover:bg-emerald-50/40 transition-colors">
                  <td className="p-3 font-mono font-bold text-emerald-900 text-xs">{deposit_code}</td>
                  <td className="p-3 font-bold text-slate-800">
                    <div>{formatMonthLabel(rawMonth)}</div>
                    {dep.deposited_by_name ? (
                      <div className="text-[10px] text-amber-900 font-semibold font-sans mt-0.5">
                        Via Rep: {dep.deposited_by_name}
                      </div>
                    ) : (
                      <div className="text-[10px] text-emerald-700 font-normal font-sans mt-0.5">
                        Paid: Self (In Person)
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-900">
                    NPR {Number(dep.amount_paid || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-xs text-slate-500 font-mono">
                    {dep.created_at ? dep.created_at.slice(0, 10) : dep.for_month || 'N/A'}
                  </td>
                  <td className="p-3 text-xs text-slate-700 font-sans">
                    <div className="font-bold">{cleanName}</div>
                    {dep.recorded_by_designation && (
                      <div className="text-[10px] text-slate-400">{dep.recorded_by_designation}</div>
                    )}
                  </td>
                  <td className="p-3 text-right">
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

            {filteredPersonalDeposits.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400 text-xs font-medium">
                  No personal savings records found matching the applied filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}