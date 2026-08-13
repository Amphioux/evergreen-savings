'use client';

import { useState, useMemo } from 'react';
import { formatMonthLabel } from '@/lib/formatters';
import { calculateSavingsFine, getSavingsRateForMonth } from '@/lib/savingsUtils';
import { 
  ShieldAlert, 
  CalendarCheck, 
  PhoneCall, 
  ArrowRight, 
  Printer, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';

interface SavingsDefaultersDetailTableProps {
  defaultersList: any[];
  fineRules: any[];
  contributionRules: any[];
  onSelectLateFeeTab?: (memberId: string) => void;
}

export default function SavingsDefaultersDetailTable({
  defaultersList = [],
  fineRules = [],
  contributionRules = [],
  onSelectLateFeeTab
}: SavingsDefaultersDetailTableProps) {
  
  // Pagination State (5 Defaulters Per Page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // STRICT FILTER: Only show defaulters who have passed the grace period (Accrued Fine > 0)
  const gracePassedDefaulters = useMemo(() => {
    return defaultersList
      .map((m) => {
        const fineActiveMonths = (m.missedMonthsList || []).filter((monthStr: string) => {
          const rate = getSavingsRateForMonth(monthStr, contributionRules);
          return calculateSavingsFine(monthStr, rate, fineRules) > 0;
        });

        const totalAccruedFine = (m.missedMonthsList || []).reduce((sum: number, monthStr: string) => {
          const rate = getSavingsRateForMonth(monthStr, contributionRules);
          return sum + calculateSavingsFine(monthStr, rate, fineRules);
        }, 0);

        return {
          ...m,
          fineActiveMonths,
          totalAccruedFine,
          totalPayable: (m.totalDefaultedAmount || 0) + totalAccruedFine
        };
      })
      .filter((m) => m.totalAccruedFine > 0) // Grace period expired check
      .sort((a, b) => b.totalPayable - a.totalPayable);
  }, [defaultersList, fineRules, contributionRules]);

  // Paginated Slice
  const totalPages = Math.ceil(gracePassedDefaulters.length / itemsPerPage) || 1;
  const paginatedDefaulters = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return gracePassedDefaulters.slice(start, start + itemsPerPage);
  }, [gracePassedDefaulters, currentPage, itemsPerPage]);

  function handlePrintPenaltyLedger() {
    window.open('/deposits/print-penalty-ledger', '_blank', 'width=1000,height=800,scrollbars=yes');
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-amber-200 shadow-xs overflow-hidden text-left font-sans">
      
      {/* Header Banner */}
      <div className="p-4 bg-amber-50 border-b border-amber-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h3 className="font-extrabold text-amber-950 text-sm uppercase tracking-wider">
              Grace-Expired Savings Penalty Ledger ({gracePassedDefaulters.length})
            </h3>
            <p className="text-xs text-amber-800">
              Members whose grace period has expired and have active accrued late penalty charges
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrintPenaltyLedger}
            className="px-3 py-1.5 bg-amber-900 hover:bg-amber-800 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Printer size={14} /> Print Penalty Ledger
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-amber-100/50 text-amber-950 uppercase font-bold text-[10px]">
            <tr>
              <th className="p-3">Member & Account Reference</th>
              <th className="p-3">Overdue Months</th>
              <th className="p-3 text-right">Overdue Base</th>
              <th className="p-3 text-right">Accrued Late Fine</th>
              <th className="p-3 text-right font-black">Total Payable</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-100">
            {paginatedDefaulters.map((member) => (
              <tr key={member.id} className="hover:bg-amber-50/40 transition-colors">
                <td className="p-3 font-medium text-slate-900">
                  <div className="font-extrabold text-slate-900">{member.full_name}</div>
                  <div className="text-[10px] font-mono text-slate-500">
                    Acc: {member.account_id || 'N/A'} • Joined: {member.joinedMonth}
                  </div>
                  {member.phone && member.phone !== 'N/A' && (
                    <a href={`tel:${member.phone}`} className="inline-flex items-center gap-1 text-[10px] text-blue-800 font-bold hover:underline">
                      <PhoneCall size={10} /> Call {member.phone}
                    </a>
                  )}
                </td>

                <td className="p-3">
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {(member.fineActiveMonths || member.missedMonthsList).map((mStr: string) => (
                      <span key={mStr} className="px-1.5 py-0.5 bg-amber-200 text-amber-950 rounded font-mono text-[9px] font-bold">
                        {formatMonthLabel(mStr)}
                      </span>
                    ))}
                  </div>
                </td>

                <td className="p-3 text-right font-mono font-bold text-slate-800">
                  NPR {Number(member.totalDefaultedAmount || 0).toLocaleString('en-IN')}
                </td>

                <td className="p-3 text-right font-mono font-bold text-amber-900">
                  + NPR {member.totalAccruedFine.toLocaleString('en-IN')}
                </td>

                <td className="p-3 text-right font-mono font-black text-amber-950 text-sm">
                  NPR {member.totalPayable.toLocaleString('en-IN')}
                </td>

                <td className="p-3 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectLateFeeTab) {
                        onSelectLateFeeTab(member.id);
                      } else {
                        window.location.href = `/deposits?tab=LATE_FEES&member_id=${member.id}`;
                      }
                    }}
                    className="px-3 py-1 bg-amber-900 hover:bg-amber-800 text-white font-bold text-[11px] rounded-lg inline-flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                  >
                    Collect Fee <ArrowRight size={12} />
                  </button>
                </td>
              </tr>
            ))}

            {gracePassedDefaulters.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-emerald-800 font-bold bg-emerald-50/50 text-xs">
                  <div className="flex items-center justify-center gap-2">
                    <CalendarCheck size={18} className="text-emerald-600" />
                    <span>No grace-expired defaulters! All members are compliant or within allowed grace windows.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="p-3 bg-amber-50/80 border-t border-amber-200 flex justify-between items-center text-xs font-bold font-mono">
          <span className="text-amber-900">
            Page {currentPage} of {totalPages} ({gracePassedDefaulters.length} Grace-Expired Records)
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 bg-white border border-amber-300 text-amber-950 disabled:opacity-40 rounded-lg flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft size={13} /> Prev
            </button>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 bg-white border border-amber-300 text-amber-950 disabled:opacity-40 rounded-lg flex items-center gap-1 cursor-pointer"
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}