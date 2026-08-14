'use client';

import { useState, useMemo } from 'react';
import DeleteFinePaymentModal from './DeleteFinePaymentModal';
import RepaymentReceiptModal from './RepaymentReceiptModal';
import { 
  ShieldAlert, 
  Search, 
  Printer, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  FileSpreadsheet,
  Banknote,
  Percent,
  Sparkles,
  Receipt
} from 'lucide-react';

interface FineRepaymentsLedgerTableProps {
  paymentList: any[];
  loanList?: any[];
  activeLoans: any[];
  profiles: any[];
  isSuperAdmin?: boolean;
}

export default function FineRepaymentsLedgerTable({
  paymentList = [],
  loanList = [],
  activeLoans = [],
  profiles = [],
  isSuperAdmin = true
}: FineRepaymentsLedgerTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Track active deleting modal payments to prevent unmounting during server revalidation
  const [activeDeletingPayments, setActiveDeletingPayments] = useState<Record<string, any>>({});
  const itemsPerPage = 8;

  // Combine full loan list to ensure paid-off or completed loans are available
  const allLoans = useMemo(() => {
    return loanList.length > 0 ? loanList : activeLoans;
  }, [loanList, activeLoans]);

  // Combine paymentList with retained payments whose confirmation modals are active
  const effectivePaymentList = useMemo(() => {
    const map = new Map();
    paymentList.forEach((p) => map.set(String(p.id), p));
    Object.values(activeDeletingPayments).forEach((p) => {
      if (!map.has(String(p.id))) {
        map.set(String(p.id), p);
      }
    });
    return Array.from(map.values());
  }, [paymentList, activeDeletingPayments]);

  // Pre-calculate exact historical running balance per payment ID
  const historicalBalanceMap = useMemo(() => {
    const paymentsByLoan: Record<string, any[]> = {};
    effectivePaymentList.forEach((p) => {
      const lId = String(p.loan_id);
      if (!paymentsByLoan[lId]) paymentsByLoan[lId] = [];
      paymentsByLoan[lId].push(p);
    });

    const map: Record<string, number> = {};

    Object.keys(paymentsByLoan).forEach((loanId) => {
      const loan = allLoans.find((l) => String(l.id) === loanId) || {};
      const initialPrincipal = Number(loan.principal_amount || 0);

      const sortedPayments = [...paymentsByLoan[loanId]].sort((a, b) => {
        const dateDiff = new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return Number(a.id || 0) - Number(b.id || 0);
      });

      let runningBalance = initialPrincipal;
      sortedPayments.forEach((p) => {
        const pPaid = Number(p.principal_paid || 0);
        runningBalance = Math.max(0, runningBalance - pPaid);
        map[String(p.id)] = runningBalance;
      });
    });

    return map;
  }, [effectivePaymentList, allLoans]);

  // Filter fine payments and attach accurate historical balances
  const finePayments = useMemo(() => {
    return effectivePaymentList
      .map((payment) => {
        const loan = allLoans.find((l) => String(l.id) === String(payment.loan_id)) || {};
        const borrower = profiles.find((p) => String(p.id) === String(loan.borrower_id || payment.borrower_id)) || loan.borrower || {
          full_name: payment.borrower_name || 'Borrower',
          account_id: payment.borrower_account_id || 'N/A',
        };

        const editorProfile = profiles.find(
          (p) => String(p.id) === String(payment.recorded_by_id) || p.full_name === payment.recorded_by_name
        );

        const recorded_by_designation = 
          payment.recorded_by_designation || 
          editorProfile?.committee_position || 
          '';

        const note = String(payment.payment_note || '');
        
        let fineDiscountAmount = Number(payment.fine_discount_amount || 0);
        let interestWaived = Number(payment.interest_waived || 0);

        if (fineDiscountAmount === 0 && note.includes('Fine Relief: NPR ')) {
          const match = note.match(/Fine Relief: NPR (\d+)/);
          if (match) fineDiscountAmount = Number(match[1]);
        }
        if (interestWaived === 0 && note.includes('Interest Relief: NPR ')) {
          const match = note.match(/Interest Relief: NPR (\d+)/);
          if (match) interestWaived = Number(match[1]);
        }

        const finePaid = Number(payment.fine_paid || payment.penalty_paid || 0);
        const interestPaid = Number(payment.interest_paid || 0);
        const principalPaid = Number(payment.principal_paid || 0);
        const totalPaid = Number(payment.total_paid) > 0 ? Number(payment.total_paid) : (finePaid + interestPaid + principalPaid);

        const isFineVoucher = finePaid > 0 || fineDiscountAmount > 0 || interestWaived > 0 || Boolean(payment.fine_waived) || note.includes('[TELLER SETTLEMENT') || note.includes('[BANKING WATERFALL');

        const computed_remaining_balance = historicalBalanceMap[String(payment.id)];

        return {
          ...payment,
          loan,
          borrower,
          isFineVoucher,
          finePaid,
          interestPaid,
          principalPaid,
          totalPaid,
          fineWaived: fineDiscountAmount,
          interestWaived,
          waiver_reason: payment.waiver_reason || '',
          borrower_name: borrower?.full_name || payment.borrower_name || 'Borrower',
          borrower_account_id: borrower?.account_id || payment.borrower_account_id || 'N/A',
          loan_code: loan?.loan_code || `LN-${payment.loan_id}`,
          recorded_by_designation,
          computed_remaining_balance,
        };
      })
      .filter((p) => p.isFineVoucher)
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
  }, [effectivePaymentList, allLoans, profiles, historicalBalanceMap]);

  // Search & Date Range Filters
  const filteredPayments = useMemo(() => {
    return finePayments.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        p.payment_code?.toLowerCase().includes(q) ||
        p.borrower_name?.toLowerCase().includes(q) ||
        p.borrower_account_id?.toLowerCase().includes(q) ||
        p.loan_code?.toLowerCase().includes(q)
      );

      const pDate = new Date(p.payment_date);
      const matchesStart = !startDate || pDate >= new Date(startDate);
      const matchesEnd = !endDate || pDate <= new Date(endDate);

      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [finePayments, searchQuery, startDate, endDate]);

  // Pagination
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage) || 1;
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPayments.slice(start, start + itemsPerPage);
  }, [filteredPayments, currentPage, itemsPerPage]);

  // Summary Stat Totals
  const totalFineCollected = filteredPayments.reduce((s, p) => s + p.finePaid, 0);
  const totalInterestCollected = filteredPayments.reduce((s, p) => s + p.interestPaid, 0);
  const totalPrincipalCollected = filteredPayments.reduce((s, p) => s + p.principalPaid, 0);
  const totalReliefGranted = filteredPayments.reduce((s, p) => s + p.fineWaived + p.interestWaived, 0);
  const totalGrossCash = filteredPayments.reduce((s, p) => s + p.totalPaid, 0);

  const avgReliefPerVoucher = filteredPayments.length > 0 
    ? Math.round(totalReliefGranted / filteredPayments.length) 
    : 0;

  const reliefRatio = totalGrossCash > 0 
    ? ((totalReliefGranted / (totalGrossCash + totalReliefGranted)) * 100).toFixed(1) 
    : '0.0';

  // CSV Export Handler
  function handleExportCSV() {
    const headers = ['Voucher Code', 'Date', 'Borrower Name', 'Account ID', 'Loan Code', 'Fine Paid (NPR)', 'Interest Paid (NPR)', 'Principal Paid (NPR)', 'Relief Granted (NPR)', 'Total Paid (NPR)', 'Waiver Reason'];
    const rows = filteredPayments.map((p) => [
      p.payment_code || `PY-${p.id}`,
      p.payment_date,
      `"${p.borrower_name || 'Borrower'}"`,
      p.borrower_account_id || 'N/A',
      p.loan_code || `LN-${p.loan_id}`,
      p.finePaid,
      p.interestPaid,
      p.principalPaid,
      p.fineWaived + p.interestWaived,
      p.totalPaid,
      `"${p.waiver_reason || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `fine_repayments_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Open Pop-up Print Window for Full Fine Ledger Report
  function handleOpenFullLedgerPrintWindow() {
    const windowHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fine & Penalty Settlement Audit Ledger</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #0f172a; }
            h2 { margin-bottom: 4px; text-transform: uppercase; color: #7f1d1d; }
            p.sub { font-size: 12px; color: #64748b; margin-top: 0; margin-bottom: 20px; }
            .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
            .kpi-card { border: 1px solid #fecdd3; padding: 10px; border-radius: 8px; background: #fff1f2; }
            .kpi-card span { font-size: 10px; text-transform: uppercase; color: #9f1239; font-weight: bold; display: block; }
            .kpi-card strong { font-size: 14px; color: #881337; font-family: monospace; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
            th { background: #7f1d1d; color: white; text-align: left; padding: 8px; text-transform: uppercase; font-size: 10px; }
            td { padding: 8px; border-bottom: 1px solid #fecdd3; font-family: monospace; }
            .text-right { text-align: right; }
            .footer { margin-top: 30px; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 10px; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <h2>Fine & Penalty Settlement Audit Ledger</h2>
              <p class="sub">Generated on ${new Date().toLocaleDateString('en-US', { dateStyle: 'full' })} | Treasury Audit Log</p>
            </div>
            <button onclick="window.print()" style="padding: 8px 16px; background: #7f1d1d; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
              🖨️ Print / Save PDF
            </button>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card">
              <span>Late Fines Recovered</span>
              <strong>NPR ${totalFineCollected.toLocaleString('en-IN')}</strong>
            </div>
            <div class="kpi-card">
              <span>Interest Recovered</span>
              <strong>NPR ${totalInterestCollected.toLocaleString('en-IN')}</strong>
            </div>
            <div class="kpi-card">
              <span>Total Relief Granted</span>
              <strong>NPR ${totalReliefGranted.toLocaleString('en-IN')}</strong>
            </div>
            <div class="kpi-card">
              <span>Gross Cash Recovered</span>
              <strong>NPR ${totalGrossCash.toLocaleString('en-IN')}</strong>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Voucher Code & Date</th>
                <th>Borrower & Loan ID</th>
                <th class="text-right">Fine Paid</th>
                <th class="text-right">Interest Paid</th>
                <th class="text-right">Relief Granted</th>
                <th class="text-right">Total Cash</th>
                <th>Waiver Justification</th>
              </tr>
            </thead>
            <tbody>
              ${filteredPayments.map((p) => {
                const relief = p.fineWaived + p.interestWaived;
                return `
                  <tr>
                    <td>
                      <strong>${p.payment_code || `PY-${p.id}`}</strong><br/>
                      <small style="color:#64748b;">${p.payment_date}</small>
                    </td>
                    <td>
                      <strong>${p.borrower_name}</strong><br/>
                      <small style="color:#64748b;">Loan Code: ${p.loan_code}</small><br/>
                      <small style="color:#64748b;">Account ID: ${p.borrower_account_id}</small>
                    </td>
                    <td class="text-right">NPR ${p.finePaid.toLocaleString('en-IN')}</td>
                    <td class="text-right">NPR ${p.interestPaid.toLocaleString('en-IN')}</td>
                    <td class="text-right" style="color:#b45309; font-weight:bold;">
                      ${relief > 0 ? `- NPR ${relief.toLocaleString('en-IN')}` : 'NPR 0'}
                    </td>
                    <td class="text-right" style="font-weight:bold;">NPR ${p.totalPaid.toLocaleString('en-IN')}</td>
                    <td style="font-family: sans-serif; font-size: 10px; color: #475569;">${p.waiver_reason || '-'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="footer">
            <span>Cooperative Fine & Penalty Audit Ledger</span>
            <span>Total Vouchers Analyzed: ${filteredPayments.length}</span>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=1050,height=850,scrollbars=yes');
    if (printWindow) {
      printWindow.document.write(windowHtml);
      printWindow.document.close();
    }
  }

  return (
    <div className="space-y-5 text-left font-sans">
      
      {/* KPI STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
        
        {/* Card 1: Late Fines Recovered */}
        <div className="p-3.5 bg-red-950 text-white rounded-2xl border border-red-900 shadow-xs space-y-1">
          <span className="text-[10px] text-red-300 font-sans font-extrabold uppercase flex items-center justify-between">
            <span>Late Fines Recovered</span>
            <Receipt size={14} className="text-amber-400" />
          </span>
          <strong className="text-xl font-black text-amber-300 block">
            NPR {totalFineCollected.toLocaleString('en-IN')}
          </strong>
          <span className="text-[9px] text-red-300 font-sans block pt-0.5 border-t border-red-900/60">
            {filteredPayments.length} Settlement Vouchers Processed
          </span>
        </div>

        {/* Card 2: Interest & Principal Recovered */}
        <div className="p-3.5 bg-purple-950 text-white rounded-2xl border border-purple-900 shadow-xs space-y-1">
          <span className="text-[10px] text-purple-300 font-sans font-extrabold uppercase flex items-center justify-between">
            <span>Interest & Principal Rec.</span>
            <Banknote size={14} className="text-purple-300" />
          </span>
          <strong className="text-xl font-black text-purple-200 block">
            NPR {(totalInterestCollected + totalPrincipalCollected).toLocaleString('en-IN')}
          </strong>
          <span className="text-[9px] text-purple-300 font-sans block pt-0.5 border-t border-purple-900/60 font-mono">
            Int: NPR {totalInterestCollected.toLocaleString('en-IN')} | Prin: NPR {totalPrincipalCollected.toLocaleString('en-IN')}
          </span>
        </div>

        {/* Card 3: Executive Relief & Waivers */}
        <div className="p-3.5 bg-amber-950 text-white rounded-2xl border border-amber-900 shadow-xs space-y-1">
          <span className="text-[10px] text-amber-300 font-sans font-extrabold uppercase flex items-center justify-between">
            <span>Executive Relief / Waivers</span>
            <Sparkles size={14} className="text-amber-300" />
          </span>
          <strong className="text-xl font-black text-amber-300 block">
            NPR {totalReliefGranted.toLocaleString('en-IN')}
          </strong>
          <span className="text-[9px] text-amber-300 font-sans block pt-0.5 border-t border-amber-900/60">
            Avg Relief: NPR {avgReliefPerVoucher.toLocaleString('en-IN')} / Voucher
          </span>
        </div>

        {/* Card 4: Gross Cash Recovered */}
        <div className="p-3.5 bg-slate-950 text-white rounded-2xl border border-slate-900 shadow-xs space-y-1">
          <span className="text-[10px] text-slate-400 font-sans font-extrabold uppercase flex items-center justify-between">
            <span>Total Settlement Received</span>
            <Percent size={14} className="text-emerald-400" />
          </span>
          <strong className="text-xl font-black text-emerald-400 block">
            NPR {totalGrossCash.toLocaleString('en-IN')}
          </strong>
          <span className="text-[9px] text-slate-400 font-sans block pt-0.5 border-t border-slate-900/60">
            Relief Ratio: {reliefRatio}% of Total Claims
          </span>
        </div>

      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs">
        
        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Borrower, Code, Voucher..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-800"
          />
        </div>

        {/* Date Range, Export & Print Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl p-1 px-2">
            <Calendar size={13} className="text-slate-500" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-slate-800 font-mono text-xs focus:outline-none"
            />
            <span className="text-slate-400 text-[10px]">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-slate-800 font-mono text-xs focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <FileSpreadsheet size={14} /> Export CSV
          </button>

          {/* PRINT REPORT BUTTON */}
          <button
            type="button"
            onClick={handleOpenFullLedgerPrintWindow}
            className="px-3 py-2 bg-red-900 hover:bg-red-800 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Printer size={14} /> Print Report
          </button>
        </div>

      </div>

      {/* LEDGER TABLE */}
      <div className="bg-white rounded-2xl border-2 border-red-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-red-100/60 text-red-950 uppercase font-bold text-[10px]">
              <tr>
                <th className="p-3"># Voucher ID</th>
                <th className="p-3">Payment Date</th>
                <th className="p-3">Borrower & Loan Code</th>
                <th className="p-3 text-right">Fine Paid</th>
                <th className="p-3 text-right">Interest Paid</th>
                <th className="p-3 text-right">Relief Granted</th>
                <th className="p-3 text-right font-black min-w-[130px]">Total Cash</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-100 font-mono">
              {paginatedPayments.map((p) => {
                const voucherCode = p.payment_code || `PY-${p.id}`;
                const reliefTotal = p.fineWaived + p.interestWaived;

                return (
                  <tr key={p.id} className="hover:bg-red-50/40 transition-colors">
                    <td className="p-3 font-extrabold text-blue-900 whitespace-nowrap">
                      {voucherCode}
                    </td>

                    <td className="p-3 text-slate-700 font-medium whitespace-nowrap">
                      {p.payment_date}
                    </td>

                    <td className="p-3 font-sans">
                      <div className="font-bold text-slate-900">{p.borrower_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono space-y-0.5 mt-0.5">
                        <div>Loan Code: <strong className="text-slate-800 font-semibold">{p.loan_code}</strong></div>
                        <div>Account ID: <span className="text-slate-700">{p.borrower_account_id}</span></div>
                      </div>
                    </td>

                    <td className="p-3 text-right font-extrabold text-red-900 whitespace-nowrap">
                      {p.finePaid > 0 ? `NPR ${p.finePaid.toLocaleString('en-IN')}` : 'NPR 0'}
                    </td>

                    <td className="p-3 text-right font-extrabold text-purple-900 whitespace-nowrap">
                      {p.interestPaid > 0 ? `NPR ${p.interestPaid.toLocaleString('en-IN')}` : 'NPR 0'}
                    </td>

                    <td className="p-3 text-right font-bold text-amber-800 font-sans text-[11px] whitespace-nowrap">
                      {reliefTotal > 0 ? `- NPR ${reliefTotal.toLocaleString('en-IN')}` : 'NPR 0'}
                    </td>

                    <td className="p-3 text-right font-black text-slate-950 text-sm whitespace-nowrap min-w-[130px]">
                      NPR {p.totalPaid.toLocaleString('en-IN')}
                    </td>

                    <td className="p-3 text-right font-sans whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* 1. Print Receipt Slip */}
                        <RepaymentReceiptModal receipt={p} profiles={profiles} />

                        {/* 2. Void & Delete Voucher (Self-Contained Trigger & Modal) */}
                        {isSuperAdmin && (
                          <DeleteFinePaymentModal 
                            payment={p}
                            onDeleteStart={(payment) => {
                              setActiveDeletingPayments((prev) => ({ ...prev, [payment.id]: payment }));
                            }}
                            onDeleteComplete={(paymentId) => {
                              setActiveDeletingPayments((prev) => {
                                const copy = { ...prev };
                                delete copy[paymentId];
                                return copy;
                              });
                            }}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 font-sans text-xs">
                    <ShieldAlert size={28} className="mx-auto text-red-700/60 mb-1" />
                    <p className="font-bold">No Penalty Settlement Repayments Found</p>
                    <p className="text-[10px] text-slate-400">Try adjusting your search criteria or date filter.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION BAR */}
        {totalPages > 1 && (
          <div className="p-3 bg-red-50/80 border-t border-red-200 flex justify-between items-center text-xs font-bold font-mono">
            <span className="text-red-900">
              Page {currentPage} of {totalPages} ({filteredPayments.length} Fine Vouchers Logged)
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

    </div>
  );
}