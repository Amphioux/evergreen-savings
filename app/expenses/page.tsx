import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getCurrentUserRole } from '@/lib/getUserRole';
import RecordExpenseForm from './RecordExpenseForm';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Receipt, Eye, UserCheck } from 'lucide-react';

export const revalidate = 0;

async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/+$/, ''),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );
}

export default async function ExpensesPage() {
  const supabaseServer = await getSupabaseServerClient();
  const { data: { user } } = await supabaseServer.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { isAdmin } = await getCurrentUserRole();

  // Fetch active admin profile details to pass into the RecordExpenseForm
  const { data: currentAdminProfile } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, committee_position, role')
    .eq('id', user.id)
    .single();

  // Fetch expenses directory ordered by date
  const { data: expenses } = await supabaseAdmin
    .from('expenses')
    .select('*')
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });

  const expenseList = expenses || [];
  const totalExpenses = expenseList.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const categoryLabels: Record<string, string> = {
    PROGRAM: 'Program / Event',
    REFRESHMENTS: 'Refreshments',
    OFFICE: 'Office Supplies',
    ASSET_MAINTENANCE: 'Asset Repair',
    OTHER: 'Other',
  };

  return (
    <div className="space-y-8 text-left font-sans max-w-7xl mx-auto p-4 sm:p-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Committee Expenses & Programs</h2>
        <p className="text-xs text-slate-500">Log and track group funds spent on programs, purchases, and operations</p>
      </div>

      {!isAdmin && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs flex items-center gap-2">
          <Eye size={16} className="text-blue-600 shrink-0" />
          <span>You are viewing expense logs in <strong>Member Mode (Read-Only)</strong>.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Record Expense Form Component (Admins Only) */}
        {isAdmin && (
          <div className="lg:col-span-1">
            <RecordExpenseForm 
              currentAdmin={currentAdminProfile ? {
                id: currentAdminProfile.id,
                full_name: currentAdminProfile.full_name,
                committee_position: currentAdminProfile.committee_position,
                role: currentAdminProfile.role
              } : undefined}
            />
          </div>
        )}

        {/* Expense Summary & Table */}
        <div className={`space-y-4 ${isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2 text-red-950 font-bold text-xs uppercase tracking-wider">
              <Receipt size={20} className="text-red-700" />
              <span>Cumulative Expenses Disbursed</span>
            </div>
            <div className="text-2xl font-black text-red-800 font-mono">
              NPR {totalExpenses.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 font-bold text-slate-900 text-xs uppercase tracking-wider flex justify-between items-center">
              <span>Expenditure Log Directory ({expenseList.length})</span>
              <span className="text-[10px] font-mono text-slate-500 font-bold">Official Records</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-mono">Voucher ID</th>
                    <th className="p-3">Expense Title & Purpose</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Expense Date</th>
                    <th className="p-3">Recorded By</th>
                    <th className="p-3 text-right">Amount Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenseList.map((exp: any) => {
                    const expCode = exp.expense_code || `EXP-${String(exp.id).padStart(4, '0')}`;
                    const categoryDisplay = categoryLabels[exp.category] || exp.category;

                    return (
                      <tr key={exp.id || expCode} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono font-bold text-red-900">{expCode}</td>
                        <td className="p-3 font-medium text-slate-900">
                          <div className="font-bold text-slate-900">{exp.title}</div>
                          {exp.notes && (
                            <div className="text-[11px] text-slate-500 font-normal italic mt-0.5 max-w-xs truncate">
                              {exp.notes}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200">
                            {categoryDisplay}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 font-mono">{exp.expense_date}</td>
                        <td className="p-3 text-slate-700">
                          <div className="font-bold text-slate-900">{exp.recorded_by_name || 'System Admin'}</div>
                          {exp.recorded_by_designation && (
                            <div className="text-[10px] text-slate-400 font-medium">{exp.recorded_by_designation}</div>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-red-700 text-sm">
                          NPR {Number(exp.amount || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}

                  {expenseList.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400 text-xs font-medium">
                        No expense entries recorded in the committee log.
                      </td>
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