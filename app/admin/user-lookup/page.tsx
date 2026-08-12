import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getCurrentUserRole } from '@/lib/getUserRole';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import User360Lookup from './User360Lookup';

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
        setAll() {},
      },
    }
  );
}

export default async function UserLookupPage() {
  const { isAdmin, isSuperAdmin } = await getCurrentUserRole();

  if (!isAdmin) {
    redirect('/');
  }

  // Identify current logged-in Admin's name for printable audit trailing
  const supabaseServer = await getSupabaseServerClient();
  const { data: { user } } = await supabaseServer.auth.getUser();

  let currentAdminName = 'Authorized Admin';
  if (user?.id) {
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    if (adminProfile?.full_name) {
      currentAdminName = adminProfile.full_name.replace(/\s*\((Admin|Superadmin)\)/i, '').trim();
    }
  }

  // 1. Fetch all user profiles
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .order('full_name');

  // 2. Fetch all savings deposits
  const { data: deposits } = await supabaseAdmin
    .from('deposits')
    .select('id, member_id, amount_paid, for_month, created_at')
    .order('for_month', { ascending: false });

  // 3. Fetch all loan records
  const { data: loans } = await supabaseAdmin
    .from('loans')
    .select('*')
    .order('issue_date', { ascending: false });

  // 4. Fetch all loan payments
  const { data: payments } = await supabaseAdmin
    .from('loan_payments')
    .select('id, loan_id, payment_code, principal_paid, interest_paid, payment_date, recorded_by_name')
    .order('payment_date', { ascending: false });

  // 5. Fetch all dividend payouts and distributions
  const { data: dividendPayouts } = await supabaseAdmin
    .from('dividend_payouts')
    .select('id, distribution_id, member_id, member_savings_snapshot, dividend_amount, payout_status, created_at');

  const { data: dividendDistributions } = await supabaseAdmin
    .from('dividend_distributions')
    .select('id, distribution_code, title, distributed_at');

  return (
    <div className="space-y-6 text-left">
      <div className="print:hidden">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">360° Member Audit & Detail Lookup</h2>
        <p className="text-sm text-slate-500">
          Search any member to audit complete personal records, identity documentation, savings history, active loan obligations grouped by Loan ID, and dividend payouts.
        </p>
      </div>

      <User360Lookup
        isSuperAdmin={isSuperAdmin}
        currentAdminName={currentAdminName}
        profiles={profiles || []}
        deposits={deposits || []}
        loans={loans || []}
        payments={payments || []}
        dividendPayouts={dividendPayouts || []}
        dividendDistributions={dividendDistributions || []}
      />
    </div>
  );
}