'use client';

import { useState } from 'react';
import { updateExpense } from '@/app/actions';
import { Edit2, ShieldCheck, CheckCircle2, AlertTriangle, X } from 'lucide-react';

interface EditExpenseModalProps {
  expense: {
    id: number;
    expense_code?: string;
    title: string;
    category: string;
    amount: number;
    expense_date: string;
    notes?: string | null;
  };
}

export default function EditExpenseModal({ expense }: EditExpenseModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<{ error?: string; success?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Form Field States initialized from existing prop values
  const [title, setTitle] = useState(expense.title || '');
  const [category, setCategory] = useState(expense.category || 'PROGRAM');
  const [amount, setAmount] = useState(String(expense.amount || ''));
  const [expenseDate, setExpenseDate] = useState(expense.expense_date || '');
  const [notes, setNotes] = useState(expense.notes || '');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const res = await updateExpense(formData);
    setLoading(false);

    if (res?.error) {
      setStatus({ error: res.error });
    } else if (res?.success) {
      setStatus({ success: res.success });
      setTimeout(() => {
        setIsOpen(false);
        setStatus(null);
      }, 1000);
    }
  }

  return (
    <>
      {/* Edit Trigger Button */}
      <button
        onClick={() => {
          setIsOpen(true);
          setStatus(null);
        }}
        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
        title="Edit Expense Entry"
      >
        <Edit2 size={13} />
        <span>Edit</span>
      </button>

      {/* Edit Modal Popup */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-left font-sans">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden space-y-4 p-5">
            
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Edit2 size={18} className="text-amber-800" />
                <span>Edit Expense ({expense.expense_code || `EXP-${expense.id}`})</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
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

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <input type="hidden" name="expense_id" value={expense.id} />

              <div>
                <label className="block font-bold text-slate-700 mb-1">Expense Title *</label>
                <input 
                  name="title" 
                  required 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
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
                  className="w-full p-2 border border-slate-300 rounded-lg font-medium text-slate-900 bg-white" 
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                >
                  Cancel
                </button>

                <button 
                  disabled={loading} 
                  type="submit" 
                  className="py-2.5 bg-amber-800 hover:bg-amber-700 disabled:bg-slate-400 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck size={15} />
                  {loading ? 'Saving Changes...' : 'Update Record'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </>
  );
}