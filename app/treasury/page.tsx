import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getCurrentUserRole } from '@/lib/getUserRole';
import { recordBankInterest, recordAsset } from '@/app/actions';
import UpdateValuationForm from './UpdateValuationForm';
import { Landmark, Building2, History } from 'lucide-react';

export const revalidate = 0;

export default async function TreasuryPage() {
  const { isAdmin } = await getCurrentUserRole();

  // Descending database queries (latest transactions and logs first)
  const { data: bankInterests } = await supabaseAdmin
    .from('bank_interest')
    .select('*')
    .order('credit_date', { ascending: false });

  const { data: assets } = await supabaseAdmin
    .from('assets')
    .select('*')
    .order('purchase_date', { ascending: false });

  const { data: auditLogs } = await supabaseAdmin
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false });

  const interestList = bankInterests || [];
  const assetList = assets || [];
  const logs = auditLogs || [];

  const totalBankInterest = interestList.reduce((sum, b) => sum + Number(b.amount || 0), 0);
  const totalAssetValuation = assetList.reduce((sum, a) => sum + Number(a.current_value || 0), 0);

  return (
    <div className="space-y-8 text-left">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Treasury, Assets & Audit Logs</h2>
        <p className="text-sm text-slate-500">
          Central bank interest earnings, fixed property portfolio, and compliance audit trail
        </p>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase text-slate-500">Total Bank Interest Earned</span>
            <div className="text-2xl font-extrabold text-emerald-800 font-mono mt-1">
              NPR {totalBankInterest.toLocaleString('en-IN')}
            </div>
          </div>
          <Landmark size={32} className="text-emerald-700" />
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase text-slate-500">Property & Asset Valuation</span>
            <div className="text-2xl font-extrabold text-purple-900 font-mono mt-1">
              NPR {totalAssetValuation.toLocaleString('en-IN')}
            </div>
          </div>
          <Building2 size={32} className="text-purple-700" />
        </div>
      </div>

      {/* Admin Management Controls */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Record Bank Interest Form */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Landmark size={18} className="text-emerald-700" /> Record Commercial Bank Interest
            </h3>
            <form action={recordBankInterest} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Amount (NPR) *</label>
                  <input
                    name="amount"
                    required
                    type="number"
                    placeholder="2500"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Credit Date *</label>
                  <input
                    name="credit_date"
                    required
                    type="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>
              <input
                name="notes"
                placeholder="Notes (e.g. Q2 Savings Interest Credit)"
                className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
              />
              <button
                type="submit"
                className="w-full bg-emerald-900 hover:bg-emerald-800 text-white font-bold text-xs py-2.5 rounded-lg transition-colors"
              >
                Log Bank Interest Credit
              </button>
            </form>
          </div>

          {/* Register Property Asset Form */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Building2 size={18} className="text-purple-700" /> Register Land / Property Asset
            </h3>
            <form action={recordAsset} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Asset Name *</label>
                  <input
                    name="asset_name"
                    required
                    placeholder="e.g. Ward 4 Land Plot"
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Type *</label>
                  <input
                    name="asset_type"
                    required
                    defaultValue="Land"
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Purchase Price (NPR) *</label>
                  <input
                    name="purchase_price"
                    required
                    type="number"
                    placeholder="500000"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Purchase Date *</label>
                  <input
                    name="purchase_date"
                    required
                    type="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-purple-900 hover:bg-purple-800 text-white font-bold text-xs py-2.5 rounded-lg transition-colors"
              >
                Register Asset Record
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Property Valuation Update Client Component */}
      {isAdmin && assetList.length > 0 && (
        <UpdateValuationForm assetList={assetList} />
      )}

      {/* Compliance Audit Trail Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 font-semibold text-slate-800 text-sm flex items-center gap-2">
          <History size={18} className="text-amber-600" />
          Compliance Audit History Log ({logs.length} Entries)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Action</th>
                <th className="p-3">Audit Details / Changes</th>
                <th className="p-3">Reason</th>
                <th className="p-3">Author</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="p-3 text-slate-500 font-sans">
                    {log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}
                  </td>
                  <td className="p-3">
                    <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded text-[10px] font-sans uppercase">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 text-slate-800 break-all">
                    {log.old_value ? `Old: ${JSON.stringify(log.old_value)} -> New: ${JSON.stringify(log.new_value)}` : JSON.stringify(log.new_value)}
                  </td>
                  <td className="p-3 text-slate-600 font-sans">{log.reason || 'N/A'}</td>
                  <td className="p-3 font-semibold text-slate-800 font-sans">{log.changed_by_email || 'System'}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-5 text-center text-slate-400 font-sans text-xs">
                    No compliance audit logs recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}