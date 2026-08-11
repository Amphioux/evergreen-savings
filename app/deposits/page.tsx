import { supabase } from '@/lib/supabase';
import { calculateExpectedSavings } from '@/lib/finance';
import { recordDeposit } from '@/app/actions';
import { getCurrentUserRole } from '@/lib/getUserRole';
import { Wallet, Eye, CheckCircle2 } from 'lucide-react';

export const revalidate = 0;

export default async function DepositsPage() {
  const { isAdmin } = await getCurrentUserRole();
  const { data: profiles } = await supabase.from('profiles').select('*').eq('user_type', 'MEMBER').order('full_name');
  const { data: rules } = await supabase.from('contribution_rules').select('*');
  const { data: deposits } = await supabase.from('deposits').select('*, profiles(full_name)').order('created_at', { ascending: false });

  const savingsRules = rules || [];
  const depositList = deposits || [];
  const membersOnly = profiles || [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Monthly Savings Deposits</h2>
        <p className="text-sm text-slate-500">Track member dues, expected savings, and transaction history</p>
      </div>

      {!isAdmin && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs flex items-center gap-2">
          <Eye size={16} />
          <span>You are viewing this ledger in <strong>Member Mode (Read-Only)</strong>.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Admin Deposit Form */}
        {isAdmin && (
          <div className="lg:col-span-1">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <Wallet size={20} />
                <h3>Record Monthly Deposit</h3>
              </div>
              <form action={recordDeposit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Member *</label>
                  <select name="member_id" required className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900">
                    <option value="">-- Choose Savings Member --</option>
                    {membersOnly.map((m) => (
                      <option key={m.id} value={m.id}>{m.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Deposit Month *</label>
                  <input name="for_month" required type="month" defaultValue={new Date().toISOString().slice(0, 7)} className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Amount (NPR) *</label>
                  <input name="amount_paid" required type="number" defaultValue={500} className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900" />
                </div>
                <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm py-2.5 rounded-lg transition-colors">
                  Submit Deposit
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Member Savings Overview */}
        <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="p-4 border-b border-slate-200 font-semibold text-slate-800">
            Savings Overview by Member
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Member Name</th>
                  <th className="p-3">Expected Total</th>
                  <th className="p-3">Total Paid</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {membersOnly.map((member) => {
                  const memberDeposits = depositList.filter(d => d.member_id === member.id);
                  const totalPaid = memberDeposits.reduce((acc, curr) => acc + Number(curr.amount_paid), 0);
                  const expected = calculateExpectedSavings(member.joined_date, savingsRules);
                  const diff = totalPaid - expected;

                  return (
                    <tr key={member.id} className="hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-900">{member.full_name}</td>
                      <td className="p-3 font-mono text-slate-600">NPR {expected.toLocaleString('en-IN')}</td>
                      <td className="p-3 font-mono font-bold text-emerald-800">NPR {totalPaid.toLocaleString('en-IN')}</td>
                      <td className="p-3">
                        {diff >= 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">Up to date</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">Due NPR {Math.abs(diff).toLocaleString('en-IN')}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Raw Transaction History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 font-semibold text-slate-800">Recent Deposit History Logs</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Date Logged</th>
                <th className="p-3">Member</th>
                <th className="p-3">For Month Of</th>
                <th className="p-3">Amount Deposited</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {depositList.map((dep) => (
                <tr key={dep.id} className="hover:bg-slate-50">
                  <td className="p-3 text-slate-500 text-xs">{new Date(dep.created_at).toLocaleDateString()}</td>
                  <td className="p-3 font-medium text-slate-900">{dep.profiles?.full_name}</td>
                  <td className="p-3 font-semibold text-slate-700">{new Date(dep.for_month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</td>
                  <td className="p-3 font-mono font-bold text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 size={14} className="text-emerald-600" /> NPR {Number(dep.amount_paid).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
              {depositList.length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center text-slate-400">No deposits recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}