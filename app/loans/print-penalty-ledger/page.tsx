import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import PrintControls from '../ledger-print/PrintControls';
import { calculateIndustryLoanDues } from '@/lib/loanUtils';
import { ShieldAlert } from 'lucide-react';

export const revalidate = 0;

function getKathmanduPrintTimestamp() {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kathmandu',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(new Date());
}

export default async function PrintPenaltyLedgerPage() {
  const cookieStore = await cookies();
  const supabaseServer = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/+$/, ''),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  const { data: { user } } = await supabaseServer.auth.getUser();
  if (!user) redirect('/login');

  const [
    { data: profiles },
    { data: loans },
    { data: payments },
    { data: fineRulesData }
  ] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, full_name, user_type, role, account_id, status, phone')
      .or('status.eq.ACTIVE,status.is.null'),
    supabaseAdmin
      .from('loans')
      .select(`
        *,
        borrower:profiles!borrower_id(full_name, account_id, user_type),
        guarantor:profiles!guarantor_id(full_name, account_id)
      `)
      .eq('status', 'ACTIVE')
      .order('issue_date', { ascending: false }),
    supabaseAdmin
      .from('loan_payments')
      .select('id, loan_id, principal_paid, interest_paid, payment_date'),
    supabaseAdmin
      .from('fine_rules')
      .select('*')
      .order('created_at', { ascending: false })
  ]);

  const profileList = profiles || [];
  const loanList = loans || [];
  const paymentList = payments || [];
  const fineRulesList = fineRulesData || [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const gracePassedDefaulters = loanList
    .map((loan) => {
      const bId = loan.borrower_id || loan.borrower?.id;
      const borrower = profileList.find((p) => String(p.id) === String(bId)) || loan.borrower || {
        full_name: loan.borrower_name || 'Unknown Borrower',
        account_id: loan.account_id || 'N/A',
        phone: 'N/A',
        user_type: 'MEMBER',
      };
      const gId = loan.guarantor_id || loan.guarantor?.id;
      const guarantor = profileList.find((p) => String(p.id) === String(gId)) || loan.guarantor;

      const loanPayments = paymentList.filter((p) => String(p.loan_id) === String(loan.id));
      const calculation = calculateIndustryLoanDues(loan, loanPayments, fineRulesList, today);

      const totalRepaid = loanPayments.reduce((sum, p) => sum + Number(p.principal_paid || 0), 0);
      const remainingBalance = Math.max(0, Number(loan.principal_amount || 0) - totalRepaid);

      if (remainingBalance <= 0) return null;

      if (calculation.unpaidMonthsCount === 0 && calculation.daysOverdue < 30) {
        return null;
      }

      return {
        ...loan,
        borrower,
        guarantor,
        remainingBalance,
        calculation,
      };
    })
    .filter((l): l is NonNullable<typeof l> => l !== null)
    .sort((a, b) => b.calculation.daysOverdue - a.calculation.daysOverdue);

  const grandTotalBaseDue = gracePassedDefaulters.reduce((sum, d) => sum + d.calculation.overdueEmiBase, 0);
  const grandTotalInterest = gracePassedDefaulters.reduce((sum, d) => sum + d.calculation.accruedInterestTotal, 0);
  const grandTotalAccruedFine = gracePassedDefaulters.reduce((sum, d) => sum + d.calculation.accruedFineTotal, 0);
  const grandTotalCashDue = grandTotalBaseDue + grandTotalInterest + grandTotalAccruedFine;

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 font-sans text-left print:bg-white print:p-0 print:min-h-0">
      
      <style type="text/css" media="print">
        {`
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          html, body {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body * {
            visibility: hidden !important;
          }
          .printable-card-zone, .printable-card-zone * {
            visibility: visible !important;
          }
          .printable-card-zone {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
          }
          tr, table, tfoot {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        `}
      </style>

      <PrintControls title="Grace-Expired Loan Penalty Ledger Statement" />

      <div className="printable-card-zone max-w-4xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-xl p-8 space-y-6 print:border-none print:shadow-none print:p-0">
        
        {/* Document Header */}
        <div className="text-center border-b border-slate-300 pb-4 mb-4">
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-wide">EVERGREEN SAVINGS GROUP</h1>
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            OFFICIAL GRACE-EXPIRED LOAN PENALTY & INTEREST AUDIT STATEMENT
          </p>
          <div className="inline-flex items-center gap-1 px-3 py-0.5 bg-red-100 text-red-900 font-sans text-[10px] font-bold rounded-full mt-2">
            <ShieldAlert size={12} /> Confidential Treasury Audit Record
          </div>
        </div>

        {/* Audit Totals Summary Cards */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-xs font-mono">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block font-sans">GRACE-EXPIRED BORROWERS</span>
            <strong className="text-slate-900 text-sm font-bold">{gracePassedDefaulters.length} Borrowers</strong>
            <span className="text-[11px] text-slate-500 block font-sans">OVERDUE EMI BASE: NPR {grandTotalBaseDue.toLocaleString('en-IN')}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block font-sans">TOTAL ACCRUED DUES (INC. INTEREST & FINES)</span>
            <strong className="text-red-950 text-base font-black">NPR {grandTotalCashDue.toLocaleString('en-IN')}</strong>
          </div>
        </div>

        {/* Ledger Printable Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="p-3 font-sans"># BORROWER & LOAN REFERENCE</th>
                <th className="p-3">DISBURSED DATE</th>
                <th className="p-3">OVERDUE TERM</th>
                <th className="p-3 text-right">ACCRUED INTEREST</th>
                <th className="p-3 text-right">ACCRUED FINE</th>
                <th className="p-3 text-right font-black">TOTAL PAYABLE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gracePassedDefaulters.map((item, index) => {
                const calc = item.calculation;

                return (
                  <tr key={item.id}>
                    <td className="p-3 font-sans">
                      <div className="font-bold text-slate-900">{index + 1}. {item.borrower?.full_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Code: {item.loan_code || `LN-${item.id}`} • Acc: {item.borrower?.account_id || 'N/A'}
                      </div>
                    </td>
                    <td className="p-3 text-slate-700">{item.issue_date || 'N/A'}</td>
                    <td className="p-3 text-slate-900 font-bold">
                      {calc.daysOverdue} Days ({calc.unpaidMonthsCount} mo unpaid)
                    </td>
                    <td className="p-3 text-right font-bold text-purple-900">
                      + NPR {calc.accruedInterestTotal.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-right font-bold text-red-800">
                      + NPR {calc.accruedFineTotal.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-right font-black text-slate-950">
                      NPR {calc.totalCashDueNow.toLocaleString('en-IN')}
                    </td>
                  </tr>
                );
              })}
              {gracePassedDefaulters.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500 font-sans text-xs font-semibold">
                    No active loan borrowers currently have grace-expired penalty charges accrued.
                  </td>
                </tr>
              )}
            </tbody>
            {gracePassedDefaulters.length > 0 && (
              <tfoot className="bg-slate-100 text-slate-900 border-t-2 border-slate-800 font-bold">
                <tr>
                  <td colSpan={3} className="p-3 font-sans uppercase text-xs font-black">
                    Grand Total ({gracePassedDefaulters.length} Borrowers)
                  </td>
                  <td className="p-3 text-right font-mono text-xs font-black text-purple-950">
                    + NPR {grandTotalInterest.toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-right font-mono text-xs font-black text-red-900">
                    + NPR {grandTotalAccruedFine.toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-right font-mono text-sm font-black text-red-950">
                    NPR {grandTotalCashDue.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Footer & Signature Block */}
        <div className="hidden print:grid pt-8 mt-8 grid-cols-2 gap-8 text-xs font-mono border-t-2 border-slate-900">
          <div className="space-y-1 font-sans">
            <div className="font-bold text-slate-900 uppercase">Audit Metadata:</div>
            <div>As of Date: <strong>{getKathmanduPrintTimestamp()}</strong></div>
            <div className="pt-8">
              <div className="border-b border-slate-400 w-48 mb-1"></div>
              <span className="font-bold text-slate-900 uppercase text-[10px]">Prepared By (Loan Collector)</span>
            </div>
          </div>
          <div className="text-center flex flex-col justify-end items-center font-sans">
            <div className="border-b border-slate-400 w-48 mb-1 h-8"></div>
            <span className="font-bold text-slate-900 uppercase text-[10px]">Approved By (Executive Chairperson / Secretary)</span>
          </div>
        </div>

      </div>
    </div>
  );
}