import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { formatMonthLabel, formatNptDateTime } from '@/lib/formatters';
import PrintControls from '../PrintControls';

export const revalidate = 0;

export default async function PrintTransactionsPage({ searchParams }: any) {
  const { startDate, endDate, search } = await searchParams;

  const [{ data: rawDeposits }, { data: profiles }] = await Promise.all([
    supabaseAdmin.from('deposits').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('profiles').select('id, full_name, account_id')
  ]);

  const profileMap = new Map((profiles || []).map((p) => [String(p.id), p]));

  const transactions = (rawDeposits || []).filter((dep) => {
    const member = profileMap.get(String(dep.member_id));
    const memberName = (member?.full_name || '').toLowerCase();
    const accountId = (member?.account_id || '').toLowerCase();
    const depCode = (dep.deposit_code || '').toLowerCase();

    if (search) {
      const q = search.toLowerCase();
      if (!memberName.includes(q) && !accountId.includes(q) && !depCode.includes(q)) return false;
    }

    const createdDate = dep.created_at ? dep.created_at.slice(0, 10) : `${dep.for_month}-01`;
    if (startDate && createdDate < startDate) return false;
    if (endDate && createdDate > endDate) return false;

    return true;
  });

  const totalBase = transactions.reduce((sum, d) => sum + Number(d.amount_paid || 0), 0);
  const totalFine = transactions.reduce((sum, d) => sum + Number(d.fine_amount || 0), 0);

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
        <p className="font-bold uppercase text-slate-600">Official Deposits Transaction Stream Audit Log</p>
        <p className="text-[10px] text-slate-500 font-mono">
          {startDate && endDate ? `Filter Date Range: ${startDate} to ${endDate}` : 'Full Transaction Stream'}
        </p>
      </div>

      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-700 border-y">
          <tr>
            <th className="p-2.5 font-mono">Voucher ID</th>
            <th className="p-2.5">Member Name</th>
            <th className="p-2.5">Month</th>
            <th className="p-2.5 text-right">Base Deposit</th>
            <th className="p-2.5 text-right">Fine Collected</th>
            <th className="p-2.5 text-right font-black">Net Cash</th>
            <th className="p-2.5">Transaction Time</th>
          </tr>
        </thead>
        <tbody className="divide-y text-xs">
          {transactions.map((dep) => {
            const member = profileMap.get(String(dep.member_id));
            const base = Number(dep.amount_paid || 0);
            const fine = Number(dep.fine_amount || 0);

            return (
              <tr key={dep.id}>
                <td className="p-2.5 font-mono font-bold text-blue-900">{dep.deposit_code || `DP-${dep.id}`}</td>
                <td className="p-2.5 font-bold">{member?.full_name || 'Member'} ({member?.account_id || 'N/A'})</td>
                <td className="p-2.5 font-mono">{formatMonthLabel(dep.for_month?.slice(0, 7))}</td>
                <td className="p-2.5 text-right font-mono">NPR {base.toLocaleString('en-IN')}</td>
                <td className="p-2.5 text-right font-mono font-bold text-amber-900">{fine > 0 ? `+NPR ${fine}` : 'NPR 0'}</td>
                <td className="p-2.5 text-right font-mono font-black text-emerald-950">NPR {(base + fine).toLocaleString('en-IN')}</td>
                <td className="p-2.5 font-mono text-[10px] text-slate-500">{formatNptDateTime(dep.created_at)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-800 text-xs">
          <tr>
            <td colSpan={3} className="p-3">Total ({transactions.length} Transactions)</td>
            <td className="p-3 text-right font-mono">NPR {totalBase.toLocaleString('en-IN')}</td>
            <td className="p-3 text-right font-mono text-amber-950">+NPR {totalFine.toLocaleString('en-IN')}</td>
            <td className="p-3 text-right font-mono font-black text-emerald-950 text-sm">
              NPR {(totalBase + totalFine).toLocaleString('en-IN')}
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}