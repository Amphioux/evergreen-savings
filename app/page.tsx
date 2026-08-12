import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getCurrentUserRole } from '@/lib/getUserRole';
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
  CalendarCheck
} from 'lucide-react';

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

export default async function DashboardPage() {
  const { isAdmin } = await getCurrentUserRole();
  const today = new Date();
  const currentMonthStr = today.toISOString().slice(0, 7); // e.g., "2026-08"

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

  // 3. Fetch loans
  const { data: loans } = await supabaseAdmin
    .from('loans')
    .select('*')
    .order('issue_date', { ascending: false });

  const loanList = loans || [];
  const totalDisbursedLoans = loanList.reduce((sum, l) => sum + Number(l.principal_amount || 0), 0);

  // 4. Fetch loan repayments (Safe selection query)
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
  
  // Total Group Earnings = Interest Collected on Loans + Interest Earned from Bank Credits
  const totalGroupEarnings = totalInterestCollected + totalBankInterest;
  
  // Treasury Pool Cash = (Savings + Principal Repaid + Interest Earnings) - Disbursed Loans - Expenses
  const liquidCashOnHand = 
    (totalSavingsCollected + totalPrincipalRepaid + totalGroupEarnings) - totalDisbursedLoans - totalExpenses;

  const netGroupWorth = liquidCashOnHand + activeLoanPortfolio + totalAssetsValuation;

  // Compute Loan EMI Due & Overdue Trackers
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
      borrowerName: borrower?.full_name || 'Borrower',
      accountId: borrower?.account_id || 'N/A',
      monthlyEmi: Number(loan.monthly_emi || 0),
      balance,
      nextDueDate: nextDueDate.toISOString().split('T')[0],
      isOverdue,
    };
  }).filter((t) => t.balance > 0);

  const overdueEmiCount = loanEmiTrackers.filter((t) => t.isOverdue).length;

  // Build Unified Recent Activity Feed formatted in Kathmandu Local Time
  const recentDeposits = depositList.slice(0, 5).map((d) => {
    const member = profileList.find((p) => p.id === d.member_id);
    const rawTimestamp = d.created_at || `${d.for_month}T00:00:00`;
    return {
      type: 'DEPOSIT' as const,
      id: `DEP-${d.id}`,
      rawTimestamp,
      formattedTime: formatKathmanduTime(rawTimestamp),
      title: `Savings Deposit (${d.for_month?.slice(0, 7) || 'Monthly'})`,
      subtitle: `${member?.full_name || 'Member'} (${member?.account_id || 'N/A'})`,
      amount: Number(d.amount_paid || 0),
    };
  });

  const recentRepayments = paymentList.slice(0, 5).map((p) => {
    const loan = loanList.find((l) => String(l.id) === String(p.loan_id));
    const borrower = profileList.find((b) => b.id === loan?.borrower_id);
    const rawTimestamp = `${p.payment_date}T12:00:00`;
    return {
      type: 'REPAYMENT' as const,
      id: p.payment_code || `PY-${p.id}`,
      rawTimestamp,
      formattedTime: formatKathmanduTime(rawTimestamp),
      title: `Loan Payment (${loan?.loan_code || 'Loan'})`,
      subtitle: `${borrower?.full_name || 'Borrower'} (${borrower?.account_id || 'N/A'})`,
      amount: Number(p.principal_paid || 0) + Number(p.interest_paid || 0),
    };
  });

  const activityFeed = [...recentDeposits, ...recentRepayments]
    .sort((a, b) => new Date(b.rawTimestamp).getTime() - new Date(a.rawTimestamp).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-6 text-left">
      
      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Dashboard</h2>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Real-time liquid cash flow, loan portfolio metrics, and compliance trackers
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
          <p className="text-[11px] text-slate-500">Net available pool money</p>
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
      <div className="p-4 bg-slate-900 text-white rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs font-mono">
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

      {/* Row 3: Operational Risk & Compliance Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Unpaid Monthly Savings Defaulters */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
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
                  <div className="text-[10px] text-slate-500 font-mono">ID: {member.account_id || 'N/A'} • {member.phone || 'No Phone'}</div>
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

        {/* Loan EMI Schedule */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
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
                  <div className="font-bold text-slate-900 font-sans">{item.borrowerName} <span className="text-blue-900 text-[10px]">({item.loanCode})</span></div>
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

      {/* Row 4: Recent Activity Stream */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 font-bold text-slate-900 text-xs uppercase tracking-wider flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <Receipt size={16} className="text-emerald-700" /> Recent Group Transactions
          </div>
          <Link href="/deposits" className="text-blue-800 hover:underline text-[11px] font-semibold flex items-center gap-0.5">
            View All <ArrowUpRight size={12} />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {activityFeed.map((item) => (
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
                    {item.subtitle} • <span className="text-slate-700 font-bold">{item.formattedTime}</span>
                  </div>
                </div>
              </div>
              <div className="font-mono font-black text-emerald-900 text-sm">
                + NPR {item.amount.toLocaleString('en-IN')}
              </div>
            </div>
          ))}

          {activityFeed.length === 0 && (
            <div className="p-6 text-center text-slate-400 text-xs">
              No recent transaction activity recorded yet.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}