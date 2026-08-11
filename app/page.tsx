import { supabase } from '@/lib/supabase';
import SummaryCard from '@/components/SummaryCard';
import { Landmark, PiggyBank, Banknote, Percent, Users } from 'lucide-react';

export const revalidate = 0; // Ensures fresh data on every page refresh

export default async function OverviewPage() {
  // 1. Fetch group treasury metrics
  const { data: treasury } = await supabase.from('treasury_summary').select('*').single();
  
  // 2. Fetch counts
  const { count: memberCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('user_type', 'MEMBER');
  const { count: activeLoanCount } = await supabase.from('loans').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE');

  const summary = treasury || {
    net_cash_in_bank: 0,
    total_member_deposits: 0,
    total_bank_interest: 0,
    total_loan_interest_collected: 0,
    active_loan_principal_outstanding: 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Group Financial Overview</h2>
        <p className="text-sm text-slate-500">Live balance and loan liquidity pool for Evergreen Saving and Credit Group</p>
      </div>

      {/* Main Liquidity Card */}
      <SummaryCard 
        title="Net Bank Account Cash" 
        amount={summary.net_cash_in_bank} 
        icon={<Landmark size={24} />} 
        subtitle="Available cash pool remaining in the central bank account"
        highlight={true}
      />

      {/* Financial Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard 
          title="Total Member Savings" 
          amount={summary.total_member_deposits} 
          icon={<PiggyBank size={20} />} 
          subtitle={`${memberCount || 0} Total Active Members`}
        />
        <SummaryCard 
          title="Active Loans Out" 
          amount={summary.active_loan_principal_outstanding} 
          icon={<Banknote size={20} />} 
          subtitle={`${activeLoanCount || 0} Borrower(s) Active`}
        />
        <SummaryCard 
          title="Loan Interest Earned" 
          amount={summary.total_loan_interest_collected} 
          icon={<Percent size={20} />} 
          subtitle="Collected from 12% & dynamic loans"
        />
        <SummaryCard 
          title="Bank Interest Received" 
          amount={summary.total_bank_interest} 
          icon={<Landmark size={20} />} 
          subtitle="Interest credited by commercial bank"
        />
      </div>
    </div>
  );
}