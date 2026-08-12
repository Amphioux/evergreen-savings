import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getCurrentUserRole } from '@/lib/getUserRole';
import { getNextAdminAccountId, getNextSuperAdminAccountId } from '@/app/actions';
import { redirect } from 'next/navigation';
import UsersContainer from './UsersContainer';

export const revalidate = 0;

export default async function UsersPage() {
  const { isAdmin, isSuperAdmin } = await getCurrentUserRole();

  if (!isAdmin) {
    redirect('/');
  }

  const nextAdminAccountId = await getNextAdminAccountId();
  const nextSuperAdminAccountId = await getNextSuperAdminAccountId();

  // Query system profiles
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  // Query audit logs for promotion history tracking
  const { data: auditLogs } = await supabaseAdmin
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6 text-left p-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Access Control & Administration</h2>
        <p className="text-sm text-slate-500">
          Manage system credentials, track board member promotion history, reassign committee positions, and offboard accounts
        </p>
      </div>

      <UsersContainer
        isSuperAdmin={isSuperAdmin}
        profiles={profiles || []}
        auditLogs={auditLogs || []}
        nextAdminAccountId={nextAdminAccountId}
        nextSuperAdminAccountId={nextSuperAdminAccountId}
      />
    </div>
  );
}