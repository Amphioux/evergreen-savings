import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { formatMonthLabel } from '@/lib/formatters';
import PrintControls from '../PrintControls';

export const revalidate = 0;

export default async function PrintDirectoryPage() {
  const [{ data: rawDeposits }, { data: profiles }] = await Promise.all([
    supabaseAdmin.from('deposits').select('*').order('for_month', { ascending: false }),
    supabaseAdmin.from('profiles').select('id, full_name, account_id').order('full_name')
  ]);

  const profileMap = new Map((profiles || []).map((p) => [String(p.id), p]));

  // Group Member-Wise
  const groups: Record<string, { member: any; deposits: any[]; baseTotal: number; fineTotal: number }> = {};

  (rawDeposits || []).forEach((dep) => {
    const mId = String(dep.member_id || 'UNKNOWN');
    const member = profileMap.get(mId) || { full_name: 'Member', account_id: 'N/A' };

    if (!groups[mId]) {
      groups[mId] = { member, deposits: [], baseTotal: 0, fineTotal: 0 };
    }

    groups[mId].deposits.push(dep);
    groups[mId].baseTotal += Number(dep.amount_paid || 0);
    groups[mId].fineTotal += Number(dep.fine_amount || 0);
  });

  const memberGroups = Object.values(groups);

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

      {/* Document Header */}
      <div className="text-center border-b pb-4 space-y-1">
        <h1 className="text-2xl font-black uppercase tracking-tight">EVERGREEN SAVINGS GROUP</h1>
        <p className="font-bold uppercase text-slate-600">Official Group Savings & Penalty Directory Report</p>
        <p className="text-[10px] text-slate-400 font-mono">Generated Date: {new Date().toLocaleDateString()}</p>
      </div>

      {/* Member Groups */}
      <div className="space-y-6">
        {memberGroups.map((g) => (
          <div key={g.member.id} className="border border-slate-300 rounded-lg overflow-hidden space-y-2">
            <div className="p-3 bg-slate-100 font-bold flex justify-between items-center text-xs">
              <span>{g.member.full_name} ({g.member.account_id})</span>
              <span className="font-mono">Total Net Savings: NPR {(g.baseTotal + g.fineTotal).toLocaleString('en-IN')}</span>
            </div>

            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-600 border-y">
                <tr>
                  <th className="p-2 font-mono">Voucher Code</th>
                  <th className="p-2">Target Month</th>
                  <th className="p-2 text-right">Base</th>
                  <th className="p-2 text-right">Fine</th>
                  <th className="p-2 text-right">Net Paid</th>
                  <th className="p-2">Collector</th>
                </tr>
              </thead>
              <tbody className="divide-y text-[11px] font-mono">
                {g.deposits.map((dep) => {
                  const base = Number(dep.amount_paid || 0);
                  const fine = Number(dep.fine_amount || 0);
                  return (
                    <tr key={dep.id}>
                      <td className="p-2 font-bold text-blue-900">{dep.deposit_code || `DP-${dep.id}`}</td>
                      <td className="p-2 font-bold">{formatMonthLabel(dep.for_month?.slice(0, 7))}</td>
                      <td className="p-2 text-right">NPR {base.toLocaleString('en-IN')}</td>
                      <td className="p-2 text-right">{fine > 0 ? `+NPR ${fine}` : 'NPR 0'}</td>
                      <td className="p-2 text-right font-black">NPR {(base + fine).toLocaleString('en-IN')}</td>
                      <td className="p-2 font-sans">{dep.recorded_by_name || 'System Admin'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="pt-8 flex justify-between items-center text-[10px] text-slate-500 font-mono border-t">
        <span>Verified Group Master Record</span>
        <span>Executive Committee Stamp & Signature</span>
      </div>
    </div>
  );
}