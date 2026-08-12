'use client';

import { useState, useRef } from 'react';
import { recordExpense } from '@/app/actions';
import { PlusCircle } from 'lucide-react';

export default function RecordExpenseForm() {
  const [status, setStatus] = useState<{ error?: string; success?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    setStatus(null);
    setLoading(true);

    const res = await recordExpense(formData);
    setLoading(false);

    if (res?.error) {
      setStatus({ error: res.error });
    } else if (res?.success) {
      setStatus({ success: res.success });
      formRef.current?.reset();
    }
  }

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center gap-2 text-slate-900 font-bold">
        <PlusCircle size={20} className="text-red-600" />
        <h3>Log Committee Expense</h3>
      </div>

      {status?.error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-semibold rounded-lg">
          {status.error}
        </div>
      )}

      {status?.success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg">
          {status.success}
        </div>
      )}

      <form ref={formRef} action={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Expense Title *</label>
          <input 
            name="title" 
            required 
            placeholder="e.g. Annual General Meeting Refreshments" 
            className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900" 
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
            <select name="category" required className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 font-semibold">
              <option value="PROGRAM">Program / Event</option>
              <option value="REFRESHMENTS">Refreshments</option>
              <option value="OFFICE">Office Supplies</option>
              <option value="ASSET_MAINTENANCE">Asset Repair</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Amount (NPR) *</label>
            <input 
              name="amount" 
              required 
              type="number" 
              placeholder="5000" 
              className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900" 
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Expense Date *</label>
          <input 
            name="expense_date" 
            required 
            type="date" 
            defaultValue={new Date().toISOString().split('T')[0]} 
            className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900" 
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Purpose</label>
          <textarea 
            name="notes" 
            rows={2} 
            placeholder="Brief details about committee approval or receipts..." 
            className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900" 
          />
        </div>

        <button 
          disabled={loading} 
          type="submit" 
          className="w-full bg-red-700 hover:bg-red-800 disabled:bg-slate-400 text-white font-bold text-sm py-2.5 rounded-lg transition-colors"
        >
          {loading ? 'Recording...' : 'Record Expense Entry'}
        </button>
      </form>
    </div>
  );
}