import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getCurrentUserRole } from '@/lib/getUserRole';
import GroupSavingsDirectoryContainer from './GroupSavingsDirectoryContainer';
import DepositsClientContainer from './DepositsClientContainer';
import ManageFineRulesModal from './ManageFineRulesModal';
import ManageSavingsTierModal from './ManageSavingsTierModal';
import SavingsDefaultersDetailTable from './SavingsDefaultersDetailTable';
import DepositsTabWrapper from './DepositsTabWrapper';
import { getMonthsBetween, getSavingsRateForMonth, calculateSavingsFine } from '@/lib/savingsUtils';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Eye } from 'lucide-react';

export const revalidate = 0;

export default async function DepositsPage() {
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

  if (!user) {
    redirect('/login');
  }

  const currentUserId = user.id;
  const { isAdmin, isSuperAdmin } = await getCurrentUserRole();
  const today = new Date();
  const currentMonthStr = today.toISOString().slice(0, 7);

  // Fetch profiles, deposits, contribution rules, and fine rules in parallel
  const [
    { data: profiles }, 
    { data: rawDeposits },
    { data: contributionRulesData },
    { data: fineRulesData }
  ] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, full_name, account_id, user_type, role, status, phone, joined_date')
      .order('full_name'),
    supabaseAdmin
      .from('deposits')
      .select('*')
      .order('for_month', { ascending: false })
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('contribution_rules')
      .select('*')
      .order('effective_from_month', { ascending: false }),
    supabaseAdmin
      .from('fine_rules')
      .select('*')
      .order('created_at', { ascending: false }),
  ]);

  const allProfiles = profiles || [];
  const profileMap = new Map(allProfiles.map((p) => [String(p.id), p]));
  
  // Normalize contribution_rules rows
  const rulesList = (contributionRulesData || []).map((r: any) => ({
    id: r.id,
    effective_from_month: r.effective_from_month || (r.effective_from ? String(r.effective_from).slice(0, 7) : '2020-01'),
    effective_to_month: r.effective_to_month || (r.effective_to ? String(r.effective_to).slice(0, 7) : null),
    monthly_amount: Number(r.monthly_amount ?? r.amount ?? 500),
    notes: r.notes || r.reason || 'General Assembly Rule',
    recorded_by_name: r.recorded_by_name || 'Board',
    recorded_by_designation: r.recorded_by_designation || 'Executive Officer',
  }));

  const fineRulesList = fineRulesData || [];

  // Identify currently active rate rule
  const currentActiveRule = rulesList.find((r) => !r.effective_to_month) || rulesList[0] || { 
    monthly_amount: 500 
  };

  // Attach profile object in-memory
  const depositList = (rawDeposits || []).map((d: any) => ({
    ...d,
    profiles: profileMap.get(String(d.member_id)) || null,
  }));

  const activeMembers = allProfiles.filter(
    (p) =>
      p.user_type === 'MEMBER' &&
      (p.role === 'MEMBER' || !p.role) &&
      (p.status === 'ACTIVE' || !p.status)
  );

  // Dynamic Historical Joined-Date Defaulter Engine (Strict Grace-Period Filtered)
  const fullDefaultersList = activeMembers.map((member) => {
    const joinedMonth = member.joined_date ? member.joined_date.slice(0, 7) : '2025-01';
    const requiredMonths = getMonthsBetween(joinedMonth, currentMonthStr);
    
    const paidMonthsSet = new Set(
      depositList
        .filter((d) => String(d.member_id) === String(member.id) && d.for_month)
        .map((d) => d.for_month.slice(0, 7))
    );

    const missedMonths = requiredMonths.filter((m) => !paidMonthsSet.has(m));

    const totalDefaultedAmount = missedMonths.reduce((sum, month) => {
      return sum + getSavingsRateForMonth(month, rulesList);
    }, 0);

    // Calculate accrued late fine across missed months taking grace periods into account
    const totalAccruedFine = missedMonths.reduce((sumFine, monthStr) => {
      const baseAmount = getSavingsRateForMonth(monthStr, rulesList);
      return sumFine + calculateSavingsFine(monthStr, baseAmount, fineRulesList);
    }, 0);

    return {
      ...member,
      joinedMonth,
      totalMissedMonthsCount: missedMonths.length,
      missedMonthsList: missedMonths,
      totalDefaultedAmount,
      totalAccruedFine,
      totalPayableWithFine: totalDefaultedAmount + totalAccruedFine,
      isDefaulter: missedMonths.length > 0,
    };
  })
    // STRICT RULE: Only count as a Late Fee Terminal defaulter if accrued fine > 0 (grace period expired)
    .filter((m) => m.totalAccruedFine > 0)
    .sort((a, b) => b.totalPayableWithFine - a.totalPayableWithFine);

  const myDeposits = depositList.filter((d: any) => String(d.member_id) === String(currentUserId));

  return (
    <div className="space-y-6 text-left p-6 max-w-7xl mx-auto font-sans">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Monthly Savings Deposits</h2>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Record monthly contributions, process group meeting bulk savings, and manage late penalty fee collections
          </p>
        </div>
      </div>

      {!isAdmin && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs flex items-center gap-2 print:hidden">
          <Eye size={16} className="text-blue-600 flex-shrink-0" />
          <span>Viewing in <strong>Member Mode</strong>. Voucher IDs and Account IDs for other group members are masked for privacy.</span>
        </div>
      )}

      {/* ACTIVE CONTRIBUTION RATE RULE BANNER */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-extrabold uppercase text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-mono">
              Active Savings Rate Tier
            </span>
            <h3 className="text-base font-black text-slate-900 mt-1">
              NPR {Number(currentActiveRule.monthly_amount).toLocaleString('en-IN')} / Month Per Member
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Historical rates (e.g. NPR 300 prior to 2025) are preserved and applied to past missed months automatically.
            </p>
          </div>

          <div className="flex flex-col gap-2 shrink-0 self-stretch sm:self-auto min-w-[210px]">
            <ManageFineRulesModal fineRules={fineRulesList} isAdmin={isAdmin} />
            <ManageSavingsTierModal currentRules={rulesList} isSuperAdmin={isSuperAdmin} />
          </div>
        </div>
      )}

      {/* Interactive Tab Wrapper */}
      <DepositsTabWrapper
        isAdmin={isAdmin}
        activeMembers={activeMembers}
        depositList={depositList}
        allProfiles={allProfiles}
        fineRulesList={fineRulesList}
        rulesList={rulesList}
        fullDefaultersList={fullDefaultersList}
        myDeposits={myDeposits}
        currentUserId={currentUserId}
      />

    </div>
  );
}