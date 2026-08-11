import { supabase } from '@/lib/supabase';
import { getCurrentUserRole } from '@/lib/getUserRole';
import RegisterMemberForm from './RegisterMemberForm';
import { Calendar, ShieldCheck, User, Eye } from 'lucide-react';

export const revalidate = 0;

export default async function MembersPage() {
  const { isAdmin } = await getCurrentUserRole();
  const { data: profiles } = await supabase.from('profiles').select('*').order('full_name');

  const membersOnly = profiles?.filter(p => p.user_type === 'MEMBER') || [];
  const nonMembersOnly = profiles?.filter(p => p.user_type === 'NON_MEMBER') || [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Member Directory & Access</h2>
        <p className="text-sm text-slate-500">Manage group participants and portal login credentials</p>
      </div>

      {!isAdmin && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs flex items-center gap-2">
          <Eye size={16} />
          <span>You are viewing this directory in <strong>Member Mode (Read-Only)</strong>.</span>
        </div>
      )}

      {/* Admin Registration Form */}
      {isAdmin && (
        <div className="max-w-xl">
          <RegisterMemberForm />
        </div>
      )}

      {/* Village Members Directory */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 font-semibold text-slate-800 flex justify-between items-center">
          <span>Registered Village Members ({membersOnly.length})</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Member & Credentials</th>
                <th className="p-3">Access Level</th>
                <th className="p-3">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {membersOnly.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-medium text-slate-900">
                    {member.full_name}
                    <div className="text-xs text-slate-400 font-normal">{member.email || member.phone || 'No login configured'}</div>
                  </td>
                  <td className="p-3 text-xs">
                    {member.role === 'ADMIN' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold bg-purple-100 text-purple-800">
                        <ShieldCheck size={12} /> Committee Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold bg-slate-100 text-slate-700">
                        <User size={12} /> Member (View Only)
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-slate-600">
                    <div className="flex items-center gap-1 text-xs">
                      <Calendar size={13} className="text-slate-400" /> {member.joined_date}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}