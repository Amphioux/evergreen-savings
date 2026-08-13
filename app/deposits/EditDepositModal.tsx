'use client';

import { useState } from 'react';
import { updateDeposit } from '@/app/actions';
import { Edit3, X, CheckCircle2, UserCheck, UserPlus, AlertTriangle, FileText } from 'lucide-react';

export default function EditDepositModal({ deposit }: { deposit: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ error?: string; success?: string } | null>(null);

  const currentMonth = deposit.for_month ? deposit.for_month.slice(0, 7) : new Date().toISOString().slice(0, 7);

  // Depositor identity state
  const [isSelf, setIsSelf] = useState<boolean>(!deposit.deposited_by_name);
  const [depositorName, setDepositorName] = useState<string>(deposit.deposited_by_name || '');

  // Fine & Note State
  const [fineAmount, setFineAmount] = useState<string>(String(deposit.fine_amount || 0));
  const [fineDiscount, setFineDiscount] = useState<string>(String(deposit.fine_discount_amount || 0));
  const [fineWaived, setFineWaived] = useState<boolean>(Boolean(deposit.fine_waived));
  const [fineOverrideReason, setFineOverrideReason] = useState<string>(deposit.fine_override_reason || '');
  const [depositNote, setDepositNote] = useState<string>(deposit.deposit_note || '');

  async function handleSubmit(formData: FormData) {
    setStatus(null);
    setLoading(true);

    // Append late fine & note parameters
    formData.append('deposit_note', depositNote);
    formData.append('fine_amount', fineWaived ? '0' : fineAmount);
    formData.append('fine_discount_amount', fineDiscount);
    formData.append('fine_waived', fineWaived ? 'true' : 'false');
    formData.append('fine_override_reason', fineOverrideReason);

    const res = await updateDeposit(formData);
    setLoading(false);

    if (res?.error) {
      setStatus({ error: res.error });
    } else if (res?.success) {
      setStatus({ success: res.success });
      setTimeout(() => setIsOpen(false), 1200);
    }
  }

  function handleOpen() {
    setIsOpen(true);
    setStatus(null);
    setIsSelf(!deposit.deposited_by_name);
    setDepositorName(deposit.deposited_by_name || '');
    setFineAmount(String(deposit.fine_amount || 0));
    setFineDiscount(String(deposit.fine_discount_amount || 0));
    setFineWaived(Boolean(deposit.fine_waived));
    setFineOverrideReason(deposit.fine_override_reason || '');
    setDepositNote(deposit.deposit_note || '');
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="p-1.5 text-slate-600 hover:text-blue-800 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center gap-1 font-bold text-xs cursor-pointer"
        title="Edit Deposit Entry"
      >
        <Edit3 size={14} /> Edit
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-left font-sans">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">Edit Deposit Entry</h3>
                <p className="text-xs text-slate-300 font-mono">
                  {deposit.profiles?.full_name} ({deposit.profiles?.account_id || 'N/A'})
                </p>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="text-slate-400 hover:text-white p-1 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form action={handleSubmit} className="p-5 space-y-3.5 text-xs">
              <input type="hidden" name="deposit_id" value={deposit.id} />

              {status?.error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 font-semibold rounded-lg">
                  {status.error}
                </div>
              )}
              {status?.success && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold rounded-lg flex items-center gap-2">
                  <CheckCircle2 size={16} /> {status.success}
                </div>
              )}

              {/* Month and Amount Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contribution Month *</label>
                  <input
                    name="for_month"
                    required
                    type="month"
                    defaultValue={currentMonth}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount Paid (NPR) *</label>
                  <input
                    name="amount_paid"
                    required
                    type="number"
                    defaultValue={deposit.amount_paid}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Late Penalty Fine Adjustment Box */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <div className="flex justify-between items-center border-b border-amber-200 pb-1.5">
                  <span className="font-extrabold text-amber-950 flex items-center gap-1">
                    <AlertTriangle size={14} className="text-amber-700" /> Late Penalty Fine Adjustment
                  </span>
                  <label className="flex items-center gap-1 text-[11px] font-bold text-amber-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fineWaived}
                      onChange={(e) => setFineWaived(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-amber-800"
                    />
                    Waive Off Fine
                  </label>
                </div>

                {!fineWaived && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Fine Collected (NPR)
                      </label>
                      <input
                        type="number"
                        value={fineAmount}
                        onChange={(e) => setFineAmount(e.target.value)}
                        min="0"
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-mono font-bold text-amber-950"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Discount Granted (NPR)
                      </label>
                      <input
                        type="number"
                        value={fineDiscount}
                        onChange={(e) => setFineDiscount(e.target.value)}
                        min="0"
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-mono font-bold text-emerald-800"
                      />
                    </div>
                  </div>
                )}

                {(fineWaived || Number(fineDiscount) > 0) && (
                  <div className="pt-1">
                    <label className="block font-bold text-amber-900 mb-1 text-[11px]">
                      Waiver / Discount Approval Note *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Approved by Executive Board"
                      value={fineOverrideReason}
                      onChange={(e) => setFineOverrideReason(e.target.value)}
                      required={fineWaived || Number(fineDiscount) > 0}
                      className="w-full p-2 border border-amber-300 rounded-lg bg-white text-slate-900 font-medium"
                    />
                  </div>
                )}
              </div>

              {/* Depositor Identity Selection */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="block font-bold text-slate-800">Depositor Identity *</label>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="radio"
                      name="is_self_deposit"
                      checked={isSelf}
                      onChange={() => {
                        setIsSelf(true);
                        setDepositorName('');
                      }}
                      className="text-blue-900 focus:ring-blue-900"
                    />
                    <UserCheck size={14} className="text-emerald-700" /> Member (Self)
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="radio"
                      name="is_self_deposit"
                      checked={!isSelf}
                      onChange={() => setIsSelf(false)}
                      className="text-blue-900 focus:ring-blue-900"
                    />
                    <UserPlus size={14} className="text-blue-700" /> On Behalf Of
                  </label>
                </div>

                {!isSelf && (
                  <div className="pt-1">
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      Representative / Depositor Name *
                    </label>
                    <input
                      type="text"
                      name="deposited_by_name"
                      placeholder="e.g. Ramesh Karki (Brother / Representative)"
                      value={depositorName}
                      onChange={(e) => setDepositorName(e.target.value)}
                      required={!isSelf}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-900"
                    />
                  </div>
                )}
              </div>

              {/* Deposit Reference Note */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <FileText size={12} /> Deposit Reference Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paid via mobile banking or cash in meeting"
                  value={depositNote}
                  onChange={(e) => setDepositNote(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={loading}
                  type="submit"
                  className="w-1/2 bg-blue-900 hover:bg-blue-800 disabled:bg-slate-400 text-white font-bold py-2 rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  {loading ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </>
  );
}