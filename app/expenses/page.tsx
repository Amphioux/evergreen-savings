import { supabase } from '@/lib/supabase';
import { getCurrentUserRole } from '@/lib/getUserRole';
import RecordExpenseForm from './RecordExpenseForm';
import { Receipt, Eye } from 'lucide-react';

export const revalidate = 0;

export default async function ExpensesPage() {
  const { isAdmin } = await getCurrentUserRole();
  const { data: expenses } = await supabase.from('expenses').select('*').order('expense_date', { ascending: false });

  const expenseList = expenses || [];
  const totalExpenses = expenseList.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Committee Expenses & Programs</h2>
        <p className="text-sm text-slate-500">Log and track group funds spent on programs, purchases, and operations</p>
      </div>

      {!isAdmin && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs flex items-center gap-2">
          <Eye size={16} />
          <span>You are viewing expense logs in <strong>Member Mode (Read-Only)</strong>.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Record Expense Form Component */}
        {isAdmin && (
          <div className="lg:col-span-1">
            <RecordExpenseForm />
          </div>
        )}

        {/* Expense Summary & Table */}
        <div className={`space-y-4 ${isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-950 font-bold">
              <Receipt size={20} className="text-red-700" />
              <span>Cumulative Expenses Disbursed</span>
            </div>
            <div className="text-2xl font-extrabold text-red-800 font-mono">
              NPR {totalExpenses.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 font-semibold text-slate-800">
              Expenditure Log Directory ({expenseList.length})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Title & Notes</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenseList.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-900">
                        {exp.title}
                        {exp.notes && <div className="text-xs text-slate-400 font-normal">{exp.notes}</div>}
                      </td>
                      <td className="p-3 text-xs">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-bold">
                          {exp.category}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 text-xs">{exp.expense_date}</td>
                      <td className="p-3 font-mono font-bold text-red-700">
                        NPR {Number(exp.amount).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                  {expenseList.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-400">No expenses logged yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}