import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getCurrentUserRole } from '@/lib/getUserRole';
import { Landmark, Building2, Eye } from 'lucide-react';
import RecordBankInterestForm from './RecordBankInterestForm';
import RecordAssetForm from './RecordAssetForm';
import UpdateValuationForm from './UpdateValuationForm';
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

  const { isAdmin } = await getCurrentUserRole();

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

  // Descending database queries (latest transactions and logs first)
  const { data: bankInterests } = await supabaseAdmin
    .from('bank_interest')
    .select('*')
    .order('credit_date', { ascending: false });

  const { data: assets } = await supabaseAdmin
    .from('assets')
    .select('*')
    .order('purchase_date', { ascending: false });

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

  const totalBankInterest = interestList.reduce((sum, b) => sum + Number(b.amount || 0), 0);
  const totalAssetValuation = assetList.reduce((sum, a) => sum + Number(a.current_value || 0), 0);

  return (
    <div className="space-y-8 text-left font-sans max-w-7xl mx-auto p-4 sm:p-6 print:p-0 print:space-y-4">
      <div className="print:hidden">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Treasury & Assets</h2>
        <p className="text-xs text-slate-500">
          Central bank interest earnings, fixed property portfolio{isAdmin ? ', and compliance audit trail' : ''}
        </p>
      </div>

      {!isAdmin && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs flex items-center gap-2 print:hidden">
          <Eye size={16} className="text-blue-600 shrink-0" />
          <span>You are viewing treasury records in <strong>Member Mode (Read-Only)</strong>.</span>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Total Bank Interest Earned</span>
            <div className="text-2xl font-black text-emerald-800 font-mono mt-1">
              NPR {totalBankInterest.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">{interestList.length} Credit Records</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl">
            <Landmark size={28} />
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Property & Asset Valuation</span>
            <div className="text-2xl font-black text-purple-900 font-mono mt-1">
              NPR {totalAssetValuation.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">{assetList.length} Registered Assets</p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-700 rounded-2xl">
            <Building2 size={28} />
          </div>
        </div>
      </div>

      {/* Admin Forms (Hidden in Print) */}
      <div className="print:hidden space-y-6">
        {isAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecordBankInterestForm currentAdmin={adminProps} />
            <RecordAssetForm currentAdmin={adminProps} />
          </div>
        )}

        {isAdmin && assetList.length > 0 && (
          <UpdateValuationForm assetList={assetList} currentAdmin={adminProps} />
        )}
      </div>

      {/* Lists & Logs */}
      <TreasuryListViews
        bankInterestList={interestList}
        assetList={assetList}
        auditLogs={auditLogs}
        isAdmin={isAdmin}
      />
    </div>
  );
}