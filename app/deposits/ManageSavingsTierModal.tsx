'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Settings, 
  ShieldCheck, 
  X, 
  History, 
  Plus, 
  Edit2, 
  Trash2, 
  RotateCcw, 
  CheckCircle2, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle,
  Save 
} from 'lucide-react';
import { createContributionRule, updateContributionRule, deleteContributionRule } from '@/app/actions';

interface ContributionRule {
  id: number;
  effective_from_month?: string;
  effective_from?: string;
  effective_to_month?: string | null;
  effective_to?: string | null;
  monthly_amount?: number;
  amount?: number;
  notes?: string;
  reason?: string;
  recorded_by_name?: string;
  recorded_by_designation?: string;
  ruleCode?: string;
}

export default function ManageSavingsTierModal({ 
  currentRules = [], 
  isSuperAdmin = false 
}: { 
  currentRules: ContributionRule[]; 
  isSuperAdmin?: boolean; 
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'VIEW' | 'NEW' | 'EDIT'>('VIEW');
  const [editingRule, setEditingRule] = useState<ContributionRule | null>(null);
  const [deletingRule, setEditingDeleteRule] = useState<ContributionRule | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [showAllRules, setShowAllRules] = useState(false);

  // Pending Confirmation State for both Creation & Edition
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [pendingSummary, setPendingSummary] = useState<{ amount: string; month: string; notes: string; isEdit: boolean } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successPopupMsg, setSuccessPopupMsg] = useState<string | null>(null);

  // Sort newest rules first AND compute category sequential code (SCR-01, SCR-02, SCR-03)
  const sortedRules = useMemo(() => {
    const sorted = [...currentRules].sort((a, b) => {
      const monthA = a.effective_from_month || a.effective_from || '2020-01';
      const monthB = b.effective_from_month || b.effective_from || '2020-01';
      return monthB.localeCompare(monthA);
    });

    return sorted.map((rule, idx) => ({
      ...rule,
      ruleCode: `SCR-${String(sorted.length - idx).padStart(2, '0')}`,
    }));
  }, [currentRules]);

  const visibleRules = showAllRules ? sortedRules : sortedRules.slice(0, 3);

  function openCreateForm() {
    setError(null);
    setActiveTab('NEW');
  }

  function openEditForm(rule: ContributionRule) {
    setError(null);
    setEditingRule(rule);
    setActiveTab('EDIT');
  }

  function resetToDirectory() {
    setError(null);
    setEditingRule(null);
    setEditingDeleteRule(null);
    setDeleteReason('');
    setPendingFormData(null);
    setPendingSummary(null);
    setConfirmOpen(false);
    setActiveTab('VIEW');
  }

  // Intercept Form Submission for BOTH New Rule & Edit Rule to show Confirmation Modal
  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const effectiveMonth = (formData.get('effective_from_month') as string) || '';
    const monthlyAmt = (formData.get('monthly_amount') as string) || '0';
    const notesVal = (formData.get('notes') as string) || '';

    if (editingRule) {
      formData.append('rule_id', String(editingRule.id));
    }

    setPendingFormData(formData);
    setPendingSummary({
      amount: monthlyAmt,
      month: effectiveMonth,
      notes: notesVal,
      isEdit: Boolean(editingRule),
    });

    setConfirmOpen(true);
  }

  // Execute actual submission after user confirms
  async function executeConfirmSave() {
    if (!pendingFormData) return;

    setLoading(true);
    setError(null);

    const isEdit = pendingSummary?.isEdit;
    const res = isEdit 
      ? await updateContributionRule(pendingFormData)
      : await createContributionRule(pendingFormData);

    setLoading(false);
    setConfirmOpen(false);
    setPendingFormData(null);
    setPendingSummary(null);

    if (res?.error) {
      setError(res.error);
    } else {
      setIsOpen(false);
      resetToDirectory();
      router.refresh();
      setSuccessPopupMsg(res.success || `Contribution rule ${isEdit ? 'updated' : 'scheduled'} and audited successfully!`);
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

    const res = await deleteContributionRule(formData);

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
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
      >
        <Settings size={14} /> {isSuperAdmin ? 'Configure Contribution Rules' : 'View Contribution Rules'}
      </button>

      {/* MAIN MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-left font-sans">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 text-slate-900 space-y-4 border border-slate-200 relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-100 text-purple-900 rounded-lg">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm uppercase text-slate-900">Contribution Rules & Tiers</h3>
                  <p className="text-[10px] text-slate-500 font-mono">Historical rates & active contribution rules</p>
                </div>
              </div>
              <button 
                type="button"
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

            {/* TAB 1: VIEW DIRECTORY */}
            {activeTab === 'VIEW' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase text-slate-400 font-mono flex items-center gap-1">
                    <History size={12} /> Rate Audit Log ({sortedRules.length} Tiers)
                  </span>
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={openCreateForm}
                      className="px-2.5 py-1 bg-purple-900 hover:bg-purple-800 text-white font-bold text-[11px] rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus size={12} /> New Rate Rule
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 text-xs font-mono bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {visibleRules.map((r) => {
                    const fromMonth = r.effective_from_month || (r.effective_from ? String(r.effective_from).slice(0, 7) : '2020-01');
                    const toMonth = r.effective_to_month || (r.effective_to ? String(r.effective_to).slice(0, 7) : null);
                    const amountVal = Number(r.monthly_amount ?? r.amount ?? 500);
                    const noteText = r.notes || r.reason || 'General Assembly Rule';

                    return (
                      <div key={r.id} className="border-b border-slate-200 pb-2.5 last:border-0 last:pb-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-1.5">
                              {/* SEQUENTIAL CATEGORY BADGE (e.g. SCR-03) */}
                              <span className="px-1.5 py-0.2 bg-purple-200 text-purple-950 font-black rounded font-mono text-[10px]">
                                {r.ruleCode}
                              </span>
                              <strong className="text-slate-900 font-sans text-xs">
                                {fromMonth} to {toMonth || 'Present (Active)'}
                              </strong>
                            </div>
                            <p className="text-[11px] font-sans text-slate-700 italic mt-0.5">
                              "{noteText}"
                            </p>
                            <div className="text-[9px] font-sans text-slate-400 mt-1">
                              Authorized By: <strong className="text-slate-700">{r.recorded_by_name || 'Executive Board'}</strong> ({r.recorded_by_designation || 'Board Assembly'})
                            </div>
                          </div>

                          <div className="text-right shrink-0 space-y-1 ml-2">
                            <strong className="text-purple-950 font-black text-sm block">
                              NPR {amountVal.toLocaleString('en-IN')} / mo
                            </strong>
                            {isSuperAdmin && (
                              <div className="flex justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditForm(r)}
                                  className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-sans font-bold text-[10px] rounded transition-colors inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit2 size={10} /> Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingDeleteRule(r)}
                                  className="px-2 py-0.5 bg-red-100 hover:bg-red-200 text-red-800 font-sans font-bold text-[10px] rounded transition-colors inline-flex items-center gap-1 cursor-pointer"
                                  title="Delete Accidental Rule"
                                >
                                  <Trash2 size={10} /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {sortedRules.length === 0 && (
                    <div className="p-4 text-center text-slate-400 text-xs font-sans">
                      No contribution rules found.
                    </div>
                  )}
                </div>

                {sortedRules.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setShowAllRules(!showAllRules)}
                    className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    {showAllRules ? (
                      <>Collapse List <ChevronUp size={13} /></>
                    ) : (
                      <>Show {sortedRules.length - 3} More Tiers <ChevronDown size={13} /></>
                    )}
                  </button>
                )}

                {!isSuperAdmin && (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl font-medium">
                    <strong>Note:</strong> Rule modifications require <strong>Superadmin privileges</strong>.
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: SCHEDULE / ADD NEW RULE */}
            {activeTab === 'NEW' && isSuperAdmin && (
              <form onSubmit={handleFormSubmit} className="space-y-3 text-xs">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-extrabold uppercase text-purple-900 font-mono">
                    Schedule New Contribution Rule
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
                    <label className="block font-bold text-slate-700 mb-1">Effective Starting Month *</label>
                    <input 
                      type="month" 
                      name="effective_from_month" 
                      defaultValue={new Date().toISOString().slice(0, 7)}
                      required 
                      className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-mono" 
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Monthly Amount (NPR) *</label>
                    <input 
                      type="number" 
                      name="monthly_amount" 
                      required 
                      min="1" 
                      step="1" 
                      placeholder="e.g. 500" 
                      className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">General Assembly / Resolution Audit Notes *</label>
                  <input 
                    type="text" 
                    name="notes" 
                    required 
                    minLength={5} 
                    placeholder="e.g. Enacted by General Assembly Resolution #4" 
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-sans" 
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
                    className="flex-1 py-2 bg-purple-900 hover:bg-purple-800 text-white font-bold rounded-xl transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1"
                  >
                    <Save size={14} /> Schedule & Review Rule
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: EDIT EXISTING RULE */}
            {activeTab === 'EDIT' && editingRule && isSuperAdmin && (
              <form onSubmit={handleFormSubmit} className="space-y-3 text-xs">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-extrabold uppercase text-purple-900 font-mono">
                    Edit Contribution Rule {editingRule.ruleCode ? `(${editingRule.ruleCode})` : `#${editingRule.id}`}
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
                    <label className="block font-bold text-slate-700 mb-1">Effective From (YYYY-MM) *</label>
                    <input 
                      type="month" 
                      name="effective_from_month" 
                      defaultValue={editingRule.effective_from_month || editingRule.effective_from}
                      required 
                      className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-mono" 
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Effective To (YYYY-MM)</label>
                    <input 
                      type="month" 
                      name="effective_to_month" 
                      defaultValue={editingRule.effective_to_month || editingRule.effective_to || ''}
                      placeholder="Leave blank if Active"
                      className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-mono" 
                    />
                    <span className="text-[9px] text-slate-400 block mt-0.5">Leave blank for active ongoing rate</span>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Monthly Amount (NPR) *</label>
                  <input 
                    type="number" 
                    name="monthly_amount" 
                    defaultValue={editingRule.monthly_amount ?? editingRule.amount}
                    required 
                    min="1" 
                    step="1" 
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold" 
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">General Assembly / Resolution Audit Notes *</label>
                  <input 
                    type="text" 
                    name="notes" 
                    defaultValue={editingRule.notes || editingRule.reason}
                    required 
                    minLength={5} 
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-sans" 
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
                    className="flex-1 py-2 bg-purple-900 hover:bg-purple-800 text-white font-bold rounded-xl transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1"
                  >
                    <Save size={14} /> Save & Review Update
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* CONFIRMATION POPUP MODAL (Triggers for BOTH Creation & Edit) */}
      {confirmOpen && pendingSummary && (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-left font-sans">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-purple-200 overflow-hidden space-y-4 p-5 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <AlertTriangle size={18} className="text-purple-700" /> 
                {pendingSummary.isEdit ? 'Confirm Rule Modification' : 'Confirm New Contribution Rule'}
              </h3>
              <button 
                type="button"
                onClick={() => setConfirmOpen(false)} 
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-purple-50 border border-purple-200 text-purple-950 rounded-xl space-y-2">
              <div className="font-extrabold text-purple-900 text-xs">
                {pendingSummary.isEdit ? `Updating Existing Tier ${editingRule?.ruleCode ? `(${editingRule.ruleCode})` : `#${editingRule?.id}`}` : 'Enacting New Rate Tier'}
              </div>
              <ul className="space-y-1 font-mono text-[11px] text-purple-900">
                <li>• Rate Tier: <strong>NPR {Number(pendingSummary.amount).toLocaleString('en-IN')} / month</strong></li>
                <li>• Effective Starting Month: <strong>{pendingSummary.month}</strong></li>
                <li>• Audit Notes: <em>"{pendingSummary.notes}"</em></li>
              </ul>
              <p className="text-[10px] text-purple-800 pt-1 border-t border-purple-200 font-sans">
                {pendingSummary.isEdit 
                  ? 'This modification will update rule history and be permanently logged into the audit trail.'
                  : 'Scheduling this tier will automatically close out the prior active rate tier and apply to all member deposit calculations starting this month.'}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => setConfirmOpen(false)}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
              >
                Go Back & Edit
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={executeConfirmSave}
                className="w-1/2 py-2.5 bg-purple-900 hover:bg-purple-800 text-white font-bold rounded-xl flex justify-center items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {loading ? 'Authorizing...' : 'Confirm & Save'}
              </button>
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
                <Trash2 size={18} className="text-red-700" /> Delete Contribution Rule {deletingRule.ruleCode ? `(${deletingRule.ruleCode})` : `#${deletingRule.id}`}
              </h3>
              <button 
                type="button"
                onClick={() => setEditingDeleteRule(null)} 
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 text-red-950 rounded-xl space-y-1">
              <div className="font-extrabold flex items-center gap-1.5 text-red-900">
                <AlertTriangle size={16} /> Permanent Removal Warning
              </div>
              <p className="text-[11px] text-red-800">
                You are deleting rule <strong>{deletingRule.ruleCode || `#${deletingRule.id}`}</strong> (DB Record #{deletingRule.id}, NPR {Number(deletingRule.monthly_amount ?? deletingRule.amount).toLocaleString('en-IN')}/mo) starting from <strong>{deletingRule.effective_from_month || deletingRule.effective_from}</strong>. This will be permanently recorded in the audit log.
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

      {/* SUCCESS NOTIFICATION MODAL */}
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