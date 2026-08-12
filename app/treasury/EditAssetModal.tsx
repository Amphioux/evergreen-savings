'use client';

import { useState } from 'react';
import { updateAsset } from '@/app/actions';
import { Edit2, X, CheckCircle2, AlertTriangle, Building2 } from 'lucide-react';

export default function EditAssetModal({ asset }: { asset: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ error?: string; success?: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.append('asset_id', String(asset.id));

    const res = await updateAsset(formData);
    setLoading(false);

    if (res?.error) {
      setStatus({ error: res.error });
    } else if (res?.success) {
      setStatus({ success: res.success });
      setTimeout(() => setIsOpen(false), 1000);
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        className="p-1.5 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
        title="Edit Asset Details"
      >
        <Edit2 size={15} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden text-left font-sans">
            
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <Building2 size={18} className="text-purple-700" /> Edit Asset Details
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {status?.error && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 text-xs font-bold rounded-lg flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0" />{status.error}
                </div>
              )}
              {status?.success && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0" />{status.success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Asset Name *</label>
                    <input name="asset_name" required defaultValue={asset.asset_name} className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-medium" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Type *</label>
                    <select name="asset_type" required defaultValue={asset.asset_type?.toUpperCase() || 'LAND'} className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-bold bg-white">
                      <option value="LAND">Land / Real Estate</option>
                      <option value="BUILDING">Building / Office Premises</option>
                      <option value="EQUIPMENT">Office Equipment / Machinery</option>
                      <option value="OTHER">Other Fixed Asset</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Purchase Price (NPR) *</label>
                    <input name="purchase_price" required type="number" defaultValue={asset.purchase_price} className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Purchase Date *</label>
                    <input name="purchase_date" required type="date" defaultValue={asset.purchase_date} className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-mono" />
                  </div>
                </div>
                
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Notes / Description</label>
                  <input name="notes" defaultValue={asset.notes || ''} className="w-full p-2 border border-slate-300 rounded-lg text-slate-900" />
                </div>

                <div className="p-2 bg-purple-50 text-purple-800 text-[10px] rounded-lg mt-2 font-medium">
                  <strong>Note:</strong> To change current valuation, please use the dedicated "Update Valuation" audit tool.
                </div>

                <button disabled={loading} type="submit" className="w-full bg-purple-900 hover:bg-purple-800 disabled:bg-slate-400 text-white font-bold py-2.5 rounded-xl transition-colors cursor-pointer mt-2">
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>

          </div>
        </div>
      )}
    </>
  );
}