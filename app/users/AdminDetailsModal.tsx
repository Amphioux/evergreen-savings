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
  Calendar, 
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
                      <strong className="font-mono text-slate-900">{admin.joined_date || 'N/A'}</strong>
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
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <History size={15} className="text-purple-700" /> Promotion & Executive Title Cycle
                  </h4>

                  <div className="relative border-l-2 border-purple-200 ml-3 space-y-4 pl-4 pt-1">
                    <div className="relative">
                      <div className="absolute -left-[23px] top-0.5 w-3 h-3 rounded-full bg-purple-700 border-2 border-white" />
                      <div className="font-bold text-slate-900">Appointed as {admin.committee_position || 'Executive Board'}</div>
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                        <Calendar size={11} /> {admin.joined_date || 'Initial System Setup'}
                      </div>
                    </div>

                    {positionHistory.map((log) => (
                      <div key={log.id} className="relative">
                        <div className="absolute -left-[23px] top-0.5 w-3 h-3 rounded-full bg-amber-500 border-2 border-white" />
                        <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                          <span>Reassigned:</span>
                          <span className="text-slate-500 line-through">{log.old_value?.position}</span>
                          <ArrowRight size={12} className="text-purple-700" />
                          <span className="text-purple-900 font-extrabold">{log.new_value?.position}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Appointment Date: <strong>{log.new_value?.effective_date || log.created_at?.slice(0, 10)}</strong> • Approved by {log.changed_by_email}
                        </div>
                        {log.reason && (
                          <div className="p-2 bg-slate-50 border rounded-md text-[11px] text-slate-600 mt-1 italic">
                            "{log.reason}"
                          </div>
                        )}
                      </div>
                    ))}
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