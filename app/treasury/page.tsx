import { supabase } from '@/lib/supabase';
import { getCurrentUserRole } from '@/lib/getUserRole';
import { recordBankInterest, recordAsset } from '@/app/actions';
import { Landmark, Building2, Eye } from 'lucide-react';

export const revalidate = 0;

export default async function TreasuryPage() {
  const { isAdmin } = await getCurrentUserRole();

  const { data: bankInterests } = await supabase.from('bank_interest').select('*').order('credit_date', { ascending: false });
  const { data: assets } = await supabase.from('assets').select('*').order('purchase_date', { ascending: false });

  const totalBankInterest = bankInterests?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
  const totalAssetValue = assets?.reduce((sum, item) => sum + Number(item.current_value), 0) || 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Treasury & Property Portfolio</h2>
        <p className="text-sm text-slate-500">
          {isAdmin ? 'Manage bank interest logs and property acquisitions' : 'Read-only ledger of group central bank earnings and land assets'}
        </p>
      </div>

      {!isAdmin && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs flex items-center gap-2">
          <Eye size={16} />
          <span>You are viewing this ledger in <strong>Member Mode (Read-Only)</strong>.</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">Total Interest Earned from Commercial Bank</div>
          <div className="text-2xl font-bold text-emerald-800 mt-1">NPR {totalBankInterest.toLocaleString('en-IN')}</div>
        </div>
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">Group Property & Fixed Asset Valuation</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">NPR {totalAssetValue.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* Entry Forms (Admin Only) */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 font-semibold">
              <Landmark size={20} />
              <h3>Log Bank Interest Received</h3>
            </div>
            <form action={recordBankInterest} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Interest Amount (NPR) *</label>
                <input name="amount" required type="number" placeholder="e.g. 2500" className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Credit Date *</label>
                <input name="credit_date" required type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Bank Reference / Notes</label>
                <input name="notes" type="text" placeholder="e.g. Q2 Commercial Bank Interest" className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <button type="submit" className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-medium text-sm py-2 rounded-lg transition-colors">
                Save Bank Interest
              </button>
            </form>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-semibold">
              <Building2 size={20} />
              <h3>Record Land / Asset Purchase</h3>
            </div>
            <form action={recordAsset} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Property Name *</label>
                <input name="asset_name" required type="text" placeholder="e.g. Ward 4 Land Parcel" className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Asset Type *</label>
                  <select name="asset_type" className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white">
                    <option value="LAND">Land</option>
                    <option value="FIXED_DEPOSIT">Fixed Deposit</option>
                    <option value="BUILDING">Building</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Purchase Price (NPR) *</label>
                  <input name="purchase_price" required type="number" placeholder="500000" className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Purchase Date *</label>
                <input name="purchase_date" required type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm py-2 rounded-lg transition-colors">
                Save Asset Record
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Portfolio Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 font-semibold text-slate-800">
          Group Asset & Property Ledger
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200 font-semibold">
              <tr>
                <th className="p-3">Asset Name</th>
                <th className="p-3">Type</th>
                <th className="p-3">Purchase Date</th>
                <th className="p-3">Purchase Cost</th>
                <th className="p-3">Est. Current Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assets?.map((asset) => (
                <tr key={asset.id} className="hover:bg-slate-50">
                  <td className="p-3 font-medium text-slate-900">{asset.asset_name}</td>
                  <td className="p-3 text-xs"><span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700">{asset.asset_type}</span></td>
                  <td className="p-3 text-slate-600">{asset.purchase_date}</td>
                  <td className="p-3 font-mono">NPR {Number(asset.purchase_price).toLocaleString('en-IN')}</td>
                  <td className="p-3 font-mono font-bold text-emerald-800">NPR {Number(asset.current_value).toLocaleString('en-IN')}</td>
                </tr>
              ))}
              {(!assets || assets.length === 0) && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400">
                    No property or fixed assets recorded in portfolio yet.
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