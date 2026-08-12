import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { formatMonthLabel } from '@/lib/formatters';
import PrintBatchClient from './PrintBatchClient';

export const revalidate = 0;

function cleanName(name?: string | null): string {
  if (!name) return '';
  return name.replace(/\s*\((Admin|Superadmin)\)/gi, '').trim();
}

export default async function PrintBatchPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const month = params.month;

  if (!month) {
    return <div className="p-8 text-center text-sm">No target month specified for batch printing.</div>;
  }

  const formattedMonth = `${month}-01`;

  // Fetch deposits for the selected month along with member profiles
  const { data: rawDeposits } = await supabaseAdmin
    .from('deposits')
    .select('*, profiles!member_id(full_name, account_id)')
    .eq('for_month', formattedMonth)
    .order('deposit_code', { ascending: true });

  const vouchers = (rawDeposits || []).map((d: any) => ({
    deposit_code: d.deposit_code,
    for_month: d.for_month,
    amount_paid: Number(d.amount_paid || 500),
    created_at: d.created_at?.slice(0, 10),
    member_name: cleanName(d.profiles?.full_name || 'Member'),
    member_account_id: d.profiles?.account_id || 'N/A',
    deposited_by_name: cleanName(d.deposited_by_name),
    recorded_by_name: cleanName(d.recorded_by_name || 'System Admin'),
    recorded_by_designation: d.recorded_by_designation || 'Committee Executive',
  }));

  return <PrintBatchClient vouchers={vouchers} monthLabel={formatMonthLabel(month)} />;
}