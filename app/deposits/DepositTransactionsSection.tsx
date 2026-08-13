'use client';

import { useState, useMemo } from 'react';
import { formatMonthLabel, formatNptDateTime } from '@/lib/formatters';
import DepositReceiptModal from './DepositReceiptModal';
import EditDepositModal from './EditDepositModal';
import DeleteDepositModal from './DeleteDepositModal';
import { 
  Receipt, 
  Search, 
  Calendar, 
  Printer, 
  ChevronLeft, 
  ChevronRight, 
  FileText,
  Lock,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  RotateCcw
} from 'lucide-react';

interface DepositTransactionsSectionProps {
  depositList: any[];
  isAdmin: boolean;
  currentUserId: string;
}

export default function DepositTransactionsSection({
  depositList = [],
  isAdmin,
  currentUserId
}: DepositTransactionsSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOption, setSortOption] = useState<string>('recorded_desc');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Pagination State (10 Transactions Per Page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter & Sort Transactions by Query, Date Range, & Sort Dropdown
  const filteredAndSortedTransactions = useMemo(() => {
    // 1. Filter Logic
    let filtered = depositList.filter((dep) => {
      const depCode = (dep.deposit_code || `DP-${dep.id}`).toLowerCase();
      const memberName = (dep.profiles?.full_name || '').toLowerCase();
      const accountId = (dep.profiles?.account_id || '').toLowerCase();
      const repName = (dep.deposited_by_name || '').toLowerCase();
      const note = (dep.deposit_note || '').toLowerCase();

      const query = searchTerm.toLowerCase().trim();

      if (
        query &&
        !memberName.includes(query) &&
        !accountId.includes(query) &&
        !depCode.includes(query) &&
        !repName.includes(query) &&
        !note.includes(query)
      ) {
        return false;
      }

      // Date Range Filter
      const createdDate = dep.created_at ? dep.created_at.slice(0, 10) : `${dep.for_month}-01`;
      if (startDate && createdDate < startDate) return false;
      if (endDate && createdDate > endDate) return false;

      return true;
    });

    // 2. Sort Logic
    filtered.sort((a, b) => {
      if (sortOption === 'recorded_desc') {
        const timeA = new Date(a.created_at || a.for_month || 0).getTime();
        const timeB = new Date(b.created_at || b.for_month || 0).getTime();
        return timeB - timeA;
      }
      if (sortOption === 'recorded_asc') {
        const timeA = new Date(a.created_at || a.for_month || 0).getTime();
        const timeB = new Date(b.created_at || b.for_month || 0).getTime();
        return timeA - timeB;
      }
      if (sortOption === 'month_desc') {
        return (b.for_month || '').localeCompare(a.for_month || '');
      }
      if (sortOption === 'month_asc') {
        return (a.for_month || '').localeCompare(b.for_month || '');
      }
      if (sortOption === 'amount_desc') {
        const netA = Number(a.amount_paid || 0) + Number(a.fine_amount || 0);
        const netB = Number(b.amount_paid || 0) + Number(b.fine_amount || 0);
        return netB - netA;
      }
      if (sortOption === 'amount_asc') {
        const netA = Number(a.amount_paid || 0) + Number(a.fine_amount || 0);
        const netB = Number(b.amount_paid || 0) + Number(b.fine_amount || 0);
        return netA - netB;
      }
      if (sortOption === 'name_asc') {
        return (a.profiles?.full_name || '').localeCompare(b.profiles?.full_name || '');
      }
      if (sortOption === 'name_desc') {
        return (b.profiles?.full_name || '').localeCompare(a.profiles?.full_name || '');
      }
      return 0;
    });

    return filtered;
  }, [depositList, searchTerm, startDate, endDate, sortOption]);

  // Pagination Calculations
  const totalPages = Math.ceil(filteredAndSortedTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedTransactions.slice(start, start + itemsPerPage);
  }, [filteredAndSortedTransactions, currentPage, itemsPerPage]);

  function handleResetAll() {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setSortOption('recorded_desc');
    setCurrentPage(1);
  }

  function handlePrintTransactions() {
    let url = '/deposits/print-transactions';
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (searchTerm) params.append('search', searchTerm);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    window.open(url, '_blank', 'width=1000,height=800,scrollbars=yes');
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden text-left font-sans">
      
      {/* Header */}
      <div className="p-4 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-800 rounded-lg">
            <Receipt size={20} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-base">Deposits Transactions Stream</h3>
            <p className="text-xs text-slate-400 font-mono">
              Itemized Voucher Feed ({filteredAndSortedTransactions.length} Transactions)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
          >
            {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            {isCollapsed ? 'Expand' : 'Collapse'}
          </button>

          <button
            type="button"
            onClick={handlePrintTransactions}
            className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Printer size={15} /> Print Transactions Page
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Filters & Sort Controls Bar */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col xl:flex-row justify-between items-center gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Voucher Code, Member, Note..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-700 font-medium"
              />
            </div>

            {/* Date Range & Sort Dropdowns */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-700 w-full xl:w-auto">
              
              {/* Date From */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-300 px-2.5 py-1.5 rounded-xl">
                <Calendar size={13} className="text-emerald-700" />
                <span className="text-[11px] text-slate-500 font-sans">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                  className="bg-transparent font-mono text-xs font-bold focus:outline-none cursor-pointer"
                />
              </div>

              {/* Date To */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-300 px-2.5 py-1.5 rounded-xl">
                <Calendar size={13} className="text-emerald-700" />
                <span className="text-[11px] text-slate-500 font-sans">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                  className="bg-transparent font-mono text-xs font-bold focus:outline-none cursor-pointer"
                />
              </div>

              {/* Sort By Dropdown */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-300 px-2.5 py-1.5 rounded-xl">
                <ArrowUpDown size={13} className="text-emerald-700" />
                <span className="text-[11px] text-slate-500 font-sans">Sort By:</span>
                <select
                  value={sortOption}
                  onChange={(e) => { setSortOption(e.target.value); setCurrentPage(1); }}
                  className="bg-transparent font-sans text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                >
                  <option value="recorded_desc">Transaction Time (Newest First)</option>
                  <option value="recorded_asc">Transaction Time (Oldest First)</option>
                  <option value="month_desc">Contribution Month (Newest First)</option>
                  <option value="month_asc">Contribution Month (Oldest First)</option>
                  <option value="amount_desc">Amount Paid (Highest First)</option>
                  <option value="amount_asc">Amount Paid (Lowest First)</option>
                  <option value="name_asc">Member Name (A – Z)</option>
                  <option value="name_desc">Member Name (Z – A)</option>
                </select>
              </div>

              {/* Clear / Reset Filters */}
              {(startDate || endDate || searchTerm || sortOption !== 'recorded_desc') && (
                <button
                  type="button"
                  onClick={handleResetAll}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl flex items-center gap-1 transition-colors cursor-pointer font-bold"
                >
                  <RotateCcw size={12} /> Reset
                </button>
              )}
            </div>

          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-100 text-slate-600 uppercase font-semibold border-b border-slate-200 text-[10px]">
                <tr>
                  <th className="p-3 font-mono">Voucher ID</th>
                  <th className="p-3">Member</th>
                  <th className="p-3">Month</th>
                  <th className="p-3 text-right">Base Amount</th>
                  <th className="p-3 text-right">Fine Collected</th>
                  <th className="p-3 text-right font-black">Net Cash</th>
                  <th className="p-3">Transaction Time</th>
                  <th className="p-3">Recorded By</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedTransactions.map((dep) => {
                  const base = Number(dep.amount_paid || 0);
                  const fine = Number(dep.fine_amount || 0);
                  const net = base + fine;
                  const depCode = dep.deposit_code || `DP-${dep.id}`;
                  const isOwn = String(dep.member_id) === String(currentUserId);
                  const canAccess = isAdmin || isOwn;

                  return (
                    <tr key={dep.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-blue-900">{depCode}</td>
                      <td className="p-3 font-medium text-slate-900">
                        <div className="font-bold">{dep.profiles?.full_name || 'Member'}</div>
                        <div className="text-[10px] font-mono text-slate-400">Acc: {dep.profiles?.account_id || 'N/A'}</div>
                        {dep.deposited_by_name && (
                          <div className="text-[10px] text-amber-950 font-semibold mt-0.5">
                            On Behalf Of: <strong>{dep.deposited_by_name}</strong>
                          </div>
                        )}
                        {dep.deposit_note && (
                          <div className="text-[10px] text-slate-500 italic flex items-center gap-1 mt-0.5">
                            <FileText size={10} /> "{dep.deposit_note}"
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900">{formatMonthLabel(dep.for_month?.slice(0, 7))}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-800">NPR {base.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-mono text-amber-900 font-bold">
                        {fine > 0 ? `+NPR ${fine.toLocaleString('en-IN')}` : 'NPR 0'}
                      </td>
                      <td className="p-3 text-right font-mono font-black text-emerald-950 text-sm">
                        NPR {net.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 font-mono text-slate-600 text-[11px]">{formatNptDateTime(dep.created_at)}</td>
                      <td className="p-3 text-slate-700 font-sans">
                        <div className="font-bold">{dep.recorded_by_name || 'System Admin'}</div>
                        <div className="text-[10px] text-slate-400">{dep.recorded_by_designation}</div>
                      </td>
                      <td className="p-3 text-right">
                        {canAccess ? (
                          <div className="flex items-center justify-end gap-1">
                            <DepositReceiptModal receipt={dep} />
                            {isAdmin && <EditDepositModal deposit={dep} />}
                            {isAdmin && <DeleteDepositModal deposit={dep} />}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px] flex items-center justify-end gap-1">
                            <Lock size={11} /> Restricted
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {paginatedTransactions.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 text-xs font-sans">
                      No deposit transactions match your applied filters and sort criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs font-bold">
              <span className="text-slate-500">
                Page {currentPage} of {totalPages} ({filteredAndSortedTransactions.length} Total Filtered)
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 bg-white border border-slate-300 disabled:opacity-40 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft size={13} /> Prev
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 bg-white border border-slate-300 disabled:opacity-40 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  Next <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}