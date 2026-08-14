'use client';

import { useState, useMemo } from 'react';
import { calculateIndustryLoanDues } from '@/lib/loanUtils';
import { 
  ShieldAlert, 
  CalendarCheck, 
  PhoneCall, 
  Printer, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  AlertTriangle
} from 'lucide-react';

interface LoanDefaultersDetailTableProps {
  activeLoans: any[];
  profiles: any[];
  paymentList: any[];
  fineRules: any[];
  onSelectRepaymentTab?: (loanId: string) => void;
}

export default function LoanDefaultersDetailTable({
  activeLoans = [],
  profiles = [],
  paymentList = [],
  fineRules = [],
  onSelectRepaymentTab,
}: LoanDefaultersDetailTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const gracePassedDefaulters = useMemo(() => {
    return activeLoans
      .map((loan) => {
        const borrower = profiles.find((p) => String(p.id) === String(loan.borrower_id)) || {
          full_name: 'Unknown Borrower',
          account_id: 'N/A',
          phone: 'N/A',
          user_type: 'MEMBER',
        };
        const guarantor = profiles.find((p) => String(p.id) === String(loan.guarantor_id));

        const loanPayments = paymentList.filter((p) => String(p.loan_id) === String(loan.id));
        const calculation = calculateIndustryLoanDues(loan, loanPayments, fineRules, today);

        if (calculation.unpaidMonthsCount === 0 && calculation.daysOverdue < 30) {
          return null;
        }

        const remainingBalance = loan.remaining_balance ?? Math.max(
          0, 
          Number(loan.principal_amount || 0) - loanPayments.reduce((s, p) => s + Number(p.principal_paid || 0), 0)
        );

        if (remainingBalance <= 0) return null;

        // Compute total loan age in calendar days since disbursement
        const issueDateObj = new Date(loan.issue_date);
        const ageInMs = today.getTime() - issueDateObj.getTime();
        const loanAgeDays = Math.max(0, Math.floor(ageInMs / (1000 * 60 * 60 * 24)));

        return {
          ...loan,
          borrower,
          guarantor,
          remainingBalance,
          calculation,
          loanAgeDays,
        };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null)
      .sort((a, b) => b.calculation.unpaidMonthsCount - a.calculation.unpaidMonthsCount);
  }, [activeLoans, profiles, paymentList, fineRules, today]);

  const totalPages = Math.ceil(gracePassedDefaulters.length / itemsPerPage) || 1;
  const paginatedDefaulters = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return gracePassedDefaulters.slice(start, start + itemsPerPage);
  }, [gracePassedDefaulters, currentPage, itemsPerPage]);

  function handlePrintPenaltyLedger() {
    window.open('/loans/print-penalty-ledger', '_blank', 'width=1000,height=800,scrollbars=yes');
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-red-200 shadow-xs overflow-hidden text-left font-sans">
      
      {/* Header Banner */}
      <div className="p-4 bg-red-50 border-b border-red-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-red-100 text-red-800 rounded-xl">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h3 className="font-extrabold text-red-950 text-sm uppercase tracking-wider">
              Grace-Expired Loan Penalty Ledger ({gracePassedDefaulters.length})
            </h3>
            <p className="text-xs text-red-800">
              Active borrowers with overdue EMI backlogs and accrued penalty fines
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handlePrintPenaltyLedger}
          className="px-3 py-1.5 bg-red-900 hover:bg-red-800 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
        >
          <Printer size={14} /> Print Penalty Ledger
        </button>
      </div>

      {/* Ledger Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-red-100/50 text-red-950 uppercase font-bold text-[10px]">
            <tr>
              <th className="p-3">Borrower & Loan Reference</th>
              <th className="p-3">Loan Age</th>
              <th className="p-3 text-center">Overdue Backlog</th>
              <th className="p-3 text-right">Accrued Interest</th>
              <th className="p-3 text-right">Accrued Late Fine</th>
              <th className="p-3 text-right font-black">Total Due Now</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-red-100">
            {paginatedDefaulters.map((item) => {
              const calc = item.calculation;

              return (
                <tr key={item.id} className="hover:bg-red-50/40 transition-colors">
                  
                  {/* Borrower Details */}
                  <td className="p-3 font-medium text-slate-900">
                    <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                      {item.borrower.full_name}
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                        item.borrower.user_type === 'NON_MEMBER' ? 'bg-purple-100 text-purple-900' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {item.borrower.user_type === 'NON_MEMBER' ? 'EXTERNAL' : 'INTERNAL'}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      Code: <strong className="text-slate-800">{item.loan_code || `LN-${item.id}`}</strong> • Acc: {item.borrower.account_id || 'N/A'}
                    </div>
                    {item.borrower.phone && item.borrower.phone !== 'N/A' && (
                      <a href={`tel:${item.borrower.phone}`} className="inline-flex items-center gap-1 text-[10px] text-blue-800 font-bold hover:underline mt-0.5">
                        <PhoneCall size={10} /> Call {item.borrower.phone}
                      </a>
                    )}
                    {item.guarantor && (
                      <div className="text-[10px] font-mono text-purple-900">
                        Guarantor: <strong>{item.guarantor.full_name}</strong> ({item.guarantor.account_id})
                      </div>
                    )}
                  </td>

                  {/* Loan Age Column (Disbursement Lifespan) */}
                  <td className="p-3 font-mono">
                    <div className="flex items-center gap-1 font-bold text-slate-800">
                      <Clock size={12} className="text-slate-400" />
                      <span>{item.loanAgeDays} Days Old</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Disbursed: <strong>{item.issue_date}</strong>
                    </div>
                  </td>

                  {/* Overdue Backlog Column (Unpaid EMI Count) */}
                  <td className="p-3 text-center">
                    <span className="px-2.5 py-1 bg-red-100 text-red-900 border border-red-300 font-extrabold rounded-lg text-xs inline-flex items-center gap-1 font-mono shadow-2xs">
                      <AlertTriangle size={12} className="text-red-700" />
                      {calc.unpaidMonthsCount} Month{calc.unpaidMonthsCount > 1 ? 's' : ''} Unpaid
                    </span>
                  </td>

                  {/* Accrued Interest */}
                  <td className="p-3 text-right font-mono font-bold text-purple-900">
                    + NPR {calc.accruedInterestTotal.toLocaleString('en-IN')}
                  </td>

                  {/* Accrued Late Fine */}
                  <td className="p-3 text-right font-mono font-bold text-red-900">
                    + NPR {calc.accruedFineTotal.toLocaleString('en-IN')}
                  </td>

                  {/* Total Cash Due Now */}
                  <td className="p-3 text-right font-mono font-black text-red-950 text-sm">
                    NPR {calc.totalCashDueNow.toLocaleString('en-IN')}
                  </td>

                </tr>
              );
            })}

            {gracePassedDefaulters.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-emerald-800 font-bold bg-emerald-50/50 text-xs">
                  <div className="flex items-center justify-center gap-2">
                    <CalendarCheck size={18} className="text-emerald-600" />
                    <span>No loan defaulters! All active borrowers are compliant.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="p-3 bg-red-50/80 border-t border-red-200 flex justify-between items-center text-xs font-bold font-mono">
          <span className="text-red-900">
            Page {currentPage} of {totalPages} ({gracePassedDefaulters.length} Grace-Expired Records)
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 bg-white border border-red-300 text-red-950 disabled:opacity-40 rounded-lg flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft size={13} /> Prev
            </button>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 bg-white border border-red-300 text-red-950 disabled:opacity-40 rounded-lg flex items-center gap-1 cursor-pointer"
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}