'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldAlert, 
  Settings, 
  X, 
  Plus, 
  Edit2, 
  Trash2, 
  RotateCcw, 
  CheckCircle2, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle,
  PiggyBank,
  Landmark,
  Save
} from 'lucide-react';
import { createOrUpdateFineRule, deleteFineRule } from '@/app/actions';

interface FineRule {
  id: number;
  rule_type: 'SAVINGS' | 'LOAN';
  fine_type: 'PERCENTAGE' | 'FLAT_MONTHLY' | 'FLAT_DAILY';
  rate_value?: number;
  amount?: number;
  grace_period_days?: number;
  effective_from_month?: string;
  effective_from?: string;
  effective_to_month?: string | null;
  effective_to?: string | null;
  notes?: string;
  reason?: string;
  recorded_by_name?: string;
  recorded_by_designation?: string;
  ruleCode?: string;
}

export default function ManageFineRulesModal({
  fineRules = [],
  isAdmin = false,
}: {
  fineRules: FineRule[];
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'VIEW' | 'FORM'>('VIEW');
  const [editingRule, setEditingRule] = useState<FineRule | null>(null);
  const [deletingRule, setEditingDeleteRule] = useState<FineRule | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  
  // Pending Update Confirmation State
  const [pendingUpdateData, setPendingUpdateData] = useState<FormData | null>(null);
  const [updateConfirmOpen, setUpdateConfirmOpen] = useState(false);

  // Collapse Toggles for Long Histories
  const [showAllSavingsRules, setShowAllSavingsRules] = useState(false);
  const [showAllLoanRules, setShowAllLoanRules] = useState(false);

  const [ruleType, setRuleType] = useState<'SAVINGS' | 'LOAN'>('SAVINGS');
  const [fineType, setFineType] = useState<'PERCENTAGE' | 'FLAT_MONTHLY' | 'FLAT_DAILY'>('FLAT_MONTHLY');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successPopupMsg, setSuccessPopupMsg] = useState<string | null>(null);

  // Compute Category-Scoped Codes (SFR-01, SFR-02, LFR-01, LFR-02)
  const savingsRules = useMemo(() => {
    const filtered = fineRules
      .filter((r) => r.rule_type === 'SAVINGS')
      .sort((a, b) => {
        const monthA = a.effective_from_month || a.effective_from || '2025-01';
        const monthB = b.effective_from_month || b.effective_from || '2025-01';
        return monthB.localeCompare(monthA);
      });

    return filtered.map((rule, idx) => ({
      ...rule,
      ruleCode: `SFR-${String(filtered.length - idx).padStart(2, '0')}`,
    }));
  }, [fineRules]);

  const loanRules = useMemo(() => {
    const filtered = fineRules
      .filter((r) => r.rule_type === 'LOAN')
      .sort((a, b) => {
        const monthA = a.effective_from_month || a.effective_from || '2025-01';
        const monthB = b.effective_from_month || b.effective_from || '2025-01';
        return monthB.localeCompare(monthA);
      });

    return filtered.map((rule, idx) => ({
      ...rule,
      ruleCode: `LFR-${String(filtered.length - idx).padStart(2, '0')}`,
    }));
  }, [fineRules]);

  const visibleSavingsRules = showAllSavingsRules ? savingsRules : savingsRules.slice(0, 3);
  const visibleLoanRules = showAllLoanRules ? loanRules : loanRules.slice(0, 3);

  function openNewForm(type: 'SAVINGS' | 'LOAN') {
    setError(null);
    setEditingRule(null);
    setRuleType(type);
    setFineType(type === 'SAVINGS' ? 'FLAT_MONTHLY' : 'PERCENTAGE');
    setActiveTab('FORM');
  }

  function openEditForm(rule: FineRule) {
    setError(null);
    setEditingRule(rule);
    setRuleType(rule.rule_type);
    setFineType(rule.fine_type);
    setActiveTab('FORM');
  }

  function resetToDirectory() {
    setError(null);
    setEditingRule(null);
    setEditingDeleteRule(null);
    setDeleteReason('');
    setPendingUpdateData(null);
    setUpdateConfirmOpen(false);
    setActiveTab('VIEW');
  }

  // Intercept Form Submission: Trigger Confirmation Modal if Editing
  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (editingRule) {
      formData.append('rule_id', String(editingRule.id));
      setPendingUpdateData(formData);
      setUpdateConfirmOpen(true); // Open Confirmation Popup
    } else {
      executeSave(formData); // Directly create new rules
    }
  }

  async function executeSave(formData: FormData) {
    setLoading(true);
    setError(null);

    const res = await createOrUpdateFineRule(formData);

    setLoading(false);
    setUpdateConfirmOpen(false);
    setPendingUpdateData(null);

    if (res?.error) {
      setError(res.error);
    } else {
      setIsOpen(false);
      resetToDirectory();
      router.refresh();
      
      const defaultMsg = editingRule 
        ? `${ruleType} Fine rule (${editingRule.ruleCode || `#${editingRule.id}`}) updated successfully!` 
        : `${ruleType} Fine rule created successfully!`;
        
      setSuccessPopupMsg(res?.success || defaultMsg);
    }
  }

  async function handleDeleteConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!deletingRule) return;
    if (!deleteReason.trim() || deleteReason.trim().length < 5) {
      setError('Please provide a valid deletion reason (min 5 characters).');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('rule_id', String(deletingRule.id));
    formData.append('reason', `${deletingRule.ruleCode ? `[${deletingRule.ruleCode}] ` : ''}${deleteReason}`);

    const res = await deleteFineRule(formData);

    setLoading(false);
    if (res?.error) {
      setError(res.error);
    } else {
      setEditingDeleteRule(null);
      setDeleteReason('');
      setIsOpen(false);
      resetToDirectory();
      router.refresh();
      setSuccessPopupMsg(res.success || `${deletingRule.ruleCode || `Rule #${deletingRule.id}`} deleted permanently and audited!`);
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full sm:w-auto px-3 py-2 bg-amber-900 hover:bg-amber-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
      >
        <Settings size={14} /> Manage Late Fines & Penalties
      </button>

      {/* MAIN MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-left font-sans">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 text-slate-900 space-y-4 border border-slate-200 relative">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 text-amber-900 rounded-lg">
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm uppercase text-slate-900">Penalty & Fine Configuration</h3>
                  <p className="text-[10px] text-slate-500 font-mono">Separate Management for Savings Deposits & Overdue Loans</p>
                </div>
              </div>
              <button 
                onClick={() => { setIsOpen(false); resetToDirectory(); }} 
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="p-2.5 bg-red-50 text-red-700 text-xs font-bold rounded-lg border border-red-200">
                {error}
              </div>
            )}

            {/* TAB 1: VIEW TWO-COLUMN DIRECTORY */}
            {activeTab === 'VIEW' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                
                {/* COLUMN 1: SAVINGS FINE RULES */}
                <div className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center border-b border-amber-200 pb-2">
                    <div className="flex items-center gap-1.5 font-extrabold text-amber-950 text-xs">
                      <PiggyBank size={16} className="text-amber-700" />
                      <span>Savings Fine Rules ({savingsRules.length})</span>
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => openNewForm('SAVINGS')}
                        className="px-2 py-1 bg-amber-900 hover:bg-amber-800 text-white font-bold text-[10px] rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                      >
                        <Plus size={11} /> New Savings Rule
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2 font-mono">
                    {visibleSavingsRules.map((r) => {
                      const fromMonth = r.effective_from_month || (r.effective_from ? String(r.effective_from).slice(0, 7) : '2025-01');
                      const toMonth = r.effective_to_month || (r.effective_to ? String(r.effective_to).slice(0, 7) : null);
                      const rateVal = Number(r.rate_value ?? r.amount ?? 0);
                      const noteText = r.notes || r.reason || 'General Assembly Rule';

                      return (
                        <div key={r.id} className="p-2.5 bg-white border border-amber-200 rounded-xl shadow-2xs space-y-1">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.2 bg-amber-200 text-amber-950 font-black rounded font-mono text-[10px]">
                                {r.ruleCode}
                              </span>
                              <strong className="text-slate-900 font-sans text-xs">
                                {fromMonth} to {toMonth || 'Present (Active)'}
                              </strong>
                            </div>
                            <strong className="text-amber-950 font-black text-xs">
                              {r.fine_type === 'PERCENTAGE' ? `${rateVal}%` : `NPR ${rateVal}`}
                            </strong>
                          </div>

                          <p className="text-[10px] font-sans text-slate-700 italic">
                            "{noteText}"
                          </p>

                          <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-[9px] font-sans text-slate-500">
                            <span>Grace: <strong>{r.grace_period_days ?? 0} Days</strong></span>
                            {isAdmin && (
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditForm(r)}
                                  className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[9px] rounded transition-colors"
                                >
                                  <Edit2 size={9} /> Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingDeleteRule(r)}
                                  className="px-1.5 py-0.5 bg-red-100 hover:bg-red-200 text-red-800 font-bold text-[9px] rounded transition-colors"
                                  title="Delete Rule"
                                >
                                  <Trash2 size={9} /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {savingsRules.length === 0 && (
                      <div className="p-4 text-center text-amber-800/60 font-sans text-xs">
                        No custom savings deposit fine rules configured.
                      </div>
                    )}
                  </div>

                  {savingsRules.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setShowAllSavingsRules(!showAllSavingsRules)}
                      className="w-full py-1 bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-[10px] rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      {showAllSavingsRules ? (
                        <>Collapse Savings Rules <ChevronUp size={12} /></>
                      ) : (
                        <>Show {savingsRules.length - 3} More Rules <ChevronDown size={12} /></>
                      )}
                    </button>
                  )}
                </div>

                {/* COLUMN 2: LOAN FINE RULES */}
                <div className="p-3.5 bg-red-50/50 border border-red-200 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center border-b border-red-200 pb-2">
                    <div className="flex items-center gap-1.5 font-extrabold text-red-950 text-xs">
                      <Landmark size={16} className="text-red-700" />
                      <span>Loan Fine Rules ({loanRules.length})</span>
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => openNewForm('LOAN')}
                        className="px-2 py-1 bg-red-900 hover:bg-red-800 text-white font-bold text-[10px] rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                      >
                        <Plus size={11} /> New Loan Rule
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2 font-mono">
                    {visibleLoanRules.map((r) => {
                      const fromMonth = r.effective_from_month || (r.effective_from ? String(r.effective_from).slice(0, 7) : '2025-01');
                      const toMonth = r.effective_to_month || (r.effective_to ? String(r.effective_to).slice(0, 7) : null);
                      const rateVal = Number(r.rate_value ?? r.amount ?? 0);
                      const noteText = r.notes || r.reason || 'Board resolution rule';

                      return (
                        <div key={r.id} className="p-2.5 bg-white border border-red-200 rounded-xl shadow-2xs space-y-1">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.2 bg-red-200 text-red-950 font-black rounded font-mono text-[10px]">
                                {r.ruleCode}
                              </span>
                              <strong className="text-slate-900 font-sans text-xs">
                                {fromMonth} to {toMonth || 'Present (Active)'}
                              </strong>
                            </div>
                            <strong className="text-red-950 font-black text-xs">
                              {r.fine_type === 'PERCENTAGE' ? `${rateVal}%` : `NPR ${rateVal}`}
                            </strong>
                          </div>

                          <p className="text-[10px] font-sans text-slate-700 italic">
                            "{noteText}"
                          </p>

                          <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-[9px] font-sans text-slate-500">
                            <span>Grace: <strong>{r.grace_period_days ?? 0} Days</strong></span>
                            {isAdmin && (
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditForm(r)}
                                  className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[9px] rounded transition-colors"
                                >
                                  <Edit2 size={9} /> Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingDeleteRule(r)}
                                  className="px-1.5 py-0.5 bg-red-100 hover:bg-red-200 text-red-800 font-bold text-[9px] rounded transition-colors"
                                  title="Delete Rule"
                                >
                                  <Trash2 size={9} /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {loanRules.length === 0 && (
                      <div className="p-4 text-center text-red-800/60 font-sans text-xs">
                        No custom loan overdue fine rules configured.
                      </div>
                    )}
                  </div>

                  {loanRules.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setShowAllLoanRules(!showAllLoanRules)}
                      className="w-full py-1 bg-red-100 hover:bg-red-200 text-red-950 font-bold text-[10px] rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      {showAllLoanRules ? (
                        <>Collapse Loan Rules <ChevronUp size={12} /></>
                      ) : (
                        <>Show {loanRules.length - 3} More Rules <ChevronDown size={12} /></>
                      )}
                    </button>
                  )}
                </div>

              </div>
            )}

            {/* TAB 2: FORM */}
            {activeTab === 'FORM' && isAdmin && (
              <form onSubmit={handleFormSubmit} className="space-y-3 text-xs">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-extrabold uppercase text-amber-900 font-mono">
                    {editingRule ? `Edit ${editingRule.ruleCode || `${editingRule.rule_type} Rule #${editingRule.id}`}` : `New ${ruleType} Fine Rule`}
                  </span>
                  <button 
                    type="button" 
                    onClick={resetToDirectory} 
                    className="text-slate-500 hover:text-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw size={12} /> Back to Directory
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Target Module *</label>
                    <select
                      name="rule_type"
                      value={ruleType}
                      onChange={(e) => {
                        const newType = e.target.value as 'SAVINGS' | 'LOAN';
                        setRuleType(newType);
                        setFineType(newType === 'SAVINGS' ? 'FLAT_MONTHLY' : 'PERCENTAGE');
                      }}
                      className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-bold bg-white"
                    >
                      <option value="SAVINGS">SAVINGS DEPOSIT FINE</option>
                      <option value="LOAN">LOAN REPAYMENT FINE</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Calculation Type *</label>
                    <select
                      name="fine_type"
                      value={fineType}
                      onChange={(e) => setFineType(e.target.value as any)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-bold bg-white"
                    >
                      <option value="PERCENTAGE">PERCENTAGE (%) OF OVERDUE</option>
                      <option value="FLAT_MONTHLY">FLAT AMOUNT PER MISSED MONTH (NPR)</option>
                      <option value="FLAT_DAILY">FLAT AMOUNT PER OVERDUE DAY (NPR)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Rate / Value * {fineType === 'PERCENTAGE' ? '(%)' : '(NPR)'}
                    </label>
                    <input
                      type="number"
                      name="rate_value"
                      defaultValue={editingRule?.rate_value ?? editingRule?.amount ?? ''}
                      step="any"
                      required
                      placeholder="e.g. 2.0 or 50"
                      className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Grace Period (Days)</label>
                    <input
                      type="number"
                      name="grace_period_days"
                      defaultValue={editingRule?.grace_period_days ?? 5}
                      min="0"
                      step="1"
                      className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Effective Starting Month *</label>
                  <input
                    type="month"
                    name="effective_from_month"
                    defaultValue={editingRule?.effective_from_month || editingRule?.effective_from || new Date().toISOString().slice(0, 7)}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">General Assembly / Resolution Notes *</label>
                  <input
                    type="text"
                    name="notes"
                    defaultValue={editingRule?.notes || editingRule?.reason || ''}
                    required
                    minLength={5}
                    placeholder="e.g. Enacted by General Assembly Resolution #5"
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    type="button" 
                    onClick={resetToDirectory} 
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading} 
                    className="flex-1 py-2 bg-amber-900 hover:bg-amber-800 text-white font-bold rounded-xl transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1"
                  >
                    <Save size={14} />
                    {editingRule ? 'Save & Review Update' : 'Save Fine Rule'}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* UPDATE CONFIRMATION MODAL */}
      {updateConfirmOpen && editingRule && pendingUpdateData && (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-left font-sans">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-amber-200 overflow-hidden space-y-4 p-5 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-700" /> Confirm Rule Update
              </h3>
              <button onClick={() => setUpdateConfirmOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-950 rounded-xl space-y-1">
              <p className="text-[11px] text-amber-900 leading-relaxed">
                You are updating rule <strong>{editingRule.ruleCode || `#${editingRule.id}`}</strong> ({editingRule.rule_type} Fine). Changes will take effect immediately and be permanently logged into the system audit trail.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setUpdateConfirmOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => executeSave(pendingUpdateData)}
                  className="w-1/2 py-2.5 bg-amber-900 hover:bg-amber-800 text-white font-bold rounded-xl flex justify-center items-center gap-1.5 cursor-pointer"
                >
                  {loading ? 'Saving...' : 'Confirm & Update'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETION CONFIRMATION MODAL */}
      {deletingRule && (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-left font-sans">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-red-200 overflow-hidden space-y-4 p-5 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Trash2 size={18} className="text-red-700" /> Delete {deletingRule.rule_type} Fine Rule {deletingRule.ruleCode ? `(${deletingRule.ruleCode})` : `#${deletingRule.id}`}
              </h3>
              <button onClick={() => setEditingDeleteRule(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 text-red-950 rounded-xl space-y-1">
              <div className="font-extrabold flex items-center gap-1.5 text-red-900">
                <AlertTriangle size={16} /> Permanent Removal Warning
              </div>
              <p className="text-[11px] text-red-800">
                You are deleting rule <strong>{deletingRule.ruleCode || `#${deletingRule.id}`}</strong> (DB Record #{deletingRule.id}, {deletingRule.rule_type} fine of <strong>{deletingRule.fine_type === 'PERCENTAGE' ? `${deletingRule.rate_value}%` : `NPR ${deletingRule.rate_value}`}</strong>) starting from <strong>{deletingRule.effective_from_month || deletingRule.effective_from}</strong>. This action will be permanently logged in the audit trail.
              </p>
            </div>

            <form onSubmit={handleDeleteConfirm} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Audit Deletion Reason (Min 5 chars) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Accidental duplicate rule entry"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  required
                  minLength={5}
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-medium"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setEditingDeleteRule(null)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-1/2 py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl flex justify-center items-center gap-1.5 cursor-pointer"
                >
                  {loading ? 'Deleting...' : 'Confirm & Audit Delete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUCCESS POPUP NOTIFICATION MODAL */}
      {successPopupMsg && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-left font-sans">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-emerald-200 overflow-hidden text-center p-6 space-y-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={28} />
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-slate-900 text-base flex items-center justify-center gap-1.5">
                <Sparkles size={16} className="text-emerald-600" /> Action Audited & Saved!
              </h3>
              <p className="text-xs text-slate-700 font-medium px-2 leading-relaxed">
                {successPopupMsg}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSuccessPopupMsg(null)}
              className="w-full py-2.5 bg-emerald-900 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl cursor-pointer shadow-xs"
            >
              Great, Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}