import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getCurrentUserRole } from '@/lib/getUserRole';
import { getNextAccountId, getOrganogramData } from '@/app/actions';
import MembersTabContainer from './MembersTabContainer';

export const revalidate = 0;

export default async function MembersPage() {
  const { isAdmin, isSuperAdmin } = await getCurrentUserRole();
  const nextAccountId = await getNextAccountId();
  const organogramNodes = await getOrganogramData();

  // Fetch profiles using supabaseAdmin to bypass RLS restrictions
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .order('full_name');

  const { data: deposits } = await supabaseAdmin.from('deposits').select('member_id, amount_paid');
  const { data: loans } = await supabaseAdmin.from('loans').select('id, borrower_id, principal_amount, status');
  const { data: payments } = await supabaseAdmin.from('loan_payments').select('loan_id, principal_paid');

  // Include all savings members and external borrowers (Exclude ADMIN-XXX & SA-XXX accounts)
  const membersOnly = profiles?.filter(p => p.role !== 'ADMIN' && p.role !== 'SUPER_ADMIN') || [];

  // Calculate financial totals per account
  const financialSummary: Record<string, { totalDeposits: number; activeLoanBalance: number; totalLoansTaken: number }> = {};

  membersOnly.forEach((m) => {
    const memberDeposits = deposits?.filter(d => d.member_id === m.id) || [];
    const totalDeposits = memberDeposits.reduce((sum, d) => sum + Number(d.amount_paid), 0);

    const memberLoans = loans?.filter(l => l.borrower_id === m.id) || [];
    const totalLoansTaken = memberLoans.length;

    let activeLoanBalance = 0;
    memberLoans.filter(l => l.status === 'ACTIVE').forEach((l) => {
      const loanPayments = payments?.filter(p => p.loan_id === l.id) || [];
      const repaid = loanPayments.reduce((sum, p) => sum + Number(p.principal_paid), 0);
      activeLoanBalance += (Number(l.principal_amount) - repaid);
    });

    financialSummary[m.id] = { totalDeposits, activeLoanBalance, totalLoansTaken };
  });

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Member Directory & Access</h2>
        <p className="text-sm text-slate-500">Manage group participants, view member details, and control portal credentials</p>
      </div>

      <MembersTabContainer
        isAdmin={isAdmin}
        isSuperAdmin={isSuperAdmin}
        nextAccountId={nextAccountId}
        membersOnly={membersOnly}
        organogramNodes={organogramNodes || []}
        financialSummary={financialSummary}
      />
    </div>
  );
}