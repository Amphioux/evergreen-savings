'use client';

import { useState, useMemo } from 'react';
import { recordDeposit } from '@/app/actions';
import DepositReceiptModal from './DepositReceiptModal';
import { formatMonthLabel } from '@/lib/formatters';
import { calculateSavingsFine, getSavingsRateForMonth } from '@/lib/savingsUtils';
import { 
  ShieldAlert, 
  PhoneCall, 
  CheckSquare, 
  Square, 
  AlertTriangle, 
  UserCheck, 
  UserPlus, 
  ShieldCheck, 
  CheckCircle2, 
  FileText,
  Search,
  X
} from 'lucide-react';

interface LateFeeCollectionTabProps {
  defaultersList: any[];
  fineRules: any[];
  contributionRules: any[];
}

export default function LateFeeCollectionTab({
  defaultersList = [],
  fineRules = [],
  contributionRules = []
}: LateFeeCollectionTabProps) {
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  
  // Search Filter
  const [searchDefaulterQuery, setSearchDefaulterQuery] = useState('');

  // Form State
  const [isSelf, setIsSelf] = useState(true);
  const [depositorName, setDepositorName] = useState('');
  const [depositNote, setDepositNote] = useState('');
  
  // Editable Financials
  const [customFineAmount, setCustomFineAmount] = useState<string>('0');
  const [waiveFine, setWaiveFine] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  // Confirmation Step State
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ error?: string; success?: string } | null>(null);
  const [generatedVouchers, setGeneratedVouchers] = useState<any[]>([]);

  // STRICT FILTER: Only include defaulters who have accrued fine > 0 (Grace Period Passed)
  const gracePassedDefaulters = useMemo(() => {
    return defaultersList
      .map((m) => {
        // Calculate fine for each missed month
        const fineApplicableMonths = (m.missedMonthsList || []).filter((monthStr: string) => {
          const rate = getSavingsRateForMonth(monthStr, contributionRules);
          return calculateSavingsFine(monthStr, rate, fineRules) > 0;
        });

        const totalFineAccrued = (m.missedMonthsList || []).reduce((sum: number, monthStr: string) => {
          const rate = getSavingsRateForMonth(monthStr, contributionRules);
          return sum + calculateSavingsFine(monthStr, rate, fineRules);
        }, 0);

        return {
          ...m,
          fineApplicableMonths,
          totalFineAccrued
        };
      })
      // Keep ONLY members whose grace period has passed and have accrued fines > 0
      .filter((m) => m.totalFineAccrued > 0);
  }, [defaultersList, fineRules, contributionRules]);

  // Apply search query on top of grace-passed defaulters
  const filteredDefaulters = useMemo(() => {
    if (!searchDefaulterQuery.trim()) return gracePassedDefaulters;
    const q = searchDefaulterQuery.toLowerCase();
    return gracePassedDefaulters.filter((m) => 
      m.full_name?.toLowerCase().includes(q) ||
      m.account_id?.toLowerCase().includes(q) ||
      m.phone?.toLowerCase().includes(q)
    );
  }, [gracePassedDefaulters, searchDefaulterQuery]);

  // When an admin selects a member from the defaulter list
  function handleSelectMember(member: any) {
    setSelectedMember(member);
    setStatus(null);
    setGeneratedVouchers([]);
    setIsSelf(true);
    setDepositorName('');
    setDepositNote('');
    setWaiveFine(false);
    setOverrideReason('');
    setShowConfirmation(false);

    // Default to selecting months where fine is active
    const fineMonths = member.fineApplicableMonths?.length > 0 
      ? member.fineApplicableMonths 
      : (member.missedMonthsList || []);

    setSelectedMonths(fineMonths);
    calculateCalculatedFine(fineMonths);
  }

  function toggleMonth(monthStr: string) {
    let nextMonths: string[];
    if (selectedMonths.includes(monthStr)) {
      nextMonths = selectedMonths.filter(m => m !== monthStr);
    } else {
      nextMonths = [...selectedMonths, monthStr].sort();
    }
    setSelectedMonths(nextMonths);
    calculateCalculatedFine(nextMonths);
  }

  const { basePrincipalTotal, calculatedFineTotal } = useMemo(() => {
    if (!selectedMonths || selectedMonths.length === 0) {
      return { basePrincipalTotal: 0, calculatedFineTotal: 0 };
    }

    const principal = selectedMonths.reduce((sum, m) => {
      return sum + getSavingsRateForMonth(m, contributionRules);
    }, 0);

    const fine = selectedMonths.reduce((sum, m) => {
      const rate = getSavingsRateForMonth(m, contributionRules);
      return sum + calculateSavingsFine(m, rate, fineRules);
    }, 0);

    return { basePrincipalTotal: principal, calculatedFineTotal: fine };
  }, [selectedMonths, contributionRules, fineRules]);

  function calculateCalculatedFine(months: string[]) {
    const fine = months.reduce((sum, m) => {
      const rate = getSavingsRateForMonth(m, contributionRules);
      return sum + calculateSavingsFine(m, rate, fineRules);
    }, 0);
    setCustomFineAmount(String(fine));
  }

  const finalFineCollected = waiveFine ? 0 : Number(customFineAmount) || 0;
  const fineDiscountGranted = waiveFine 
    ? calculatedFineTotal 
    : Math.max(0, calculatedFineTotal - finalFineCollected);

  // Pre-Action Confirmation Trigger
  function handleInitConfirmation(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMember || selectedMonths.length === 0) return;
    setStatus(null);
    setShowConfirmation(true);
  }

  // Execute Payment Settlement After Confirmation
  async function executeConfirmedSubmit() {
    if (!selectedMember || selectedMonths.length === 0) return;

    setLoading(true);
    setStatus(null);

    let successCount = 0;
    const vouchers: any[] = [];

    for (let i = 0; i < selectedMonths.length; i++) {
      const monthStr = selectedMonths[i];
      const monthBase = getSavingsRateForMonth(monthStr, contributionRules);
      const monthCalculatedFine = calculateSavingsFine(monthStr, monthBase, fineRules);

      const monthFineToCollect = waiveFine 
        ? 0 
        : (selectedMonths.length === 1 ? finalFineCollected : Math.round(finalFineCollected / selectedMonths.length));
      
      const monthDiscount = Math.max(0, monthCalculatedFine - monthFineToCollect);

      const formData = new FormData();
      formData.append('member_id', String(selectedMember.id));
      formData.append('for_month', monthStr);
      formData.append('amount_paid', String(monthBase));
      formData.append('fine_amount', String(monthFineToCollect));
      formData.append('fine_discount_amount', String(monthDiscount));
      formData.append('fine_waived', waiveFine ? 'true' : 'false');
      formData.append('fine_override_reason', overrideReason);
      formData.append('deposit_note', depositNote || `Penalty collection for ${formatMonthLabel(monthStr)}`);
      
      if (!isSelf && depositorName) {
        formData.append('deposited_by_name', depositorName);
      }

      const res = await recordDeposit(formData);
      if (res?.success) {
        successCount++;
        if (res.receipt) {
          vouchers.push({
            ...res.receipt,
            fine_amount: monthFineToCollect,
            fine_discount_amount: monthDiscount,
            fine_waived: waiveFine,
            fine_override_reason: overrideReason,
            deposit_note: depositNote
          });
        }
      } else if (res?.error) {
        setStatus({ error: res.error });
        setLoading(false);
        setShowConfirmation(false);
        return;
      }
    }

    setLoading(false);
    setShowConfirmation(false);
    setGeneratedVouchers(vouchers);
    setStatus({ 
      success: `Successfully collected NPR ${(basePrincipalTotal + finalFineCollected).toLocaleString('en-IN')} across ${successCount} month(s) for ${selectedMember.full_name}!` 
    });

    setSelectedMember(null);
    setSelectedMonths([]);
  }

  return (
    <div className="space-y-6 text-left font-sans">
      
      {/* Header Banner */}
      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h3 className="font-extrabold text-amber-950 text-sm flex items-center gap-2">
            <ShieldAlert size={18} className="text-amber-800" />
            Overdue Penalty & Fine Collection Terminal
          </h3>
          <p className="text-xs text-amber-800 font-mono mt-0.5">
            Strict Penalty Terminal: Listing members whose grace period has passed and have active accrued late fines.
          </p>
        </div>
        <span className="text-xs font-mono font-bold text-amber-950 bg-amber-200/80 px-3 py-1 rounded-lg">
          {gracePassedDefaulters.length} Fine-Active Defaulters
        </span>
      </div>

      {status?.success && (
        <div className="p-4 bg-emerald-50 text-emerald-900 font-bold text-xs rounded-xl border border-emerald-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-700" />
              <span>{status.success}</span>
            </div>
          </div>

          {generatedVouchers.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-200">
              <span className="text-[11px] font-bold text-emerald-800">Generated Vouchers:</span>
              {generatedVouchers.map((v) => (
                <DepositReceiptModal 
                  key={v.deposit_code} 
                  receipt={v} 
                  triggerLabel={`Print ${v.deposit_code} (${v.for_month?.slice(0, 7)})`} 
                />
              ))}
            </div>
          )}
        </div>
      )}

      {status?.error && (
        <div className="p-3 bg-red-50 text-red-700 font-bold text-xs rounded-xl border border-red-200">
          {status.error}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT PANEL: Defaulters Directory List (Grace Period Passed Only) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3.5 bg-slate-900 text-white font-bold text-xs uppercase tracking-wider space-y-2">
            <div className="flex justify-between items-center">
              <span>Fine-Active Directory</span>
              <span className="font-mono text-[10px] text-amber-300 font-bold">{filteredDefaulters.length} Grace Passed</span>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter by Member, Account ID, Phone..."
                value={searchDefaulterQuery}
                onChange={(e) => setSearchDefaulterQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-800 text-white placeholder-slate-400 rounded-lg text-xs border border-slate-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[550px] overflow-y-auto">
            {filteredDefaulters.map((m) => {
              const isSelected = selectedMember?.id === m.id;

              return (
                <div
                  key={m.id}
                  onClick={() => handleSelectMember(m)}
                  className={`p-3.5 transition-colors cursor-pointer flex justify-between items-center text-xs ${
                    isSelected ? 'bg-amber-100/70 border-l-4 border-amber-800' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                      {m.full_name}
                      <span className="text-[9px] bg-amber-200 text-amber-950 px-1.5 py-0.2 rounded font-mono font-bold">
                        {m.fineApplicableMonths?.length || m.totalMissedMonthsCount} mo overdue
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      Acc: <strong className="text-slate-800">{m.account_id || 'N/A'}</strong>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-black text-amber-950 text-sm">
                      NPR {((m.totalDefaultedAmount || 0) + m.totalFineAccrued).toLocaleString('en-IN')}
                    </div>
                    <span className="text-[9px] text-amber-900 font-bold font-mono block">
                      + Accrued Fine: NPR {m.totalFineAccrued.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredDefaulters.length === 0 && (
              <div className="p-8 text-center text-emerald-800 bg-emerald-50/50 text-xs font-bold space-y-1">
                <CheckCircle2 size={24} className="mx-auto text-emerald-600 mb-1" />
                <p>No Active Penalty Defaulters!</p>
                <p className="text-[10px] text-emerald-600 font-normal">
                  All overdue members are either compliant or currently within their allowed grace window.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Fine Settlement Form */}
        <div className="lg:col-span-7">
          {selectedMember ? (
            <form onSubmit={handleInitConfirmation} className="bg-white rounded-2xl border-2 border-amber-200 shadow-xs p-5 space-y-4 text-xs">
              
              {/* Selected Member Header */}
              <div className="border-b border-slate-200 pb-3 flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-amber-900 bg-amber-100 px-2 py-0.5 rounded font-mono">
                    Collecting Penalty Fees
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mt-1">
                    {selectedMember.full_name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Account ID: <strong className="text-slate-800">{selectedMember.account_id || 'N/A'}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMember(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>

              {/* Missed Month Selection */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-800">
                  Select Missed Months to Collect Today *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono">
                  {(selectedMember.missedMonthsList || []).map((mStr: string) => {
                    const isChecked = selectedMonths.includes(mStr);
                    const mRate = getSavingsRateForMonth(mStr, contributionRules);
                    const mFine = calculateSavingsFine(mStr, mRate, fineRules);

                    return (
                      <div
                        key={mStr}
                        onClick={() => toggleMonth(mStr)}
                        className={`p-2.5 rounded-xl border transition-colors cursor-pointer flex items-center justify-between ${
                          isChecked 
                            ? 'bg-amber-100/80 border-amber-400 text-amber-950 font-bold' 
                            : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {isChecked ? <CheckSquare size={14} className="text-amber-800" /> : <Square size={14} />}
                          <span>{formatMonthLabel(mStr)}</span>
                        </div>
                        <span className={`text-[10px] font-black ${mFine > 0 ? 'text-amber-900' : 'text-slate-400'}`}>
                          {mFine > 0 ? `+NPR ${mFine}` : 'Grace'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Financial Summary */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 font-sans">
                <div className="flex justify-between items-center text-slate-700">
                  <span>Base Savings ({selectedMonths.length} Months):</span>
                  <span className="font-mono font-bold text-slate-900">NPR {basePrincipalTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center text-amber-900 font-bold">
                  <span className="flex items-center gap-1"><AlertTriangle size={14} /> Accrued Penalty Fine:</span>
                  <span className="font-mono font-black text-amber-950">NPR {calculatedFineTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Editable Fine Adjustments */}
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-3">
                <div className="flex justify-between items-center border-b border-amber-200 pb-2">
                  <span className="font-extrabold text-amber-950">Fine Collection & Discount Adjustment</span>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-amber-950 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={waiveFine}
                      onChange={(e) => setWaiveFine(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-800 cursor-pointer"
                    />
                    Waive Off Fine
                  </label>
                </div>

                {!waiveFine && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Final Fine Collected (NPR) *</label>
                      <input
                        type="number"
                        value={customFineAmount}
                        onChange={(e) => setCustomFineAmount(e.target.value)}
                        min="0"
                        required
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-mono font-black text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Discount Granted (NPR)</label>
                      <input
                        type="number"
                        value={fineDiscountGranted}
                        readOnly
                        className="w-full p-2 border border-slate-200 bg-slate-100 rounded-lg font-mono font-bold text-emerald-800"
                      />
                    </div>
                  </div>
                )}

                {(waiveFine || fineDiscountGranted > 0) && (
                  <div>
                    <label className="block font-bold text-amber-900 mb-1">Waiver Approval Reason *</label>
                    <input
                      type="text"
                      placeholder="e.g. Approved by Executive Committee"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      required={waiveFine || fineDiscountGranted > 0}
                      className="w-full p-2 border border-amber-300 rounded-lg bg-white text-slate-900 font-medium"
                    />
                  </div>
                )}
              </div>

              {/* Depositor Identity */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="block font-bold text-slate-800">Depositor Identity *</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="radio"
                      checked={isSelf}
                      onChange={() => { setIsSelf(true); setDepositorName(''); }}
                      className="text-emerald-700 cursor-pointer"
                    />
                    <UserCheck size={14} className="text-emerald-700" /> Member (Self)
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="radio"
                      checked={!isSelf}
                      onChange={() => setIsSelf(false)}
                      className="text-emerald-700 cursor-pointer"
                    />
                    <UserPlus size={14} className="text-blue-700" /> Representative
                  </label>
                </div>

                {!isSelf && (
                  <input
                    type="text"
                    placeholder="Representative Name"
                    value={depositorName}
                    onChange={(e) => setDepositorName(e.target.value)}
                    required={!isSelf}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-900"
                  />
                )}
              </div>

              {/* Reference Note */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Reference Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Paid in monthly meeting"
                  value={depositNote}
                  onChange={(e) => setDepositNote(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={selectedMonths.length === 0}
                className="w-full py-3 bg-emerald-900 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl transition-colors inline-flex justify-center items-center gap-2 cursor-pointer shadow-xs"
              >
                <ShieldCheck size={16} /> Review & Confirm Penalty Collection
              </button>

            </form>
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs text-slate-400 space-y-2">
              <ShieldAlert size={32} className="mx-auto text-amber-700/60" />
              <h4 className="font-extrabold text-slate-700 text-sm">No Member Selected</h4>
              <p className="text-xs max-w-xs mx-auto">
                Select a penalty-active defaulter from the directory on the left to review their overdue months, calculate late fines, and record settlements.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* PRE-ACTION CONFIRMATION MODAL */}
      {showConfirmation && selectedMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-left">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden space-y-4 p-5 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-700" /> Confirm Penalty Settlement
              </h3>
              <button onClick={() => setShowConfirmation(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-950 rounded-xl space-y-1">
              <strong className="block font-bold">Please verify the transaction summary before finalizing:</strong>
              <p className="text-[11px] text-amber-800">
                This action will create {selectedMonths.length} deposit voucher(s) and update member compliance records.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 divide-y divide-slate-200 space-y-2">
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Member:</span>
                <strong className="text-slate-900">{selectedMember.full_name} ({selectedMember.account_id})</strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Selected Months:</span>
                <strong className="text-slate-900">{selectedMonths.map(m => formatMonthLabel(m)).join(', ')}</strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Base Savings Due:</span>
                <strong className="text-slate-900">NPR {basePrincipalTotal.toLocaleString('en-IN')}</strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Fine Collected:</span>
                <strong className="text-amber-950">NPR {finalFineCollected.toLocaleString('en-IN')}{fineDiscountGranted > 0 ? ` (NPR ${fineDiscountGranted} Waived)` : ''}</strong>
              </div>
              <div className="flex justify-between py-1 pt-2 border-t border-slate-300 font-bold text-sm">
                <span className="text-emerald-950">Total Cash Received:</span>
                <strong className="text-emerald-950 font-mono">NPR {(basePrincipalTotal + finalFineCollected).toLocaleString('en-IN')}</strong>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowConfirmation(false)}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
              >
                Edit Details
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={executeConfirmedSubmit}
                className="w-1/2 py-2.5 bg-emerald-900 hover:bg-emerald-800 text-white font-bold rounded-xl flex justify-center items-center gap-1.5 cursor-pointer"
              >
                {loading ? 'Processing...' : 'Confirm & Collect'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}