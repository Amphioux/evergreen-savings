'use client';

import { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Search, 
  Lock, 
  KeyRound, 
  ShieldAlert,
  Check,
  X,
  Filter,
  UserCheck
} from 'lucide-react';
import RegisterAdminForm from './RegisterAdminForm';
import RegisterSuperAdminForm from './RegisterSuperAdminForm';
import AdminDetailsModal from './AdminDetailsModal';
import ResetUserPasswordModal from './ResetUserPasswordModal';

interface UsersContainerProps {
  isSuperAdmin: boolean;
  profiles?: any[];
  auditLogs?: any[];
  nextAdminAccountId: string;
  nextSuperAdminAccountId: string;
}

export default function UsersContainer({
  isSuperAdmin,
  profiles = [],
  auditLogs = [],
  nextAdminAccountId,
  nextSuperAdminAccountId,
}: UsersContainerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'SUPER_ADMIN'>('ALL');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  const safeProfiles = useMemo(() => (Array.isArray(profiles) ? profiles : []), [profiles]);

  // Keep ONLY Admin & Superadmin profiles
  const administrativeStaff = useMemo(() => {
    return safeProfiles.filter(
      (p) =>
        p.role === 'ADMIN' ||
        p.role === 'SUPER_ADMIN' ||
        p.account_id?.startsWith('ADMIN-') ||
        p.account_id?.startsWith('SA-')
    );
  }, [safeProfiles]);

  // Keep General Members (excluding Admins, Superadmins, and External Borrowers)
  const generalMembers = useMemo(() => {
    return safeProfiles.filter(
      (p) => p.user_type === 'MEMBER' && p.role !== 'ADMIN' && p.role !== 'SUPER_ADMIN'
    );
  }, [safeProfiles]);

  const superAdmins = useMemo(() => {
    return administrativeStaff.filter((p) => p.role === 'SUPER_ADMIN' || p.account_id?.startsWith('SA-'));
  }, [administrativeStaff]);

  const committeeAdmins = useMemo(() => {
    return administrativeStaff.filter((p) => p.role === 'ADMIN' || p.account_id?.startsWith('ADMIN-'));
  }, [administrativeStaff]);

  const generalMembersCount = generalMembers.length;

  const externalBorrowersCount = useMemo(() => {
    return safeProfiles.filter((p) => p.user_type === 'NON_MEMBER').length;
  }, [safeProfiles]);

  // Filter Administrative Staff table
  const filteredAdminStaff = useMemo(() => {
    return administrativeStaff.filter((p) => {
      const isSA = p.role === 'SUPER_ADMIN' || p.account_id?.startsWith('SA-');

      if (roleFilter === 'ADMIN' && isSA) return false;
      if (roleFilter === 'SUPER_ADMIN' && !isSA) return false;

      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      return (
        (p.full_name && p.full_name.toLowerCase().includes(q)) ||
        (p.account_id && p.account_id.toLowerCase().includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q)) ||
        (p.phone && p.phone.includes(q)) ||
        (p.committee_position && p.committee_position.toLowerCase().includes(q))
      );
    });
  }, [administrativeStaff, roleFilter, searchQuery]);

  // Filter General Members table
  const filteredGeneralMembers = useMemo(() => {
    const q = memberSearchQuery.toLowerCase().trim();
    if (!q) return generalMembers;

    return generalMembers.filter(
      (m) =>
        (m.full_name && m.full_name.toLowerCase().includes(q)) ||
        (m.account_id && m.account_id.toLowerCase().includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.phone && m.phone.includes(q))
    );
  }, [generalMembers, memberSearchQuery]);

  return (
    <div className="space-y-6 text-left">

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-purple-800 text-xs font-bold uppercase">
            <span>Superadmins</span>
            <ShieldAlert size={16} />
          </div>
          <div className="text-2xl font-black text-purple-950 font-mono">{superAdmins.length}</div>
          <p className="text-[10px] text-purple-700 font-semibold">Full System Control</p>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-blue-800 text-xs font-bold uppercase">
            <span>Committee Admins</span>
            <ShieldCheck size={16} />
          </div>
          <div className="text-2xl font-black text-blue-950 font-mono">{committeeAdmins.length}</div>
          <p className="text-[10px] text-blue-700 font-semibold">Operations Management</p>
        </div>

        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-bold uppercase">
            <span>General Members</span>
            <Users size={16} />
          </div>
          <div className="text-2xl font-black text-emerald-950 font-mono">{generalMembersCount}</div>
          <p className="text-[10px] text-emerald-700 font-semibold">Registered Cooperative Members</p>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-amber-800 text-xs font-bold uppercase">
            <span>External Borrowers</span>
            <UserCheck size={16} />
          </div>
          <div className="text-2xl font-black text-amber-950 font-mono">{externalBorrowersCount}</div>
          <p className="text-[10px] text-amber-700 font-semibold">Non-Member Borrowers</p>
        </div>
      </div>

      {/* Privileges Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-800 text-xs uppercase flex items-center gap-2">
          <KeyRound size={16} className="text-blue-700" />
          <span>Privilege Tier Matrix</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase">
              <tr>
                <th className="p-3">Platform Capability</th>
                <th className="p-3 text-center">Committee Admin</th>
                <th className="p-3 text-center">Superadmin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              <tr>
                <td className="p-3 text-slate-900 font-bold">Record Deposits, Loan Repayments & Expenses</td>
                <td className="p-3 text-center text-emerald-600"><Check size={16} className="mx-auto" /></td>
                <td className="p-3 text-center text-emerald-600"><Check size={16} className="mx-auto" /></td>
              </tr>
              <tr>
                <td className="p-3 text-slate-900 font-bold">Disburse Loans & View Member Dossiers</td>
                <td className="p-3 text-center text-emerald-600"><Check size={16} className="mx-auto" /></td>
                <td className="p-3 text-center text-emerald-600"><Check size={16} className="mx-auto" /></td>
              </tr>
              <tr>
                <td className="p-3 text-slate-900 font-bold">Register General Members & External Borrowers</td>
                <td className="p-3 text-center text-emerald-600"><Check size={16} className="mx-auto" /></td>
                <td className="p-3 text-center text-emerald-600"><Check size={16} className="mx-auto" /></td>
              </tr>
              <tr>
                <td className="p-3 text-slate-900 font-bold">Register Admins (`ADMIN`) & Superadmins (`SA`)</td>
                <td className="p-3 text-center text-red-500"><X size={16} className="mx-auto" /></td>
                <td className="p-3 text-center text-emerald-600"><Check size={16} className="mx-auto" /></td>
              </tr>
              <tr>
                <td className="p-3 text-slate-900 font-bold">Reassign Executive Positions, Edit Info & Reset Passwords</td>
                <td className="p-3 text-center text-red-500"><X size={16} className="mx-auto" /></td>
                <td className="p-3 text-center text-emerald-600"><Check size={16} className="mx-auto" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Registration Forms (Superadmin Only) */}
      {isSuperAdmin ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RegisterAdminForm nextAccountId={nextAdminAccountId} />
          <RegisterSuperAdminForm nextAccountId={nextSuperAdminAccountId} />
        </div>
      ) : (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center gap-2">
          <Lock size={16} />
          <span>Viewing in <strong>Committee Admin Mode</strong>. Registering new Admins, reassigning positions, or overriding passwords is restricted to Superadmins.</span>
        </div>
      )}

      {/* SECTION 1: ADMIN-ONLY DIRECTORY TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-0">
        <div className="p-4 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <span className="font-semibold text-slate-800 text-sm">
            Administrative Credentials Directory ({filteredAdminStaff.length} of {administrativeStaff.length})
          </span>

          <div className="flex flex-wrap items-center gap-2">
            {/* Role Filter Toggles */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
              <Filter size={13} className="text-slate-500 ml-1" />
              <button
                onClick={() => setRoleFilter('ALL')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  roleFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Staff ({administrativeStaff.length})
              </button>

              <button
                onClick={() => setRoleFilter('ADMIN')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  roleFilter === 'ADMIN'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Admins ({committeeAdmins.length})
              </button>

              <button
                onClick={() => setRoleFilter('SUPER_ADMIN')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  roleFilter === 'SUPER_ADMIN'
                    ? 'bg-purple-950 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Superadmins ({superAdmins.length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Admin Name, Account ID, Position..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-800"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm align-middle">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3 font-mono">Account ID & Name</th>
                <th className="p-3">Role Tier</th>
                <th className="p-3">Executive Designation</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAdminStaff.map((p) => {
                const isSA = p.role === 'SUPER_ADMIN' || p.account_id?.startsWith('SA-');

                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-medium text-slate-900 align-middle">
                      <div className="font-bold text-slate-900">{p.full_name}</div>
                      <div className="text-xs font-mono text-purple-900 font-extrabold">{p.account_id || 'N/A'}</div>
                    </td>

                    <td className="p-3 text-xs font-mono align-middle">
                      <span className={`px-2.5 py-0.5 rounded font-extrabold text-[10px] inline-block ${
                        isSA ? 'bg-purple-100 text-purple-950 border border-purple-300' : 'bg-blue-100 text-blue-950 border border-blue-300'
                      }`}>
                        {isSA ? 'SUPER_ADMIN' : 'ADMIN'}
                      </span>
                    </td>

                    <td className="p-3 text-xs align-middle">
                      <div className="font-bold text-slate-800">{p.committee_position || 'Executive Board'}</div>
                    </td>

                    <td className="p-3 text-xs font-mono text-slate-700 align-middle">{p.phone || 'N/A'}</td>

                    <td className="p-3 text-xs align-middle">
                      <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded inline-block ${
                        p.status === 'INACTIVE' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {p.status || 'ACTIVE'}
                      </span>
                    </td>

                    <td className="p-3 text-right align-middle">
                      <div className="inline-flex items-center justify-end gap-2">
                        {isSuperAdmin && (
                          <ResetUserPasswordModal
                            user={{
                              id: p.id,
                              full_name: p.full_name,
                              account_id: p.account_id || 'N/A',
                              role: p.role,
                            }}
                          />
                        )}
                        <AdminDetailsModal
                          admin={p}
                          auditLogs={auditLogs}
                          isSuperAdmin={isSuperAdmin}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredAdminStaff.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400 text-xs font-medium">
                    No administrative credentials found matching the applied filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: GENERAL MEMBERS PASSWORD MANAGEMENT DIRECTORY */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-0">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Users size={18} className="text-emerald-700" />
              General Members Credentials Directory ({filteredGeneralMembers.length} of {generalMembers.length})
            </h3>
            <p className="text-xs text-slate-500">
              Manage member account login credentials and perform manual password resets
            </p>
          </div>

          <div className="relative sm:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Member Name, Account ID, Email..."
              value={memberSearchQuery}
              onChange={(e) => setMemberSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-700"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm align-middle">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3 font-mono">Account ID & Name</th>
                <th className="p-3">Email Address</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Password Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredGeneralMembers.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-medium text-slate-900 align-middle">
                    <div className="font-bold text-slate-900">{m.full_name}</div>
                    <div className="text-xs font-mono text-emerald-900 font-extrabold">{m.account_id || 'N/A'}</div>
                  </td>

                  <td className="p-3 text-xs font-mono text-slate-700 align-middle">
                    {m.email || <span className="text-slate-400 font-sans italic">No email linked</span>}
                  </td>

                  <td className="p-3 text-xs font-mono text-slate-700 align-middle">{m.phone || 'N/A'}</td>

                  <td className="p-3 text-xs align-middle">
                    <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded inline-block ${
                      m.status === 'INACTIVE' || m.status === 'SETTLED' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {m.status || 'ACTIVE'}
                    </span>
                  </td>

                  <td className="p-3 text-right align-middle">
                    <div className="inline-flex items-center justify-end">
                      {isSuperAdmin ? (
                        <ResetUserPasswordModal
                          user={{
                            id: m.id,
                            full_name: m.full_name,
                            account_id: m.account_id || 'N/A',
                            role: m.role || 'MEMBER',
                          }}
                        />
                      ) : (
                        <span className="text-[11px] text-slate-400 font-semibold px-2.5 py-1 bg-slate-100 rounded border border-slate-200 inline-flex items-center gap-1 cursor-not-allowed">
                          <Lock size={12} /> Restricted
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredGeneralMembers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400 text-xs font-medium">
                    No general member profiles found matching your search query.
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