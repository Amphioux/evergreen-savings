import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getCurrentUserRole } from '@/lib/getUserRole';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  Users, 
  PiggyBank, 
  Landmark, 
  Wallet, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  Receipt, 
  ArrowUpRight, 
  ShieldAlert, 
  CalendarCheck,
  Calendar,
  Activity,
  Percent,
  Sparkles,
  Award,
  UserCheck
} from 'lucide-react';
import { formatMonthLabel } from '@/lib/formatters';

export const revalidate = 0;

// Helper function to format ISO timestamps into Kathmandu local time
function formatKathmanduTime(dateStr: string) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kathmandu',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

// Helper: Mask Account IDs for Members Only
function maskAccountId(accId?: string): string {
  if (!accId) return 'ACC-****';
  if (accId.length <= 4) return 'ACC-****';
  return `ACC-***${accId.slice(-2)}`;
}

// Helper: Calculate next eligible contribution month
function getNextEligibleMonth(memberId: string, deposits: any[] = []): string {
  const memberMonths = deposits
    .filter((d) => String(d.member_id) === String(memberId) && d.for_month)
    .map((d) => d.for_month.slice(0, 7))
    .sort();

  if (memberMonths.length === 0) {
    return new Date().toISOString().slice(0, 7);
  }

  const latest = memberMonths[memberMonths.length - 1];
  const [yStr, mStr] = latest.split('-');
  let year = parseInt(yStr, 10);
  let month = parseInt(mStr, 10);

  month++;
  if (month > 12) {
    month = 1;
    year++;
  }

  return `${year}-${month.toString().padStart(2, '0')}`;
}

async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
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
}

export default async function DashboardPage() {
  const supabaseServer = await getSupabaseServerClient();
  const { data: { user } } = await supabaseServer.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const authUserId = user.id;
  const { isAdmin } = await getCurrentUserRole();
  const today = new Date();
  const currentMonthStr = today.toISOString().slice(0, 7);

  // Fetch logged-in user's profile info for accurate ID matching & personalized greeting
  const { data: currentUserProfile } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, committee_position, role, account_id')
    .eq('id', authUserId)
    .single();

  const currentMemberProfileId = currentUserProfile?.id || authUserId;
  const userName = currentUserProfile?.full_name || user.user_metadata?.full_name || 'Member';
  const userDesignation = currentUserProfile?.committee_position || (currentUserProfile?.role === 'SUPER_ADMIN' ? 'Chairperson / President' : currentUserProfile?.role === 'ADMIN' ? 'Committee Secretary' : 'General Group Member');

  // 30 Days Ago Threshold for Transactions Feed
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  // 1. Fetch active member profiles
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, account_id, user_type, role, status, phone')
    .or('status.eq.ACTIVE,status.is.null')
    .order('full_name');

  const profileList = profiles || [];
  
  // INTERNAL GROUP MEMBERS
  const internalMembers = profileList.filter(
    (p) => p.user_type === 'MEMBER' && p.role !== 'ADMIN' && p.role !== 'SUPER_ADMIN' && p.role !== 'SUPERADMIN'
  );

  // EXTERNAL BORROWERS
  const externalBorrowers = profileList.filter(
    (p) => p.user_type === 'NON_MEMBER'
  );

  // 2. Fetch all deposits
  const { data: deposits } = await supabaseAdmin
    .from('deposits')
    .select('id, member_id, amount_paid, for_month, created_at')
    .order('created_at', { ascending: false });

  const depositList = deposits || [];
  const totalSavingsCollected = depositList.reduce((sum, d) => sum + Number(d.amount_paid || 0), 0);

  // Check deposit defaulters for current month
  const currentMonthDepositedMemberIds = new Set(
    depositList
      .filter((d) => d.for_month && d.for_month.slice(0, 7) === currentMonthStr)
      .map((d) => d.member_id)
  );

  const currentMonthDefaulters = internalMembers.filter(
    (m) => !currentMonthDepositedMemberIds.has(m.id)
  );

  // Compliance Rate Calculation (%)
  const monthlyComplianceRate = internalMembers.length > 0
    ? Math.round(((internalMembers.length - currentMonthDefaulters.length) / internalMembers.length) * 100)
    : 100;

  // 3. Fetch loans
  const { data: loans } = await supabaseAdmin
    .from('loans')
    .select('*')
    .order('issue_date', { ascending: false });

  const loanList = loans || [];
  const totalDisbursedLoans = loanList.reduce((sum, l) => sum + Number(l.principal_amount || 0), 0);

  // 4. Fetch loan repayments
  const { data: payments } = await supabaseAdmin
    .from('loan_payments')
    .select('id, loan_id, payment_code, principal_paid, interest_paid, payment_date')
    .order('payment_date', { ascending: false });

  const paymentList = payments || [];
  const totalPrincipalRepaid = paymentList.reduce((sum, p) => sum + Number(p.principal_paid || 0), 0);
  const totalInterestCollected = paymentList.reduce((sum, p) => sum + Number(p.interest_paid || 0), 0);

  // 5. Fetch bank interest credits
  const { data: bankInterests } = await supabaseAdmin
    .from('bank_interest')
    .select('amount');

  const totalBankInterest = (bankInterests || []).reduce((sum, b) => sum + Number(b.amount || 0), 0);

  // 6. Fetch operational expenses
  const { data: expenses } = await supabaseAdmin
    .from('expenses')
    .select('amount');

  const totalExpenses = (expenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);

  // 7. Fetch property/asset valuation
  const { data: assets } = await supabaseAdmin
    .from('assets')
    .select('current_value');

  const totalAssetsValuation = (assets || []).reduce((sum, a) => sum + Number(a.current_value || 0), 0);

  // 8. ACCURATE DIVIDEND CALCULATIONS
  // Master Distribution Events
  const { data: dividendDistributions } = await supabaseAdmin
    .from('dividend_distributions')
    .select('*')
    .order('distributed_at', { ascending: false });

  // Individual Payouts Joined with Master Metadata
  const { data: dividendPayouts } = await supabaseAdmin
    .from('dividend_payouts')
    .select('*, dividend_distributions(distribution_code, title, distributed_at, cutoff_month)')
    .order('created_at', { ascending: false });

  // Master Total: Sum total_profit_pool directly from dividend_distributions
  const totalDividendsDisbursed = (dividendDistributions || []).reduce(
    (sum, d) => sum + Number(d.total_profit_pool || 0), 
    0
  );

  // Member-Specific Payouts: Dual match against profile ID or auth user ID
  const myDividendPayouts = (dividendPayouts || []).filter(
    (dp) => String(dp.member_id) === String(currentMemberProfileId) || String(dp.member_id) === String(authUserId)
  );
  const myTotalDividendEarnings = myDividendPayouts.reduce(
    (sum, dp) => sum + Number(dp.dividend_amount || 0), 
    0
  );

  // Pre-calculate remaining loan balances
  const loansWithBalances = loanList.map((loan) => {
    const loanPayments = paymentList.filter((p) => String(p.loan_id) === String(loan.id));
    const repaid = loanPayments.reduce((sum, p) => sum + Number(p.principal_paid || 0), 0);
    const balance = Math.max(0, Number(loan.principal_amount || 0) - repaid);
    return { ...loan, balance, loanPayments };
  });

  // Filter for TRULY active loans
  const trueActiveLoans = loansWithBalances.filter(
    (l) => l.status === 'ACTIVE' && l.balance > 0
  );

  const activeLoanPortfolio = trueActiveLoans.reduce((sum, l) => sum + l.balance, 0);
  const uniqueActiveBorrowersCount = new Set(trueActiveLoans.map((l) => l.borrower_id)).size;

  // Track EMI Schedules & Loan Defaulters
  const loanEmiTrackers = trueActiveLoans.map((loan) => {
    const borrower = profileList.find((p) => p.id === loan.borrower_id);
    const guarantor = profileList.find((p) => p.id === loan.guarantor_id);

    const sortedPayments = [...loan.loanPayments].sort(
      (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
    );
    const lastPaymentDate = sortedPayments[0]?.payment_date || loan.issue_date;
    
    const nextDueDate = new Date(lastPaymentDate);
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);

    const isOverdue = nextDueDate < today;
    const daysOverdue = isOverdue ? Math.floor((today.getTime() - nextDueDate.getTime()) / (1000 * 3600 * 24)) : 0;

    return {
      loanId: loan.id,
      loanCode: loan.loan_code || `LN-${loan.id}`,
      borrowerId: loan.borrower_id,
      borrowerName: borrower?.full_name || 'Borrower',
      borrowerType: borrower?.user_type || 'MEMBER',
      accountId: borrower?.account_id || 'N/A',
      phone: borrower?.phone || 'N/A',
      guarantorName: guarantor?.full_name || null,
      guarantorAccountId: guarantor?.account_id || null,
      monthlyEmi: Number(loan.monthly_emi || 0),
      balance: loan.balance,
      nextDueDate: nextDueDate.toISOString().split('T')[0],
      isOverdue,
      daysOverdue,
    };
  });

  const loanDefaultersList = loanEmiTrackers.filter((t) => t.isOverdue);

  // Financial Summaries
  const totalGroupEarnings = totalInterestCollected + totalBankInterest;
  const liquidCashOnHand = (totalSavingsCollected + totalPrincipalRepaid + totalGroupEarnings) - totalDisbursedLoans - totalExpenses;
  const netGroupWorth = liquidCashOnHand + activeLoanPortfolio + totalAssetsValuation;

  const liquidityRatio = totalSavingsCollected > 0
    ? Math.min(100, Math.round((liquidCashOnHand / totalSavingsCollected) * 100))
    : 100;

  // Member-Specific Metrics
  const myDeposits = depositList.filter((d) => String(d.member_id) === String(currentMemberProfileId) || String(d.member_id) === String(authUserId));
  const myTotalSavings = myDeposits.reduce((sum, d) => sum + Number(d.amount_paid || 0), 0);
  const myNextDepositMonth = getNextEligibleMonth(currentMemberProfileId, depositList);
  
  const myActiveLoans = loanEmiTrackers.filter((t) => String(t.borrowerId) === String(currentMemberProfileId) || String(t.borrowerId) === String(authUserId));
  const myTotalLoanBalance = myActiveLoans.reduce((sum, t) => sum + t.balance, 0);
  const myPrimaryLoan = myActiveLoans[0];

  // INTERNAL MEMBER COMPLIANCE RADAR DATA
  const memberComplianceList = internalMembers.map((m) => {
    const nextMonth = getNextEligibleMonth(m.id, depositList);
    const memberLoans = loanEmiTrackers.filter((t) => String(t.borrowerId) === String(m.id));
    const totalEmiDue = memberLoans.reduce((sum, t) => sum + t.monthlyEmi, 0);
    const hasActiveLoan = memberLoans.length > 0;
    const isDueDeposit = nextMonth <= currentMonthStr;

    return {
      id: m.id,
      fullName: m.full_name,
      accountId: m.account_id || 'N/A',
      displayAccountId: isAdmin ? (m.account_id || 'N/A') : maskAccountId(m.account_id),
      nextDepositMonth: nextMonth,
      isDueDeposit,
      hasActiveLoan,
      loanEMI: totalEmiDue,
    };
  });

  // EXTERNAL BORROWERS RADAR DATA
  const externalBorrowersRadarList = externalBorrowers.map((eb) => {
    const activeLoans = loanEmiTrackers.filter((t) => String(t.borrowerId) === String(eb.id));
    const totalBalance = activeLoans.reduce((sum, l) => sum + l.balance, 0);
    const totalMonthlyEmi = activeLoans.reduce((sum, l) => sum + l.monthlyEmi, 0);
    const primaryLoan = activeLoans[0];

    return {
      id: eb.id,
      fullName: eb.full_name,
      accountId: eb.account_id || 'N/A',
      displayAccountId: isAdmin ? (eb.account_id || 'N/A') : maskAccountId(eb.account_id),
      phone: eb.phone || 'N/A',
      hasActiveLoan: activeLoans.length > 0,
      activeLoanCount: activeLoans.length,
      totalBalance,
      totalMonthlyEmi,
      isOverdue: activeLoans.some((l) => l.isOverdue),
      guarantorName: primaryLoan?.guarantorName || 'N/A',
      guarantorAccountId: primaryLoan?.guarantorAccountId || null,
      nextDueDate: primaryLoan?.nextDueDate || 'N/A',
    };
  });

  // 30-Day Activity Feed
  const recent30DayDeposits = depositList
    .filter((d) => {
      const depDate = d.created_at ? new Date(d.created_at) : new Date(`${d.for_month}-01`);
      return depDate >= thirtyDaysAgo;
    })
    .map((d) => {
      const member = profileList.find((p) => p.id === d.member_id);
      const rawTimestamp = d.created_at || `${d.for_month}T00:00:00`;
      return {
        type: 'DEPOSIT' as const,
        id: `DEP-${d.id}`,
        rawTimestamp,
        formattedTime: formatKathmanduTime(rawTimestamp),
        title: `Savings Deposit (${d.for_month?.slice(0, 7) || 'Monthly'})`,
        memberName: member?.full_name || 'Group Member',
        accountId: member?.account_id || 'N/A',
        displayAccountId: isAdmin ? (member?.account_id || 'N/A') : maskAccountId(member?.account_id),
        amount: Number(d.amount_paid || 0),
      };
    });

  const recent30DayRepayments = paymentList
    .filter((p) => new Date(p.payment_date) >= thirtyDaysAgo)
    .map((p) => {
      const loan = loanList.find((l) => String(l.id) === String(p.loan_id));
      const borrower = profileList.find((b) => b.id === loan?.borrower_id);
      const rawTimestamp = `${p.payment_date}T12:00:00`;
      return {
        type: 'REPAYMENT' as const,
        id: p.payment_code || `PY-${p.id}`,
        rawTimestamp,
        formattedTime: formatKathmanduTime(rawTimestamp),
        title: `Loan Repayment (${loan?.loan_code || 'Loan'})`,
        memberName: borrower?.full_name || 'Borrower',
        accountId: borrower?.account_id || 'N/A',
        displayAccountId: isAdmin ? (borrower?.account_id || 'N/A') : maskAccountId(borrower?.account_id),
        amount: Number(p.principal_paid || 0) + Number(p.interest_paid || 0),
      };
    });

  const activityFeed30Days = [...recent30DayDeposits, ...recent30DayRepayments]
    .sort((a, b) => new Date(b.rawTimestamp).getTime() - new Date(a.rawTimestamp).getTime());

  return (
    <div className="space-y-6 text-left font-sans">
      
      {/* Header & Dynamic Personalized Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Hello, {userName}! 👋
            </h2>
            <span className="px-2.5 py-0.5 bg-purple-100 text-purple-900 border border-purple-200 font-extrabold text-[10px] rounded-full uppercase font-mono">
              {userDesignation}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-mono mt-1">
            {isAdmin 
              ? 'Real-time liquid cash flow, dividend events, loan metrics, and compliance trackers'
              : 'Personal savings & dividend summary, upcoming due payments, and group radar'}
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <Link
              href="/deposits"
              className="px-3 py-2 bg-emerald-900 hover:bg-emerald-800 text-white rounded-lg inline-flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <PiggyBank size={14} /> Record Deposit
            </Link>
            <Link
              href="/treasury"
              className="px-3 py-2 bg-purple-900 hover:bg-purple-800 text-white rounded-lg inline-flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <TrendingUp size={14} /> Distribute Dividends
            </Link>
            <Link
              href="/loans"
              className="px-3 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg inline-flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Landmark size={14} /> Manage Loans
            </Link>
          </div>
        )}
      </div>

      {/* ==================== GENERAL MEMBER VIEW ==================== */}
      {!isAdmin && (
        <>
          {/* Member Primary KPI Row (Includes Dividend Earnings) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-emerald-900 text-white rounded-2xl space-y-1 shadow-xs">
              <div className="flex justify-between items-center text-emerald-300 text-xs font-bold uppercase">
                <span>My Accumulated Savings</span>
                <PiggyBank size={18} />
              </div>
              <div className="text-2xl font-black font-mono">NPR {myTotalSavings.toLocaleString('en-IN')}</div>
              <p className="text-[11px] text-emerald-200 font-medium">{myDeposits.length} Monthly Contributions</p>
            </div>

            {/* My Dividend Earnings Card */}
            <div className="p-4 bg-purple-900 text-white rounded-2xl space-y-1 shadow-xs">
              <div className="flex justify-between items-center text-purple-300 text-xs font-bold uppercase">
                <span>My Dividend Earnings</span>
                <Sparkles size={18} />
              </div>
              <div className="text-2xl font-black font-mono">NPR {myTotalDividendEarnings.toLocaleString('en-IN')}</div>
              <p className="text-[11px] text-purple-200 font-medium">{myDividendPayouts.length} Profit Distributions Received</p>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-1 shadow-xs">
              <div className="flex justify-between items-center text-amber-800 text-xs font-bold uppercase">
                <span>Active Borrowed Loan</span>
                <Landmark size={18} />
              </div>
              <div className="text-2xl font-black text-amber-950 font-mono">
                NPR {myTotalLoanBalance.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-amber-800 font-semibold">
                {myPrimaryLoan ? `Code: ${myPrimaryLoan.loanCode}${myActiveLoans.length > 1 ? ` (+${myActiveLoans.length - 1} more)` : ''}` : 'No Active Loans'}
              </p>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-1 shadow-xs">
              <div className="flex justify-between items-center text-blue-800 text-xs font-bold uppercase">
                <span>Next Due Deposit</span>
                <Calendar size={18} />
              </div>
              <div className="text-xl font-black text-blue-950 font-mono">
                {formatMonthLabel(myNextDepositMonth)}
              </div>
              <p className="text-[11px] text-blue-700 font-bold">Standard Contribution: NPR 500</p>
            </div>
          </div>

          {/* MY PERSONAL DIVIDEND PAYOUTS HISTORY */}
          <div className="bg-white rounded-2xl border border-purple-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-purple-50/60 border-b border-purple-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-purple-950 text-sm flex items-center gap-2">
                  <Award size={18} className="text-purple-700" />
                  My Dividend Payout History
                </h3>
                <p className="text-xs text-purple-700">
                  Your share of cooperative profit distributions
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-purple-600 block">Total Profit Earned</span>
                <strong className="text-purple-950 font-mono text-sm">NPR {myTotalDividendEarnings.toLocaleString('en-IN')}</strong>
              </div>
            </div>

            <div className="divide-y divide-slate-100 font-sans">
              {myDividendPayouts.map((dp: any) => (
                <div key={dp.id} className="p-3.5 hover:bg-purple-50/30 flex justify-between items-center text-xs transition-colors">
                  <div>
                    <div className="font-bold text-slate-900">{dp.dividend_distributions?.title || 'Profit Distribution'}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Voucher Code: <strong className="text-purple-900">{dp.dividend_distributions?.distribution_code || `DIV-${dp.id}`}</strong> • Cutoff: {dp.dividend_distributions?.cutoff_month || 'N/A'} • Share: <strong>{dp.share_percentage}%</strong>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-black text-purple-950 text-base">
                      + NPR {Number(dp.dividend_amount || 0).toLocaleString('en-IN')}
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded">
                      {dp.payment_method || 'CASH'} PAID
                    </span>
                  </div>
                </div>
              ))}

              {myDividendPayouts.length === 0 && (
                <div className="p-6 text-center text-slate-400 text-xs font-medium">
                  No dividend payouts received yet. Future distributions will appear here automatically.
                </div>
              )}
            </div>
          </div>

          {/* MY PERSONAL DUE ACTION CARD */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">My Incoming & Due Payments</h3>
                <p className="text-xs text-slate-500">Your upcoming financial commitments for the cooperative</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
              {/* Savings Contribution Due */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700">Monthly Savings Contribution</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                    myNextDepositMonth <= currentMonthStr ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                  }`}>
                    {myNextDepositMonth <= currentMonthStr ? 'PAYMENT DUE' : 'UP TO DATE'}
                  </span>
                </div>
                <div className="text-slate-900 font-mono text-sm font-extrabold">
                  Target Month: {formatMonthLabel(myNextDepositMonth)}
                </div>
                <p className="text-[11px] text-slate-500">
                  Please deposit NPR 500 in the upcoming group meeting or via executive collector.
                </p>
              </div>

              {/* Loan EMI Due with Next Due Date */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700">Loan Repayment EMI</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                    myPrimaryLoan ? (myPrimaryLoan.isOverdue ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-900') : 'bg-slate-200 text-slate-600'
                  }`}>
                    {myPrimaryLoan ? (myPrimaryLoan.isOverdue ? 'OVERDUE' : 'EMI DUE') : 'NO LOAN'}
                  </span>
                </div>
                {myPrimaryLoan ? (
                  <>
                    <div className="text-slate-900 font-mono text-sm font-extrabold">
                      Monthly EMI: NPR {myPrimaryLoan.monthlyEmi.toLocaleString('en-IN')}
                    </div>
                    <div className="text-slate-700 font-mono text-xs font-bold flex items-center justify-between">
                      <span>Next Due Date:</span>
                      <span className={myPrimaryLoan.isOverdue ? 'text-red-700 font-black' : 'text-blue-900 font-black'}>
                        {myPrimaryLoan.nextDueDate}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Remaining Principal Balance: NPR {myTotalLoanBalance.toLocaleString('en-IN')}
                    </p>
                  </>
                ) : (
                  <p className="text-[11px] text-slate-500 pt-1">
                    You currently have no active loans or pending EMI repayments.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* INTERNAL GROUP MEMBER COMPLIANCE RADAR (MEMBERS VIEW) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Users size={18} className="text-emerald-700" />
                  Internal Group Members Compliance Radar
                </h3>
                <p className="text-xs text-slate-500">
                  Internal group members deposit status and active loan commitments
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                {memberComplianceList.length} Internal Members
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-slate-100 text-slate-500 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="p-3">Member Name & Account Reference</th>
                    <th className="p-3">Next Due Deposit</th>
                    <th className="p-3 text-center">Savings Status</th>
                    <th className="p-3 text-center">Loan EMI Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {memberComplianceList.map((peer) => (
                    <tr key={peer.id} className="hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-900">
                        <div className="font-bold text-slate-900">{peer.fullName}</div>
                        <div className="text-[10px] font-mono text-slate-400">{peer.displayAccountId}</div>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900">{formatMonthLabel(peer.nextDepositMonth)}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          peer.isDueDeposit ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                        }`}>
                          {peer.isDueDeposit ? 'DUE NOW' : 'COMPLIANT'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {peer.hasActiveLoan ? (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-900 rounded text-[10px] font-bold">
                            EMI NPR {peer.loanEMI.toLocaleString('en-IN')} DUE
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* LAST 30 DAYS GROUP RECENT TRANSACTIONS (MEMBERS VIEW) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 font-bold text-slate-900 text-xs uppercase tracking-wider flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-emerald-700" />
                <span>Group Transactions Feed (Last 30 Days)</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 font-bold">
                {activityFeed30Days.length} Transactions
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {activityFeed30Days.map((item) => (
                <div key={item.id} className="p-3 hover:bg-slate-50 flex justify-between items-center text-xs transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      item.type === 'DEPOSIT' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {item.type === 'DEPOSIT' ? <PiggyBank size={16} /> : <Receipt size={16} />}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{item.title}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        <strong className="text-slate-900 font-sans font-bold">{item.memberName}</strong> ({item.displayAccountId}) • <span className="text-slate-700 font-bold">{item.formattedTime}</span>
                      </div>
                    </div>
                  </div>
                  <div className="font-mono font-black text-emerald-900 text-sm">
                    + NPR {item.amount.toLocaleString('en-IN')}
                  </div>
                </div>
              ))}

              {activityFeed30Days.length === 0 && (
                <div className="p-6 text-center text-slate-400 text-xs font-medium">
                  No group deposits or loan repayments recorded in the last 30 days.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ==================== ADMIN & SUPERADMIN VIEW ==================== */}
      {isAdmin && (
        <>
          {/* Row 1: Primary Group Financial KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Liquid Cash Pool */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-900">
                  Liquid Treasury Cash
                </span>
                <Wallet size={18} className="text-blue-700" />
              </div>
              <div className="text-xl font-black text-slate-900 font-mono">
                NPR {liquidCashOnHand.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-slate-500">
                Liquidity Ratio: <strong className="text-blue-900 font-bold">{liquidityRatio}%</strong>
              </p>
            </div>

            {/* Savings Deposits */}
            <div className="p-4 bg-emerald-50/80 border-2 border-emerald-300 rounded-xl shadow-xs space-y-1">
              <div className="flex items-center justify-between text-emerald-800">
                <span className="text-[10px] font-extrabold uppercase tracking-wider">
                  Total Savings Deposits
                </span>
                <PiggyBank size={18} className="text-emerald-700" />
              </div>
              <div className="text-xl font-black text-emerald-950 font-mono">
                NPR {totalSavingsCollected.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-emerald-800 font-semibold">{internalMembers.length} Active Internal Members</p>
            </div>

            {/* Active Loan Balance */}
            <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl shadow-xs space-y-1">
              <div className="flex items-center justify-between text-amber-800">
                <span className="text-[10px] font-extrabold uppercase tracking-wider">
                  Active Outstanding Loans
                </span>
                <Landmark size={18} className="text-amber-700" />
              </div>
              <div className="text-xl font-black text-amber-950 font-mono">
                NPR {activeLoanPortfolio.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-amber-900 font-semibold">{uniqueActiveBorrowersCount} Active Borrowers</p>
            </div>

            {/* Total Dividends Disbursed Card */}
            <div className="p-4 bg-purple-50/80 border border-purple-200 rounded-xl shadow-xs space-y-1">
              <div className="flex items-center justify-between text-purple-800">
                <span className="text-[10px] font-extrabold uppercase tracking-wider">
                  Dividends Disbursed
                </span>
                <Sparkles size={18} className="text-purple-700" />
              </div>
              <div className="text-xl font-black text-purple-950 font-mono">
                NPR {totalDividendsDisbursed.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-purple-900 font-semibold">
                {(dividendDistributions || []).length} Distribution Events Logged
              </p>
            </div>

          </div>

          {/* Row 2: Comprehensive Group Net Worth Breakdown */}
          <div className="p-4 bg-slate-900 text-white rounded-xl shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs font-mono">
            <div className="space-y-0.5">
              <div className="text-slate-400 uppercase text-[10px] font-sans font-bold">Group Net Worth</div>
              <div className="text-2xl font-black text-emerald-400">
                NPR {netGroupWorth.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-6">
              <div>
                <span className="text-slate-400 text-[10px] block font-sans">Interest & Bank Earnings</span>
                <strong className="text-purple-300">NPR {totalGroupEarnings.toLocaleString('en-IN')}</strong>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block font-sans">Property/Assets</span>
                <strong className="text-blue-300">NPR {totalAssetsValuation.toLocaleString('en-IN')}</strong>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block font-sans">Operating Expenses</span>
                <strong className="text-red-300">NPR {totalExpenses.toLocaleString('en-IN')}</strong>
              </div>
            </div>
          </div>

          {/* HIGH-PRIORITY ADMIN ALERT RADAR (LOAN & SAVINGS DEFAULTERS) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 1. LOAN DEFAULTERS WATCHLIST */}
            <div className="bg-white rounded-2xl border-2 border-red-200 shadow-xs p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-red-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-red-100 text-red-700 rounded-lg">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-red-950 text-xs uppercase tracking-wider">
                      Loan Repayment Defaulters ({loanDefaultersList.length})
                    </h3>
                    <p className="text-[10px] text-red-700">Members or external borrowers with overdue loan EMI payments</p>
                  </div>
                </div>
                {loanDefaultersList.length > 0 && (
                  <span className="px-2 py-0.5 bg-red-800 text-white font-mono text-[10px] font-black rounded-full">
                    ACTION REQUIRED
                  </span>
                )}
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {loanDefaultersList.map((item) => (
                  <div key={item.loanId} className="p-3 bg-red-50/60 border border-red-200 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                        {item.borrowerName}
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                          item.borrowerType === 'NON_MEMBER' ? 'bg-purple-100 text-purple-900' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {item.borrowerType === 'NON_MEMBER' ? 'EXTERNAL' : 'INTERNAL'}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-600 mt-0.5">
                        Code: <strong className="text-slate-800">{item.loanCode}</strong> • Acc: {item.accountId} • Ph: {item.phone}
                      </div>
                      {item.guarantorName && (
                        <div className="text-[10px] font-mono text-blue-900 mt-0.5">
                          Guarantor: <strong>{item.guarantorName}</strong> ({item.guarantorAccountId})
                        </div>
                      )}
                      <div className="text-[10px] text-red-800 font-bold mt-1">
                        Due Date: {item.nextDueDate} <span className="bg-red-200 text-red-950 px-1.5 py-0.2 rounded font-mono text-[9px] ml-1">({item.daysOverdue} Days Overdue)</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-black text-red-900 text-sm">
                        NPR {item.monthlyEmi.toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] font-sans font-bold text-slate-500 block">
                        Bal: NPR {item.balance.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))}

                {loanDefaultersList.length === 0 && (
                  <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center justify-center gap-2">
                    <CalendarCheck size={18} className="text-emerald-600" />
                    No loan defaulters! All loan EMIs are up to date.
                  </div>
                )}
              </div>
            </div>

            {/* 2. SAVINGS DEFAULTERS WATCHLIST (INTERNAL MEMBERS ONLY) */}
            <div className="bg-white rounded-2xl border-2 border-amber-200 shadow-xs p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                    <ShieldAlert size={18} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-amber-950 text-xs uppercase tracking-wider">
                      Savings Defaulters ({currentMonthDefaulters.length})
                    </h3>
                    <p className="text-[10px] text-amber-800">Unpaid monthly deposit for {formatMonthLabel(currentMonthStr)} (Internal Members)</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-500 font-bold">{currentMonthStr}</span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {currentMonthDefaulters.map((member) => (
                  <div key={member.id} className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <div className="font-extrabold text-slate-900">{member.full_name}</div>
                      <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                        Acc ID: <strong>{member.account_id || 'N/A'}</strong> • Phone: {member.phone || 'N/A'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 bg-amber-200/80 text-amber-950 text-[10px] font-extrabold rounded-lg inline-block">
                        NPR 500 PENDING
                      </span>
                    </div>
                  </div>
                ))}

                {currentMonthDefaulters.length === 0 && (
                  <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center justify-center gap-2">
                    <CalendarCheck size={18} className="text-emerald-600" />
                    100% Monthly Savings Compliance Achieved for {formatMonthLabel(currentMonthStr)}!
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* ADMIN DIVIDEND DISTRIBUTION TRACKER TABLE */}
          <div className="bg-white rounded-2xl border border-purple-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-purple-50/60 border-b border-purple-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-purple-950 text-sm flex items-center gap-2">
                  <TrendingUp size={18} className="text-purple-700" />
                  Dividend Distribution Events Directory
                </h3>
                <p className="text-xs text-purple-700">
                  Overview of all profit distribution batches executed across the group
                </p>
              </div>
              <Link
                href="/treasury"
                className="px-3 py-1.5 bg-purple-900 hover:bg-purple-800 text-white font-bold text-xs rounded-lg flex items-center gap-1 transition-colors shadow-xs"
              >
                + New Distribution
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-purple-100/50 text-purple-900 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-3 font-mono">Voucher Code</th>
                    <th className="p-3">Event Title</th>
                    <th className="p-3">Distributed At</th>
                    <th className="p-3">Cutoff Month</th>
                    <th className="p-3 text-center">Recipients</th>
                    <th className="p-3 text-right">Profit Disbursed</th>
                    <th className="p-3">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {(dividendDistributions || []).map((dist: any) => (
                    <tr key={dist.id} className="hover:bg-purple-50/20">
                      <td className="p-3 font-bold text-purple-900">{dist.distribution_code}</td>
                      <td className="p-3 font-sans font-bold text-slate-900">{dist.title}</td>
                      <td className="p-3 text-slate-600">{dist.distributed_at}</td>
                      <td className="p-3 text-slate-700">{dist.cutoff_month}</td>
                      <td className="p-3 text-center font-bold text-slate-800">{dist.eligible_member_count || 0} Members</td>
                      <td className="p-3 text-right font-black text-purple-950 text-sm">
                        NPR {Number(dist.total_profit_pool || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 font-sans text-slate-700 text-[11px]">
                        <strong>{dist.recorded_by_name || 'System Admin'}</strong>
                        <span className="block text-[9px] text-slate-400">{dist.recorded_by_designation}</span>
                      </td>
                    </tr>
                  ))}

                  {(dividendDistributions || []).length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400 font-sans">
                        No dividend distributions recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 1: INTERNAL GROUP MEMBERS COMPLIANCE RADAR */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Users size={18} className="text-emerald-700" />
                  Internal Group Members Compliance Radar
                </h3>
                <p className="text-xs text-slate-500">
                  Full visibility into all internal group members' monthly deposit status and active loan commitments
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-200 px-2.5 py-1 rounded-lg">
                {memberComplianceList.length} Internal Members
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-slate-100 text-slate-500 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="p-3">Member Name & Account ID</th>
                    <th className="p-3">Next Due Deposit</th>
                    <th className="p-3 text-center">Savings Status</th>
                    <th className="p-3 text-center">Loan EMI Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {memberComplianceList.map((peer) => (
                    <tr key={peer.id} className="hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-900">
                        <div className="font-bold text-slate-900">{peer.fullName}</div>
                        <div className="text-[10px] font-mono text-emerald-900 font-extrabold">{peer.displayAccountId}</div>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900">{formatMonthLabel(peer.nextDepositMonth)}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          peer.isDueDeposit ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                        }`}>
                          {peer.isDueDeposit ? 'DUE NOW' : 'COMPLIANT'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {peer.hasActiveLoan ? (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-900 rounded text-[10px] font-bold">
                            EMI NPR {peer.loanEMI.toLocaleString('en-IN')} DUE
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 2: EXTERNAL BORROWERS RADAR */}
          <div className="bg-white rounded-2xl border border-purple-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-purple-50/60 border-b border-purple-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-purple-950 text-sm flex items-center gap-2">
                  <UserCheck size={18} className="text-purple-700" />
                  External Borrowers Radar
                </h3>
                <p className="text-xs text-purple-700">
                  Directory of non-member external borrowers, active loan exposure, and guarantors
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold text-purple-900 bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-lg">
                {externalBorrowersRadarList.length} Registered Borrowers
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-purple-100/50 text-purple-900 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-3">Borrower Name & External ID</th>
                    <th className="p-3">Guarantor (Internal Member)</th>
                    <th className="p-3 text-right">Outstanding Balance</th>
                    <th className="p-3 text-right">Monthly EMI Due</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {externalBorrowersRadarList.map((eb) => (
                    <tr key={eb.id} className="hover:bg-purple-50/20">
                      <td className="p-3 font-medium text-slate-900">
                        <div className="font-bold text-slate-900">{eb.fullName}</div>
                        <div className="text-[10px] font-mono text-purple-900 font-bold">{eb.displayAccountId} • Ph: {eb.phone}</div>
                      </td>
                      <td className="p-3 font-mono text-slate-700">
                        {eb.guarantorAccountId ? (
                          <>
                            <strong className="text-slate-900 font-sans block">{eb.guarantorName}</strong>
                            <span className="text-[10px] text-blue-900 font-bold">({eb.guarantorAccountId})</span>
                          </>
                        ) : (
                          <span className="text-slate-400 font-sans">-</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        {eb.hasActiveLoan ? `NPR ${eb.totalBalance.toLocaleString('en-IN')}` : <span className="text-slate-400 font-normal">NPR 0</span>}
                      </td>
                      <td className="p-3 text-right font-mono font-black text-purple-950">
                        {eb.hasActiveLoan ? `NPR ${eb.totalMonthlyEmi.toLocaleString('en-IN')}` : <span className="text-slate-400 font-normal">-</span>}
                      </td>
                      <td className="p-3 text-center font-mono">
                        {eb.hasActiveLoan ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            eb.isOverdue ? 'bg-red-100 text-red-900' : 'bg-blue-100 text-blue-900'
                          }`}>
                            {eb.isOverdue ? 'EMI OVERDUE' : 'ACTIVE LOAN'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold">
                            NO LOAN EXPOSURE
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {externalBorrowersRadarList.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400 font-sans">
                        No external borrowers registered in the system.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Activity Stream (UNMASKED FOR ADMINS) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 font-bold text-slate-900 text-xs uppercase tracking-wider flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <Receipt size={16} className="text-emerald-700" /> Recent Group Transactions (30-Day Stream)
              </div>
              <Link href="/deposits" className="text-blue-800 hover:underline text-[11px] font-semibold flex items-center gap-0.5">
                View All <ArrowUpRight size={12} />
              </Link>
            </div>

            <div className="divide-y divide-slate-100 font-sans">
              {activityFeed30Days.slice(0, 10).map((item) => (
                <div key={item.id} className="p-3 hover:bg-slate-50 flex justify-between items-center text-xs transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      item.type === 'DEPOSIT' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {item.type === 'DEPOSIT' ? <PiggyBank size={16} /> : <Receipt size={16} />}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{item.title}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        <strong className="text-slate-900 font-sans font-bold">{item.memberName}</strong> ({item.displayAccountId}) • <span className="text-slate-700 font-bold">{item.formattedTime}</span>
                      </div>
                    </div>
                  </div>
                  <div className="font-mono font-black text-emerald-900 text-sm">
                    + NPR {item.amount.toLocaleString('en-IN')}
                  </div>
                </div>
              ))}

              {activityFeed30Days.length === 0 && (
                <div className="p-6 text-center text-slate-400 text-xs">
                  No recent transaction activity recorded yet.
                </div>
              )}
            </div>
          </div>
        </>
      )}

    </div>
  );
}