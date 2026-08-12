'use client';

import { useState, useRef, useMemo } from 'react';
import { issueLoan } from '@/app/actions';
import { Banknote, ShieldCheck, CheckCircle2, Calculator, AlertTriangle, FileText, Upload, UserCheck, X } from 'lucide-react';

interface IssueLoanFormProps {
  profiles: any[];
  activeLoans?: any[];
  currentAdmin?: {
    id: string;
    full_name: string;
    committee_position?: string;
    role?: string;
  };
}

export default function IssueLoanForm({
  profiles,
  activeLoans = [],
  currentAdmin,
}: IssueLoanFormProps) {
  const [selectedBorrowerId, setSelectedBorrowerId] = useState('');
  const [selectedGuarantorId, setSelectedGuarantorId] = useState('');
  const [principal, setPrincipal] = useState('50000');
  const [rate, setRate] = useState('12.0');
  const [tenure, setTenure] = useState('12');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);

  // PDF File Upload & Validation States
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Popup & Submit States
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [status, setStatus] = useState<{ error?: string; success?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter eligible borrowers and guarantors
  const eligibleBorrowers = profiles.filter(
    (p) =>
      p.role !== 'ADMIN' &&
      p.role !== 'SUPER_ADMIN' &&
      (!p.account_id || (!p.account_id.startsWith('ADMIN-') && !p.account_id.startsWith('SA-')))
  );

  const eligibleGuarantors = profiles.filter(
    (p) =>
      p.user_type === 'MEMBER' &&
      p.role !== 'ADMIN' &&
      p.role !== 'SUPER_ADMIN' &&
      (!p.account_id || (!p.account_id.startsWith('ADMIN-') && !p.account_id.startsWith('SA-')))
  );

  const selectedBorrower = eligibleBorrowers.find((p) => p.id === selectedBorrowerId);
  const selectedGuarantor = eligibleGuarantors.find((p) => p.id === selectedGuarantorId);
  const isExternalBorrower = selectedBorrower?.user_type === 'NON_MEMBER';

  // Approver display label
  const adminName = currentAdmin?.full_name || 'Logged Admin';
  const adminDesignation =
    currentAdmin?.committee_position || (currentAdmin?.role === 'SUPER_ADMIN' ? 'Superadmin' : 'Committee Admin');

  // Check active loan backlog
  const selectedBorrowerActiveLoan = useMemo(() => {
    if (!selectedBorrowerId) return null;
    return activeLoans.find(
      (l) =>
        (l.borrower_id && String(l.borrower_id) === String(selectedBorrowerId)) ||
        (l.account_id && selectedBorrower?.account_id && l.account_id === selectedBorrower.account_id)
    );
  }, [selectedBorrowerId, activeLoans, selectedBorrower]);

  const isSelectedBorrowerIneligible =
    selectedBorrowerActiveLoan && Number(selectedBorrowerActiveLoan.remaining_balance || 0) > 0;

  // Live EMI Projection
  const emiCalculation = useMemo(() => {
    const P = Number(principal) || 0;
    const R = (Number(rate) || 0) / 12 / 100;
    const N = Number(tenure) || 1;

    if (P <= 0 || N <= 0) return { emi: 0, totalPayable: 0, totalInterest: 0 };

    if (R === 0) {
      const emi = P / N;
      return { emi: Math.round(emi), totalPayable: P, totalInterest: 0 };
    }

    const emi = (P * R * Math.pow(1 + R, N)) / (Math.pow(1 + R, N) - 1);
    const totalPayable = emi * N;
    const totalInterest = totalPayable - P;

    return {
      emi: Math.round(emi),
      totalPayable: Math.round(totalPayable),
      totalInterest: Math.round(totalInterest),
    };
  }, [principal, rate, tenure]);

  // Frontend PDF File Validation Handler (< 500 KB)
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const file = e.target.files?.[0];

    if (!file) {
      setPdfFile(null);
      return;
    }

    // 1. Validate File Format
    if (file.type !== 'application/pdf') {
      setFileError('Invalid file type! Scanned loan application must be a PDF document.');
      setPdfFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 2. Validate File Size (< 500 KB)
    const maxSizeBytes = 500 * 1024;
    if (file.size > maxSizeBytes) {
      const fileSizeKb = (file.size / 1024).toFixed(1);
      setFileError(`File size (${fileSizeKb} KB) exceeds the 500 KB limit! Please compress the scanned PDF before uploading.`);
      setPdfFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setPdfFile(file);
  }

  // Pre-submit validation trigger
  function handleOpenConfirmation(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    if (isSelectedBorrowerIneligible) return;

    if (!pdfFile) {
      setFileError('Please attach the scanned copy of the loan application (PDF < 500 KB).');
      return;
    }

    if (isExternalBorrower && !selectedGuarantorId) {
      setStatus({ error: 'Please select an internal member guarantor for the external borrower.' });
      return;
    }

    setShowConfirmModal(true);
  }

  // Final Action Submission
  async function handleFinalSubmit() {
    setShowConfirmModal(false);
    setStatus(null);
    setLoading(true);

    if (!formRef.current) return;
    const formData = new FormData(formRef.current);

    const res = await issueLoan(formData);
    setLoading(false);

    if (res?.error) {
      setStatus({ error: res.error });
    } else if (res?.success) {
      setStatus({ success: res.success });
      formRef.current.reset();
      setSelectedBorrowerId('');
      setSelectedGuarantorId('');
      setPdfFile(null);
      setFileError(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 text-left">
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
          <Banknote size={18} className="text-amber-700" />
          <h3>Disburse New Loan</h3>
        </div>

        {/* Auto-populated Approver Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-900">
          <UserCheck size={13} className="text-amber-700" />
          <span>Approver: <strong>{adminName}</strong> ({adminDesignation})</span>
        </div>
      </div>

      {status?.error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg">
          {status.error}
        </div>
      )}

      {status?.success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2">
          <CheckCircle2 size={16} /> {status.success}
        </div>
      )}

      <form ref={formRef} onSubmit={handleOpenConfirmation} className="space-y-3 text-xs">
        
        {/* Borrower Select */}
        <div>
          <label className="block font-bold text-slate-700 mb-1">Choose Borrower *</label>
          <select
            name="borrower_id"
            required
            value={selectedBorrowerId}
            onChange={(e) => {
              setSelectedBorrowerId(e.target.value);
              setSelectedGuarantorId('');
            }}
            className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-semibold"
          >
            <option value="">-- Select Borrower ({eligibleBorrowers.length} Available) --</option>
            {eligibleBorrowers.map((p) => {
              const activeLoan = activeLoans.find(
                (l) =>
                  (l.borrower_id && String(l.borrower_id) === String(p.id)) ||
                  (l.account_id && p.account_id && l.account_id === p.account_id)
              );
              const hasBacklog = activeLoan && Number(activeLoan.remaining_balance || 0) > 0;

              return (
                <option key={p.id} value={p.id} disabled={hasBacklog}>
                  {p.full_name} ({p.account_id || (p.user_type === 'NON_MEMBER' ? 'External Borrower' : 'Member')})
                  {hasBacklog
                    ? ` ❌ [ACTIVE LOAN: ${activeLoan.loan_code} - NPR ${Number(activeLoan.remaining_balance).toLocaleString('en-IN')} BAL]`
                    : ''}
                </option>
              );
            })}
          </select>
        </div>

        {isSelectedBorrowerIneligible && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-semibold flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-600 flex-shrink-0" />
            <span>
              <strong>Loan Issuance Blocked:</strong> {selectedBorrower?.full_name} has an active loan (
              <strong>{selectedBorrowerActiveLoan.loan_code}</strong>) with an outstanding backlog of{' '}
              <strong>NPR {Number(selectedBorrowerActiveLoan.remaining_balance).toLocaleString('en-IN')}</strong>. Existing loans must be fully repaid before disbursing a new loan.
            </span>
          </div>
        )}

        {/* Guarantor Section */}
        <div>
          {!selectedBorrowerId ? (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 font-medium text-[11px]">
              Select a borrower above. External borrowers will require an internal member guarantor.
            </div>
          ) : isExternalBorrower ? (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg space-y-2">
              <label className="block font-bold text-amber-900 flex items-center gap-1 text-xs">
                <ShieldCheck size={14} className="text-amber-700" /> Member Guarantor Required *
              </label>
              <select
                name="guarantor_id"
                required
                value={selectedGuarantorId}
                onChange={(e) => setSelectedGuarantorId(e.target.value)}
                className="w-full p-2 border border-amber-300 rounded-lg bg-white text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-700"
              >
                <option value="">-- Choose Member Guarantor ({eligibleGuarantors.length} Available) --</option>
                {eligibleGuarantors.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.full_name} ({g.account_id || 'Member'})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2 text-slate-500 opacity-75">
              <ShieldCheck size={16} className="text-slate-400 flex-shrink-0" />
              <div>
                <div className="font-bold text-slate-700 text-xs">Guarantor Not Required</div>
                <div className="text-[10px] text-slate-500">
                  Internal member loan is backed by personal cooperative savings.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PDF Application Scan Upload */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <label className="block font-bold text-slate-800 flex items-center gap-1.5 text-xs">
            <Upload size={14} className="text-amber-800" /> Upload Scanned Loan Application (PDF &lt; 500 KB) *
          </label>
          <input
            ref={fileInputRef}
            name="loan_application_file"
            type="file"
            accept="application/pdf"
            required
            onChange={handleFileChange}
            className="w-full text-xs text-slate-700 p-1.5 bg-white border border-slate-300 rounded-lg file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-900 hover:file:bg-amber-200 cursor-pointer"
          />

          {fileError && (
            <div className="text-xs font-bold text-red-700 bg-red-50 p-2 border border-red-200 rounded-md flex items-center gap-1.5">
              <AlertTriangle size={14} className="flex-shrink-0" />
              <span>{fileError}</span>
            </div>
          )}

          {pdfFile && !fileError && (
            <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 p-2 border border-emerald-200 rounded-md flex items-center justify-between">
              <span className="flex items-center gap-1.5 truncate">
                <FileText size={14} className="text-emerald-700" />
                <span className="truncate">{pdfFile.name}</span>
              </span>
              <span className="font-mono text-[11px] font-bold text-emerald-900 flex-shrink-0 ml-2">
                {(pdfFile.size / 1024).toFixed(1)} KB (Valid)
              </span>
            </div>
          )}
        </div>

        {/* Principal, Rate & Tenure */}
        <div>
          <label className="block font-bold text-slate-700 mb-1">Principal Amount (NPR) *</label>
          <input
            name="principal_amount"
            required
            type="number"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Interest Rate (% p.a.) *</label>
            <input
              name="current_rate"
              required
              type="number"
              step="0.1"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Tenure (Months) *</label>
            <input
              name="tenure_months"
              required
              type="number"
              value={tenure}
              onChange={(e) => setTenure(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
            />
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Disbursement Date *</label>
          <input
            name="issue_date"
            required
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
          />
        </div>

        {/* EMI Projection Card */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="font-bold text-slate-800 flex items-center gap-1">
            <Calculator size={14} className="text-amber-800" /> EMI & Interest Projection
          </div>
          <div className="grid grid-cols-3 gap-2 text-center font-mono pt-1">
            <div className="p-2 bg-amber-50/80 border border-amber-200 rounded-lg">
              <span className="text-[10px] text-amber-800 font-sans font-bold block uppercase">Monthly EMI</span>
              <strong className="text-amber-950 text-sm font-extrabold">
                NPR {emiCalculation.emi.toLocaleString('en-IN')}
              </strong>
            </div>
            <div className="p-2 bg-purple-50 border border-purple-200 rounded-lg">
              <span className="text-[10px] text-purple-800 font-sans font-bold block uppercase">Total Interest</span>
              <strong className="text-purple-950 text-xs font-bold">
                NPR {emiCalculation.totalInterest.toLocaleString('en-IN')}
              </strong>
            </div>
            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="text-[10px] text-emerald-800 font-sans font-bold block uppercase">Total Payable</span>
              <strong className="text-emerald-950 text-xs font-bold">
                NPR {emiCalculation.totalPayable.toLocaleString('en-IN')}
              </strong>
            </div>
          </div>
        </div>

        <button
          disabled={loading || isSelectedBorrowerIneligible || !!fileError || !pdfFile}
          type="submit"
          className="w-full bg-amber-800 hover:bg-amber-700 disabled:bg-slate-400 text-white font-bold py-2.5 rounded-lg transition-colors mt-2"
        >
          Review & Disburse Loan
        </button>
      </form>

      {/* CONFIRMATION POPUP MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-left">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden space-y-4 p-5">
            
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Banknote size={18} className="text-amber-800" />
                <span>Confirm Loan Disbursement</span>
              </div>
              <button onClick={() => setShowConfirmModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">Approval Authority</span>
                <div className="font-bold text-amber-950 text-sm">{adminName}</div>
                <div className="text-amber-800 font-semibold text-[11px]">{adminDesignation}</div>
              </div>

              <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between py-1 border-b">
                  <span className="text-slate-500">Borrower:</span>
                  <strong className="text-slate-900 font-bold">{selectedBorrower?.full_name} ({selectedBorrower?.account_id || 'External'})</strong>
                </div>

                {isExternalBorrower && (
                  <div className="flex justify-between py-1 border-b text-amber-900">
                    <span className="text-amber-800">Guarantor Member:</span>
                    <strong className="font-bold">{selectedGuarantor?.full_name} ({selectedGuarantor?.account_id})</strong>
                  </div>
                )}

                <div className="flex justify-between py-1 border-b">
                  <span className="text-slate-500">Principal Amount:</span>
                  <strong className="font-mono text-slate-900 text-sm font-extrabold">NPR {Number(principal).toLocaleString('en-IN')}</strong>
                </div>

                <div className="flex justify-between py-1 border-b">
                  <span className="text-slate-500">Rate & Tenure:</span>
                  <strong className="font-mono text-slate-900">{rate}% p.a. for {tenure} Months</strong>
                </div>

                <div className="flex justify-between py-1 border-b">
                  <span className="text-slate-500">Disbursement Date:</span>
                  <strong className="font-mono text-slate-900">{issueDate}</strong>
                </div>

                <div className="flex justify-between py-1 border-b">
                  <span className="text-slate-500">Calculated Monthly EMI:</span>
                  <strong className="font-mono text-amber-900 font-bold">NPR {emiCalculation.emi.toLocaleString('en-IN')}</strong>
                </div>

                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Attached Application PDF:</span>
                  <strong className="font-mono text-emerald-800 flex items-center gap-1">
                    <FileText size={12} /> {pdfFile?.name} ({(pdfFile ? pdfFile.size / 1024 : 0).toFixed(1)} KB)
                  </strong>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cancel & Edit
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handleFinalSubmit}
                className="py-2.5 bg-amber-800 hover:bg-amber-700 disabled:bg-slate-400 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                {loading ? 'Disbursing...' : 'Confirm & Disburse'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}