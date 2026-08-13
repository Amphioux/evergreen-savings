import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getMonthsBetween, getSavingsRateForMonth, calculateSavingsFine } from '@/lib/savingsUtils';
import { formatMonthLabel } from '@/lib/formatters';
import PrintControls from '../PrintControls';

export const revalidate = 0;

export default async function PrintPenaltyLedgerPage() {
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
      .select('member_id, for_month'),
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
  const rulesList = (contributionRulesData || []).map((r: any) => ({
    id: r.id,
    effective_from_month: r.effective_from_month || (r.effective_from ? String(r.effective_from).slice(0, 7) : '2020-01'),
    effective_to_month: r.effective_to_month || (r.effective_to ? String(r.effective_to).slice(0, 7) : null),
    monthly_amount: Number(r.monthly_amount ?? r.amount ?? 500),
  }));
  const fineRulesList = fineRulesData || [];

  const activeMembers = allProfiles.filter(
    (p) =>
      p.user_type === 'MEMBER' &&
      (p.role === 'MEMBER' || !p.role) &&
      (p.status === 'ACTIVE' || !p.status)
  );

  // Compute grace-expired defaulters
  const gracePassedDefaulters = activeMembers.map((member) => {
    const joinedMonth = member.joined_date ? member.joined_date.slice(0, 7) : '2025-01';
    const requiredMonths = getMonthsBetween(joinedMonth, currentMonthStr);

    const paidMonthsSet = new Set(
      (rawDeposits || [])
        .filter((d) => String(d.member_id) === String(member.id) && d.for_month)
        .map((d) => d.for_month.slice(0, 7))
    );

    const missedMonths = requiredMonths.filter((m) => !paidMonthsSet.has(m));

    const totalDefaultedAmount = missedMonths.reduce((sum, month) => {
      return sum + getSavingsRateForMonth(month, rulesList);
    }, 0);

    const totalAccruedFine = missedMonths.reduce((sumFine, monthStr) => {
      const baseAmount = getSavingsRateForMonth(monthStr, rulesList);
      return sumFine + calculateSavingsFine(monthStr, baseAmount, fineRulesList);
    }, 0);

    const fineActiveMonths = missedMonths.filter((monthStr) => {
      const baseAmount = getSavingsRateForMonth(monthStr, rulesList);
      return calculateSavingsFine(monthStr, baseAmount, fineRulesList) > 0;
    });

    return {
      ...member,
      joinedMonth,
      totalMissedMonthsCount: missedMonths.length,
      missedMonthsList: missedMonths,
      fineActiveMonths,
      totalDefaultedAmount,
      totalAccruedFine,
      totalPayable: totalDefaultedAmount + totalAccruedFine,
    };
  })
  .filter((m) => m.totalAccruedFine > 0) // Strict grace period expiration check
  .sort((a, b) => b.totalPayable - a.totalPayable);

  const grandBaseTotal = gracePassedDefaulters.reduce((sum, m) => sum + m.totalDefaultedAmount, 0);
  const grandFineTotal = gracePassedDefaulters.reduce((sum, m) => sum + m.totalAccruedFine, 0);
  const grandPayableTotal = grandBaseTotal + grandFineTotal;

  return (
    <div className="p-8 bg-white text-slate-900 font-sans text-xs max-w-4xl mx-auto space-y-6">
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      {/* Top Print Control Buttons */}
      <PrintControls />

      {/* Report Header */}
      <div className="text-center border-b border-slate-300 pb-4 space-y-1">
        <h1 className="text-2xl font-black uppercase tracking-tight">EVERGREEN SAVINGS GROUP</h1>
        <p className="font-bold uppercase text-slate-700">Official Grace-Expired Savings Penalty Ledger Report</p>
        <p className="text-[10px] text-slate-500 font-mono">
          As of: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} • Cutoff: {currentMonthStr}
        </p>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-3 gap-4 text-center font-mono text-xs">
        <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg">
          <span className="text-[10px] text-slate-500 uppercase font-sans font-bold block">Grace-Expired Defaulters</span>
          <strong className="text-slate-900 text-sm font-black">{gracePassedDefaulters.length} Members</strong>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg">
          <span className="text-[10px] text-slate-500 uppercase font-sans font-bold block">Overdue Principal Base</span>
          <strong className="text-slate-900 text-sm font-black">NPR {grandBaseTotal.toLocaleString('en-IN')}</strong>
        </div>
        <div className="p-3 bg-amber-50 border border-amber-300 text-amber-950 rounded-lg">
          <span className="text-[10px] text-amber-800 uppercase font-sans font-bold block">Total Accrued Penalty Fines</span>
          <strong className="text-amber-950 text-sm font-black">NPR {grandFineTotal.toLocaleString('en-IN')}</strong>
        </div>
      </div>

      {/* Table */}
      <table className="w-full text-left border-collapse border border-slate-300">
        <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-700 border-b border-slate-300">
          <tr>
            <th className="p-2.5 border-r border-slate-300">#</th>
            <th className="p-2.5 border-r border-slate-300">Member Name & Acc ID</th>
            <th className="p-2.5 border-r border-slate-300">Phone</th>
            <th className="p-2.5 border-r border-slate-300">Grace-Expired Months</th>
            <th className="p-2.5 text-right border-r border-slate-300">Overdue Base</th>
            <th className="p-2.5 text-right border-r border-slate-300">Accrued Fine</th>
            <th className="p-2.5 text-right font-black">Total Payable</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 text-[11px] font-mono">
          {gracePassedDefaulters.map((m, idx) => (
            <tr key={m.id} className="hover:bg-slate-50">
              <td className="p-2.5 border-r border-slate-200 text-slate-400">{idx + 1}</td>
              <td className="p-2.5 border-r border-slate-200 font-sans">
                <strong className="text-slate-900 block">{m.full_name}</strong>
                <span className="text-[10px] text-slate-500 font-mono">Acc: {m.account_id || 'N/A'}</span>
              </td>
              <td className="p-2.5 border-r border-slate-200 text-slate-700 font-sans">{m.phone || 'N/A'}</td>
              <td className="p-2.5 border-r border-slate-200">
                <div className="flex flex-wrap gap-1 max-w-[220px]">
                  {(m.fineActiveMonths || m.missedMonthsList).map((mStr: string) => (
                    <span key={mStr} className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded text-[9px] font-bold">
                      {formatMonthLabel(mStr)}
                    </span>
                  ))}
                </div>
              </td>
              <td className="p-2.5 text-right border-r border-slate-200 font-bold">
                NPR {m.totalDefaultedAmount.toLocaleString('en-IN')}
              </td>
              <td className="p-2.5 text-right border-r border-slate-200 font-bold text-amber-900">
                + NPR {m.totalAccruedFine.toLocaleString('en-IN')}
              </td>
              <td className="p-2.5 text-right font-black text-slate-900 text-xs">
                NPR {m.totalPayable.toLocaleString('en-IN')}
              </td>
            </tr>
          ))}

          {gracePassedDefaulters.length === 0 && (
            <tr>
              <td colSpan={7} className="p-8 text-center text-slate-500 font-sans italic">
                No members currently have grace-expired savings penalty fees accrued.
              </td>
            </tr>
          )}
        </tbody>

        {gracePassedDefaulters.length > 0 && (
          <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-800 text-xs">
            <tr>
              <td colSpan={4} className="p-3 uppercase font-sans">Total Penalty Default Exposure ({gracePassedDefaulters.length} Members)</td>
              <td className="p-3 text-right font-mono">NPR {grandBaseTotal.toLocaleString('en-IN')}</td>
              <td className="p-3 text-right font-mono text-amber-950">+ NPR {grandFineTotal.toLocaleString('en-IN')}</td>
              <td className="p-3 text-right font-mono font-black text-slate-900 text-sm">
                NPR {grandPayableTotal.toLocaleString('en-IN')}
              </td>
            </tr>
          </tfoot>
        )}
      </table>

      {/* Signature Section */}
      <div className="pt-12 grid grid-cols-2 gap-8 text-center text-[10px] text-slate-500 font-sans font-semibold">
        <div>
          <div className="border-b border-slate-300 mb-1 h-12"></div>
          <span>Prepared By (Accountant / Collector)</span>
        </div>
        <div>
          <div className="border-b border-slate-300 mb-1 h-12"></div>
          <span>Approved By (Executive Chairperson / Secretary)</span>
        </div>
      </div>
    </div>
  );
}