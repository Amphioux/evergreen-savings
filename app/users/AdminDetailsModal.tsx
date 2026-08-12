'use client';

import { useState, useMemo } from 'react';
import { 
  updateAdminPosition, 
  updateAdminProfileDetails, 
  deactivateAdminAccount,
  reactivateAdminAccount 
} from '@/app/actions';
import { EXECUTIVE_POSITIONS } from '@/lib/executivePositions';
import { 
  Eye, 
  X, 
  Award, 
  History, 
  Pencil, 
  UserX, 
  UserCheck,
  TrendingUp, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight
} from 'lucide-react';

interface AdminDetailsModalProps {
  admin: any;
  auditLogs?: any[];
  isSuperAdmin: boolean;
}

// Helper to fix the UTC vs Local Timezone issue
function formatLocalDate(dateString: string) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export default function AdminDetailsModal({ admin, auditLogs = [], isSuperAdmin }: AdminDetailsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'DOSSIER' | 'TIMELINE' | 'POSITION' | 'EDIT' | 'OFFBOARD' | 'REACTIVATE'>('DOSSIER');

  const [status, setStatus] = useState<{ error?: string; success?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const isInactive = admin.status === 'INACTIVE';

  const positionHistory = useMemo(() => {
    return auditLogs
      .filter((log) => log.entity_id === admin.id && log.entity_type === 'ADMIN_POSITION')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [auditLogs, admin.id]);

  async function handlePositionSubmit(formData: FormData) {
    setStatus(null);
    setLoading(true);
    const res = await updateAdminPosition(formData);
    setLoading(false);

    if (res?.error) setStatus({ error: res.error });
    else if (res?.success) {
      setStatus({ success: res.success });
      setActiveTab('TIMELINE');
    }
  }

  async function handleEditSubmit(formData: FormData) {
    setStatus(null);
    setLoading(true);
    const res = await updateAdminProfileDetails(formData);
    setLoading(false);

    if (res?.error) setStatus({ error: res.error });
    else if (res?.success) {
      setStatus({ success: res.success });
      setActiveTab('DOSSIER');
    }
  }

  async function handleOffboardSubmit(formData: FormData) {
    setStatus(null);
    setLoading(true);
    const res = await deactivateAdminAccount(formData);
    setLoading(false);

    if (res?.error) setStatus({ error: res.error });
    else if (res?.success) {
      setStatus({ success: res.success });
      setIsOpen(false);
    }
  }

  async function handleReactivateSubmit(formData: FormData) {
    setStatus(null);
    setLoading(true);
    const res = await reactivateAdminAccount(formData);
    setLoading(false);

    if (res?.error) setStatus({ error: res.error });
    else if (res?.success) {
      setStatus({ success: res.success });
      setIsOpen(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-md transition-colors"
        title="View Admin Dossier & Position History"
      >
        <Eye size={15} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-left">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-4 bg-purple-950 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-800 rounded-lg">
                  <ShieldCheck size={20} className="text-purple-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base">{admin.full_name}</h3>
                  <p className="text-xs text-purple-200 font-mono">
                    ID: {admin.account_id} • {admin.committee_position || 'Executive Board'}
                  </p>
                </div>
              </div>

              <button onClick={() => setIsOpen(false)} className="text-purple-300 hover:text-white p-1">
                <X size={20} />
              </button>
            </div>

            {/* Modal Sub Nav */}
            <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold gap-1 p-2 overflow-x-auto">
              <button
                onClick={() => { setActiveTab('DOSSIER'); setStatus(null); }}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
                  activeTab === 'DOSSIER' ? 'bg-purple-900 text-white' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Eye size={13} /> Dossier
              </button>

              <button
                onClick={() => { setActiveTab('TIMELINE'); setStatus(null); }}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
                  activeTab === 'TIMELINE' ? 'bg-purple-900 text-white' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <TrendingUp size={13} /> Position History ({positionHistory.length})
              </button>

              {isSuperAdmin && (
                <>
                  <button
                    onClick={() => { setActiveTab('POSITION'); setStatus(null); }}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
                      activeTab === 'POSITION' ? 'bg-amber-800 text-white' : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Award size={13} /> Change Position
                  </button>

                  <button
                    onClick={() => { setActiveTab('EDIT'); setStatus(null); }}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
                      activeTab === 'EDIT' ? 'bg-blue-800 text-white' : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Pencil size={13} /> Edit Info
                  </button>

                  {isInactive ? (
                    <button
                      onClick={() => { setActiveTab('REACTIVATE'); setStatus(null); }}
                      className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
                        activeTab === 'REACTIVATE' ? 'bg-emerald-800 text-white' : 'text-emerald-700 bg-emerald-100 hover:bg-emerald-200'
                      }`}
                    >
                      <UserCheck size={13} /> Reactivate Account
                    </button>
                  ) : (
                    <button
                      onClick={() => { setActiveTab('OFFBOARD'); setStatus(null); }}
                      className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
                        activeTab === 'OFFBOARD' ? 'bg-red-800 text-white' : 'text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <UserX size={13} /> Deactivate
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              
              {status?.error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 font-bold rounded-lg flex items-center gap-2">
                  <AlertCircle size={15} /> {status.error}
                </div>
              )}

              {status?.success && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold rounded-lg flex items-center gap-2">
                  <CheckCircle2 size={15} /> {status.success}
                </div>
              )}

              {/* OVERVIEW DOSSIER */}
              {activeTab === 'DOSSIER' && (
                <div className="space-y-4">
                  <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-xl space-y-2">
                    <span className="text-[10px] text-purple-800 font-bold uppercase block">Current Executive Designation</span>
                    <div className="text-base font-extrabold text-purple-950 flex items-center gap-2">
                      <Award size={18} className="text-purple-700" />
                      <span>{admin.committee_position || 'Executive Board'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 font-medium">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Account ID</span>
                      <strong className="font-mono text-slate-900">{admin.account_id}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Role Tier</span>
                      <strong className="font-mono text-purple-900">{admin.role}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Phone</span>
                      <strong className="font-mono text-slate-900">{admin.phone || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Personal Email</span>
                      <strong className="font-mono text-slate-900">{admin.email}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Appointment Date</span>
                      <strong className="font-mono text-slate-900">{admin.joined_date ? formatLocalDate(admin.joined_date) : 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Account Status</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        admin.status === 'INACTIVE' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {admin.status || 'ACTIVE'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* PROMOTION & POSITION HISTORY TIMELINE */}
              {activeTab === 'TIMELINE' && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-sm mb-2">
                    <History size={16} className="text-purple-700" /> Executive Timeline
                  </h4>

                  <div className="ml-2 border-l-2 border-slate-200 space-y-6">
                    {/* Latest reassignment logs */}
                    {positionHistory.map((log: any) => {
                      const oldPosition = log.old_value?.position || 'UNASSIGNED';
                      const newPosition = log.new_value?.position || 'UNKNOWN';
                      const effectiveDate = log.new_value?.effective_date || log.created_at?.split('T')[0];
                      
                      return (
                        <div key={log.id} className="relative pl-6">
                          <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-purple-600 ring-4 ring-white" />
                          
                          {/* Log Timestamp formatted locally */}
                          <div className="text-xs font-bold text-slate-500 mb-1">
                            {formatLocalDate(log.created_at)}
                          </div>
                          
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-2">
                            <h4 className="font-bold text-slate-900 text-sm">
                              Position Reassignment
                            </h4>
                            
                            {/* Visual A -> B transition block */}
                            <div className="flex items-center flex-wrap gap-2 mt-3 mb-3 p-2.5 bg-white border border-slate-200 rounded-lg w-fit">
                              <span className="text-slate-500 font-medium text-xs px-2 py-1 bg-slate-100 rounded">
                                {oldPosition}
                              </span>
                              <ArrowRight size={14} className="text-slate-400" />
                              <span className="text-purple-900 font-bold text-xs px-2 py-1 bg-purple-100 rounded border border-purple-200">
                                {newPosition}
                              </span>
                            </div>

                            <div className="flex flex-col gap-1 text-[11px] text-slate-500">
                              <div>
                                Effective Date: <strong className="text-slate-700">{formatLocalDate(effectiveDate)}</strong>
                              </div>
                              <div className="mt-1 pt-2 border-t border-slate-200">
                                Approved by: <span className="font-semibold text-slate-700">{log.changed_by_email}</span>
                              </div>
                              {log.reason && (
                                <div className="mt-1 text-slate-500 italic">
                                  "{log.reason}"
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Initial setup log at bottom of timeline */}
                    <div className="relative pl-6">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-400 ring-4 ring-white" />
                      <div className="text-xs font-bold text-slate-500 mb-1">
                        {admin.joined_date ? formatLocalDate(admin.joined_date) : 'Initial Setup'}
                      </div>
                      <div className="bg-white border border-slate-200 rounded-xl p-4 mt-2">
                        <h4 className="font-bold text-slate-900 text-sm">System Onboarding</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Account initialized. Initial position assigned during registration.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CHANGE POSITION */}
              {activeTab === 'POSITION' && isSuperAdmin && (
                <form action={handlePositionSubmit} className="space-y-3">
                  <input type="hidden" name="user_id" value={admin.id} />

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Current Position</label>
                    <input
                      disabled
                      value={admin.committee_position || 'Executive Board'}
                      className="w-full p-2 border rounded-lg bg-slate-100 font-bold text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">New Executive Designation *</label>
                    <select
                      name="committee_position"
                      required
                      defaultValue={admin.committee_position || EXECUTIVE_POSITIONS[0].label}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-bold"
                    >
                      {EXECUTIVE_POSITIONS.map((pos) => (
                        <option key={pos.value} value={pos.label}>
                          {pos.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Position Appointment / Effective Date *</label>
                    <input
                      name="effective_date"
                      type="date"
                      required
                      defaultValue={new Date().toISOString().split('T')[0]}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Audit Reason / Note *</label>
                    <input
                      name="reason"
                      required
                      placeholder="e.g. Annual election / Board rotation"
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900"
                    />
                  </div>

                  <button
                    disabled={loading}
                    type="submit"
                    className="w-full bg-amber-800 hover:bg-amber-700 text-white font-bold py-2.5 rounded-lg transition-colors"
                  >
                    {loading ? 'Updating Position...' : 'Confirm Position Promotion/Shift'}
                  </button>
                </form>
              )}

              {/* EDIT PROFILE */}
              {activeTab === 'EDIT' && isSuperAdmin && (
                <form action={handleEditSubmit} className="space-y-3">
                  <input type="hidden" name="user_id" value={admin.id} />

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Admin Full Name *</label>
                    <input
                      name="full_name"
                      required
                      defaultValue={admin.full_name}
                      className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                      <input
                        name="phone"
                        defaultValue={admin.phone || ''}
                        className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Personal Email</label>
                      <input
                        name="email"
                        type="email"
                        defaultValue={admin.email || ''}
                        className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Initial Board Appointment Date *</label>
                    <input
                      name="joined_date"
                      type="date"
                      required
                      defaultValue={admin.joined_date || new Date().toISOString().split('T')[0]}
                      className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
                    />
                  </div>

                  <button
                    disabled={loading}
                    type="submit"
                    className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-2.5 rounded-lg transition-colors"
                  >
                    {loading ? 'Saving Changes...' : 'Save Profile Changes'}
                  </button>
                </form>
              )}

              {/* REACTIVATE ACCOUNT (FOR INACTIVE ADMINS) */}
              {activeTab === 'REACTIVATE' && isSuperAdmin && isInactive && (
                <form action={handleReactivateSubmit} className="space-y-3">
                  <input type="hidden" name="user_id" value={admin.id} />

                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg">
                    <strong className="block text-xs font-bold mb-1">Reactivate Admin Credentials</strong>
                    <span>Reactivating this account will restore login permissions for <strong>{admin.account_id}</strong>. All prior historical receipts and audit logs will remain intact.</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Reactivation Reason / Note *</label>
                    <input
                      name="reason"
                      required
                      placeholder="e.g. Re-elected to Board / Returned from leave"
                      className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>

                  <button
                    disabled={loading}
                    type="submit"
                    className="w-full bg-emerald-800 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg transition-colors"
                  >
                    {loading ? 'Reactivating...' : 'Confirm Account Reactivation'}
                  </button>
                </form>
              )}

              {/* OFFBOARD / DEACTIVATE */}
              {activeTab === 'OFFBOARD' && isSuperAdmin && !isInactive && (
                <form action={handleOffboardSubmit} className="space-y-3">
                  <input type="hidden" name="user_id" value={admin.id} />

                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg">
                    <strong className="block text-xs font-bold mb-1">Caution: Admin Deactivation</strong>
                    <span>Deactivating this admin account will immediately revoke portal access. Past transaction logs created by this admin will remain permanently preserved for audit.</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Deactivation Reason *</label>
                    <textarea
                      name="reason"
                      required
                      rows={3}
                      placeholder="e.g. Tenure completed / Resigned from committee"
                      className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>

                  <button
                    disabled={loading}
                    type="submit"
                    className="w-full bg-red-800 hover:bg-red-700 text-white font-bold py-2.5 rounded-lg transition-colors"
                  >
                    {loading ? 'Deactivating...' : 'Deactivate Admin Credentials'}
                  </button>
                </form>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
}