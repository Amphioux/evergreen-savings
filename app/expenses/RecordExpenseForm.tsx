'use client';

import { useState, useRef } from 'react';
import { recordExpense } from '@/app/actions';
import { PlusCircle, ShieldCheck, CheckCircle2, AlertTriangle, UserCheck, X, FileText } from 'lucide-react';

interface RecordExpenseFormProps {
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
    if (pos && pos.toLowerCase() !== 'admin' && pos.toLowerCase() !== 'superadmin') {
      return pos;
    }
  }
  return admin.role === 'SUPER_ADMIN' ? 'Chairperson / President' : 'Committee Secretary';
}

function cleanAdminName(name?: string): string {
  if (!name) return 'Logged Admin';
  return name.replace(/\s*\((Admin|Superadmin)\)/gi, '').trim();
}

export default function RecordExpenseForm({ currentAdmin }: RecordExpenseFormProps) {
  const [status, setStatus] = useState<{ error?: string; success?: string; expenseCode?: string } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form Fields State for Modal Preview
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('PROGRAM');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const formRef = useRef<HTMLFormElement>(null);

  const adminName = cleanAdminName(currentAdmin?.full_name);
  const adminDesignation = formatApproverDesignation(currentAdmin);

  const categoryLabels: Record<string, string> = {
    PROGRAM: 'Program / Event',
    REFRESHMENTS: 'Refreshments',
    OFFICE: 'Office Supplies',
    ASSET_MAINTENANCE: 'Asset Repair',
    OTHER: 'Other',
  };

  function handleOpenConfirmation(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    if (!title.trim() || !amount || Number(amount) <= 0 || !expenseDate) {
      setStatus({ error: 'Please enter a valid title, positive amount, and expense date.' });
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

    const res = await recordExpense(formData);
    setLoading(false);

    if (res?.error) {
      setStatus({ error: res.error });
    } else if (res?.success) {
      setStatus({ 
        success: res.success,
        expenseCode: res.expense_code
      });
      formRef.current.reset();
      setTitle('');
      setAmount('');
      setNotes('');
      setCategory('PROGRAM');
      setExpenseDate(new Date().toISOString().split('T')[0]);
    }
  }

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 text-left font-sans">
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
          <PlusCircle size={18} className="text-red-600" />
          <h3>Log Committee Expense</h3>
        </div>

        {/* Recorded By Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-900">
          <UserCheck size={13} className="text-red-700" />
          <span>Recorded By: <strong>{adminName}</strong> ({adminDesignation})</span>
        </div>
      </div>

      {status?.error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-lg flex items-center gap-2">
          <AlertTriangle size={15} /> {status.error}
        </div>
      )}

      {status?.success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
          <span>{status.success}</span>
        </div>
      )}

      <form ref={formRef} onSubmit={handleOpenConfirmation} className="space-y-3 text-xs">
        <div>
          <label className="block font-bold text-slate-700 mb-1">Expense Title *</label>
          <input 
            name="title" 
            required 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Annual General Meeting Refreshments" 
            className="w-full p-2 border border-slate-300 rounded-lg font-medium text-slate-900 bg-white" 
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Category *</label>
            <select 
              name="category" 
              required 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
            >
              <option value="PROGRAM">Program / Event</option>
              <option value="REFRESHMENTS">Refreshments</option>
              <option value="OFFICE">Office Supplies</option>
              <option value="ASSET_MAINTENANCE">Asset Repair</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Amount (NPR) *</label>
            <input 
              name="amount" 
              required 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="5000" 
              className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 bg-white" 
            />
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Expense Date *</label>
          <input 
            name="expense_date" 
            required 
            type="date" 
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            className="w-full p-2 border border-slate-300 rounded-lg font-mono text-slate-900 bg-white" 
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Notes / Purpose</label>
          <textarea 
            name="notes" 
            rows={2} 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Brief details about committee approval or receipts..." 
            className="w-full p-2 border border-slate-300 rounded-lg font-medium text-slate-900 bg-white" 
          />
        </div>

        <button 
          disabled={loading} 
          type="submit" 
          className="w-full bg-red-700 hover:bg-red-800 disabled:bg-slate-400 text-white font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 mt-2"
        >
          <ShieldCheck size={16} /> Review & Record Expense Entry
        </button>
      </form>

      {/* CONFIRMATION POPUP MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-left font-sans">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden space-y-4 p-5">
            
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <FileText size={18} className="text-red-700" />
                <span>Confirm Expense Entry</span>
              </div>
              <button onClick={() => setShowConfirmModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1">
                <span className="text-[10px] text-red-800 font-bold uppercase tracking-wider block">Recorded & Verified By</span>
                <div className="font-bold text-red-950 text-sm">{adminName}</div>
                <div className="text-red-800 font-semibold text-[11px]">{adminDesignation}</div>
              </div>

              <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between py-1 border-b">
                  <span className="text-slate-500">Expense Title:</span>
                  <strong className="text-slate-900 font-bold">{title}</strong>
                </div>

                <div className="flex justify-between py-1 border-b">
                  <span className="text-slate-500">Category:</span>
                  <strong className="text-slate-900 font-bold">{categoryLabels[category] || category}</strong>
                </div>

                <div className="flex justify-between py-1 border-b">
                  <span className="text-slate-500">Amount Paid:</span>
                  <strong className="font-mono text-red-700 text-sm font-extrabold">NPR {Number(amount).toLocaleString('en-IN')}</strong>
                </div>

                <div className="flex justify-between py-1 border-b">
                  <span className="text-slate-500">Expense Date:</span>
                  <strong className="font-mono text-slate-900">{expenseDate}</strong>
                </div>

                {notes && (
                  <div className="py-1">
                    <span className="text-slate-500 block mb-0.5">Notes:</span>
                    <p className="text-slate-800 font-medium italic bg-white p-2 border rounded-lg text-[11px]">{notes}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Edit Details
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handleFinalSubmit}
                className="py-2.5 bg-red-700 hover:bg-red-800 disabled:bg-slate-400 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                {loading ? 'Recording...' : 'Confirm & Log Entry'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}