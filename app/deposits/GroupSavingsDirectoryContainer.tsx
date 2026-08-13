'use client';

import { useState, useMemo } from 'react';
import { formatMonthLabel } from '@/lib/formatters';
import DepositReceiptModal from './DepositReceiptModal';
import EditDepositModal from './EditDepositModal';
import DeleteDepositModal from './DeleteDepositModal';
import MyDepositsLedger from './MyDepositsLedger';
import { 
  Users, 
  Search, 
  Filter, 
  RotateCcw, 
  Printer, 
  ChevronDown, 
  ChevronRight, 
  ChevronLeft,
  FileText,
  Lock,
  UserCheck
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
  const [expandedMembers, setExpandedMembers] = useState<Record<string, boolean>>({});

  // Pagination State (5 Member Groups Per Page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Extract available years dynamically from deposits
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    depositList.forEach((d) => {
      const year = d.for_month?.slice(0, 4);
      if (year) yearsSet.add(year);
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [depositList]);

  // Group Deposits Member-Wise & Apply Filters
  const memberGroupedData = useMemo(() => {
    const groups: Record<string, { member: any; deposits: any[]; totalBase: number; totalFine: number }> = {};

    depositList.forEach((dep) => {
      const mId = String(dep.member_id || 'UNKNOWN');
      const rawYear = dep.for_month?.slice(0, 4) || '';
      const query = searchTerm.toLowerCase().trim();

      const memberName = (dep.profiles?.full_name || '').toLowerCase();
      const accountId = (dep.profiles?.account_id || '').toLowerCase();
      const depositCode = (dep.deposit_code || '').toLowerCase();
      const repName = (dep.deposited_by_name || '').toLowerCase();
      const note = (dep.deposit_note || '').toLowerCase();

      // 1. Search Filter
      if (
        query &&
        !memberName.includes(query) &&
        !accountId.includes(query) &&
        !depositCode.includes(query) &&
        !repName.includes(query) &&
        !note.includes(query)
      ) {
        return;
      }

      // 2. Year Filter
      if (selectedYear && rawYear !== selectedYear) return;

      if (!groups[mId]) {
        groups[mId] = {
          member: dep.profiles || { full_name: 'Member', account_id: 'N/A' },
          deposits: [],
          totalBase: 0,
          totalFine: 0,
        };
      }

      groups[mId].deposits.push(dep);
      groups[mId].totalBase += Number(dep.amount_paid || 0);
      groups[mId].totalFine += Number(dep.fine_amount || 0);
    });

    return Object.values(groups).sort((a, b) => 
      (a.member.full_name || '').localeCompare(b.member.full_name || '')
    );
  }, [depositList, searchTerm, selectedYear]);

  // Overall Itemized Totals across Filtered Data
  const { globalBaseTotal, globalFineTotal } = useMemo(() => {
    return memberGroupedData.reduce(
      (acc, g) => {
        acc.globalBaseTotal += g.totalBase;
        acc.globalFineTotal += g.totalFine;
        return acc;
      },
      { globalBaseTotal: 0, globalFineTotal: 0 }
    );
  }, [memberGroupedData]);

  // Paginated Group Slice
  const totalPages = Math.ceil(memberGroupedData.length / itemsPerPage) || 1;
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return memberGroupedData.slice(start, start + itemsPerPage);
  }, [memberGroupedData, currentPage, itemsPerPage]);

  function toggleExpandMember(memberId: string) {
    setExpandedMembers((prev) => ({ ...prev, [memberId]: !prev[memberId] }));
  }

  function toggleExpandAll(expand: boolean) {
    const nextState: Record<string, boolean> = {};
    memberGroupedData.forEach((g) => { nextState[g.member.id] = expand; });
    setExpandedMembers(nextState);
  }

  function handleResetFilters() {
    setSearchTerm('');
    setSelectedYear('');
    setCurrentPage(1);
  }

  // function handlePrintDirectoryPage() {
  //   window.location.href = '/deposits/print-directory';
  // }

  function handlePrintDirectoryPage() {
  window.open('/deposits/print-directory', '_blank', 'width=1000,height=800,scrollbars=yes');
}

  return (
    <div className="space-y-6 text-left font-sans">
      
      {/* SECTION 1: MY PERSONAL SAVINGS LEDGER (Non-Admins Only) */}
      {!isAdmin && (
        <MyDepositsLedger myDeposits={myDeposits} isAdmin={isAdmin} />
      )}

      {/* SECTION 2: MEMBER-GROUPED DIRECTORY */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Header Title Banner */}
        <div className="p-4 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-800 rounded-lg">
              <Users size={20} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-base">Member Savings Directory (User Grouped)</h3>
              <p className="text-xs text-slate-400 font-mono">
                {memberGroupedData.length} Grouped Member Accounts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Dedicated Print Redirect Button */}
            <button
              onClick={handlePrintDirectoryPage}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Printer size={15} /> Print Group Directory
            </button>

            {/* Accumulated Grand Total Summary Card */}
            <div className="bg-emerald-950/80 border border-emerald-800/80 px-4 py-2 rounded-xl font-mono text-xs flex items-center gap-3">
              <div>
                <span className="text-emerald-300/80 block text-[10px] font-sans font-bold uppercase tracking-wider">
                  Grand Cash Total (Base + Fines)
                </span>
                <strong className="text-emerald-400 text-lg font-black tracking-tight">
                  NPR {(globalBaseTotal + globalFineTotal).toLocaleString('en-IN')}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Member Name, Account ID, Voucher Code, Note..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-700 font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <RotateCcw size={13} />
              </button>
            )}
          </div>

          {/* Year Dropdown & Expand Actions */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-700">
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-300">
              <Filter size={13} className="text-emerald-700" />
              <span className="text-[11px] text-slate-500 font-sans">Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => { setSelectedYear(e.target.value); setCurrentPage(1); }}
                className="bg-transparent font-mono text-[11px] font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="">All Years ({availableYears.length})</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => toggleExpandAll(true)}
              className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl cursor-pointer"
            >
              Expand All
            </button>
            <button
              onClick={() => toggleExpandAll(false)}
              className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl cursor-pointer"
            >
              Collapse All
            </button>

            {(searchTerm || selectedYear) && (
              <button
                onClick={handleResetFilters}
                className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw size={12} /> Reset
              </button>
            )}
          </div>

        </div>

        {/* Collapsible Member Cards List */}
        <div className="p-4 space-y-3">
          {paginatedMembers.map((group) => {
            const isExpanded = expandedMembers[group.member.id] ?? false;
            const memberNetTotal = group.totalBase + group.totalFine;

            return (
              <div key={group.member.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                
                {/* Member Summary Card Header */}
                <div
                  onClick={() => toggleExpandMember(group.member.id)}
                  className="p-3.5 bg-slate-50 hover:bg-slate-100 flex justify-between items-center cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {isExpanded ? <ChevronDown size={16} className="text-slate-600" /> : <ChevronRight size={16} className="text-slate-400" />}
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-2">
                        {group.member.full_name} 
                        <span className="font-mono text-blue-900 font-bold">({group.member.account_id || 'N/A'})</span>
                        {String(group.member.id) === String(currentUserId) && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full text-[9px] font-extrabold inline-flex items-center gap-0.5">
                            <UserCheck size={10} /> You
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {group.deposits.length} Vouchers • Base: NPR {group.totalBase.toLocaleString('en-IN')}{group.totalFine > 0 ? ` (+Fine NPR ${group.totalFine.toLocaleString('en-IN')})` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="text-right font-mono text-xs">
                    <span className="text-[10px] font-sans font-bold text-slate-500 block">Net Member Balance</span>
                    <strong className="text-emerald-950 font-black text-sm">
                      NPR {memberNetTotal.toLocaleString('en-IN')}
                    </strong>
                  </div>
                </div>

                {/* Collapsible Vouchers Table */}
                {isExpanded && (
                  <div className="overflow-x-auto border-t border-slate-200">
                    <table className="w-full text-left text-xs font-sans">
                      <thead className="bg-slate-100 text-slate-600 uppercase font-semibold text-[10px]">
                        <tr>
                          <th className="p-2.5 font-mono">Voucher ID</th>
                          <th className="p-2.5">Target Month</th>
                          <th className="p-2.5 text-right">Base Deposit</th>
                          <th className="p-2.5 text-right">Fine Collected</th>
                          <th className="p-2.5 text-right font-black">Net Cash Paid</th>
                          <th className="p-2.5">Recorded By</th>
                          <th className="p-2.5 text-right">Receipt & Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {group.deposits.map((dep) => {
                          const depIdStr = dep.id ? String(dep.id).padStart(4, '0') : '0000';
                          const deposit_code = dep.deposit_code || `DP-${depIdStr}`;
                          const rawMonth = dep.for_month?.slice(0, 7);
                          const isOwnDeposit = String(dep.member_id) === String(currentUserId);
                          const canAccessDetails = isAdmin || isOwnDeposit;
                          const cleanName = cleanRecordedName(dep.recorded_by_name);

                          const baseAmt = Number(dep.amount_paid || 0);
                          const fineAmt = Number(dep.fine_amount || 0);
                          const fineDisc = Number(dep.fine_discount_amount || 0);
                          const netPaid = baseAmt + fineAmt;

                          return (
                            <tr key={dep.id || deposit_code} className="hover:bg-slate-50 transition-colors">
                              
                              <td className="p-2.5 font-mono text-xs">
                                {canAccessDetails ? (
                                  <span className="font-bold text-blue-900">{deposit_code}</span>
                                ) : (
                                  <span className="text-slate-400 font-sans text-xs flex items-center gap-1 select-none">
                                    <Lock size={12} /> ••••••
                                  </span>
                                )}
                              </td>

                              <td className="p-2.5 text-slate-800 font-mono font-bold">
                                {formatMonthLabel(rawMonth)}
                                {dep.deposit_note && (
                                  <div className="text-[10px] text-slate-500 font-mono italic flex items-center gap-1 font-normal">
                                    <FileText size={10} /> "{dep.deposit_note}"
                                  </div>
                                )}
                              </td>

                              <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                                NPR {baseAmt.toLocaleString('en-IN')}
                              </td>

                              <td className="p-2.5 text-right font-mono">
                                {fineAmt > 0 ? (
                                  <span className="font-bold text-amber-900">+ NPR {fineAmt.toLocaleString('en-IN')}</span>
                                ) : (
                                  <span className="text-slate-400 font-normal">NPR 0</span>
                                )}
                                {fineDisc > 0 && (
                                  <span className="block text-[9px] font-bold text-emerald-800 font-sans">
                                    (Waived NPR {fineDisc})
                                  </span>
                                )}
                              </td>

                              <td className="p-2.5 text-right font-mono font-black text-emerald-950 text-xs">
                                NPR {netPaid.toLocaleString('en-IN')}
                              </td>

                              <td className="p-2.5 text-slate-700 font-sans">
                                <div className="font-bold">{cleanName}</div>
                                <div className="text-[10px] text-slate-400">{dep.recorded_by_designation}</div>
                              </td>

                              <td className="p-2.5 text-right">
                                {canAccessDetails ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <DepositReceiptModal receipt={{
                                      deposit_code,
                                      for_month: rawMonth,
                                      amount_paid: baseAmt,
                                      fine_amount: fineAmt,
                                      fine_discount_amount: fineDisc,
                                      fine_waived: Boolean(dep.fine_waived),
                                      fine_override_reason: dep.fine_override_reason,
                                      deposit_note: dep.deposit_note,
                                      created_at: dep.created_at,
                                      member_name: dep.profiles?.full_name || group.member.full_name || 'Member',
                                      member_account_id: dep.profiles?.account_id || group.member.account_id || 'N/A',
                                      deposited_by_name: dep.deposited_by_name,
                                      recorded_by_name: cleanName,
                                      recorded_by_designation: dep.recorded_by_designation,
                                    }} />
                                    {isAdmin && <EditDepositModal deposit={dep} />}
                                    {isAdmin && <DeleteDepositModal deposit={dep} />}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-semibold px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                                    Restricted
                                  </span>
                                )}
                              </td>

                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

              </div>
            );
          })}

          {paginatedMembers.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs">
              No member savings records match your applied filters.
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs font-bold">
            <span className="text-slate-500">
              Page {currentPage} of {totalPages} ({memberGroupedData.length} Total Member Groups)
            </span>
            <div className="flex gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 bg-white border border-slate-300 disabled:opacity-40 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft size={13} /> Prev
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 bg-white border border-slate-300 disabled:opacity-40 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}