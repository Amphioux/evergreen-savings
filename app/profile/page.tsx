import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { redirect } from 'next/navigation';
import User360Lookup from '../admin/user-lookup/User360Lookup'; // Adjust import path if needed

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

export default async function MemberProfilePage() {
  const supabaseServer = await getSupabaseServerClient();
  const { data: { user } } = await supabaseServer.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch full profiles, deposits, loans, payments, and dividends for this member
  const [
    { data: profiles },
    { data: deposits },
    { data: loans },
    { data: payments },
    { data: dividendPayouts },
    { data: dividendDistributions }
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('*'),
    supabaseAdmin.from('deposits').select('*'),
    supabaseAdmin.from('loans').select('*'),
    supabaseAdmin.from('loan_payments').select('*'),
    supabaseAdmin.from('dividend_payouts').select('*'),
    supabaseAdmin.from('dividend_distributions').select('*')
  ]);

  return (
    <div className="space-y-6 text-left p-4 sm:p-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">My Financial Dossier</h2>
        <p className="text-sm text-slate-500">
          View your complete account overview, savings ledger, loan repayments, and dividend history
        </p>
      </div>

      <User360Lookup
        isAdmin={false}
        defaultUserId={user.id}
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