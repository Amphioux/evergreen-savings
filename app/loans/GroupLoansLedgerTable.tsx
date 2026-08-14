'use client';

import { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Printer, 
  FileSpreadsheet, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  ShieldAlert, 
  CheckCircle2, 
  TrendingUp, 
  Award, 
  Sparkles,
  Briefcase,
  PhoneCall
} from 'lucide-react';

interface GroupLoansLedgerTableProps {
  loanList: any[];
  paymentList: any[];
  profiles: any[];
  fineRules?: any[];
}

export default function GroupLoansLedgerTable({
  loanList = [],
  paymentList = [],
  profiles = [],
  fineRules = []
}: GroupLoansLedgerTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState<'ALL' | 'MEMBER' | 'NON_MEMBER'>('ALL');
  const [borrowerStatusFilter, setBorrowerStatusFilter] = useState<'ALL' | 'ACTIVE_BORROWERS' | 'PAID_OFF_BORROWERS'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Lifetime borrower-level aggregation engine
  const borrowerLedger = useMemo(() => {
    // Map of borrower ID -> borrower loans
    const loansByBorrower: Record<string, any[]> = {};
    loanList.forEach((loan) => {
      const bId = String(loan.borrower_id);
      if (!loansByBorrower[bId]) loansByBorrower[bId] = [];
      loansByBorrower[bId].push(loan);
    });

    // Map of loan ID -> loan payments
    const paymentsByLoan: Record<string, any[]> = {};
    paymentList.forEach((p) => {
      const lId = String(p.loan_id);
      if (!paymentsByLoan[lId]) paymentsByLoan[lId] = [];
      paymentsByLoan[lId].push(p);
    });

    // Aggregate lifetime stats per profile that has at least 1 loan
    const aggregated = Object.keys(loansByBorrower).map((bId) => {
      const borrowerProfile = profiles.find((p) => String(p.id) === bId) || {
        full_name: 'Unknown Borrower',
        account_id: 'N/A',
        user_type: 'MEMBER',
        phone: 'N/A',
      };

      const borrowerLoans = loansByBorrower[bId] || [];
      const totalLoansTaken = borrowerLoans.length;

      let totalPrincipalDisbursed = 0;
      let totalPrincipalRepaid = 0;
      let totalInterestPaid = 0;
      let totalFinePaid = 0;
      let totalFineRelief = 0;
      let totalInterestRelief = 0;
      let activeLoansCount = 0;

      borrowerLoans.forEach((loan) => {
        const principal = Number(loan.principal_amount || 0);
        totalPrincipalDisbursed += principal;

        if (loan.status === 'ACTIVE') {
          activeLoansCount++;
        }

        const lPayments = paymentsByLoan[String(loan.id)] || [];
        lPayments.forEach((p) => {
            totalPrincipalRepaid += Number(p.principal_paid || 0);
            totalInterestPaid += Number(p.interest_paid || 0);
            totalFinePaid += Number(p.fine_paid || p.penalty_paid || 0);

            // Extract Fine Relief (check DB numeric column first, fallback to note string matching for old records)
            let fRelief = Number(p.fine_discount_amount || 0);
            let iRelief = Number(p.interest_waived || 0);

            const note = String(p.payment_note || '');
            if (fRelief === 0 && note.includes('Fine Relief: NPR ')) {
                const match = note.match(/Fine Relief: NPR (\d+)/);
                if (match) fRelief = Number(match[1]);
            }
            if (iRelief === 0 && note.includes('Interest Relief: NPR ')) {
                const match = note.match(/Interest Relief: NPR (\d+)/);
                if (match) iRelief = Number(match[1]);
            }

            totalFineRelief += fRelief;
            totalInterestRelief += iRelief;
        });
      });

      const currentOutstandingPrincipal = Math.max(0, totalPrincipalDisbursed - totalPrincipalRepaid);
      const totalReliefGranted = totalFineRelief + totalInterestRelief;

      // Lifetime Recovery / Repayment Rate %
      const repaymentRate = totalPrincipalDisbursed > 0 
        ? Math.min(100, Math.round((totalPrincipalRepaid / totalPrincipalDisbursed) * 100)) 
        : 100;

      return {
        borrower_id: bId,
        borrower: borrowerProfile,
        totalLoansTaken,
        activeLoansCount,
        totalPrincipalDisbursed,
        totalPrincipalRepaid,
        currentOutstandingPrincipal,
        totalInterestPaid,
        totalFinePaid,
        totalFineRelief,
        totalInterestRelief,
        totalReliefGranted,
        totalGrossPaid: totalPrincipalRepaid + totalInterestPaid + totalFinePaid,
        repaymentRate,
        isFullyCleared: currentOutstandingPrincipal <= 0,
      };
    });

    return aggregated.sort((a, b) => b.totalPrincipalDisbursed - a.totalPrincipalDisbursed);
  }, [loanList, paymentList, profiles]);

  // Search & Filter Handler
  const filteredLedger = useMemo(() => {
    return borrowerLedger.filter((item) => {
      // User Type Filter
      if (userTypeFilter !== 'ALL' && item.borrower.user_type !== userTypeFilter) {
        return false;
      }

      // Borrower Status Filter
      if (borrowerStatusFilter === 'ACTIVE_BORROWERS' && item.currentOutstandingPrincipal <= 0) {
        return false;
      }
      if (borrowerStatusFilter === 'PAID_OFF_BORROWERS' && item.currentOutstandingPrincipal > 0) {
        return false;
      }

      // Search Query
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      const nameMatch = item.borrower.full_name?.toLowerCase().includes(q);
      const accountMatch = item.borrower.account_id?.toLowerCase().includes(q);
      const phoneMatch = item.borrower.phone?.toLowerCase().includes(q);

      return nameMatch || accountMatch || phoneMatch;
    });
  }, [borrowerLedger, searchQuery, userTypeFilter, borrowerStatusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredLedger.length / itemsPerPage) || 1;
  const paginatedLedger = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLedger.slice(start, start + itemsPerPage);
  }, [filteredLedger, currentPage, itemsPerPage]);

  // High-Level Portfolio KPI Totals
  const portfolioLifetimeDisbursed = filteredLedger.reduce((sum, i) => sum + i.totalPrincipalDisbursed, 0);
  const portfolioLifetimePrincipalPaid = filteredLedger.reduce((sum, i) => sum + i.totalPrincipalRepaid, 0);
  const portfolioCurrentOutstanding = filteredLedger.reduce((sum, i) => sum + i.currentOutstandingPrincipal, 0);
  const portfolioTotalInterestCollected = filteredLedger.reduce((sum, i) => sum + i.totalInterestPaid, 0);
  const portfolioTotalFineCollected = filteredLedger.reduce((sum, i) => sum + i.totalFinePaid, 0);
  const portfolioTotalReliefGranted = filteredLedger.reduce((sum, i) => sum + i.totalReliefGranted, 0);

  const overallRecoveryRate = portfolioLifetimeDisbursed > 0 
    ? Math.round((portfolioLifetimePrincipalPaid / portfolioLifetimeDisbursed) * 100) 
    : 100;

  // Export CSV Handler
  function handleExportCSV() {
    const headers = [
      'Borrower Name',
      'Account ID',
      'User Type',
      'Phone',
      'Total Loans Taken',
      'Active Loans',
      'Lifetime Disbursed (NPR)',
      'Lifetime Principal Repaid (NPR)',
      'Current Outstanding (NPR)',
      'Lifetime Interest Paid (NPR)',
      'Lifetime Fine Paid (NPR)',
      'Total Waivers Granted (NPR)',
      'Repayment Rate (%)'
    ];

    const rows = filteredLedger.map((i) => [
      `"${i.borrower.full_name}"`,
      i.borrower.account_id || 'N/A',
      i.borrower.user_type === 'NON_MEMBER' ? 'EXTERNAL' : 'MEMBER',
      i.borrower.phone || 'N/A',
      i.totalLoansTaken,
      i.activeLoansCount,
      i.totalPrincipalDisbursed,
      i.totalPrincipalRepaid,
      i.currentOutstandingPrincipal,
      i.totalInterestPaid,
      i.totalFinePaid,
      i.totalReliefGranted,
      `${i.repaymentRate}%`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `group_loans_lifetime_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Open Pop-up Print Report Window
  function handleOpenPrintWindow() {
    const windowHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Lifetime Group Loans Analysis Report</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #0f172a; }
            h2 { margin-bottom: 4px; text-transform: uppercase; color: #1e3a8a; }
            p.sub { font-size: 12px; color: #64748b; margin-top: 0; margin-bottom: 20px; }
            .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
            .kpi-card { border: 1px solid #cbd5e1; padding: 10px; border-radius: 8px; background: #f8fafc; }
            .kpi-card span { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; display: block; }
            .kpi-card strong { font-size: 14px; color: #0f172a; font-family: monospace; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
            th { background: #1e3a8a; color: white; text-align: left; padding: 8px; text-transform: uppercase; font-size: 10px; }
            td { padding: 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace; }
            .text-right { text-align: right; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; }
            .bg-active { background: #fef3c7; color: #92400e; }
            .bg-cleared { background: #d1fae5; color: #065f46; }
            .footer { margin-top: 30px; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 10px; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <h2>Lifetime Group Loans Analysis Report</h2>
              <p class="sub">Generated on ${new Date().toLocaleDateString('en-US', { dateStyle: 'full' })} | Cooperative Treasury Audit</p>
            </div>
            <button onclick="window.print()" style="padding: 8px 16px; background: #1e3a8a; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
              🖨️ Print / Save PDF
            </button>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card">
              <span>Lifetime Disbursed</span>
              <strong>NPR ${portfolioLifetimeDisbursed.toLocaleString('en-IN')}</strong>
            </div>
            <div class="kpi-card">
              <span>Principal Recovered</span>
              <strong>NPR ${portfolioLifetimePrincipalPaid.toLocaleString('en-IN')}</strong>
            </div>
            <div class="kpi-card">
              <span>Active Outstanding</span>
              <strong>NPR ${portfolioCurrentOutstanding.toLocaleString('en-IN')}</strong>
            </div>
            <div class="kpi-card">
              <span>Recovery Rate</span>
              <strong>${overallRecoveryRate}%</strong>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Borrower Name & Account</th>
                <th>Type</th>
                <th class="text-right">Total Disbursed</th>
                <th class="text-right">Principal Repaid</th>
                <th class="text-right">Outstanding</th>
                <th class="text-right">Interest Paid</th>
                <th class="text-right">Fine Paid</th>
                <th class="text-right">Waivers</th>
                <th class="text-right">Rate</th>
              </tr>
            </thead>
            <tbody>
              ${filteredLedger.map((i) => `
                <tr>
                  <td>
                    <strong>${i.borrower.full_name}</strong><br/>
                    <small style="color:#64748b;">ID: ${i.borrower.account_id || 'N/A'}</small>
                  </td>
                  <td>${i.borrower.user_type === 'NON_MEMBER' ? 'External' : 'Member'}</td>
                  <td class="text-right">NPR ${i.totalPrincipalDisbursed.toLocaleString('en-IN')}</td>
                  <td class="text-right">NPR ${i.totalPrincipalRepaid.toLocaleString('en-IN')}</td>
                  <td class="text-right" style="font-weight:bold; color: ${i.currentOutstandingPrincipal > 0 ? '#991b1b' : '#065f46'};">
                    NPR ${i.currentOutstandingPrincipal.toLocaleString('en-IN')}
                  </td>
                  <td class="text-right">NPR ${i.totalInterestPaid.toLocaleString('en-IN')}</td>
                  <td class="text-right">NPR ${i.totalFinePaid.toLocaleString('en-IN')}</td>
                  <td class="text-right" style="color:#92400e;">- NPR ${i.totalReliefGranted.toLocaleString('en-IN')}</td>
                  <td class="text-right"><strong>${i.repaymentRate}%</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <span>Cooperative Lifetime Portfolio Audit System</span>
            <span>Total Borrowers Analyzed: ${filteredLedger.length}</span>
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
      
      {/* KPI SUMMARY STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
        <div className="p-3.5 bg-blue-950 text-white rounded-2xl border border-blue-900 shadow-xs">
          <span className="text-[10px] text-blue-300 font-sans font-extrabold uppercase block">Lifetime Portfolio Disbursed</span>
          <strong className="text-lg font-black text-blue-200">NPR {portfolioLifetimeDisbursed.toLocaleString('en-IN')}</strong>
          <span className="text-[9px] text-blue-300 block font-sans mt-0.5">{filteredLedger.length} Unique Borrowers Analyzed</span>
        </div>

        <div className="p-3.5 bg-emerald-950 text-white rounded-2xl border border-emerald-900 shadow-xs">
          <span className="text-[10px] text-emerald-300 font-sans font-extrabold uppercase block">Lifetime Principal Repaid</span>
          <strong className="text-lg font-black text-emerald-300">NPR {portfolioLifetimePrincipalPaid.toLocaleString('en-IN')}</strong>
          <span className="text-[9px] text-emerald-400 block font-sans mt-0.5">Overall Portfolio Recovery: {overallRecoveryRate}%</span>
        </div>

        <div className="p-3.5 bg-amber-950 text-white rounded-2xl border border-amber-900 shadow-xs">
          <span className="text-[10px] text-amber-300 font-sans font-extrabold uppercase block">Active Outstanding Principal</span>
          <strong className="text-lg font-black text-amber-300">NPR {portfolioCurrentOutstanding.toLocaleString('en-IN')}</strong>
          <span className="text-[9px] text-amber-400 block font-sans mt-0.5">
            {filteredLedger.filter(i => i.currentOutstandingPrincipal > 0).length} Borrowers with Active Dues
          </span>
        </div>

        <div className="p-3.5 bg-purple-950 text-white rounded-2xl border border-purple-900 shadow-xs">
          <span className="text-[10px] text-purple-300 font-sans font-extrabold uppercase block">Interest & Fines Recovered</span>
          <strong className="text-lg font-black text-purple-200">NPR {(portfolioTotalInterestCollected + portfolioTotalFineCollected).toLocaleString('en-IN')}</strong>
          <span className="text-[9px] text-purple-300 block font-sans mt-0.5">Relief Granted: NPR {portfolioTotalReliefGranted.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* FILTER & CONTROL BAR */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 text-xs">
        
        {/* Search Bar */}
        <div className="relative w-full xl:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Borrower Name, Account ID, Phone..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-800"
          />
        </div>

        {/* Filter Pills & Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          
          {/* User Type Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 font-bold">
            <Filter size={13} className="text-slate-500 ml-1" />
            <button
              type="button"
              onClick={() => { setUserTypeFilter('ALL'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                userTypeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Types
            </button>
            <button
              type="button"
              onClick={() => { setUserTypeFilter('MEMBER'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                userTypeFilter === 'MEMBER' ? 'bg-blue-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Members
            </button>
            <button
              type="button"
              onClick={() => { setUserTypeFilter('NON_MEMBER'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                userTypeFilter === 'NON_MEMBER' ? 'bg-purple-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              External
            </button>
          </div>

          {/* Active Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 font-bold">
            <button
              type="button"
              onClick={() => { setBorrowerStatusFilter('ALL'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                borrowerStatusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Borrowers
            </button>
            <button
              type="button"
              onClick={() => { setBorrowerStatusFilter('ACTIVE_BORROWERS'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                borrowerStatusFilter === 'ACTIVE_BORROWERS' ? 'bg-amber-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active Dues
            </button>
            <button
              type="button"
              onClick={() => { setBorrowerStatusFilter('PAID_OFF_BORROWERS'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                borrowerStatusFilter === 'PAID_OFF_BORROWERS' ? 'bg-emerald-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Paid Off
            </button>
          </div>

          {/* Actions */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <FileSpreadsheet size={14} /> Export CSV
          </button>

          <button
            type="button"
            onClick={handleOpenPrintWindow}
            className="px-3 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Printer size={14} /> Print Report
          </button>

        </div>

      </div>

      {/* GROUP LOANS LIFETIME ANALYSIS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-900 text-white uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">Borrower Profile & ID</th>
                <th className="p-3.5 text-center">Loans Count</th>
                <th className="p-3.5 text-right">Lifetime Disbursed</th>
                <th className="p-3.5 text-right">Principal Repaid</th>
                <th className="p-3.5 text-right">Current Outstanding</th>
                <th className="p-3.5 text-right">Interest Paid</th>
                <th className="p-3.5 text-right">Fine Recovered</th>
                <th className="p-3.5 text-right">Total Relief</th>
                <th className="p-3.5 text-center">Recovery Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {paginatedLedger.map((item) => {
                return (
                  <tr key={item.borrower_id} className="hover:bg-blue-50/40 transition-colors">
                    
                    {/* Borrower Profile */}
                    <td className="p-3.5 font-sans">
                      <div className="font-extrabold text-slate-900 flex items-center gap-1.5 text-xs">
                        <span>{item.borrower.full_name}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                          item.borrower.user_type === 'NON_MEMBER' ? 'bg-purple-100 text-purple-900' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {item.borrower.user_type === 'NON_MEMBER' ? 'EXTERNAL' : 'MEMBER'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Account ID: <strong>{item.borrower.account_id || 'N/A'}</strong>
                        {item.borrower.phone && item.borrower.phone !== 'N/A' && (
                          <span className="ml-2 inline-flex items-center gap-0.5 text-blue-800 font-bold">
                            <PhoneCall size={9} /> {item.borrower.phone}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Loans Count */}
                    <td className="p-3.5 text-center font-sans">
                      <span className="font-bold text-slate-800 font-mono">{item.totalLoansTaken} Taken</span>
                      {item.activeLoansCount > 0 ? (
                        <span className="block text-[10px] text-amber-800 font-extrabold font-mono">
                          ({item.activeLoansCount} Active)
                        </span>
                      ) : (
                        <span className="block text-[10px] text-emerald-700 font-bold font-mono">
                          (All Cleared)
                        </span>
                      )}
                    </td>

                    {/* Lifetime Disbursed */}
                    <td className="p-3.5 text-right font-black text-slate-900">
                      NPR {item.totalPrincipalDisbursed.toLocaleString('en-IN')}
                    </td>

                    {/* Principal Repaid */}
                    <td className="p-3.5 text-right font-black text-emerald-800">
                      NPR {item.totalPrincipalRepaid.toLocaleString('en-IN')}
                    </td>

                    {/* Current Outstanding */}
                    <td className="p-3.5 text-right">
                      {item.currentOutstandingPrincipal > 0 ? (
                        <strong className="font-black text-red-900 text-sm">
                          NPR {item.currentOutstandingPrincipal.toLocaleString('en-IN')}
                        </strong>
                      ) : (
                        <span className="text-emerald-700 font-extrabold text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          CLEARED 0.00
                        </span>
                      )}
                    </td>

                    {/* Interest Paid */}
                    <td className="p-3.5 text-right font-extrabold text-purple-900">
                      NPR {item.totalInterestPaid.toLocaleString('en-IN')}
                    </td>

                    {/* Fine Paid */}
                    <td className="p-3.5 text-right font-extrabold text-amber-900">
                      NPR {item.totalFinePaid.toLocaleString('en-IN')}
                    </td>

                    {/* Total Relief Granted */}
                    <td className="p-3.5 text-right font-bold text-amber-800 font-sans text-[11px]">
                      {item.totalReliefGranted > 0 ? (
                        <span className="text-amber-900 font-mono font-bold">
                          - NPR {item.totalReliefGranted.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono">NPR 0</span>
                      )}
                    </td>

                    {/* Recovery Rate */}
                    <td className="p-3.5 text-center font-sans">
                      <div className="flex flex-col items-center">
                        <strong className={`font-mono text-xs ${
                          item.repaymentRate >= 90 ? 'text-emerald-800' : item.repaymentRate >= 50 ? 'text-amber-800' : 'text-red-800'
                        }`}>
                          {item.repaymentRate}%
                        </strong>
                        <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                          <div 
                            className={`h-full ${item.repaymentRate >= 90 ? 'bg-emerald-600' : item.repaymentRate >= 50 ? 'bg-amber-500' : 'bg-red-600'}`}
                            style={{ width: `${item.repaymentRate}%` }}
                          />
                        </div>
                      </div>
                    </td>

                  </tr>
                );
              })}

              {filteredLedger.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500 font-sans text-xs">
                    <ShieldAlert size={28} className="mx-auto text-blue-700/60 mb-1" />
                    <p className="font-bold">No Borrower Lifetime Loan Records Found</p>
                    <p className="text-[10px] text-slate-400">Try adjusting your search criteria or filter options.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION BAR */}
        {totalPages > 1 && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs font-bold font-mono">
            <span className="text-slate-700">
              Page {currentPage} of {totalPages} ({filteredLedger.length} Unique Borrowers)
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 bg-white border border-slate-300 text-slate-800 disabled:opacity-40 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft size={13} /> Prev
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 bg-white border border-slate-300 text-slate-800 disabled:opacity-40 rounded-lg flex items-center gap-1 cursor-pointer"
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