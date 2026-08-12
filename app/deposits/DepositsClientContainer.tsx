'use client';

import { useState, useMemo } from 'react';
import { recordDeposit, recordBulkDeposits, recordAdvanceDeposits } from '@/app/actions';
import DepositReceiptModal from './DepositReceiptModal';
import { 
  PiggyBank, 
  Users, 
  Calendar, 
  Plus, 
  X, 
  CheckSquare, 
  AlertCircle 
} from 'lucide-react';

interface DepositsClientContainerProps {
  activeMembers: any[];
  allProfiles?: any[];
  deposits?: any[];
}

function getNextEligibleMonth(memberId: string, deposits: any[] = []): string {
  if (!memberId) return new Date().toISOString().slice(0, 7);

  const memberMonths = deposits
    .filter((d) => String(d.member_id) === String(memberId) && d.for_month)
    .map((d) => d.for_month.slice(0, 7))
    .sort();

  if (memberMonths.length === 0) {
    return new Date().toISOString().slice(0, 7);
  }

  const latest = memberMonths[memberMonths.length - 1];
  const [yStr, mStr] = latest.split('-');
  let year = parseInt(yStr, 10);
  let month = parseInt(mStr, 10);

  month++;
  if (month > 12) {
    month = 1;
    year++;
  }

  return `${year}-${month.toString().padStart(2, '0')}`;
}

export default function DepositsClientContainer({ 
  activeMembers = [], 
  deposits = [] 
}: DepositsClientContainerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'SINGLE' | 'BULK' | 'ADVANCE'>('SINGLE');

  // Single Entry Form State
  const [singleMemberId, setSingleMemberId] = useState('');
  const [singleForMonth, setSingleForMonth] = useState(new Date().toISOString().slice(0, 7));

  // Advance Form State
  const [advanceMemberId, setAdvanceMemberId] = useState('');
  const [advanceStartMonth, setAdvanceStartMonth] = useState(new Date().toISOString().slice(0, 7));

  // Bulk Form State
  const [bulkTargetMonth, setBulkTargetMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedMembers, setSelectedMembers] = useState<Record<string, { selected: boolean; amount: number }>>({});

  const [status, setStatus] = useState<{ error?: string; success?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any | null>(null);

  // Array Guards
  const safeMembers = useMemo(() => (Array.isArray(activeMembers) ? activeMembers : []), [activeMembers]);
  const safeDeposits = useMemo(() => (Array.isArray(deposits) ? deposits : []), [deposits]);

  function handleSingleMemberChange(memberId: string) {
    setSingleMemberId(memberId);
    if (memberId) {
      setSingleForMonth(getNextEligibleMonth(memberId, safeDeposits));
    }
  }

  function handleAdvanceMemberChange(memberId: string) {
    setAdvanceMemberId(memberId);
    if (memberId) {
      setAdvanceStartMonth(getNextEligibleMonth(memberId, safeDeposits));
    }
  }

  function toggleSelectAll(checked: boolean) {
    const nextState: Record<string, { selected: boolean; amount: number }> = {};
    safeMembers.forEach((m) => {
      nextState[m.id] = { selected: checked, amount: selectedMembers[m.id]?.amount || 500 };
    });
    setSelectedMembers(nextState);
  }

  function handleMemberCheck(memberId: string, checked: boolean) {
    setSelectedMembers((prev) => ({
      ...prev,
      [memberId]: { selected: checked, amount: prev[memberId]?.amount || 500 },
    }));
  }

  function handleAmountChange(memberId: string, amount: number) {
    setSelectedMembers((prev) => ({
      ...prev,
      [memberId]: { selected: prev[memberId]?.selected || true, amount },
    }));
  }

  async function handleSingleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const res = await recordDeposit(formData);
    setLoading(false);

    if (res?.error) {
      setStatus({ error: res.error });
    } else if (res?.success) {
      setStatus({ success: res.success });
      if (res.receipt) setLastReceipt(res.receipt);
      setIsModalOpen(false);
    }
  }

  async function handleBulkSubmit() {
    setStatus(null);
    const depositsToSubmit = Object.entries(selectedMembers)
      .filter(([_, data]) => data.selected)
      .map(([member_id, data]) => ({ member_id, amount_paid: data.amount }));

    if (depositsToSubmit.length === 0) {
      setStatus({ error: 'Please select at least one member for bulk deposit.' });
      return;
    }

    setLoading(true);
    const res = await recordBulkDeposits({ for_month: bulkTargetMonth, deposits: depositsToSubmit });
    setLoading(false);

    if (res?.error) {
      setStatus({ error: res.error });
    } else if (res?.success) {
      setStatus({ success: res.success });
      setIsModalOpen(false);
    }
  }

  async function handleAdvanceSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const res = await recordAdvanceDeposits(formData);
    setLoading(false);

    if (res?.error) {
      setStatus({ error: res.error });
    } else if (res?.success) {
      setStatus({ success: res.success });
      setIsModalOpen(false);
    }
  }

  return (
    <div className="space-y-4 text-left">
      
      {/* Action Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs print:hidden">
        <button
          onClick={() => {
            setIsModalOpen(true);
            setStatus(null);
            if (safeMembers.length > 0) {
              const defaultMember = safeMembers[0].id;
              setSingleMemberId(defaultMember);
              setSingleForMonth(getNextEligibleMonth(defaultMember, safeDeposits));
            }
          }}
          className="px-4 py-2.5 bg-emerald-900 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <Plus size={16} /> Record Deposit (Popup Form)
        </button>

        {lastReceipt && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 p-1.5 px-3 rounded-xl">
            <span className="text-xs font-bold text-emerald-900">Latest Voucher:</span>
            <DepositReceiptModal receipt={lastReceipt} triggerLabel={`Print ${lastReceipt.deposit_code}`} />
          </div>
        )}
      </div>

      {status?.success && !isModalOpen && (
        <div className="p-3 bg-emerald-50 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200">
          {status.success}
        </div>
      )}

      {/* ENTRY POPUP MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden space-y-4 p-5 text-left">
            
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <PiggyBank size={18} className="text-emerald-700" /> Savings Deposit Entry
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            {status?.error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 font-bold text-xs rounded-xl flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{status.error}</span>
              </div>
            )}

            <div className="flex gap-1.5 border-b border-slate-100 pb-2">
              <button
                type="button"
                onClick={() => { setActiveTab('SINGLE'); setStatus(null); }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors ${
                  activeTab === 'SINGLE' ? 'bg-emerald-900 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                <PiggyBank size={14} /> Single Entry
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('BULK'); setStatus(null); }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors ${
                  activeTab === 'BULK' ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                <Users size={14} /> Meeting Bulk
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('ADVANCE'); setStatus(null); }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors ${
                  activeTab === 'ADVANCE' ? 'bg-purple-900 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                <Calendar size={14} /> Advance Payment
              </button>
            </div>

            {/* TAB 1: SINGLE ENTRY */}
            {activeTab === 'SINGLE' && (
              <form onSubmit={handleSingleSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Select Member *</label>
                  <select
                    name="member_id"
                    value={singleMemberId}
                    onChange={(e) => handleSingleMemberChange(e.target.value)}
                    required
                    className="w-full p-2 border rounded-lg bg-white font-bold text-slate-900"
                  >
                    <option value="">-- Choose Member ({safeMembers.length}) --</option>
                    {safeMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} ({m.account_id || 'N/A'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Contribution Month * <span className="text-[10px] text-emerald-700 font-bold">(Auto-calculated Next Month)</span>
                  </label>
                  <input
                    type="month"
                    name="for_month"
                    value={singleForMonth}
                    onChange={(e) => setSingleForMonth(e.target.value)}
                    required
                    className="w-full p-2 border rounded-lg font-mono font-bold text-slate-900 bg-emerald-50/50"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount Paid (NPR) *</label>
                  <input
                    type="number"
                    name="amount_paid"
                    defaultValue="500"
                    required
                    className="w-full p-2 border rounded-lg font-mono font-bold text-slate-900"
                  />
                </div>

                <button
                  disabled={loading}
                  type="submit"
                  className="w-full py-2.5 bg-emerald-900 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-colors"
                >
                  {loading ? 'Recording...' : 'Submit Deposit & Generate Receipt'}
                </button>
              </form>
            )}

            {/* TAB 2: BULK ENTRY */}
            {activeTab === 'BULK' && (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <label className="font-bold text-slate-700">Target Month:</label>
                    <input
                      type="month"
                      value={bulkTargetMonth}
                      onChange={(e) => setBulkTargetMonth(e.target.value)}
                      className="p-1 border rounded font-mono font-bold bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSelectAll(true)}
                    className="text-blue-700 font-bold hover:underline flex items-center gap-1"
                  >
                    <CheckSquare size={13} /> Select All
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto border rounded-xl divide-y text-xs">
                  {safeMembers.map((m) => (
                    <div key={m.id} className="p-2 flex items-center justify-between hover:bg-slate-50">
                      <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer truncate">
                        <input
                          type="checkbox"
                          checked={selectedMembers[m.id]?.selected || false}
                          onChange={(e) => handleMemberCheck(m.id, e.target.checked)}
                          className="w-4 h-4 rounded text-blue-700"
                        />
                        <span className="truncate">{m.full_name} <span className="text-slate-400 font-mono">({m.account_id || 'N/A'})</span></span>
                      </label>
                      <input
                        type="number"
                        value={selectedMembers[m.id]?.amount || 500}
                        onChange={(e) => handleAmountChange(m.id, Number(e.target.value))}
                        className="w-20 p-1 border rounded text-right font-mono font-bold"
                      />
                    </div>
                  ))}
                </div>

                <button
                  disabled={loading}
                  onClick={handleBulkSubmit}
                  className="w-full py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition-colors"
                >
                  {loading ? 'Processing...' : `Submit Group Deposits for ${bulkTargetMonth}`}
                </button>
              </div>
            )}

            {/* TAB 3: ADVANCE ENTRY */}
            {activeTab === 'ADVANCE' && (
              <form onSubmit={handleAdvanceSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Select Member *</label>
                  <select
                    name="member_id"
                    value={advanceMemberId}
                    onChange={(e) => handleAdvanceMemberChange(e.target.value)}
                    required
                    className="w-full p-2 border rounded-lg bg-white font-bold text-slate-900"
                  >
                    <option value="">-- Choose Member --</option>
                    {safeMembers.map((m) => (
                      <option key={m.id} value={m.id}>{m.full_name} ({m.account_id || 'N/A'})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Start Month * <span className="text-[10px] text-purple-700 font-bold">(Auto-calculated Next Month)</span>
                  </label>
                  <input
                    type="month"
                    name="start_month"
                    value={advanceStartMonth}
                    onChange={(e) => setAdvanceStartMonth(e.target.value)}
                    required
                    className="w-full p-2 border rounded-lg font-mono font-bold text-slate-900 bg-purple-50/50"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Number of Advance Months *</label>
                  <select name="num_months" defaultValue={3} className="w-full p-2 border rounded-lg font-bold text-slate-900">
                    <option value={2}>2 Months Advance</option>
                    <option value={3}>3 Months Advance (Quarterly)</option>
                    <option value={6}>6 Months Advance (Half-Yearly)</option>
                    <option value={12}>12 Months Advance (Annual)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Monthly Amount (NPR)</label>
                  <input
                    type="number"
                    name="monthly_amount"
                    defaultValue="500"
                    required
                    className="w-full p-2 border rounded-lg font-mono font-bold text-slate-900"
                  />
                </div>

                <button
                  disabled={loading}
                  type="submit"
                  className="w-full py-2.5 bg-purple-900 hover:bg-purple-800 text-white font-bold text-xs rounded-xl transition-colors"
                >
                  {loading ? 'Processing...' : 'Submit Advance Savings Payment'}
                </button>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}