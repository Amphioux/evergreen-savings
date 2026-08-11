import { supabase } from '@/lib/supabase';
import { issueLoan, recordLoanRepayment } from '@/app/actions';
import { getCurrentUserRole } from '@/lib/getUserRole';
import { Banknote, HandCoins, Eye } from 'lucide-react';

export const revalidate = 0;

interface Profile {
  full_name: string;
  user_type: string;
}

interface Loan {
  id: number;
  borrower_id: string;
  principal_amount: number;
  current_rate: number;
  issue_date: string;
  status: string;
  profiles?: Profile | Profile[] | null;
}

interface LoanPayment {
  id: number;
  loan_id: number;
  principal_paid: number;
  interest_paid: number;
  payment_date: string;
}

export default async function LoansPage() {
  const { isAdmin } = await getCurrentUserRole();

  const { data: borrowers } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name');

  const { data: rawLoans } = await supabase
    .from('loans')
    .select('*, profiles(full_name, user_type)')
    .order('issue_date', { ascending: false });

  const { data: rawPayments } = await supabase
    .from('loan_payments')
    .select('*');

  // Explicit type casting to eliminate TypeScript errors
  const loans: Loan[] = (rawLoans as unknown as Loan[]) || [];
  const paymentList: LoanPayment[] = (rawPayments as unknown as LoanPayment[]) || [];
  const activeLoans = loans.filter((l) => l.status === 'ACTIVE');

  // Helper function to safely extract borrower details from single or array relation
  const getBorrowerInfo = (loan: Loan) => {
    if (!loan.profiles) return { full_name: 'Unknown', user_type: 'MEMBER' };
    if (Array.isArray(loan.profiles)) {
      return loan.profiles[0] || { full_name: 'Unknown', user_type: 'MEMBER' };
    }
    return loan.profiles;
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Loan Registry & Repayments</h2>
        <p className="text-sm text-slate-500">
          {isAdmin
            ? 'Issue member loans (capped at NPR 80,000 @ 12%) and dynamic non-member loans'
            : 'Read-only directory of active group loans and repayment records'}
        </p>
      </div>

      {!isAdmin && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs flex items-center gap-2">
          <Eye size={16} />
          <span>You are viewing this ledger in <strong>Member Mode (Read-Only)</strong>.</span>
        </div>
      )}

      {/* Admin Loan Forms */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Issue New Loan */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-emerald-900 font-bold">
              <Banknote size={20} />
              <h3>Issue New Loan</h3>
            </div>
            <form action={issueLoan} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Borrower *</label>
                <select name="borrower_id" required className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900">
                  <option value="">-- Choose Borrower --</option>
                  {borrowers?.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.full_name} ({b.user_type === 'MEMBER' ? 'Member - Max 80k' : 'Non-Member'})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Principal Amount (NPR) *</label>
                  <input name="principal_amount" required type="number" placeholder="e.g. 80000" className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Annual Rate (%) *</label>
                  <input name="current_rate" required type="number" step="0.1" defaultValue={12.0} className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Issue Date *</label>
                <input name="issue_date" required type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900" />
              </div>
              <button type="submit" className="w-full bg-emerald-900 hover:bg-emerald-800 text-white font-bold text-sm py-2 rounded-lg transition-colors">
                Disburse Loan Amount
              </button>
            </form>
          </div>

          {/* Record Loan Repayment */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold">
              <HandCoins size={20} />
              <h3>Record Loan Installment / Interest</h3>
            </div>
            <form action={recordLoanRepayment} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Active Loan *</label>
                <select name="loan_id" required className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900">
                  <option value="">-- Choose Active Loan --</option>
                  {activeLoans.map((l) => {
                    const info = getBorrowerInfo(l);
                    return (
                      <option key={l.id} value={l.id}>
                        Loan #{l.id} - {info.full_name} (Principal: NPR {l.principal_amount})
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Principal Paid (NPR)</label>
                  <input name="principal_paid" type="number" defaultValue={0} className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Interest Paid (NPR)</label>
                  <input name="interest_paid" type="number" defaultValue={0} className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Date *</label>
                <input name="payment_date" required type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900" />
              </div>
              <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm py-2 rounded-lg transition-colors">
                Submit Repayment
              </button>
            </form>
          </div>

        </div>
      )}

      {/* Active Loans Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 font-semibold text-slate-800">
          Active Loans Directory ({loans.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Borrower</th>
                <th className="p-3">Type</th>
                <th className="p-3">Issue Date</th>
                <th className="p-3">Months Elapsed</th>
                <th className="p-3">Rate</th>
                <th className="p-3">Original Principal</th>
                <th className="p-3">Remaining Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loans.map((loan) => {
                const borrower = getBorrowerInfo(loan);
                const loanPayments = paymentList.filter((p) => p.loan_id === loan.id);
                const principalPaid = loanPayments.reduce((sum, p) => sum + Number(p.principal_paid), 0);
                const remainingBalance = Number(loan.principal_amount) - principalPaid;

                // Calculate Passed Months
                const issueDate = new Date(loan.issue_date);
                const today = new Date();
                const monthsPassed = (today.getFullYear() - issueDate.getFullYear()) * 12 + today.getMonth() - issueDate.getMonth();

                return (
                  <tr key={loan.id} className="hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-900">{borrower.full_name}</td>
                    <td className="p-3 text-xs">
                      <span className={`px-2 py-0.5 rounded font-bold ${borrower.user_type === 'MEMBER' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {borrower.user_type}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{loan.issue_date}</td>
                    <td className="p-3 font-semibold text-slate-700">
                      {monthsPassed <= 0 ? 'This Month' : `${monthsPassed} Month(s)`}
                    </td>
                    <td className="p-3 font-bold text-emerald-800">{loan.current_rate}%</td>
                    <td className="p-3 font-mono">NPR {Number(loan.principal_amount).toLocaleString('en-IN')}</td>
                    <td className="p-3 font-mono font-bold text-slate-900">
                      NPR {remainingBalance.toLocaleString('en-IN')}
                    </td>
                  </tr>
                );
              })}
              {loans.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    No active loans issued yet.
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