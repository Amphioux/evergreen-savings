'use client';

import { useState } from 'react';
import { addOrganogramPosition, assignOrganogramMember, deleteOrganogramPosition } from '@/app/actions';
import { Plus, Trash2, UserCheck, Shield, AlertCircle, Check } from 'lucide-react';

export default function OrganogramManager({
  organogramNodes = [],
  activeMembers = [],
  isAdmin,
}: {
  organogramNodes: any[];
  activeMembers: any[];
  isAdmin: boolean;
}) {
  const [status, setStatus] = useState<{ error?: string; success?: string } | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (!isAdmin) return null;

  async function handleAddSlot(formData: FormData) {
    setStatus(null);
    const res = await addOrganogramPosition(formData);
    if (res?.error) setStatus({ error: res.error });
    if (res?.success) setStatus({ success: res.success });
  }

  async function handleMemberChange(positionId: string, memberId: string) {
    setLoadingId(positionId);
    setStatus(null);
    const res = await assignOrganogramMember(positionId, memberId === 'VACANT' ? null : memberId);
    setLoadingId(null);
    if (res?.error) setStatus({ error: res.error });
  }

  async function handleDeleteSlot(positionId: string) {
    if (!confirm('Remove this organogram position slot?')) return;
    setStatus(null);
    const res = await deleteOrganogramPosition(positionId);
    if (res?.error) setStatus({ error: res.error });
  }

  return (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 text-left">
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
          <Shield size={16} className="text-purple-700" />
          <span>Manage Structure & Assignments (Admin Control)</span>
        </div>
      </div>

      {status?.error && <div className="p-2 bg-red-50 text-red-700 text-xs font-semibold rounded">{status.error}</div>}
      {status?.success && <div className="p-2 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded">{status.success}</div>}

      {/* Add Slot Form */}
      <form action={handleAddSlot} className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
        <input name="title" required placeholder="Position Title (e.g. Secretary)" className="p-2 border border-slate-300 rounded bg-white text-slate-900 font-semibold" />
        <select name="tier" defaultValue="2" className="p-2 border border-slate-300 rounded bg-white font-bold text-slate-900">
          <option value="1">Tier 1: Top Leadership</option>
          <option value="2">Tier 2: Executive Officer</option>
          <option value="3">Tier 3: Committee Member</option>
        </select>
        <input name="display_order" type="number" defaultValue="1" placeholder="Order" className="p-2 border border-slate-300 rounded bg-white text-slate-900 font-mono" />
        <button type="submit" className="bg-purple-900 hover:bg-purple-800 text-white font-bold py-2 rounded flex items-center justify-center gap-1">
          <Plus size={14} /> Add Slot
        </button>
      </form>

      {/* Slot Assignment Table */}
      <div className="space-y-2 pt-2">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Assigned Positions ({organogramNodes.length})</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {organogramNodes.map((node) => (
            <div key={node.id} className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-2">
              <div className="text-left overflow-hidden">
                <span className="font-bold text-slate-900 text-xs block truncate">{node.title}</span>
                <span className="text-[10px] text-slate-400 font-mono">Tier {node.tier} • Order {node.display_order}</span>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <select
                  disabled={loadingId === node.id}
                  value={node.member_id || 'VACANT'}
                  onChange={(e) => handleMemberChange(node.id, e.target.value)}
                  className="p-1.5 border border-slate-300 rounded text-xs bg-white text-slate-900 font-medium max-w-[140px]"
                >
                  <option value="VACANT">-- Vacant --</option>
                  {activeMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.account_id || 'Ext'})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleDeleteSlot(node.id)}
                  className="text-slate-400 hover:text-red-600 p-1"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}