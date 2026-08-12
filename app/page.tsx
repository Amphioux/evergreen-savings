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
  Percent
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

// Helper: Mask Account IDs for Members Only (e.g., ACC-2024-001 -> ACC-***01)
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

  const currentUserId = user.id;
  const { isAdmin } = await getCurrentUserRole();
  const today = new Date();
  const currentMonthStr = today.toISOString().slice(0, 7);

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
  const activeMembers = profileList.filter(
    (p) => p.user_type === 'MEMBER' && (p.role === 'MEMBER' || !p.role)
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

  const currentMonthDefaulters = activeMembers.filter(
    (m) => !currentMonthDepositedMemberIds.has(m.id)
  );

  // Compliance Rate Calculation (%)
  const monthlyComplianceRate = activeMembers.length > 0
    ? Math.round(((activeMembers.length - currentMonthDefaulters.length) / activeMembers.length) * 100)
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

  // Derived Financial Calculations
  const activeLoanPortfolio = Math.max(0, totalDisbursedLoans - totalPrincipalRepaid);
  const totalGroupEarnings = totalInterestCollected + totalBankInterest;
  const liquidCashOnHand = (totalSavingsCollected + totalPrincipalRepaid + totalGroupEarnings) - totalDisbursedLoans - totalExpenses;
  const netGroupWorth = liquidCashOnHand + activeLoanPortfolio + totalAssetsValuation;

  // Treasury Liquidity Ratio (%)
  const liquidityRatio = totalSavingsCollected > 0
    ? Math.min(100, Math.round((liquidCashOnHand / totalSavingsCollected) * 100))
    : 100;

  // Active Loans Tracker
  const activeLoansList = loanList.filter((l) => l.status === 'ACTIVE');
  const loanEmiTrackers = activeLoansList.map((loan) => {
    const borrower = profileList.find((p) => p.id === loan.borrower_id);
    const loanPayments = paymentList.filter((p) => String(p.loan_id) === String(loan.id));
    const repaid = loanPayments.reduce((sum, p) => sum + Number(p.principal_paid || 0), 0);
    const balance = Math.max(0, Number(loan.principal_amount || 0) - repaid);

    const sortedPayments = [...loanPayments].sort(
      (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
    );
    const lastPaymentDate = sortedPayments[0]?.payment_date || loan.issue_date;
    
    const nextDueDate = new Date(lastPaymentDate);
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);

    const isOverdue = nextDueDate < today && balance > 0;

    return {
      loanId: loan.id,
      loanCode: loan.loan_code || `LN-${loan.id}`,
      borrowerId: loan.borrower_id,
      borrowerName: borrower?.full_name || 'Borrower',
      accountId: borrower?.account_id || 'N/A',
      monthlyEmi: Number(loan.monthly_emi || 0),
      balance,
      nextDueDate: nextDueDate.toISOString().split('T')[0],
      isOverdue,
    };
  }).filter((t) => t.balance > 0);

  const overdueEmiCount = loanEmiTrackers.filter((t) => t.isOverdue).length;

  // Member-Specific Derived Metrics
  const myDeposits = depositList.filter((d) => String(d.member_id) === String(currentUserId));
  const myTotalSavings = myDeposits.reduce((sum, d) => sum + Number(d.amount_paid || 0), 0);
  const myNextDepositMonth = getNextEligibleMonth(currentUserId, depositList);
  const myActiveLoanTracker = loanEmiTrackers.find((t) => String(t.borrowerId) === String(currentUserId));

  // Member Peer Radar Data (Fully Unmasked for Admins, Account IDs Masked for Members)
  const memberComplianceList = activeMembers.map((m) => {
    const nextMonth = getNextEligibleMonth(m.id, depositList);
    const activeLoan = loanEmiTrackers.find((t) => String(t.borrowerId) === String(m.id));
    const isDueDeposit = nextMonth <= currentMonthStr;

    return {
      id: m.id,
      fullName: m.full_name,
      accountId: m.account_id || 'N/A',
      displayAccountId: isAdmin ? (m.account_id || 'N/A') : maskAccountId(m.account_id),
      nextDepositMonth: nextMonth,
      isDueDeposit,
      hasActiveLoan: !!activeLoan,
      loanEMI: activeLoan ? Number(activeLoan.monthlyEmi || 0) : 0,
    };
  });

  // 30-DAY RECENT GROUP TRANSACTIONS STREAM
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
      
      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isAdmin ? 'Executive Dashboard' : 'My Financial Dashboard'}
          </h2>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            {isAdmin 
              ? 'Real-time liquid cash flow, loan portfolio metrics, and compliance trackers'
              : 'Personal savings summary, upcoming due payments, and group radar'}
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
          {/* Member Primary KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-emerald-900 text-white rounded-2xl space-y-1 shadow-xs">
              <div className="flex justify-between items-center text-emerald-300 text-xs font-bold uppercase">
                <span>My Accumulated Savings</span>
                <PiggyBank size={18} />
              </div>
              <div className="text-2xl font-black font-mono">NPR {myTotalSavings.toLocaleString('en-IN')}</div>
              <p className="text-[11px] text-emerald-200 font-medium">{myDeposits.length} Monthly Contributions</p>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-1 shadow-xs">
              <div className="flex justify-between items-center text-amber-800 text-xs font-bold uppercase">
                <span>Active Borrowed Loan</span>
                <Landmark size={18} />
              </div>
              <div className="text-2xl font-black text-amber-950 font-mono">
                NPR {(myActiveLoanTracker?.balance || 0).toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-amber-800 font-semibold">
                {myActiveLoanTracker ? `Code: ${myActiveLoanTracker.loanCode}` : 'No Active Loans'}
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

            {/* Group Savings Health Indicator */}
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl space-y-1 shadow-xs">
              <div className="flex justify-between items-center text-purple-800 text-xs font-bold uppercase">
                <span>Group Deposit Health</span>
                <Percent size={18} />
              </div>
              <div className="text-2xl font-black text-purple-950 font-mono">
                {monthlyComplianceRate}%
              </div>
              <p className="text-[11px] text-purple-800 font-semibold">
                Monthly Savings Compliance Rate
              </p>
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
                    myActiveLoanTracker ? (myActiveLoanTracker.isOverdue ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-900') : 'bg-slate-200 text-slate-600'
                  }`}>
                    {myActiveLoanTracker ? (myActiveLoanTracker.isOverdue ? 'OVERDUE' : 'EMI DUE') : 'NO LOAN'}
                  </span>
                </div>
                {myActiveLoanTracker ? (
                  <>
                    <div className="text-slate-900 font-mono text-sm font-extrabold">
                      Monthly EMI: NPR {myActiveLoanTracker.monthlyEmi.toLocaleString('en-IN')}
                    </div>
                    <div className="text-slate-700 font-mono text-xs font-bold flex items-center justify-between">
                      <span>Next Due Date:</span>
                      <span className={myActiveLoanTracker.isOverdue ? 'text-red-700 font-black' : 'text-blue-900 font-black'}>
                        {myActiveLoanTracker.nextDueDate}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Remaining Principal Balance: NPR {myActiveLoanTracker.balance.toLocaleString('en-IN')}
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

          {/* MEMBER COMPLIANCE RADAR (MEMBERS VIEW) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Users size={18} className="text-emerald-700" />
                  Group Member Compliance Radar
                </h3>
                <p className="text-xs text-slate-500">
                  Group members deposit status and active loan commitments
                </p>
              </div>
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
          {/* Row 1: Primary KPIs */}
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
              <p className="text-[11px] text-emerald-800 font-semibold">{activeMembers.length} Active Members</p>
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
              <p className="text-[11px] text-amber-900 font-semibold">{activeLoansList.length} Active Borrowers</p>
            </div>

            {/* Total Group Revenue */}
            <div className="p-4 bg-purple-50/80 border border-purple-200 rounded-xl shadow-xs space-y-1">
              <div className="flex items-center justify-between text-purple-800">
                <span className="text-[10px] font-extrabold uppercase tracking-wider">
                  Lifetime Group Income
                </span>
                <TrendingUp size={18} className="text-purple-700" />
              </div>
              <div className="text-xl font-black text-purple-950 font-mono">
                NPR {totalGroupEarnings.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-purple-900 font-semibold">Includes NPR {totalInterestCollected.toLocaleString('en-IN')} Loan Interest</p>
            </div>

          </div>

          {/* Row 2: Comprehensive Net Group Valuation */}
          <div className="p-4 bg-slate-900 text-white rounded-xl shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs font-mono">
            <div className="space-y-0.5">
              <div className="text-slate-400 uppercase text-[10px] font-sans font-bold">Total Net Worth</div>
              <div className="text-2xl font-black text-emerald-400">
                NPR {netGroupWorth.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-6">
              <div>
                <span className="text-slate-400 text-[10px] block font-sans">Loan Interest Income</span>
                <strong className="text-purple-300">NPR {totalInterestCollected.toLocaleString('en-IN')}</strong>
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

          {/* Row 3: GROUP MEMBER COMPLIANCE RADAR (UNMASKED FOR ADMINS) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Users size={18} className="text-emerald-700" />
                  Group Member Compliance Radar
                </h3>
                <p className="text-xs text-slate-500">
                  Full visibility into all group members' deposit status and active loan commitments
                </p>
              </div>
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

          {/* Row 4: Operational Risk & Compliance Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Unpaid Monthly Savings Defaulters (UNMASKED FOR ADMINS) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs uppercase tracking-wider">
                  <ShieldAlert size={16} className="text-amber-600" />
                  <span>Current Month Savings Defaulters ({currentMonthDefaulters.length})</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 font-bold">{currentMonthStr}</span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {currentMonthDefaulters.map((member) => (
                  <div key={member.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{member.full_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">ID: {member.account_id || 'N/A'} • Phone: {member.phone || 'N/A'}</div>
                    </div>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-bold rounded">
                      Pending Deposit
                    </span>
                  </div>
                ))}

                {currentMonthDefaulters.length === 0 && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold flex items-center justify-center gap-2">
                    <CalendarCheck size={16} /> 100% Monthly Deposit Compliance Achieved!
                  </div>
                )}
              </div>
            </div>

            {/* Loan EMI Schedule (UNMASKED FOR ADMINS) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs uppercase tracking-wider">
                  <Clock size={16} className="text-blue-700" />
                  <span>Loan EMI Schedule</span>
                </div>
                {overdueEmiCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] font-extrabold rounded-full flex items-center gap-1">
                    <AlertTriangle size={12} /> {overdueEmiCount} Overdue
                  </span>
                )}
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {loanEmiTrackers.map((item) => (
                  <div key={item.loanId} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center text-xs font-mono">
                    <div>
                      <div className="font-bold text-slate-900 font-sans">{item.borrowerName} <span className="text-blue-900 text-[10px]">({item.loanCode} / {item.accountId})</span></div>
                      <div className="text-[10px] text-slate-500 font-sans">
                        Due: <strong>{item.nextDueDate}</strong> • EMI: NPR {item.monthlyEmi.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">NPR {item.balance.toLocaleString('en-IN')}</div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded inline-block mt-0.5 ${
                        item.isOverdue ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {item.isOverdue ? 'OVERDUE' : 'DUE SOON'}
                      </span>
                    </div>
                  </div>
                ))}

                {loanEmiTrackers.length === 0 && (
                  <div className="p-4 text-center text-slate-400 text-xs">
                    No active loans with pending EMIs.
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Row 5: Recent Activity Stream (UNMASKED FOR ADMINS) */}
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