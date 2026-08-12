'use client';

import { useState, useRef } from 'react';
import { recordBankInterest } from '@/app/actions';
import { Landmark, CheckCircle2, AlertTriangle, UserCheck, ShieldCheck, X } from 'lucide-react';

interface RecordBankInterestFormProps {
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

export default function RecordBankInterestForm({ currentAdmin }: RecordBankInterestFormProps) {
  const [status, setStatus] = useState<{ error?: string; success?: string } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const [amount, setAmount] = useState('');
  const [creditDate, setCreditDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const formRef = useRef<HTMLFormElement>(null);
  const adminName = cleanAdminName(currentAdmin?.full_name);
  const adminDesignation = formatApproverDesignation(currentAdmin);

  function handleOpenConfirmation(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (!amount || Number(amount) <= 0 || !creditDate) {
      setStatus({ error: 'Please enter a valid amount and date.' });
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
    const res = await recordBankInterest(formData);
    setLoading(false);

    if (res?.error) setStatus({ error: res.error });
    else if (res?.success) {
      setStatus({ success: res.success });
      formRef.current.reset();
      setAmount(''); setNotes(''); setCreditDate(new Date().toISOString().split('T')[0]);
    }
  }

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 font-sans text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5"><Landmark size={18} className="text-emerald-700" /> Record Commercial Bank Interest</h3>
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] font-semibold text-emerald-900 w-fit">
          <UserCheck size={12} className="text-emerald-700 shrink-0" />
          <span>Recorder: <strong>{adminName}</strong> ({adminDesignation})</span>
        </div>
      </div>

      {status?.error && <div className="p-2.5 bg-red-50 text-red-800 text-xs font-bold rounded-lg">{status.error}</div>}
      {status?.success && <div className="p-2.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-lg">{status.success}</div>}

      <form ref={formRef} onSubmit={handleOpenConfirmation} className="space-y-3 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block font-bold text-slate-700 mb-1">Amount (NPR) *</label><input name="amount" required type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900" /></div>
          <div><label className="block font-bold text-slate-700 mb-1">Credit Date *</label><input name="credit_date" required type="date" value={creditDate} onChange={(e) => setCreditDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-mono" /></div>
        </div>
        <div><label className="block font-bold text-slate-700 mb-1">Source / Purpose Notes</label><input name="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes..." className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-medium" /></div>
        <button disabled={loading} type="submit" className="w-full bg-emerald-900 text-white font-bold text-xs py-2.5 rounded-xl flex justify-center gap-1.5"><ShieldCheck size={15} /> {loading ? 'Reviewing...' : 'Review & Log Bank Interest'}</button>
      </form>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 text-sm space-y-4">
            <h3 className="font-bold flex justify-between items-center"><span className="flex items-center gap-2"><Landmark size={18} className="text-emerald-800" /> Confirm Bank Interest Entry</span><button onClick={() => setShowConfirmModal(false)}><X size={18} className="text-slate-400"/></button></h3>
            <div className="space-y-2 p-3 bg-slate-50 rounded-xl border text-xs">
              <div className="flex justify-between py-1 border-b"><span className="text-slate-500">Interest Amount:</span><strong className="font-mono text-emerald-900 text-sm font-extrabold">NPR {Number(amount).toLocaleString('en-IN')}</strong></div>
              <div className="flex justify-between py-1 border-b"><span className="text-slate-500">Credit Date:</span><strong className="font-mono text-slate-900">{creditDate}</strong></div>
            </div>
            <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setShowConfirmModal(false)} className="py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl">Edit</button><button type="button" disabled={loading} onClick={handleFinalSubmit} className="py-2.5 bg-emerald-900 text-white font-bold text-xs rounded-xl">{loading ? 'Logging...' : 'Confirm & Log Entry'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}