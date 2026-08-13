import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getCurrentUserRole } from '@/lib/getUserRole';
import { Landmark, Building2, Eye, TrendingUp } from 'lucide-react';
import RecordBankInterestForm from './RecordBankInterestForm';
import RecordAssetForm from './RecordAssetForm';
import UpdateValuationForm from './UpdateValuationForm';
import DistributeDividendForm from './DistributeDividendForm';
import TreasuryListViews from './TreasuryListViews';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const revalidate = 0;

// Local Auth Helper
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
      },
    }
  );
}

export default async function TreasuryPage() {
  const supabaseServer = await getSupabaseServerClient();
  const { data: { user } } = await supabaseServer.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { isAdmin, isSuperAdmin } = await getCurrentUserRole();

  // Fetch active admin profile details to pass into the Forms for the Recorder Badge
  const { data: currentAdminProfile } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, committee_position, role')
    .eq('id', user.id)
    .single();

  const adminProps = currentAdminProfile ? {
    id: currentAdminProfile.id,
    full_name: currentAdminProfile.full_name,
    committee_position: currentAdminProfile.committee_position || undefined,
    role: currentAdminProfile.role || undefined
  } : undefined;

  // 1. Fetch Profiles for Savings Snapshots & Internal Member filtering
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, account_id, user_type, role, status')
    .or('status.eq.ACTIVE,status.is.null');

  const profileList = profiles || [];
  const profileMap = new Map(profileList.map((p) => [String(p.id), p]));

  // Strictly filter out ADMIN and SUPER_ADMIN roles
  const internalMembersRaw = profileList.filter(
    (p) => p.user_type === 'MEMBER' && p.role !== 'ADMIN' && p.role !== 'SUPER_ADMIN' && p.role !== 'SUPERADMIN'
  );

  // 2. Fetch Deposits (INCLUDING for_month) to dynamically calculate savings snapshots based on cutoff month
  const { data: deposits } = await supabaseAdmin
    .from('deposits')
    .select('member_id, amount_paid, for_month');

  const internalMembers = internalMembersRaw.map((m) => {
    // Pass the member's specific deposits to the client for dynamic filtering
    const memberDeposits = (deposits || []).filter((d) => String(d.member_id) === String(m.id));
    return {
      id: m.id,
      full_name: m.full_name,
      account_id: m.account_id || 'N/A',
      deposits: memberDeposits,
    };
  });

  // Descending database queries
  const { data: bankInterests } = await supabaseAdmin
    .from('bank_interest')
    .select('*')
    .order('credit_date', { ascending: false });

  const { data: assets } = await supabaseAdmin
    .from('assets')
    .select('*')
    .order('purchase_date', { ascending: false });

  // Fetch dividend distributions history with individual payouts AND cutoff_month & recorded_by details
  const { data: rawPayouts } = await supabaseAdmin
    .from('dividend_payouts')
    .select('*, dividend_distributions(distribution_code, title, distributed_at, cutoff_month, recorded_by_name, recorded_by_designation)')
    .order('created_at', { ascending: false });

  // Only fetch sensitive Audit Logs if the user is an Admin or Superadmin
  let auditLogs: any = [];
  if (isAdmin) {
    const { data } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });
    auditLogs = data || [];
  }

  const interestList = bankInterests || [];
  const assetList = assets || [];

  const dividendList = (rawPayouts || []).map((p: any) => {
    const member = profileMap.get(String(p.member_id));
    return {
      ...p,
      distribution_code: p.dividend_distributions?.distribution_code || `DIV-${p.id}`,
      title: p.dividend_distributions?.title || 'Profit Share Event',
      distributed_at: p.dividend_distributions?.distributed_at || p.created_at?.slice(0, 10),
      cutoff_month: p.dividend_distributions?.cutoff_month || 'N/A',
      member_name: member?.full_name || 'Group Member',
      member_account_id: member?.account_id || 'N/A',
      // Dynamically map author details from payout or fallback to master distribution record
      recorded_by_name: p.recorded_by_name || p.dividend_distributions?.recorded_by_name || 'System Admin',
      recorded_by_designation: p.recorded_by_designation || p.dividend_distributions?.recorded_by_designation || 'Executive Officer',
    };
  });

  const totalBankInterest = interestList.reduce((sum, b) => sum + Number(b.amount || 0), 0);
  const totalAssetValuation = assetList.reduce((sum, a) => sum + Number(a.current_value || 0), 0);
  const totalDividendsDistributed = dividendList.reduce((sum, d) => sum + Number(d.dividend_amount || 0), 0);

  return (
    <div className="space-y-8 text-left font-sans max-w-7xl mx-auto p-4 sm:p-6 print:p-0 print:space-y-4">
      <div className="print:hidden">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Treasury & Assets</h2>
        <p className="text-xs text-slate-500">
          Central bank interest earnings, profit distributions, fixed property portfolio{isAdmin ? ', and compliance audit trail' : ''}
        </p>
      </div>

      {!isAdmin && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs flex items-center gap-2 print:hidden">
          <Eye size={16} className="text-blue-600 shrink-0" />
          <span>You are viewing treasury records in <strong>Member Mode (Read-Only)</strong>.</span>
        </div>
      )}

      {/* Row 1: Top Metric Cards (3 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Total Bank Interest</span>
            <div className="text-xl font-black text-emerald-800 font-mono mt-1">
              NPR {totalBankInterest.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">{interestList.length} Credit Records</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl shrink-0">
            <Landmark size={24} />
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Property & Assets</span>
            <div className="text-xl font-black text-purple-900 font-mono mt-1">
              NPR {totalAssetValuation.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">{assetList.length} Registered Assets</p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-700 rounded-2xl shrink-0">
            <Building2 size={24} />
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Dividends Distributed</span>
            <div className="text-xl font-black text-blue-900 font-mono mt-1">
              NPR {totalDividendsDistributed.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">{dividendList.length} Payout Vouchers</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-700 rounded-2xl shrink-0">
            <TrendingUp size={24} />
          </div>
        </div>
      </div>

      {/* Executive Management Forms: One Full-Width Card Per Row */}
      {isAdmin && (
        <div className="print:hidden space-y-6">
          
          {/* Row 2: Record Bank Interest */}
          <div className="w-full">
            <RecordBankInterestForm currentAdmin={adminProps} />
          </div>

          {/* Row 3: Distribute Dividend */}
          <div className="w-full">
            <DistributeDividendForm internalMembers={internalMembers} currentAdmin={adminProps} />
          </div>

          {/* Row 4: Register Asset */}
          <div className="w-full">
            <RecordAssetForm currentAdmin={adminProps} />
          </div>

          {/* Row 5: Re-evaluate Asset Valuation */}
          {assetList.length > 0 && (
            <div className="w-full">
              <UpdateValuationForm assetList={assetList} currentAdmin={adminProps} />
            </div>
          )}

        </div>
      )}

      {/* Lists & Audit Logs Directory */}
      <TreasuryListViews
        bankInterestList={interestList}
        assetList={assetList}
        auditLogs={auditLogs}
        dividendList={dividendList}
        isAdmin={isAdmin}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  );
}