'use client';

import { useState, useMemo, useEffect } from 'react';
import RegisterMemberForm from './RegisterMemberForm';
import MemberDetailModal from './MemberDetailModal';
import CommitteeOrganogram from './CommitteeOrganogram';
import OrganogramManager from './OrganogramManager';
import { Users, UserPlus, UserX, User, ShieldCheck, Search, Filter, RotateCcw, Network, Banknote } from 'lucide-react';
import { getPhotoSignedUrl } from '@/app/actions';

interface MembersTabContainerProps {
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  nextAccountId: string;
  membersOnly: any[];
  organogramNodes?: any[];
  financialSummary: Record<string, { totalDeposits: number; activeLoanBalance: number; totalLoansTaken: number }>;
}

// Sub-component to fetch and render signed photo URLs asynchronously in table rows
function MemberAvatar({ photoPath, name }: { photoPath?: string | null; name: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (photoPath) {
      getPhotoSignedUrl(photoPath).then((signedUrl) => {
        if (isMounted && signedUrl) setUrl(signedUrl);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [photoPath]);

  return (
    <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0 flex items-center justify-center shadow-xs">
      {url ? (
        <img src={url} alt={name} className="w-full h-full object-cover" />
      ) : (
        <User size={20} className="text-slate-400" />
      )}
    </div>
  );
}

export default function MembersTabContainer({
  isAdmin,
  isSuperAdmin = false,
  nextAccountId,
  membersOnly = [],
  organogramNodes = [],
  financialSummary = {},
}: MembersTabContainerProps) {
  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'ORGANOGRAM' | 'REGISTER' | 'SETTLED'>('DIRECTORY');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'MEMBER' | 'NON_MEMBER'>('ALL');
  const [loanFilter, setLoanFilter] = useState<'ALL' | 'WITH_LOAN' | 'NO_LOAN'>('ALL');

  const activeMembers = useMemo(
    () => membersOnly.filter((m) => m.status === 'ACTIVE' || !m.status),
    [membersOnly]
  );
  
  const settledMembers = useMemo(
    () => membersOnly.filter((m) => m.status === 'SETTLED' || m.status === 'INACTIVE'),
    [membersOnly]
  );

  // Count active members with active loan balances
  const activeLoansCount = useMemo(() => {
    return activeMembers.filter((m) => (financialSummary[m.id]?.activeLoanBalance || 0) > 0).length;
  }, [activeMembers, financialSummary]);

  // Filter & Sort Active Members Directory
  const processedActiveMembers = useMemo(() => {
    return activeMembers
      .filter((m) => {
        // Internal vs External Filter
        if (typeFilter === 'MEMBER' && m.user_type !== 'MEMBER') return false;
        if (typeFilter === 'NON_MEMBER' && m.user_type === 'MEMBER') return false;

        // Active Loan Filter
        const activeBalance = financialSummary[m.id]?.activeLoanBalance || 0;
        if (loanFilter === 'WITH_LOAN' && activeBalance <= 0) return false;
        if (loanFilter === 'NO_LOAN' && activeBalance > 0) return false;

        // Search Filter (Member Name or Account ID if Admin)
        const query = searchTerm.toLowerCase().trim();
        if (!query) return true;

        const matchName = m.full_name?.toLowerCase().includes(query);
        const matchAccountId = isAdmin && m.account_id?.toLowerCase().includes(query);

        return matchName || matchAccountId;
      })
      .sort((a, b) => {
        const dateA = new Date(a.joined_date || 0).getTime();
        const dateB = new Date(b.joined_date || 0).getTime();
        if (dateB !== dateA) return dateB - dateA;

        return String(b.account_id || '').localeCompare(String(a.account_id || ''));
      });
  }, [activeMembers, searchTerm, typeFilter, loanFilter, financialSummary, isAdmin]);

  return (
    <div className="space-y-6 text-left">
      
      {/* Sub Navigation Bar */}
      <div className="flex border-b border-slate-200 text-xs sm:text-sm font-bold gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('DIRECTORY')}
          className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'DIRECTORY'
              ? 'border-emerald-800 text-emerald-950 bg-emerald-50/50 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users size={16} /> Directory ({activeMembers.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ORGANOGRAM')}
          className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'ORGANOGRAM'
              ? 'border-purple-800 text-purple-950 bg-purple-50/50 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Network size={16} /> Committee Organogram
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('REGISTER')}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'REGISTER'
                ? 'border-emerald-800 text-emerald-950 bg-emerald-50/50 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserPlus size={16} /> Register New Account
          </button>
        )}

        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('SETTLED')}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'SETTLED'
                ? 'border-amber-700 text-amber-950 bg-amber-50/50 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserX size={16} /> Settled Accounts ({settledMembers.length})
          </button>
        )}
      </div>

      {/* TAB 1: ACTIVE MEMBERS DIRECTORY */}
      {activeTab === 'DIRECTORY' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          
          {/* Header & Controls Bar */}
          <div className="p-4 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="font-semibold text-slate-800 text-sm">
              Active Group Members Directory ({processedActiveMembers.length})
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
              
              {/* Classification Filter Buttons */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
                <Filter size={13} className="text-slate-500 ml-1" />
                <button
                  type="button"
                  onClick={() => setTypeFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    typeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All 
                  {/* ({activeMembers.length}) */}
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('MEMBER')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    typeFilter === 'MEMBER' ? 'bg-emerald-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Internal
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('NON_MEMBER')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    typeFilter === 'NON_MEMBER' ? 'bg-amber-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  External
                </button>
              </div>

              {/* Active Loan Filter Buttons */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
                <Banknote size={13} className="text-slate-500 ml-1" />
                <button
                  type="button"
                  onClick={() => setLoanFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    loanFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setLoanFilter('WITH_LOAN')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    loanFilter === 'WITH_LOAN' ? 'bg-amber-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Active Loan ({activeLoansCount})
                </button>
                <button
                  type="button"
                  onClick={() => setLoanFilter('NO_LOAN')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    loanFilter === 'NO_LOAN' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  No Loan
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative flex-1 sm:w-56">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={isAdmin ? "Search by name or ID..." : "Search by name..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-700 font-medium"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <RotateCcw size={12} />
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* Directory Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Member Details</th>
                  <th className="p-3">Classification</th>
                  <th className="p-3 text-right">Total Savings</th>
                  <th className="p-3 text-right">Active Loan Balance</th>
                  <th className="p-3 text-center">Total Loans Count</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedActiveMembers.map((member) => {
                  const fin = financialSummary[member.id] || { totalDeposits: 0, activeLoanBalance: 0, totalLoansTaken: 0 };
                  const isInternal = member.user_type === 'MEMBER';
                  const hasActiveLoan = fin.activeLoanBalance > 0;

                  return (
                    <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <MemberAvatar photoPath={member.photo_path} name={member.full_name} />
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{member.full_name}</div>
                            {isAdmin && (
                              <div className="text-xs font-mono font-bold text-slate-500">
                                ID: {member.account_id || 'N/A'}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-3 text-xs">
                        {isInternal ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px]">
                            <User size={12} /> Internal Member
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-800 border border-amber-300 text-[10px]">
                            <ShieldCheck size={12} /> External Member
                          </span>
                        )}
                        {member.committee_position && (
                          <div className="text-[10px] text-purple-800 font-semibold mt-0.5">
                            {member.committee_position}
                          </div>
                        )}
                      </td>

                      <td className="p-3 text-right font-mono font-bold text-emerald-900">
                        NPR {fin.totalDeposits.toLocaleString('en-IN')}
                      </td>

                      <td className="p-3 text-right font-mono font-bold">
                        {hasActiveLoan ? (
                          <span className="text-amber-900 font-black px-2 py-0.5 bg-amber-50 rounded border border-amber-200 inline-block">
                            NPR {fin.activeLoanBalance.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">NPR 0</span>
                        )}
                      </td>

                      <td className="p-3 text-center text-xs font-semibold text-slate-700 font-mono">
                        {fin.totalLoansTaken} Loans
                      </td>

                      <td className="p-3 text-right">
                        <MemberDetailModal
                          member={member}
                          financials={fin}
                          isAdmin={isAdmin}
                          isSuperAdmin={isSuperAdmin}
                        />
                      </td>
                    </tr>
                  );
                })}

                {processedActiveMembers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400 text-xs font-medium">
                      No active accounts match the selected filters or search query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: COMMITTEE ORGANOGRAM */}
      {activeTab === 'ORGANOGRAM' && (
        <div className="space-y-6">
          {isAdmin && (
            <OrganogramManager
              organogramNodes={organogramNodes}
              activeMembers={activeMembers}
              isAdmin={isAdmin}
            />
          )}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <CommitteeOrganogram nodes={organogramNodes} isAdmin={isAdmin} />
          </div>
        </div>
      )}

      {/* TAB 3: REGISTER NEW MEMBER (ADMIN ONLY) */}
      {activeTab === 'REGISTER' && isAdmin && (
        <div className="max-w-3xl">
          <RegisterMemberForm nextAccountId={nextAccountId} />
        </div>
      )}

      {/* TAB 4: SETTLED ACCOUNTS (ADMIN ONLY) */}
      {activeTab === 'SETTLED' && isAdmin && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 font-semibold text-slate-800 bg-amber-50/50">
            Settled & Archived Accounts ({settledMembers.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Member</th>
                  <th className="p-3">Type / Role</th>
                  <th className="p-3 text-right">Historical Savings</th>
                  <th className="p-3 font-mono">Settlement Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {settledMembers.map((member) => {
                  const fin = financialSummary[member.id] || { totalDeposits: 0, activeLoanBalance: 0, totalLoansTaken: 0 };
                  const isInternal = member.user_type === 'MEMBER';

                  return (
                    <tr key={member.id} className="hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-900">
                        <div className="flex items-center gap-3">
                          <MemberAvatar photoPath={member.photo_path} name={member.full_name} />
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{member.full_name}</div>
                            <div className="text-xs text-slate-400 font-mono">ID: {member.account_id || 'N/A'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-xs">
                        <span className="px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-800 border border-amber-300 text-[10px]">
                          {isInternal ? 'Internal Member' : 'External Member'}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-700">
                        NPR {fin.totalDeposits.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-xs text-slate-600 font-mono">{member.settled_at || 'Settled'}</td>
                      <td className="p-3 text-right">
                        <MemberDetailModal
                          member={member}
                          financials={fin}
                          isAdmin={isAdmin}
                          isSuperAdmin={isSuperAdmin}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}