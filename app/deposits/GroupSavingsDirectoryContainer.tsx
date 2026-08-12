'use client';

import { useState, useMemo } from 'react';
import { formatMonthLabel, formatNptDateTime } from '@/lib/formatters';
import DepositReceiptModal from './DepositReceiptModal';
import EditDepositModal from './EditDepositModal';
import MyDepositsLedger from './MyDepositsLedger';
import { 
  Users, 
  Search, 
  Filter, 
  RotateCcw, 
  Lock, 
  UserCheck, 
  Printer,
  ArrowUpDown
} from 'lucide-react';

interface GroupSavingsDirectoryContainerProps {
  depositList: any[];
  myDeposits: any[];
  currentUserId: string;
  isAdmin: boolean;
}

function cleanRecordedName(name?: string): string {
  if (!name) return 'System Admin';
  return name.replace(/\s*\((Admin|Superadmin)\)/gi, '').trim();
}

export default function GroupSavingsDirectoryContainer({
  depositList = [],
  myDeposits = [],
  currentUserId,
  isAdmin,
}: GroupSavingsDirectoryContainerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [sortOption, setSortOption] = useState('recorded_desc');

  // Extract available years dynamically from deposits
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    depositList.forEach((d) => {
      const year = d.for_month?.slice(0, 4);
      if (year) yearsSet.add(year);
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [depositList]);

  // Filter and Sort group deposits
  const filteredAndSortedDeposits = useMemo(() => {
    let filtered = depositList.filter((dep) => {
      const depIdStr = dep.id ? String(dep.id).padStart(4, '0') : '0000';
      const depositCode = (dep.deposit_code || `DP-${depIdStr}`).toLowerCase();
      const memberName = (dep.profiles?.full_name || '').toLowerCase();
      const accountId = (dep.profiles?.account_id || '').toLowerCase();
      const depositedBy = (dep.deposited_by_name || '').toLowerCase();
      const recordedBy = cleanRecordedName(dep.recorded_by_name).toLowerCase();
      const rawYear = dep.for_month?.slice(0, 4) || '';

      const query = searchTerm.toLowerCase().trim();

      // 1. Search Filter
      if (
        query &&
        !memberName.includes(query) &&
        !accountId.includes(query) &&
        !depositCode.includes(query) &&
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
  }, [depositList, searchTerm, selectedYear, sortOption]);

  // Total Accumulated Savings calculated dynamically from filtered deposits
  const totalAccumulatedSavings = useMemo(() => {
    return filteredAndSortedDeposits.reduce((sum, d) => sum + Number(d.amount_paid || 0), 0);
  }, [filteredAndSortedDeposits]);

  function handleResetFilters() {
    setSearchTerm('');
    setSelectedYear('');
    setSortOption('recorded_desc');
  }

  function handlePrintLedger() {
    window.print();
  }

  return (
    <div className="space-y-6 text-left">
      {/* Hide the Group Directory Ledger during print if a batch print or single receipt is open */}
      <style type="text/css" media="print">
        {`
          body:has(#batch-print-zone) .directory-ledger-section,
          body:has([id^="single-receipt-print-zone"]) .directory-ledger-section {
            display: none !important;
          }
          /* Force tfoot to only render once at the end of the printed table */
          tfoot {
            display: table-row-group !important;
            break-inside: avoid !important;
          }
        `}
      </style>

      {/* SECTION 1: MY PERSONAL SAVINGS LEDGER (Non-Admins Only) */}
      {!isAdmin && (
        <MyDepositsLedger myDeposits={myDeposits} isAdmin={isAdmin} />
      )}

      {/* SECTION 2: GROUP SAVINGS DIRECTORY */}
      <div className="directory-ledger-section bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
        
        {/* Printable Group Title Banner for Print Mode */}
        <div className="hidden print:block text-center border-b border-slate-300 pb-3 mb-4 space-y-1">
          <h1 className="text-xl font-black text-slate-900 uppercase">EVERGREEN SAVINGS GROUP</h1>
          <p className="text-xs font-bold text-slate-600 uppercase">Official Group Savings Master Ledger Report</p>
          {selectedYear && <p className="text-xs text-slate-500 font-mono font-bold">Filtered Year: {selectedYear}</p>}
        </div>

        {/* Header Title Banner */}
        <div className="p-4 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-3 print:bg-slate-100 print:text-slate-900 print:border-b print:border-slate-300">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-800 rounded-lg print:hidden">
              <Users size={20} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-base">Group Savings Directory</h3>
              <p className="text-xs text-slate-400 print:text-slate-600">
                Complete savings deposits directory across all group accounts ({filteredAndSortedDeposits.length} Records)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Print Button */}
            <button
              onClick={handlePrintLedger}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors print:hidden"
            >
              <Printer size={15} /> Print Group Ledger
            </button>

            {/* Accumulated Total Summary Card */}
            <div className="bg-emerald-950/80 border border-emerald-800/80 px-4 py-2 rounded-xl font-mono text-xs flex items-center gap-3 print:bg-white print:border-slate-300 print:text-slate-900">
              <div>
                <span className="text-emerald-300/80 print:text-slate-500 block text-[10px] font-sans font-bold uppercase tracking-wider">
                  Total Accumulated Savings
                </span>
                <strong className="text-emerald-400 print:text-emerald-950 text-lg font-black tracking-tight">
                  NPR {totalAccumulatedSavings.toLocaleString('en-IN')}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar (Hidden when printing) */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 print:hidden">
          
          {/* Member / Deposit ID / Representative Search */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Member, Account ID, Representative Name, Deposit ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-700 font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <RotateCcw size={13} />
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
                className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <RotateCcw size={12} /> Reset
              </button>
            )}
          </div>

        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3 font-mono">Deposit ID</th>
                <th className="p-3">Member Name</th>
                <th className="p-3">Contribution Month</th>
                <th className="p-3 text-right">Amount Paid</th>
                <th className="p-3">Recorded Time</th>
                <th className="p-3">Recorded By</th>
                <th className="p-3 text-right print:hidden">Receipt & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSortedDeposits.map((dep: any) => {
                const depIdStr = dep.id ? String(dep.id).padStart(4, '0') : '0000';
                const deposit_code = dep.deposit_code || `DP-${depIdStr}`;
                const rawMonth = dep.for_month?.slice(0, 7);
                const isOwnDeposit = String(dep.member_id) === String(currentUserId);
                const canAccessDetails = isAdmin || isOwnDeposit;
                const cleanName = cleanRecordedName(dep.recorded_by_name);

                return (
                  <tr key={dep.id || deposit_code} className={`hover:bg-slate-50 transition-colors ${isOwnDeposit ? 'bg-emerald-50/20' : ''}`}>
                    
                    {/* Deposit ID */}
                    <td className="p-3 font-mono text-xs">
                      {canAccessDetails ? (
                        <span className="font-bold text-blue-900">{deposit_code}</span>
                      ) : (
                        <span className="text-slate-400 font-sans text-xs flex items-center gap-1 select-none" title="Voucher ID restricted for privacy">
                          <Lock size={12} className="text-slate-400" /> ••••••
                        </span>
                      )}
                    </td>

                    {/* Member Name & Deposited By Identity Note */}
                    <td className="p-3 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{dep.profiles?.full_name || 'Member'}</span>
                        {isOwnDeposit && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full text-[10px] font-extrabold flex items-center gap-1 print:hidden">
                            <UserCheck size={11} /> You
                          </span>
                        )}
                      </div>

                      {/* Depositor Identity Note */}
                      {dep.deposited_by_name ? (
                        <div className="text-[11px] text-amber-950 font-semibold mt-0.5">
                          On Behalf Of: <strong>{dep.deposited_by_name}</strong>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 font-sans">
                          Deposited By: <span className="font-bold text-slate-500">Self (Member)</span>
                        </div>
                      )}

                      {isAdmin && (
                        <div className="text-xs text-slate-400 font-mono mt-0.5">
                          ID: {dep.profiles?.account_id || 'N/A'}
                        </div>
                      )}
                    </td>

                    {/* Contribution Month */}
                    <td className="p-3 text-slate-800 text-xs font-mono font-bold">
                      {formatMonthLabel(rawMonth)}
                    </td>

                    {/* Amount Paid */}
                    <td className="p-3 text-right font-mono font-bold text-emerald-800">
                      NPR {Number(dep.amount_paid || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Recorded Time in NPT */}
                    <td className="p-3 text-xs text-slate-600 font-mono">
                      {formatNptDateTime(dep.created_at)}
                    </td>

                    {/* Recorded By Collector */}
                    <td className="p-3 text-xs text-slate-700 font-sans">
                      <div className="font-bold">{cleanName}</div>
                      {dep.recorded_by_designation && (
                        <div className="text-[10px] text-slate-400">{dep.recorded_by_designation}</div>
                      )}
                    </td>

                    {/* Receipt & Actions (Hidden during print) */}
                    <td className="p-3 text-right flex items-center justify-end gap-2 print:hidden">
                      {canAccessDetails ? (
                        <>
                          <DepositReceiptModal receipt={{
                            deposit_code,
                            for_month: rawMonth,
                            amount_paid: Number(dep.amount_paid || 0),
                            created_at: dep.created_at,
                            member_name: dep.profiles?.full_name || 'Member',
                            member_account_id: dep.profiles?.account_id || 'N/A',
                            deposited_by_name: dep.deposited_by_name,
                            recorded_by_name: cleanName,
                            recorded_by_designation: dep.recorded_by_designation,
                          }} />
                          {isAdmin && <EditDepositModal deposit={dep} />}
                        </>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-semibold px-2.5 py-1 bg-slate-100 rounded border border-slate-200 inline-flex items-center gap-1 cursor-not-allowed select-none">
                          <Lock size={11} /> Restricted
                        </span>
                      )}
                    </td>

                  </tr>
                );
              })}

              {filteredAndSortedDeposits.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-xs font-sans">
                    No group savings deposit records match your applied filters.
                  </td>
                </tr>
              )}
            </tbody>

            {/* TOTAL SUMMARY FOOTER ROW - RENDERS ONLY ONCE AT THE VERY END */}
            {filteredAndSortedDeposits.length > 0 && (
              <tfoot className="bg-slate-100/90 text-slate-900 border-t-2 border-slate-300 font-bold print:border-t-2 print:border-slate-800">
                <tr>
                  <td colSpan={3} className="p-3 text-left font-sans uppercase text-xs font-black tracking-wider">
                    Total Filtered Deposits ({filteredAndSortedDeposits.length} Entries)
                  </td>
                  <td className="p-3 text-right font-mono text-sm font-black text-emerald-950">
                    NPR {totalAccumulatedSavings.toLocaleString('en-IN')}
                  </td>
                  <td colSpan={3} className="p-3 text-slate-400 font-mono text-[10px] print:hidden">
                    Verified Group Total
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