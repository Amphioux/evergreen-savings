import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getCurrentUserRole } from '@/lib/getUserRole';
import GroupSavingsDirectoryContainer from './GroupSavingsDirectoryContainer';
import DepositsClientContainer from './DepositsClientContainer';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Eye } from 'lucide-react';

export const revalidate = 0;

export default async function DepositsPage() {
  const cookieStore = await cookies();
  const supabaseServer = createServerClient(
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

  const { data: { user } } = await supabaseServer.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const currentUserId = user.id;
  const { isAdmin } = await getCurrentUserRole();

  // Fetch profiles and deposits separately without PostgREST joins to prevent FK ambiguity errors
  const [{ data: profiles }, { data: rawDeposits }] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, full_name, account_id, user_type, role, status')
      .order('full_name'),
    supabaseAdmin
      .from('deposits')
      .select('*')
      .order('for_month', { ascending: false })
      .order('created_at', { ascending: false }),
  ]);

  const allProfiles = profiles || [];
  const profileMap = new Map(allProfiles.map((p) => [String(p.id), p]));

  // Attach profile object in-memory by String-coerced lookup
  const depositList = (rawDeposits || []).map((d: any) => ({
    ...d,
    profiles: profileMap.get(String(d.member_id)) || null,
  }));

  const activeMembers = allProfiles.filter(
    (p) =>
      p.user_type === 'MEMBER' &&
      (p.role === 'MEMBER' || !p.role) &&
      (p.status === 'ACTIVE' || !p.status)
  );

  // Personal deposits for the logged-in member
  const myDeposits = depositList.filter((d: any) => String(d.member_id) === String(currentUserId));

  return (
    <div className="space-y-8 text-left p-6 max-w-7xl mx-auto">
      <div className="print:hidden">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Monthly Savings Deposits</h2>
        <p className="text-sm text-slate-500">
          Record monthly contributions, process group meeting bulk savings, and manage printable deposit slips
        </p>
      </div>

      {!isAdmin && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs flex items-center gap-2 print:hidden">
          <Eye size={16} className="text-blue-600 flex-shrink-0" />
          <span>Viewing in <strong>Member Mode</strong>. Voucher IDs and Account IDs for other group members are masked for privacy.</span>
        </div>
      )}

      {/* Admin Action Bar (Only visible to Admins) */}
      {isAdmin && <DepositsClientContainer activeMembers={activeMembers} deposits={depositList} allProfiles={allProfiles} />}

      {/* GROUP SAVINGS DIRECTORY (Renders MyDepositsLedger internally for non-admins) */}
      <GroupSavingsDirectoryContainer
        depositList={depositList}
        myDeposits={myDeposits}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
      />
    </div>
  );
}