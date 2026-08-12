'use client';

import { useState, useRef } from 'react';
import { updateAssetValuation } from '@/app/actions';
import { Edit3 } from 'lucide-react';

interface Asset {
  id: number;
  asset_name: string;
  current_value: number;
}

export default function UpdateValuationForm({ assetList }: { assetList: Asset[] }) {
  const [status, setStatus] = useState<{ error?: string; success?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    setStatus(null);
    setLoading(true);

    const res = await updateAssetValuation(formData);
    setLoading(false);

    if (res?.error) {
      setStatus({ error: res.error });
    } else if (res?.success) {
      setStatus({ success: res.success });
      formRef.current?.reset();
    }
  }

  return (
    <div className="bg-purple-50 border border-purple-200 p-5 rounded-xl space-y-3">
      <h3 className="font-bold text-purple-950 text-sm flex items-center gap-2">
        <Edit3 size={18} /> Update Property Asset Valuation (Compliance Audited)
      </h3>

      {status?.error && (
        <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 text-xs font-semibold rounded-lg">
          {status.error}
        </div>
      )}

      {status?.success && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg">
          {status.success}
        </div>
      )}

      <form ref={formRef} action={handleSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <select name="asset_id" required className="p-2 border border-slate-300 rounded text-sm bg-white font-semibold text-slate-900">
          <option value="">-- Choose Asset --</option>
          {assetList.map((a) => (
            <option key={a.id} value={a.id}>
              {a.asset_name} (Current: NPR {Number(a.current_value).toLocaleString('en-IN')})
            </option>
          ))}
        </select>

        <input 
          name="current_value" 
          required 
          type="number" 
          placeholder="New Valuation (NPR)" 
          className="p-2 border border-slate-300 rounded text-sm bg-white text-slate-900" 
        />

        <input 
          name="reason" 
          required 
          placeholder="Reason for change (e.g. Annual valuation review)" 
          className="p-2 border border-slate-300 rounded text-sm bg-white text-slate-900" 
        />

        <button 
          disabled={loading} 
          type="submit" 
          className="bg-purple-900 hover:bg-purple-800 disabled:bg-slate-400 text-white font-bold text-sm rounded p-2 transition-colors"
        >
          {loading ? 'Saving...' : 'Save & Audit'}
        </button>
      </form>
    </div>
  );
}