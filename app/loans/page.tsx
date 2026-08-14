import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getCurrentUserRole } from '@/lib/getUserRole';
import LoansTabContainer from './LoansTabContainer';
import MyLoansLedger from './MyLoansLedger';
import LoanDefaultersDetailTable from './LoanDefaultersDetailTable';
import ManageFineRulesModal from '../deposits/ManageFineRulesModal';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Eye } from 'lucide-react';

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{
    tab?: string;
    loan_id?: string;
  }>;
}

export default async function LoansPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const preSelectedLoanId = params.loan_id || '';
  const initialTab = (params.tab as any) || (preSelectedLoanId ? 'LATE_FEE_COLLECTION' : 'DIRECTORY');

  const cookieStore = await cookies();
  const supabaseServer = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/+$/, ''),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Handled safely in Server Components
          }
        },
      },
    }
  );

  const { data: { user } } = await supabaseServer.auth.getUser();
  const currentUserId = user?.id || '';
  const { isAdmin, isSuperAdmin } = await getCurrentUserRole();

  const [
    { data: profiles },
    { data: loans },
    { data: payments },
    { data: fineRulesData }
  ] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, full_name, user_type, role, account_id, status, phone')
      .or('status.eq.ACTIVE,status.is.null')
      .order('full_name'),
    supabaseAdmin
      .from('loans')
      .select(`
        *,
        borrower:profiles!borrower_id(full_name, account_id, user_type),
        guarantor:profiles!guarantor_id(full_name, account_id)
      `)
      .order('issue_date', { ascending: false })
      .order('id', { ascending: false }),
    supabaseAdmin
      .from('loan_payments')
      .select('id, loan_id, payment_code, principal_paid, interest_paid, fine_paid, fine_discount_amount, fine_waived, interest_waived, waiver_reason, payment_date, payment_note, recorded_by_name, recorded_by_email')
      .order('payment_date', { ascending: false })
      .order('payment_code', { ascending: false })
      .order('id', { ascending: false }),
    supabaseAdmin
      .from('fine_rules')
      .select('*')
      .order('created_at', { ascending: false })
  ]);

  const profileList = profiles || [];
  const loanList = loans || [];
  const paymentList = payments || [];
  const fineRulesList = fineRulesData || [];

  const myLoans = loanList.filter(
    (l: any) => !isAdmin && Boolean(currentUserId) && String(l.borrower_id) === String(currentUserId)
  );

  // Historical Balance Calculation
  const paymentsByLoan: Record<string, typeof paymentList> = {};
  paymentList.forEach((p) => {
    const lId = String(p.loan_id);
    if (!paymentsByLoan[lId]) paymentsByLoan[lId] = [];
    paymentsByLoan[lId].push(p);
  });

  const historicalBalances: Record<string, number> = {};

  Object.keys(paymentsByLoan).forEach((lId) => {
    const loan = loanList.find((l) => String(l.id) === lId);
    const loanPrincipal = Number(loan?.principal_amount || 0);

    const sortedLoanPayments = [...paymentsByLoan[lId]].sort((a, b) => {
      const dateDiff = new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return Number(a.id) - Number(b.id);
    });

    let accumulatedPrincipalPaid = 0;
    sortedLoanPayments.forEach((p) => {
      accumulatedPrincipalPaid += Number(p.principal_paid || 0);
      historicalBalances[String(p.id)] = Math.max(0, loanPrincipal - accumulatedPrincipalPaid);
    });
  });

  const repaymentHistory = paymentList.map((p) => {
    const loan = loanList.find((l) => String(l.id) === String(p.loan_id));
    const borrower = profileList.find((b) => b.id === loan?.borrower_id);
    const guarantor = profileList.find((g) => g.id === loan?.guarantor_id);

    const principal_paid = Number(p.principal_paid) || 0;
    const interest_paid = Number(p.interest_paid) || 0;
    const fine_paid = Number(p.fine_paid) || 0;
    const fine_discount_amount = Number(p.fine_discount_amount) || 0;
    const interest_waived = Number(p.interest_waived) || 0;
    const remaining_balance = historicalBalances[String(p.id)] ?? 0;

    return {
      ...p, // Spread raw payment record to preserve all schema fields
      id: p.id,
      loan_id: p.loan_id,
      borrower_id: loan?.borrower_id,
      payment_code: p.payment_code || `PY-${p.id}`,
      payment_date: p.payment_date,
      loan_code: loan?.loan_code || `LN-${p.loan_id}`,
      current_rate: Number(loan?.current_rate || 12.0),
      borrower_name: borrower?.full_name || 'Unknown Borrower',
      borrower_account_id: borrower?.account_id || 'N/A',
      guarantor_name: guarantor?.full_name,
      guarantor_account_id: guarantor?.account_id,
      principal_paid,
      interest_paid,
      fine_paid,
      fine_discount_amount,
      fine_waived: p.fine_waived,
      interest_waived,
      waiver_reason: p.waiver_reason || '',
      payment_note: p.payment_note || '',
      total_paid: principal_paid + interest_paid + fine_paid,
      remaining_balance,
      recorded_by_name: p.recorded_by_name || 'Authorized Admin',
      recorded_by_email: p.recorded_by_email || '',
    };
  });

  const activeLoanOptions = loanList
    .filter((l) => l.status === 'ACTIVE')
    .map((loan) => {
      const borrower = profileList.find((p) => p.id === loan.borrower_id);
      const loanPayments = paymentList.filter((p) => String(p.loan_id) === String(loan.id));
      const totalRepaid = loanPayments.reduce((sum, p) => sum + Number(p.principal_paid || 0), 0);
      const remaining_balance = Math.max(0, Number(loan.principal_amount || 0) - totalRepaid);

      const sortedPayments = [...loanPayments].sort(
        (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
      );
      const last_payment_date = sortedPayments[0]?.payment_date || loan.issue_date;

      return {
        ...loan,
        borrower_name: borrower?.full_name || 'Unknown Borrower',
        account_id: borrower?.account_id || 'N/A',
        remaining_balance,
        monthly_emi: Number(loan.monthly_emi || 0),
        current_rate: Number(loan?.current_rate || 12.0),
        last_payment_date,
      };
    })
    .filter((l) => l.remaining_balance > 0);

  return (
    <div className="space-y-6 text-left p-6 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Loan Management & Repayments</h2>
          <p className="text-sm text-slate-500 mt-1">
            {isAdmin
              ? 'Disburse loans with unique Loan IDs, enforce guarantors, track accrued late penalty fines, and manage repayments'
              : 'View your active loan balances, repayment statements, and group loan records'}
          </p>
        </div>

        {isAdmin && (
          <div className="shrink-0">
            <ManageFineRulesModal fineRules={fineRulesList} isAdmin={isAdmin} />
          </div>
        )}
      </div>

      {/* MEMBER VIEW */}
      {!isAdmin && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs flex items-center gap-2">
            <Eye size={16} className="text-blue-600 flex-shrink-0" />
            <span>You are viewing loans in <strong>Member Mode (Read-Only)</strong>. Voucher IDs and account numbers for other members are restricted.</span>
          </div>
          <MyLoansLedger myLoans={myLoans} paymentList={paymentList} isAdmin={false} />
        </div>
      )}

      {/* ADMIN VIEW: Grace-Expired Loan Penalty Ledger Table */}
      {isAdmin && (
        <LoanDefaultersDetailTable
          activeLoans={loanList.filter((l) => l.status === 'ACTIVE')}
          profiles={profileList}
          paymentList={paymentList}
          fineRules={fineRulesList}
        />
      )}

      {/* ADMIN UNIFIED TABBED WORKSPACE */}
      {isAdmin && (
        <LoansTabContainer
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          isSuperAdmin={isSuperAdmin}
          profiles={profileList}
          loanList={loanList}
          paymentList={paymentList}
          activeLoans={activeLoanOptions}
          repaymentHistory={repaymentHistory}
          fineRules={fineRulesList}
          selectedLoanIdForRepayment={preSelectedLoanId}
          initialActiveTab={initialTab}
        />
      )}

    </div>
  );
}