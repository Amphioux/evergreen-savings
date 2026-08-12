'use client';

import { useState, useRef } from 'react';
import { updateAssetValuation } from '@/app/actions';
import { Edit3, CheckCircle2, AlertTriangle, UserCheck, ShieldCheck, X } from 'lucide-react';

interface Asset { id: number; asset_name: string; current_value: number; }

interface UpdateValuationFormProps {
  assetList: Asset[];
  currentAdmin?: {
    id: string;
    full_name: string;
    committee_position?: string;
    role?: string;
  };
}

function formatApproverDesignation(admin?: { committee_position?: string; role?: string }): string {
  if (!admin) return 'Committee Officer';
  if (admin.committee_position && admin.committee_position.trim()) {
    const pos = admin.committee_position.replace(/\s*\((Admin|Superadmin)\)/gi, '').trim();
    if (pos && pos.toLowerCase() !== 'admin' && pos.toLowerCase() !== 'superadmin') return pos;
  }
  return admin.role === 'SUPER_ADMIN' ? 'Chairperson / President' : 'Committee Secretary';
}

function cleanAdminName(name?: string): string {
  if (!name) return 'Logged Admin';
  return name.replace(/\s*\((Admin|Superadmin)\)/gi, '').trim();
}

export default function UpdateValuationForm({ assetList, currentAdmin }: UpdateValuationFormProps) {
  const [status, setStatus] = useState<{ error?: string; success?: string } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const [assetId, setAssetId] = useState('');
  const [newValue, setNewValue] = useState('');
  const [reason, setReason] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const adminName = cleanAdminName(currentAdmin?.full_name);
  const adminDesignation = formatApproverDesignation(currentAdmin);
  const selectedAsset = assetList.find((a) => String(a.id) === String(assetId));

  function handleOpenConfirmation(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (!assetId || !newValue || Number(newValue) < 0 || !reason.trim()) {
      setStatus({ error: 'Please enter valid details.' });
      return;
    }
    setShowConfirmModal(true);
  }

  async function handleFinalSubmit() {
    setShowConfirmModal(false);
    setStatus(null);
    setLoading(true);

    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    const res = await updateAssetValuation(formData);
    setLoading(false);

    if (res?.error) setStatus({ error: res.error });
    else if (res?.success) {
      setStatus({ success: res.success });
      formRef.current.reset();
      setAssetId(''); setNewValue(''); setReason('');
    }
  }

  return (
    <div className="bg-purple-50 border border-purple-200 p-5 rounded-2xl shadow-xs space-y-3 font-sans text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-200/60 pb-2">
        <h3 className="font-bold text-purple-950 text-sm flex items-center gap-2">
          <Edit3 size={18} className="text-purple-700" /> Update Property Asset Valuation (Audited)
        </h3>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-purple-200 rounded-lg text-xs font-semibold text-purple-900 w-fit">
          <UserCheck size={13} className="text-purple-700" />
          <span>Editor: <strong>{adminName}</strong> ({adminDesignation})</span>
        </div>
      </div>

      {status?.error && <div className="p-2.5 bg-red-50 text-red-800 text-xs font-bold rounded-lg">{status.error}</div>}
      {status?.success && <div className="p-2.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-lg">{status.success}</div>}

      <form ref={formRef} onSubmit={handleOpenConfirmation} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <select name="asset_id" required value={assetId} onChange={(e) => setAssetId(e.target.value)} className="p-2 border border-slate-300 rounded-lg bg-white font-semibold text-slate-900">
          <option value="">-- Choose Asset --</option>
          {assetList.map((a) => <option key={a.id} value={a.id}>{a.asset_name} (Current: NPR {Number(a.current_value).toLocaleString('en-IN')})</option>)}
        </select>
        <input name="current_value" required type="number" value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="New Valuation (NPR)" className="p-2 border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900" />
        <input name="reason" required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (e.g. Annual valuation)" className="p-2 border border-slate-300 rounded-lg bg-white text-slate-900" />
        <button disabled={loading} type="submit" className="bg-purple-900 hover:bg-purple-800 disabled:bg-slate-400 text-white font-bold rounded-lg p-2 flex items-center justify-center gap-1.5">
          <ShieldCheck size={15} /> {loading ? 'Reviewing...' : 'Review Valuation'}
        </button>
      </form>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-left font-sans">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden space-y-4 p-5">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Edit3 size={18} className="text-purple-800" /> <span>Confirm Valuation Adjustment</span>
              </div>
              <button onClick={() => setShowConfirmModal(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="flex justify-between py-1 border-b"><span className="text-slate-500">Target Asset:</span><strong className="text-slate-900 font-bold">{selectedAsset?.asset_name}</strong></div>
              <div className="flex justify-between py-1 border-b"><span className="text-slate-500">New Proposed Valuation:</span><strong className="font-mono text-purple-900 text-sm font-extrabold">NPR {Number(newValue).toLocaleString('en-IN')}</strong></div>
              <div className="py-1"><span className="text-slate-500 block mb-0.5">Audit Reason:</span><p className="text-slate-800 italic bg-white p-2 border rounded-lg text-[11px]">{reason}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button type="button" onClick={() => setShowConfirmModal(false)} className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl">Edit</button>
              <button type="button" disabled={loading} onClick={handleFinalSubmit} className="py-2.5 bg-purple-900 text-white font-bold text-xs rounded-xl">{loading ? 'Saving...' : 'Confirm & Save Audit'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}