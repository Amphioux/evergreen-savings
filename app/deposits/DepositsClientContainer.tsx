'use client';

import { useState, useMemo } from 'react';
import { recordDeposit, recordBulkDeposits, recordAdvanceDeposits } from '@/app/actions';
import DepositReceiptModal from './DepositReceiptModal';
import { formatMonthLabel } from '@/lib/formatters';
import { 
  PiggyBank, 
  Users, 
  Calendar, 
  Plus, 
  X, 
  CheckSquare, 
  AlertCircle,
  UserCheck,
  UserPlus,
  Printer,
  ShieldCheck,
  CheckCircle2,
  History
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
  const [singleIsSelf, setSingleIsSelf] = useState(true);
  const [singleDepositorName, setSingleDepositorName] = useState('');
  const [singleAmount, setSingleAmount] = useState('500');

  // Advance Form State
  const [advanceMemberId, setAdvanceMemberId] = useState('');
  const [advanceStartMonth, setAdvanceStartMonth] = useState(new Date().toISOString().slice(0, 7));
  const [advanceIsSelf, setAdvanceIsSelf] = useState(true);
  const [advanceDepositorName, setAdvanceDepositorName] = useState('');
  const [advanceNumMonths, setAdvanceNumMonths] = useState('3');
  const [advanceMonthlyAmount, setAdvanceMonthlyAmount] = useState('500');

  // Bulk Form State
  const [bulkTargetMonth, setBulkTargetMonth] = useState(new Date().toISOString().slice(0, 7));
  const [bulkAllSelf, setBulkAllSelf] = useState(true);
  const [selectedMembers, setSelectedMembers] = useState<Record<string, { selected: boolean; amount: number; depositorName: string }>>({});

  // Batch History State
  const [selectedHistoryKey, setSelectedHistoryKey] = useState<string>('');

  // Confirmation Step State
  const [confirmationData, setConfirmationData] = useState<{
    type: 'SINGLE' | 'BULK' | 'ADVANCE';
    summaryItems: { label: string; value: string }[];
    payload: any;
  } | null>(null);

  const [status, setStatus] = useState<{ error?: string; success?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any | null>(null);
  const [activeBatchMonth, setActiveBatchMonth] = useState<string | null>(null);
  const [autoOpenReceipt, setAutoOpenReceipt] = useState(false);

  // Array Guards
  const safeMembers = useMemo(() => (Array.isArray(activeMembers) ? activeMembers : []), [activeMembers]);
  const safeDeposits = useMemo(() => (Array.isArray(deposits) ? deposits : []), [deposits]);

  const memberMap = useMemo(() => {
    return new Map(safeMembers.map((m) => [String(m.id), m]));
  }, [safeMembers]);

  // Group historical deposits by contribution month
  const batchHistoryOptions = useMemo(() => {
    const groups: Record<string, any[]> = {};

    safeDeposits.forEach((d) => {
      const monthKey = d.for_month?.slice(0, 7) || 'UNKNOWN';
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(d);
    });

    return Object.entries(groups)
      .map(([monthKey, list]) => ({
        key: monthKey,
        label: `${formatMonthLabel(monthKey)} Meeting Batch (${list.length} Vouchers)`,
        count: list.length,
      }))
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [safeDeposits]);

  function handleOpenBatchPrint(monthKey: string) {
    if (!monthKey) return;
    window.open(`/deposits/print-batch?month=${monthKey}`, '_blank');
  }

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
    const nextState: Record<string, { selected: boolean; amount: number; depositorName: string }> = {};
    safeMembers.forEach((m) => {
      nextState[m.id] = { 
        selected: checked, 
        amount: selectedMembers[m.id]?.amount || 500,
        depositorName: selectedMembers[m.id]?.depositorName || '' 
      };
    });
    setSelectedMembers(nextState);
  }

  function handleMemberCheck(memberId: string, checked: boolean) {
    setSelectedMembers((prev) => ({
      ...prev,
      [memberId]: { 
        selected: checked, 
        amount: prev[memberId]?.amount || 500,
        depositorName: prev[memberId]?.depositorName || ''
      },
    }));
  }

  function handleAmountChange(memberId: string, amount: number) {
    setSelectedMembers((prev) => ({
      ...prev,
      [memberId]: { 
        selected: prev[memberId]?.selected || true, 
        amount,
        depositorName: prev[memberId]?.depositorName || ''
      },
    }));
  }

  function handleDepositorNameChange(memberId: string, depositorName: string) {
    setSelectedMembers((prev) => ({
      ...prev,
      [memberId]: { 
        selected: prev[memberId]?.selected || true, 
        amount: prev[memberId]?.amount || 500,
        depositorName
      },
    }));
  }

  // Pre-Submission Check Handlers
  function prepareSingleConfirmation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);

    const member = memberMap.get(String(singleMemberId));
    if (!member) {
      setStatus({ error: 'Please select a valid member.' });
      return;
    }

    const formData = new FormData(e.currentTarget);

    setConfirmationData({
      type: 'SINGLE',
      summaryItems: [
        { label: 'Member Name', value: `${member.full_name} (${member.account_id || 'N/A'})` },
        { label: 'Contribution Month', value: formatMonthLabel(singleForMonth) },
        { label: 'Amount Paid', value: `NPR ${Number(singleAmount).toLocaleString('en-IN')}` },
        { 
          label: 'Deposited By', 
          value: singleIsSelf ? 'Self (Member In Person)' : `${singleDepositorName} (Representative)` 
        },
      ],
      payload: formData,
    });
  }

  function prepareBulkConfirmation() {
    setStatus(null);
    const selectedList = Object.entries(selectedMembers).filter(([_, data]) => data.selected);

    if (selectedList.length === 0) {
      setStatus({ error: 'Please select at least one member for bulk deposit.' });
      return;
    }

    const totalCollection = selectedList.reduce((sum, [_, data]) => sum + Number(data.amount || 0), 0);

    const depositsToSubmit = selectedList.map(([member_id, data]) => ({ 
      member_id, 
      amount_paid: data.amount,
      deposited_by_name: bulkAllSelf ? null : (data.depositorName?.trim() || null)
    }));

    setConfirmationData({
      type: 'BULK',
      summaryItems: [
        { label: 'Target Contribution Month', value: formatMonthLabel(bulkTargetMonth) },
        { label: 'Total Members Selected', value: `${selectedList.length} Members` },
        { label: 'Total Collection Pool', value: `NPR ${totalCollection.toLocaleString('en-IN')}` },
        { label: 'Depositor Mode', value: bulkAllSelf ? 'All Paid In Person (Self)' : 'Individual Representatives' },
      ],
      payload: { for_month: bulkTargetMonth, deposits: depositsToSubmit },
    });
  }

  function prepareAdvanceConfirmation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);

    const member = memberMap.get(String(advanceMemberId));
    if (!member) {
      setStatus({ error: 'Please select a valid member.' });
      return;
    }

    const totalAmt = Number(advanceNumMonths) * Number(advanceMonthlyAmount);
    const formData = new FormData(e.currentTarget);

    setConfirmationData({
      type: 'ADVANCE',
      summaryItems: [
        { label: 'Member Name', value: `${member.full_name} (${member.account_id || 'N/A'})` },
        { label: 'Start Month', value: formatMonthLabel(advanceStartMonth) },
        { label: 'Tenure', value: `${advanceNumMonths} Months Advance` },
        { label: 'Monthly Rate', value: `NPR ${Number(advanceMonthlyAmount).toLocaleString('en-IN')} / month` },
        { label: 'Total Lump Sum Paid', value: `NPR ${totalAmt.toLocaleString('en-IN')}` },
        { 
          label: 'Deposited By', 
          value: advanceIsSelf ? 'Self (Member In Person)' : `${advanceDepositorName} (Representative)` 
        },
      ],
      payload: formData,
    });
  }

  // Final Action Execution
  async function executeConfirmedSubmit() {
    if (!confirmationData) return;

    setLoading(true);
    setStatus(null);

    if (confirmationData.type === 'SINGLE') {
      const res = await recordDeposit(confirmationData.payload);
      setLoading(false);

      if (res?.error) {
        setStatus({ error: res.error });
        setConfirmationData(null);
      } else if (res?.success) {
        setStatus({ success: res.success });
        if (res.receipt) {
          setLastReceipt(res.receipt);
          setAutoOpenReceipt(true);
        }
        setActiveBatchMonth(null);
        setConfirmationData(null);
        setIsModalOpen(false);
        setSingleDepositorName('');
        setSingleIsSelf(true);
      }
    } else if (confirmationData.type === 'BULK') {
      const res = await recordBulkDeposits(confirmationData.payload);
      setLoading(false);

      if (res?.error) {
        setStatus({ error: res.error });
        setConfirmationData(null);
      } else if (res?.success) {
        setStatus({ success: res.success });
        setActiveBatchMonth(bulkTargetMonth);
        setLastReceipt(null);
        setConfirmationData(null);
        setIsModalOpen(false);
      }
    } else if (confirmationData.type === 'ADVANCE') {
      const res = await recordAdvanceDeposits(confirmationData.payload);
      setLoading(false);

      if (res?.error) {
        setStatus({ error: res.error });
        setConfirmationData(null);
      } else if (res?.success) {
        setStatus({ success: res.success });
        setActiveBatchMonth(null);
        setConfirmationData(null);
        setIsModalOpen(false);
        setAdvanceDepositorName('');
        setAdvanceIsSelf(true);
      }
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
            setConfirmationData(null);
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

        <div className="flex flex-wrap items-center gap-2">
          {/* Historical Batch Re-Print Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 px-3 py-1.5 rounded-xl text-xs font-bold">
            <History size={15} className="text-blue-700" />
            <span className="text-slate-500 hidden sm:inline">Reprint Batch Slips:</span>
            <select
              value={selectedHistoryKey}
              onChange={(e) => {
                setSelectedHistoryKey(e.target.value);
                if (e.target.value) handleOpenBatchPrint(e.target.value);
              }}
              className="bg-transparent font-sans font-bold text-slate-900 focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              <option value="">-- Choose Meeting Batch --</option>
              {batchHistoryOptions.map((b) => (
                <option key={b.key} value={b.key}>{b.label}</option>
              ))}
            </select>
          </div>

          {lastReceipt && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 p-1.5 px-3 rounded-xl">
              <span className="text-xs font-bold text-emerald-900">Latest Voucher:</span>
              <DepositReceiptModal 
                receipt={lastReceipt} 
                triggerLabel={`Print ${lastReceipt.deposit_code}`} 
                initialOpen={autoOpenReceipt}
              />
            </div>
          )}

          {/* Newly Created Batch Print Launcher */}
          {activeBatchMonth && (
            <button
              onClick={() => handleOpenBatchPrint(activeBatchMonth)}
              className="px-3.5 py-1.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Printer size={14} /> Print New Batch Vouchers
            </button>
          )}
        </div>
      </div>

      {status?.success && !isModalOpen && (
        <div className="p-3 bg-emerald-50 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-700" />
            <span>{status.success}</span>
          </div>
          {lastReceipt && (
            <DepositReceiptModal 
              receipt={lastReceipt} 
              triggerLabel="Print Receipt Slip Now" 
              initialOpen={true}
            />
          )}
          {activeBatchMonth && (
            <button
              onClick={() => handleOpenBatchPrint(activeBatchMonth)}
              className="px-3 py-1 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-lg flex items-center gap-1 transition-colors"
            >
              <Printer size={13} /> Open Batch Print Window
            </button>
          )}
        </div>
      )}

      {/* ENTRY & CONFIRMATION POPUP MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden space-y-4 p-5 text-left">
            
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <PiggyBank size={18} className="text-emerald-700" /> Savings Deposit Entry
              </h3>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setConfirmationData(null);
                }} 
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {status?.error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 font-bold text-xs rounded-xl flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{status.error}</span>
              </div>
            )}

            {confirmationData ? (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-950 rounded-xl space-y-1">
                  <div className="font-extrabold text-xs flex items-center gap-1.5 text-amber-900">
                    <ShieldCheck size={16} /> Confirm Deposit Transaction Details
                  </div>
                  <p className="text-[11px] text-amber-800 font-medium">
                    Please carefully verify all details below before finalizing the deposit.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 divide-y divide-slate-200">
                  {confirmationData.summaryItems.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex justify-between items-center gap-4 text-xs">
                      <span className="text-slate-500 font-medium">{item.label}:</span>
                      <strong className="text-slate-900 font-bold text-right">{item.value}</strong>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setConfirmationData(null)}
                    className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                  >
                    Edit Details
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={executeConfirmedSubmit}
                    className="w-1/2 py-2.5 bg-emerald-900 hover:bg-emerald-800 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    {loading ? 'Processing Transaction...' : 'Confirm & Generate Slips'}
                  </button>
                </div>
              </div>
            ) : (
              <>
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

                {activeTab === 'SINGLE' && (
                  <form onSubmit={prepareSingleConfirmation} className="space-y-3 text-xs">
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

                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <label className="block font-bold text-slate-800">Depositor Identity *</label>
                      <div className="flex items-center gap-4 text-xs">
                        <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                          <input
                            type="radio"
                            name="is_self_deposit"
                            checked={singleIsSelf}
                            onChange={() => {
                              setSingleIsSelf(true);
                              setSingleDepositorName('');
                            }}
                            className="text-emerald-700 focus:ring-emerald-700"
                          />
                          <UserCheck size={14} className="text-emerald-700" /> Deposited By Member (Self)
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                          <input
                            type="radio"
                            name="is_self_deposit"
                            checked={!singleIsSelf}
                            onChange={() => setSingleIsSelf(false)}
                            className="text-emerald-700 focus:ring-emerald-700"
                          />
                          <UserPlus size={14} className="text-blue-700" /> Deposited On Behalf Of
                        </label>
                      </div>

                      {!singleIsSelf && (
                        <div className="pt-1">
                          <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                            Representative / Depositor Name *
                          </label>
                          <input
                            type="text"
                            name="deposited_by_name"
                            placeholder="e.g. Ramesh Karki (Brother / Representative)"
                            value={singleDepositorName}
                            onChange={(e) => setSingleDepositorName(e.target.value)}
                            required={!singleIsSelf}
                            className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-900"
                          />
                        </div>
                      )}
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
                        value={singleAmount}
                        onChange={(e) => setSingleAmount(e.target.value)}
                        required
                        className="w-full p-2 border rounded-lg font-mono font-bold text-slate-900"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-emerald-900 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck size={15} /> Review & Confirm Single Deposit
                    </button>
                  </form>
                )}

                {activeTab === 'BULK' && (
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border">
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

                    <div className="p-2 bg-slate-50 border rounded-xl flex items-center gap-4 text-xs font-semibold text-slate-700">
                      <span>Bulk Depositor Mode:</span>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          checked={bulkAllSelf}
                          onChange={() => setBulkAllSelf(true)}
                          className="text-blue-700"
                        />
                        <span>All Paid In Person (Self)</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          checked={!bulkAllSelf}
                          onChange={() => setBulkAllSelf(false)}
                          className="text-blue-700"
                        />
                        <span>Specific Representatives</span>
                      </label>
                    </div>

                    <div className="max-h-56 overflow-y-auto border rounded-xl divide-y text-xs">
                      {safeMembers.map((m) => (
                        <div key={m.id} className="p-2 flex flex-col gap-1.5 hover:bg-slate-50">
                          <div className="flex items-center justify-between">
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

                          {!bulkAllSelf && selectedMembers[m.id]?.selected && (
                            <input
                              type="text"
                              placeholder="Representative Name (Leave blank if Self)"
                              value={selectedMembers[m.id]?.depositorName || ''}
                              onChange={(e) => handleDepositorNameChange(m.id, e.target.value)}
                              className="w-full p-1 pl-2 text-[11px] border border-slate-300 rounded bg-white font-medium text-slate-800"
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={prepareBulkConfirmation}
                      className="w-full py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck size={15} /> Review & Confirm Group Deposits
                    </button>
                  </div>
                )}

                {activeTab === 'ADVANCE' && (
                  <form onSubmit={prepareAdvanceConfirmation} className="space-y-3 text-xs">
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

                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <label className="block font-bold text-slate-800">Depositor Identity *</label>
                      <div className="flex items-center gap-4 text-xs">
                        <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                          <input
                            type="radio"
                            name="is_self_deposit"
                            checked={advanceIsSelf}
                            onChange={() => {
                              setAdvanceIsSelf(true);
                              setAdvanceDepositorName('');
                            }}
                            className="text-purple-700 focus:ring-purple-700"
                          />
                          <UserCheck size={14} className="text-purple-700" /> Deposited By Member (Self)
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                          <input
                            type="radio"
                            name="is_self_deposit"
                            checked={!advanceIsSelf}
                            onChange={() => setAdvanceIsSelf(false)}
                            className="text-purple-700 focus:ring-purple-700"
                          />
                          <UserPlus size={14} className="text-blue-700" /> Deposited On Behalf Of
                        </label>
                      </div>

                      {!advanceIsSelf && (
                        <div className="pt-1">
                          <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                            Representative / Depositor Name *
                          </label>
                          <input
                            type="text"
                            name="deposited_by_name"
                            placeholder="e.g. Suman Thapa (Son / Representative)"
                            value={advanceDepositorName}
                            onChange={(e) => setAdvanceDepositorName(e.target.value)}
                            required={!advanceIsSelf}
                            className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-900"
                          />
                        </div>
                      )}
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
                      <select 
                        name="num_months" 
                        value={advanceNumMonths}
                        onChange={(e) => setAdvanceNumMonths(e.target.value)}
                        className="w-full p-2 border rounded-lg font-bold text-slate-900"
                      >
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
                        value={advanceMonthlyAmount}
                        onChange={(e) => setAdvanceMonthlyAmount(e.target.value)}
                        required
                        className="w-full p-2 border rounded-lg font-mono font-bold text-slate-900"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-purple-900 hover:bg-purple-800 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck size={15} /> Review & Confirm Advance Payment
                    </button>
                  </form>
                )}
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
}