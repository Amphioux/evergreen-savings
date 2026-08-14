import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import PrintControls from './PrintControls';
import { CheckCircle2, User, ShieldCheck } from 'lucide-react';

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

function cleanRecordedName(name?: string): string {
  if (!name) return 'System Admin';
  return name.replace(/\s*\((Admin|Superadmin)\)/gi, '').trim();
}

export default async function LedgerPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; id?: string; year?: string; sort?: string; member_id?: string; status?: string }>;
}) {
  const params = await searchParams;
  const printType = params.type || 'portfolio';
  const targetId = params.id;
  const targetYear = params.year || '';
  const sortOrder = params.sort || 'date_desc';
  const memberFilterId = params.member_id || '';
  const statusFilter = params.status || 'ALL';

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

  const currentUserId = user.id;

  // Check if current user is an Admin / Superadmin
  const { data: currentProfile } = await supabaseAdmin
    .from('profiles')
    .select('role, user_type')
    .eq('id', currentUserId)
    .single();

  const isAdmin = currentProfile?.role === 'ADMIN' || currentProfile?.role === 'SUPER_ADMIN' || currentProfile?.role === 'SUPERADMIN';

  // 1. SINGLE LOAN STATEMENT PRINT
  if (printType === 'single') {
    if (!targetId) notFound();

    const { data: loan } = await supabaseAdmin
      .from('loans')
      .select(`
        *,
        borrower:profiles!borrower_id(full_name, account_id, user_type),
        guarantor:profiles!guarantor_id(full_name, account_id)
      `)
      .eq('id', targetId)
      .single();

    if (!loan) notFound();

    // Member security check
    if (!isAdmin && String(loan.borrower_id) !== String(currentUserId)) {
      redirect('/loans');
    }

    const { data: payments } = await supabaseAdmin
      .from('loan_payments')
      .select('*')
      .eq('loan_id', targetId)
      .order('payment_date', { ascending: false });

    const loanPayments = payments || [];
    const totalPrincipalPaid = loanPayments.reduce((sum, p) => sum + Number(p.principal_paid || 0), 0);
    const totalInterestPaid = loanPayments.reduce((sum, p) => sum + Number(p.interest_paid || 0), 0);
    const remainingBalance = Math.max(0, Number(loan.principal_amount || 0) - totalPrincipalPaid);
    const isPaidOff = remainingBalance <= 0 || loan.status === 'SETTLED' || loan.status === 'PAID_OFF';
    const borrowerData = loan.borrower || loan.profiles || {};
    const isInternalMember = borrowerData.user_type === 'MEMBER' || (!loan.guarantor_id && !loan.guarantor);

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

        <PrintControls title={`Single Loan Statement — ${loan.loan_code}`} />

        <div className="printable-card-zone max-w-4xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-xl p-8 space-y-6 print:border-none print:shadow-none print:p-0">
          <div className="text-center border-b border-slate-300 pb-4 mb-4">
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-wide">EVERGREEN SAVINGS GROUP</h1>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Official Single Loan Ledger Statement — {loan.loan_code}
            </p>
            <div className="inline-flex items-center gap-1 px-3 py-0.5 bg-blue-100 text-blue-900 font-sans text-[10px] font-bold rounded-full mt-2">
              <CheckCircle2 size={11} /> Verified Treasury Record
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-xs">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Loan Approval Authority</span>
              <strong className="text-slate-900 text-xs font-bold">{loan.approved_by_name || 'Committee Admin'}</strong>
              <span className="text-[11px] text-slate-500 font-medium block">{loan.approved_by_designation || 'Executive Board'}</span>
            </div>
            <div className="text-right font-mono">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block font-sans">Status</span>
              <strong className={`px-2 py-0.5 rounded text-[10px] ${isPaidOff ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {isPaidOff ? 'PAID OFF & SETTLED' : 'ACTIVE'}
              </strong>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-400 uppercase text-[10px] tracking-wider mb-2">Involved Parties</h4>
              <div className="flex items-start gap-2">
                <User size={16} className="text-blue-700 mt-0.5 shrink-0" />
                <div>
                  <div className="text-slate-500 font-semibold">Borrower</div>
                  <div className="font-bold text-slate-900 text-sm">{borrowerData.full_name || 'Borrower'}</div>
                  <div className="font-mono text-slate-500">
                    {isInternalMember ? `Member ID: ${borrowerData.account_id || 'N/A'}` : 'External Borrower'}
                  </div>
                </div>
              </div>
              {loan.guarantor && (
                <div className="pt-2 border-t border-slate-200 flex items-start gap-2">
                  <ShieldCheck size={16} className="text-amber-700 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-slate-500 font-semibold">Assigned Guarantor</div>
                    <div className="font-bold text-slate-900">{loan.guarantor.full_name}</div>
                    <div className="font-mono text-slate-500">ID: {loan.guarantor.account_id || 'N/A'}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 font-mono">
              <h4 className="font-bold text-slate-400 uppercase text-[10px] tracking-wider mb-2 font-sans">Loan Terms</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 block font-sans">Principal</span>
                  <strong className="text-slate-900">NPR {Number(loan.principal_amount).toLocaleString('en-IN')}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block font-sans">Interest Rate</span>
                  <strong className="text-slate-900">{loan.current_rate}% p.a.</strong>
                </div>
                <div>
                  <span className="text-slate-500 block font-sans">Tenure</span>
                  <strong className="text-slate-900">{loan.tenure_months} Months ({loan.issue_date})</strong>
                </div>
                <div>
                  <span className="text-slate-500 block font-sans">Monthly EMI</span>
                  <strong className="text-slate-900">NPR {Number(loan.monthly_emi).toLocaleString('en-IN')}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase font-sans block">Total Repaid</span>
              <strong className="text-emerald-800 text-sm font-black">NPR {totalPrincipalPaid.toLocaleString('en-IN')}</strong>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase font-sans block">Interest Paid</span>
              <strong className="text-purple-800 text-sm font-black">NPR {totalInterestPaid.toLocaleString('en-IN')}</strong>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase font-sans block">Remaining Balance</span>
              <strong className="text-amber-900 text-sm font-black">NPR {remainingBalance.toLocaleString('en-IN')}</strong>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Transaction Ledger ({loanPayments.length})</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Payment ID</th>
                    <th className="p-2.5 text-right">Principal</th>
                    <th className="p-2.5 text-right">Interest</th>
                    <th className="p-2.5 text-right">Total</th>
                    <th className="p-2.5 text-right font-sans">Authorized By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loanPayments.map((p: any) => (
                    <tr key={p.id}>
                      <td className="p-2.5 font-bold text-slate-700">{p.payment_date}</td>
                      <td className="p-2.5 text-blue-800">{p.payment_code || `PY-${p.id}`}</td>
                      <td className="p-2.5 text-right text-emerald-800 font-bold">NPR {Number(p.principal_paid || 0).toLocaleString('en-IN')}</td>
                      <td className="p-2.5 text-right text-purple-800 font-bold">NPR {Number(p.interest_paid || 0).toLocaleString('en-IN')}</td>
                      <td className="p-2.5 text-right text-slate-900 font-black">NPR {(Number(p.principal_paid || 0) + Number(p.interest_paid || 0)).toLocaleString('en-IN')}</td>
                      <td className="p-2.5 text-right text-slate-500 font-sans text-[10px]">{cleanRecordedName(p.recorded_by_name)}</td>
                    </tr>
                  ))}
                  {loanPayments.length === 0 && (
                    <tr><td colSpan={6} className="p-4 text-center text-slate-400 font-sans text-xs">No repayments recorded towards this loan yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="hidden print:grid pt-8 mt-8 grid-cols-2 gap-8 text-xs font-mono border-t-2 border-slate-900">
            <div className="space-y-1 font-sans">
              <div className="font-bold text-slate-900 uppercase">Ledger Metadata:</div>
              <div>Printed On: <strong>{getKathmanduPrintTimestamp()}</strong></div>
              <div>Status: <strong>{isPaidOff ? 'PAID OFF & SETTLED' : 'ACTIVE'}</strong></div>
            </div>
            <div className="text-center flex flex-col justify-end items-center font-sans">
              <div className="border-b border-slate-400 w-48 mb-1 h-8"></div>
              <span className="font-bold text-slate-900 uppercase text-[10px]">Authorized Executive Seal & Signature</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fetch profiles, loans, and payments based on role permissions
  const profilesQuery = supabaseAdmin.from('profiles').select('id, full_name, account_id, user_type');
  const loansQuery = isAdmin 
    ? supabaseAdmin.from('loans').select('*, borrower:profiles!borrower_id(full_name, account_id, user_type)').order('issue_date', { ascending: false })
    : supabaseAdmin.from('loans').select('*, borrower:profiles!borrower_id(full_name, account_id, user_type)').eq('borrower_id', currentUserId).order('issue_date', { ascending: false });

  const [{ data: rawProfiles }, { data: rawLoans }, { data: rawPayments }] = await Promise.all([
    profilesQuery,
    loansQuery,
    supabaseAdmin.from('loan_payments').select('*').order('payment_date', { ascending: false }),
  ]);

  const profileList = rawProfiles || [];
  const loanList = rawLoans || [];
  const paymentList = rawPayments || [];

  const loanIdsSet = new Set(loanList.map((l) => String(l.id)));
  const relevantPayments = paymentList.filter((p) => loanIdsSet.has(String(p.loan_id)));

  // 2. DISBURSED LOANS PORTFOLIO REPORT (GROUP OR PERSONAL)
  if (printType === 'portfolio') {
    let filteredLoans = loanList.map((loan) => {
      const loanPayments = relevantPayments.filter((p) => String(p.loan_id) === String(loan.id));
      const totalRepaid = loanPayments.reduce((sum, p) => sum + Number(p.principal_paid || 0), 0);
      const remainingBalance = Math.max(0, Number(loan.principal_amount || 0) - totalRepaid);
      const isPaidOff = remainingBalance <= 0 || loan.status === 'SETTLED' || loan.status === 'PAID_OFF';
      return { ...loan, remainingBalance, isPaidOff };
    });

    if (memberFilterId && isAdmin) {
      filteredLoans = filteredLoans.filter((l) => String(l.borrower_id) === String(memberFilterId));
    }

    if (statusFilter === 'ACTIVE') {
      filteredLoans = filteredLoans.filter((l) => !l.isPaidOff);
    } else if (statusFilter === 'PAID_OFF') {
      filteredLoans = filteredLoans.filter((l) => l.isPaidOff);
    }

    if (targetYear) {
      filteredLoans = filteredLoans.filter((l) => (l.issue_date || l.created_at || '').slice(0, 4) === targetYear);
    }

    const totalActiveBalance = filteredLoans.filter((l) => !l.isPaidOff).reduce((sum, l) => sum + l.remainingBalance, 0);
    const totalDisbursedSum = filteredLoans.reduce((sum, l) => sum + Number(l.principal_amount || 0), 0);

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

        <PrintControls title={isAdmin ? "Disbursed Loans Audit Report" : "My Personal Loans Portfolio"} />

        <div className="printable-card-zone max-w-4xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-xl p-8 space-y-6 print:border-none print:shadow-none print:p-0">
          <div className="text-center border-b border-slate-300 pb-4 mb-4">
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-wide">EVERGREEN SAVINGS GROUP</h1>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              {isAdmin ? 'Official Group Disbursed Loan Audit Report' : 'My Active & Closed Loan Portfolio Report'}
            </p>
            {targetYear && <p className="text-xs text-slate-500 font-mono font-bold mt-1">Filtered Year: {targetYear}</p>}
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block font-sans">Report Scope</span>
              <strong className="text-slate-900 text-sm font-bold">{filteredLoans.length} Loans Registered</strong>
              <span className="text-[11px] text-slate-500 block font-sans">Total Issued: NPR {totalDisbursedSum.toLocaleString('en-IN')}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block font-sans">Active Outstanding Balance</span>
              <strong className="text-amber-900 text-base font-black">NPR {totalActiveBalance.toLocaleString('en-IN')}</strong>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Loan ID</th>
                  <th className="p-3 font-sans">Borrower</th>
                  <th className="p-3">Disbursed Date</th>
                  <th className="p-3 text-right">Principal Issued</th>
                  <th className="p-3 text-right">Remaining Balance</th>
                  <th className="p-3 text-center font-sans">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLoans.map((loan) => {
                  const loan_code = loan.loan_code || `LN-${loan.id.toString().padStart(4, '0')}`;
                  const borrowerName = loan.borrower?.full_name || 'Borrower';
                  const accountId = loan.borrower?.account_id || 'N/A';

                  return (
                    <tr key={loan.id}>
                      <td className="p-3 font-bold text-slate-900">{loan_code}</td>
                      <td className="p-3 font-sans">
                        <strong className="text-slate-900 block">{borrowerName}</strong>
                        <span className="text-[10px] text-slate-500 font-mono">Acc: {accountId}</span>
                      </td>
                      <td className="p-3 text-slate-700">{loan.issue_date || 'N/A'}</td>
                      <td className="p-3 text-right font-bold text-slate-800">NPR {Number(loan.principal_amount || 0).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-bold text-amber-900">NPR {loan.remainingBalance.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-center font-sans">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${loan.isPaidOff ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-900'}`}>
                          {loan.isPaidOff ? 'PAID OFF' : 'ACTIVE'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredLoans.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-slate-400 font-sans text-xs">No loan portfolio records found for the applied criteria.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="hidden print:grid pt-8 mt-8 grid-cols-2 gap-8 text-xs font-mono border-t-2 border-slate-900">
            <div className="space-y-1 font-sans">
              <div className="font-bold text-slate-900 uppercase">Audit Metadata:</div>
              <div>Printed On: <strong>{getKathmanduPrintTimestamp()}</strong></div>
            </div>
            <div className="text-center flex flex-col justify-end items-center font-sans">
              <div className="border-b border-slate-400 w-48 mb-1 h-8"></div>
              <span className="font-bold text-slate-900 uppercase text-[10px]">Authorized Executive Seal & Signature</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. REPAYMENT HISTORY STATEMENT PRINT (GROUP OR PERSONAL)
  let filteredRepayments = relevantPayments.map((p) => {
    const loan = loanList.find((l) => String(l.id) === String(p.loan_id));
    const borrower = profileList.find((b) => String(b.id) === String(loan?.borrower_id));
    return {
      ...p,
      borrower_id: loan?.borrower_id,
      borrower_name: borrower?.full_name || loan?.borrower?.full_name || 'Borrower',
      borrower_account_id: borrower?.account_id || loan?.borrower?.account_id || 'N/A',
      loan_code: loan?.loan_code || `LN-${p.loan_id}`,
    };
  });

  if (memberFilterId && isAdmin) {
    filteredRepayments = filteredRepayments.filter((p) => String(p.borrower_id) === String(memberFilterId));
  }

  if (targetYear) {
    filteredRepayments = filteredRepayments.filter((p) => (p.payment_date || '').slice(0, 4) === targetYear);
  }

  filteredRepayments.sort((a, b) => {
    const dateA = new Date(a.payment_date).getTime();
    const dateB = new Date(b.payment_date).getTime();
    return sortOrder === 'date_asc' ? dateA - dateB : dateB - dateA;
  });

  const totalFilteredPrincipal = filteredRepayments.reduce((sum, p) => sum + Number(p.principal_paid || 0), 0);
  const totalFilteredInterest = filteredRepayments.reduce((sum, p) => sum + Number(p.interest_paid || 0), 0);
  const totalFilteredPaid = totalFilteredPrincipal + totalFilteredInterest;

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

      <PrintControls title={isAdmin ? "Repayment History Audit Report" : "My Loan Repayment History"} />

      <div className="printable-card-zone max-w-4xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-xl p-8 space-y-6 print:border-none print:shadow-none print:p-0">
        <div className="text-center border-b border-slate-300 pb-4 mb-4">
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-wide">EVERGREEN SAVINGS GROUP</h1>
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            {isAdmin ? 'Official Group Loan Repayment Audit Report' : 'My Consolidated Repayment History Statement'}
          </p>
          {targetYear && <p className="text-xs text-slate-500 font-mono font-bold mt-1">Filtered Year: {targetYear}</p>}
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-xs">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Repayments Logged</span>
            <strong className="text-slate-900 text-sm font-bold">{filteredRepayments.length} Vouchers</strong>
          </div>
          <div className="text-right font-mono">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block font-sans">Total Gross Paid</span>
            <strong className="text-emerald-950 text-base font-black">NPR {totalFilteredPaid.toLocaleString('en-IN')}</strong>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Payment ID</th>
                <th className="p-3">Payment Date</th>
                <th className="p-3 font-sans">Borrower & Loan</th>
                <th className="p-3 text-right">Principal Paid</th>
                <th className="p-3 text-right">Interest Paid</th>
                <th className="p-3 text-right">Total Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRepayments.map((p) => {
                const payment_code = p.payment_code || `PY-${p.id}`;
                const totalPaid = Number(p.principal_paid || 0) + Number(p.interest_paid || 0);

                return (
                  <tr key={p.id}>
                    <td className="p-3 font-bold text-slate-900">{payment_code}</td>
                    <td className="p-3 text-slate-700">{p.payment_date}</td>
                    <td className="p-3 font-sans">
                      <strong className="text-slate-900 block">{p.borrower_name}</strong>
                      <span className="text-[10px] text-slate-500 font-mono">Code: {p.loan_code}</span>
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-800">NPR {Number(p.principal_paid || 0).toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right font-bold text-purple-800">NPR {Number(p.interest_paid || 0).toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right font-black text-slate-900">NPR {totalPaid.toLocaleString('en-IN')}</td>
                  </tr>
                );
              })}
              {filteredRepayments.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-slate-400 font-sans text-xs">No repayment records found for the applied criteria.</td></tr>
              )}
            </tbody>
            {filteredRepayments.length > 0 && (
              <tfoot className="bg-slate-100 text-slate-900 border-t-2 border-slate-300 font-bold">
                <tr>
                  <td colSpan={3} className="p-3 text-left uppercase text-xs font-black">Total Repayments</td>
                  <td className="p-3 text-right font-mono text-xs font-black text-emerald-900">
                    NPR {totalFilteredPrincipal.toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-right font-mono text-xs font-black text-purple-900">
                    NPR {totalFilteredInterest.toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-right font-mono text-xs font-black text-slate-900">
                    NPR {totalFilteredPaid.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="hidden print:grid pt-8 mt-8 grid-cols-2 gap-8 text-xs font-mono border-t-2 border-slate-900">
          <div className="space-y-1 font-sans">
            <div className="font-bold text-slate-900 uppercase">Audit Metadata:</div>
            <div>Printed On: <strong>{getKathmanduPrintTimestamp()}</strong></div>
          </div>
          <div className="text-center flex flex-col justify-end items-center font-sans">
            <div className="border-b border-slate-400 w-48 mb-1 h-8"></div>
            <span className="font-bold text-slate-900 uppercase text-[10px]">Authorized Executive Seal & Signature</span>
          </div>
        </div>
      </div>
    </div>
  );
}