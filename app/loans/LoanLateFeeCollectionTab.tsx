'use client';

import { useState, useMemo } from 'react';
import { recordLoanRepayment } from '@/app/actions';
import { 
  calculateIndustryLoanDues, 
  allocateRepaymentWaterfall 
} from '@/lib/loanUtils';
import { 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  FileText,
  Search,
  X,
  Printer,
  Sparkles,
  CalendarDays,
  Percent,
  Banknote,
  Clock,
  AlertCircle,
  UserCheck
} from 'lucide-react';

interface LoanLateFeeCollectionTabProps {
  activeLoans: any[];
  profiles: any[];
  paymentList: any[];
  fineRules: any[];
}

export default function LoanLateFeeCollectionTab({
  activeLoans = [],
  profiles = [],
  paymentList = [],
  fineRules = []
}: LoanLateFeeCollectionTabProps) {
  const today = useMemo(() => new Date(), []);
  const [selectedLoan, setSelectedLoan] = useState<any | null>(null);
  const [searchDefaulterQuery, setSearchDefaulterQuery] = useState('');

  // Form Inputs
  const [paymentDate, setPaymentDate] = useState(today.toISOString().split('T')[0]);
  const [paymentNote, setPaymentNote] = useState('');
  const [cashCollectedInput, setCustomCashInput] = useState<string>('');

  // Discount & Relief Controls
  const [fineDiscountInput, setFineDiscountInput] = useState<string>('0');
  const [waiveFine, setWaiveFine] = useState(false);

  const [interestDiscountInput, setInterestDiscountInput] = useState<string>('0');
  const [waiveInterest, setWaiveInterest] = useState(false);

  // SINGLE UNIFIED WAIVER APPROVAL REASON
  const [waiverReason, setWaiverReason] = useState('');

  // Confirmation Modal
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ error?: string; success?: string } | null>(null);
  const [generatedVoucher, setGeneratedVoucher] = useState<any | null>(null);

  // Defaulter Directory Calculator
  const gracePassedLoanDefaulters = useMemo(() => {
    return activeLoans
      .map((loan) => {
        const bId = loan.borrower_id || loan.borrower?.id;
        const borrower = profiles.find((p) => String(p.id) === String(bId)) || loan.borrower || {
          full_name: loan.borrower_name || 'Unknown Borrower',
          account_id: loan.account_id || 'N/A',
          phone: 'N/A',
          user_type: 'MEMBER',
        };
        const gId = loan.guarantor_id || loan.guarantor?.id;
        const guarantor = profiles.find((p) => String(p.id) === String(gId)) || loan.guarantor;

        const loanPayments = paymentList.filter((p) => String(p.loan_id) === String(loan.id));
        const calculation = calculateIndustryLoanDues(loan, loanPayments, fineRules, today);

        if (calculation.unpaidMonthsCount === 0 && calculation.daysOverdue < 30) {
          return null;
        }

        const remainingBalance = calculation.remainingPrincipal;
        if (remainingBalance <= 0) return null;

        // Calculate total loan age in calendar days
        const issueDateObj = new Date(loan.issue_date);
        const ageInMs = today.getTime() - issueDateObj.getTime();
        const loanAgeDays = Math.max(0, Math.floor(ageInMs / (1000 * 60 * 60 * 24)));

        return {
          ...loan,
          borrower,
          guarantor,
          calculation,
          remainingBalance,
          loanAgeDays,
        };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null)
      .sort((a, b) => b.calculation.unpaidMonthsCount - a.calculation.unpaidMonthsCount);
  }, [activeLoans, profiles, paymentList, fineRules, today]);

  // Search Filter
  const filteredDefaulters = useMemo(() => {
    if (!searchDefaulterQuery.trim()) return gracePassedLoanDefaulters;
    const q = searchDefaulterQuery.toLowerCase();
    return gracePassedLoanDefaulters.filter((l) => 
      l.borrower?.full_name?.toLowerCase().includes(q) ||
      l.borrower?.account_id?.toLowerCase().includes(q) ||
      l.loan_code?.toLowerCase().includes(q) ||
      l.borrower?.phone?.toLowerCase().includes(q)
    );
  }, [gracePassedLoanDefaulters, searchDefaulterQuery]);

  // Handle Selection
  function handleSelectLoan(loan: any) {
    setSelectedLoan(loan);
    setStatus(null);
    setGeneratedVoucher(null);
    setPaymentNote('');
    
    setWaiveFine(false);
    setFineDiscountInput('0');

    setWaiveInterest(false);
    setInterestDiscountInput('0');

    setWaiverReason('');
    setShowConfirmation(false);

    const defaultCash = loan.calculation.totalCashDueNow;
    setCustomCashInput(String(defaultCash));
  }

  // Accrued Dues
  const accruedFine = selectedLoan?.calculation.accruedFineTotal || 0;
  const accruedInterest = selectedLoan?.calculation.accruedInterestTotal || 0;
  const remainingPrincipal = selectedLoan?.remainingBalance || selectedLoan?.calculation?.remainingPrincipal || 0;

  // Dynamic Discounts
  const fineDiscountGranted = waiveFine ? accruedFine : Math.min(accruedFine, Math.max(0, Number(fineDiscountInput) || 0));
  const finalFineCollected = Math.max(0, accruedFine - fineDiscountGranted);

  const interestDiscountGranted = waiveInterest ? accruedInterest : Math.min(accruedInterest, Math.max(0, Number(interestDiscountInput) || 0));
  const finalInterestCollected = Math.max(0, accruedInterest - interestDiscountGranted);

  const requiresApprovalReason = fineDiscountGranted > 0 || interestDiscountGranted > 0;

  function handleToggleWaiveFine(checked: boolean) {
    setWaiveFine(checked);
    if (checked) {
      setFineDiscountInput(String(accruedFine));
    } else {
      setFineDiscountInput('0');
    }
  }

  function handleToggleWaiveInterest(checked: boolean) {
    setWaiveInterest(checked);
    if (checked) {
      setInterestDiscountInput(String(accruedInterest));
    } else {
      setInterestDiscountInput('0');
    }
  }

  // Real-time Waterfall Calculation
  const waterfall = useMemo(() => {
    return allocateRepaymentWaterfall(
      Number(cashCollectedInput) || 0,
      accruedFine,
      accruedInterest,
      remainingPrincipal,
      fineDiscountGranted,
      interestDiscountGranted
    );
  }, [cashCollectedInput, accruedFine, accruedInterest, remainingPrincipal, fineDiscountGranted, interestDiscountGranted]);

  function handleInitConfirmation(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLoan || waterfall.totalPaid <= 0) return;
    setStatus(null);
    setShowConfirmation(true);
  }

  async function executeConfirmedSubmit() {
    if (!selectedLoan || waterfall.totalPaid <= 0) return;

    setLoading(true);
    setStatus(null);

    const missedMonthsText = selectedLoan.calculation.unpaidMonthsBreakdown.map((m: any) => m.monthLabel).join(', ');
    const reliefNotes = [];
    if (fineDiscountGranted > 0) reliefNotes.push(`Fine Relief: NPR ${fineDiscountGranted}`);
    if (interestDiscountGranted > 0) reliefNotes.push(`Interest Relief: NPR ${interestDiscountGranted}`);

    const combinedNote = `[TELLER SETTLEMENT: Loan Age ${selectedLoan.loanAgeDays} Days | ${selectedLoan.calculation.unpaidMonthsCount} Mo Unpaid (${missedMonthsText}) | Cash: NPR ${waterfall.totalPaid} (Fine: NPR ${waterfall.finePaid}, Interest: NPR ${waterfall.interestPaid}, Principal: NPR ${waterfall.principalPaid})${reliefNotes.length > 0 ? ` | ${reliefNotes.join(', ')}` : ''}] ${paymentNote ? `Note: ${paymentNote}` : ''}${waiverReason ? ` | Waiver Reason: ${waiverReason}` : ''}`;

    const formData = new FormData();
    formData.append('loan_id', String(selectedLoan.id));
    formData.append('principal_paid', String(waterfall.principalPaid));
    formData.append('interest_paid', String(waterfall.interestPaid));
    formData.append('fine_paid', String(waterfall.finePaid));
    
    // Explicit Schema Mapping
    formData.append('fine_discount_amount', String(fineDiscountGranted));
    formData.append('fine_waived', String(waiveFine || fineDiscountGranted >= accruedFine));
    formData.append('interest_waived', String(interestDiscountGranted));
    formData.append('waiver_reason', waiverReason);
    
    formData.append('payment_date', paymentDate);
    formData.append('payment_note', combinedNote);

    const res = await recordLoanRepayment(formData);

    setLoading(false);
    setShowConfirmation(false);

    if (res?.error) {
      setStatus({ error: res.error });
    } else if (res?.success) {
      setStatus({ 
        success: `Collected NPR ${waterfall.totalPaid.toLocaleString('en-IN')} for loan ${selectedLoan.loan_code || `#${selectedLoan.id}`} (${selectedLoan.borrower?.full_name})!` 
      });

      setGeneratedVoucher({
        payment_code: res.receipt?.payment_code || `PFN-${Date.now().toString().slice(-6)}`,
        payment_date: paymentDate,
        borrower_name: selectedLoan.borrower?.full_name,
        borrower_account_id: selectedLoan.borrower?.account_id,
        loan_code: selectedLoan.loan_code || `LN-${selectedLoan.id}`,
        days_overdue: selectedLoan.calculation.daysOverdue,
        missed_months_count: selectedLoan.calculation.unpaidMonthsCount,
        fine_paid: waterfall.finePaid,
        interest_paid: waterfall.interestPaid,
        principal_paid: waterfall.principalPaid,
        total_paid: waterfall.totalPaid,
        fine_waived: fineDiscountGranted,
        interest_waived: interestDiscountGranted,
        waiver_reason: waiverReason,
        new_principal_balance: waterfall.newPrincipalBalance,
        recorded_by: 'Treasury Admin',
        payment_note: paymentNote,
      });

      setSelectedLoan(null);
      setCustomCashInput('');
      setPaymentNote('');
      setWaiveFine(false);
      setWaiveInterest(false);
      setFineDiscountInput('0');
      setInterestDiscountInput('0');
      setWaiverReason('');
    }
  }

  return (
    <div className="space-y-4 text-left font-sans">
      
      {/* Header Banner */}
      <div className="p-3.5 bg-red-50 rounded-2xl border border-red-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div>
          <h3 className="font-extrabold text-red-950 text-sm flex items-center gap-2">
            <ShieldAlert size={18} className="text-red-800 shrink-0" />
            Teller Loan Fine & Interest Settlement Terminal
          </h3>
          <p className="text-xs text-red-800 font-mono mt-0.5">
            Supports manual partial discounts, executive waivers, and automatic waterfall cash splitting.
          </p>
        </div>
        <span className="text-xs font-mono font-extrabold text-red-950 bg-red-200/80 px-3 py-1 rounded-xl">
          {gracePassedLoanDefaulters.length} Overdue Borrowers
        </span>
      </div>

      {/* Success Notification */}
      {status?.success && (
        <div className="p-3.5 bg-emerald-50 text-emerald-900 font-bold text-xs rounded-xl border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
            <span>{status.success}</span>
          </div>
          
          {generatedVoucher && (
            <button
              type="button"
              onClick={() => {
                const query = new URLSearchParams({
                  payment_code: generatedVoucher.payment_code,
                  payment_date: generatedVoucher.payment_date,
                  borrower_name: generatedVoucher.borrower_name,
                  borrower_account_id: generatedVoucher.borrower_account_id,
                  loan_code: generatedVoucher.loan_code,
                  days_overdue: String(generatedVoucher.days_overdue || 0),
                  missed_months_count: String(generatedVoucher.missed_months_count || 0),
                  fine_paid: String(generatedVoucher.fine_paid || 0),
                  interest_paid: String(generatedVoucher.interest_paid || 0),
                  principal_paid: String(generatedVoucher.principal_paid || 0),
                  total_paid: String(generatedVoucher.total_paid || 0),
                  fine_waived: String(generatedVoucher.fine_waived || 0),
                  interest_waived: String(generatedVoucher.interest_waived || 0),
                  waiver_reason: generatedVoucher.waiver_reason || '',
                  new_principal_balance: String(generatedVoucher.new_principal_balance || 0),
                  recorded_by: generatedVoucher.recorded_by || 'Treasury Admin',
                });

                window.open(
                  `/loans/fine-receipt?${query.toString()}`,
                  '_blank',
                  'width=850,height=800,scrollbars=yes'
                );
              }}
              className="px-3 py-1.5 bg-red-900 hover:bg-red-800 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
            >
              <Printer size={14} /> Print Fine Slip ({generatedVoucher.payment_code})
            </button>
          )}
        </div>
      )}

      {status?.error && (
        <div className="p-3 bg-red-50 text-red-700 font-bold text-xs rounded-xl border border-red-200">
          {status.error}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* LEFT PANEL: Defaulters Directory List */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-3 bg-slate-900 text-white font-bold text-xs uppercase tracking-wider space-y-2">
            <div className="flex justify-between items-center">
              <span>Fine-Active Loan Directory</span>
              <span className="font-mono text-[10px] text-red-300 font-bold">{filteredDefaulters.length} Overdue</span>
            </div>

            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter Name, Account ID, Loan Code..."
                value={searchDefaulterQuery}
                onChange={(e) => setSearchDefaulterQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-800 text-white placeholder-slate-400 rounded-lg text-xs border border-slate-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[580px] overflow-y-auto">
            {filteredDefaulters.map((l) => {
              const isSelected = selectedLoan?.id === l.id;
              const calc = l.calculation;

              return (
                <div
                  key={l.id}
                  onClick={() => handleSelectLoan(l)}
                  className={`p-3 transition-colors cursor-pointer space-y-2 text-xs ${
                    isSelected ? 'bg-red-50/80 border-l-4 border-red-800' : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Top Row: Borrower Name & Total Due */}
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                        <span>{l.borrower?.full_name}</span>
                        {isSelected && (
                          <span className="px-1.5 py-0.2 bg-red-800 text-white text-[9px] font-mono rounded font-bold inline-flex items-center gap-0.5">
                            <UserCheck size={9} /> Selected
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                        Code: <strong className="text-slate-800">{l.loan_code || `LN-${l.id}`}</strong> • Acc: <strong>{l.borrower?.account_id || 'N/A'}</strong>
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[9px] font-sans text-slate-400 font-extrabold uppercase block">Due Now</span>
                      <strong className="text-sm font-black text-red-950 font-mono block">
                        NPR {calc.totalCashDueNow.toLocaleString('en-IN')}
                      </strong>
                    </div>
                  </div>

                  {/* Bottom Row: Badges & Dues Split */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 font-mono text-[10px]">
                    <div className="flex items-center gap-1">
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded font-bold flex items-center gap-1">
                        <Clock size={10} className="text-slate-400" /> {l.loanAgeDays}d Old
                      </span>
                      <span className="px-1.5 py-0.5 bg-red-100 text-red-900 border border-red-200 rounded font-extrabold flex items-center gap-1">
                        <AlertCircle size={10} className="text-red-700" /> {calc.unpaidMonthsCount} Mo Unpaid
                      </span>
                    </div>

                    <div className="text-right font-bold text-slate-700">
                      <span className="text-purple-900">Int: NPR {calc.accruedInterestTotal.toLocaleString('en-IN')}</span>
                      <span className="text-slate-300 mx-1">|</span>
                      <span className="text-red-800">Fine: NPR {calc.accruedFineTotal.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredDefaulters.length === 0 && (
              <div className="p-8 text-center text-emerald-800 bg-emerald-50/50 text-xs font-bold space-y-1">
                <CheckCircle2 size={24} className="mx-auto text-emerald-600 mb-1" />
                <p>No Active Loan Penalty Defaulters!</p>
                <p className="text-[10px] text-emerald-600 font-normal">
                  All active loan borrowers are either compliant or currently within their allowed grace window.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Form */}
        <div className="lg:col-span-7">
          {selectedLoan ? (
            <form onSubmit={handleInitConfirmation} className="bg-white rounded-2xl border-2 border-red-200 shadow-xs p-4 space-y-3.5 text-xs">
              
              {/* Header */}
              <div className="border-b border-slate-200 pb-2.5 flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-red-900 bg-red-100 px-2 py-0.5 rounded font-mono">
                    Collecting Overdue Loan Dues
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-1">
                    {selectedLoan.borrower?.full_name}
                  </h3>
                  <div className="text-[11px] text-slate-500 font-mono flex items-center gap-3 mt-0.5">
                    <span>Code: <strong className="text-slate-800">{selectedLoan.loan_code || `LN-${selectedLoan.id}`}</strong></span>
                    <span>Acc: <strong>{selectedLoan.borrower?.account_id || 'N/A'}</strong></span>
                    <span className="text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded font-bold">Age: {selectedLoan.loanAgeDays} Days Old</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLoan(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>

              {/* OVERDUE MONTHS BREAKDOWN PILLS */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                  <CalendarDays size={13} className="text-red-700" /> Overdue Months Breakdown ({selectedLoan.calculation.unpaidMonthsCount} Months Unpaid)
                </label>
                <div className="flex flex-wrap gap-1 font-mono">
                  {selectedLoan.calculation.unpaidMonthsBreakdown.map((m: any) => (
                    <span 
                      key={m.monthStr}
                      className="px-2 py-0.5 bg-red-100 text-red-950 border border-red-200 rounded text-[10px] font-extrabold flex items-center gap-1.5"
                    >
                      <span>{m.monthLabel}</span>
                      <span className="text-purple-950 font-black">Int: NPR {m.accruedInterest}</span>
                      <span className="text-red-800 font-black">Fine: NPR {m.accruedFine}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* DUES STATEMENT CARD - PROPER DENSE GRID */}
              <div className="p-3 bg-red-50/80 border border-red-200 rounded-xl space-y-2 font-mono text-xs">
                <div className="flex justify-between items-center border-b border-red-200 pb-1 font-sans">
                  <span className="font-extrabold text-red-950 flex items-center gap-1.5 text-[11px]">
                    <AlertTriangle size={14} className="text-red-700" /> Outstanding Dues Statement
                  </span>
                  <span className="px-2 py-0.5 bg-red-800 text-white text-[9px] font-black rounded font-mono">
                    GRACE EXPIRED
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 bg-white rounded-lg border border-red-100">
                    <span className="text-[10px] text-slate-500 font-sans block">Accrued Late Fine</span>
                    <strong className="text-red-900 text-xs font-black">NPR {accruedFine.toLocaleString('en-IN')}</strong>
                  </div>

                  <div className="p-2 bg-white rounded-lg border border-red-100">
                    <span className="text-[10px] text-slate-500 font-sans block">Accrued Interest</span>
                    <strong className="text-purple-900 text-xs font-black">NPR {accruedInterest.toLocaleString('en-IN')}</strong>
                  </div>

                  <div className="p-2 bg-white rounded-lg border border-red-100">
                    <span className="text-[10px] text-slate-500 font-sans block">Principal Balance</span>
                    <strong className="text-slate-900 text-xs font-black">NPR {remainingPrincipal.toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                <div className="p-2 bg-red-900 text-white rounded-lg flex justify-between items-center font-sans">
                  <span className="text-xs font-bold text-red-100 uppercase">Total Cash Due Now:</span>
                  <strong className="text-base font-black text-amber-300 font-mono">
                    NPR {selectedLoan.calculation.totalCashDueNow.toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>

              {/* DENSE 2-COLUMN RELIEF SECTION */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* SECTION 1: INTEREST RELIEF */}
                <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-xl space-y-2">
                  <div className="flex justify-between items-center border-b border-purple-200 pb-1">
                    <span className="font-extrabold text-purple-950 text-[11px] flex items-center gap-1">
                      <Percent size={13} className="text-purple-700" /> Interest Relief
                    </span>
                    <label className="flex items-center gap-1 text-[10px] font-bold text-purple-950 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={waiveInterest}
                        onChange={(e) => handleToggleWaiveInterest(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-purple-800 cursor-pointer"
                      />
                      Waive 100%
                    </label>
                  </div>

                  <div className="space-y-1.5">
                    <div>
                      <label className="block font-bold text-purple-950 text-[10px] mb-0.5">Discount Granted (NPR)</label>
                      <input
                        type="number"
                        value={interestDiscountInput}
                        onChange={(e) => {
                          setWaiveInterest(false);
                          setInterestDiscountInput(e.target.value);
                        }}
                        min="0"
                        max={accruedInterest}
                        required
                        className="w-full p-1.5 border border-purple-300 rounded-lg bg-white font-mono font-bold text-purple-950"
                      />
                    </div>
                    <div className="text-[10px] text-slate-600 font-mono flex justify-between">
                      <span>Net Interest:</span>
                      <strong className="text-purple-900 font-bold">NPR {finalInterestCollected.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: LATE FINE RELIEF */}
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex justify-between items-center border-b border-amber-200 pb-1">
                    <span className="font-extrabold text-amber-950 text-[11px] flex items-center gap-1">
                      <Sparkles size={13} className="text-amber-700" /> Late Fine Relief
                    </span>
                    <label className="flex items-center gap-1 text-[10px] font-bold text-amber-950 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={waiveFine}
                        onChange={(e) => handleToggleWaiveFine(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-amber-800 cursor-pointer"
                      />
                      Waive 100%
                    </label>
                  </div>

                  <div className="space-y-1.5">
                    <div>
                      <label className="block font-bold text-amber-950 text-[10px] mb-0.5">Discount Granted (NPR)</label>
                      <input
                        type="number"
                        value={fineDiscountInput}
                        onChange={(e) => {
                          setWaiveFine(false);
                          setFineDiscountInput(e.target.value);
                        }}
                        min="0"
                        max={accruedFine}
                        required
                        className="w-full p-1.5 border border-amber-300 rounded-lg bg-white font-mono font-bold text-amber-950"
                      />
                    </div>
                    <div className="text-[10px] text-slate-600 font-mono flex justify-between">
                      <span>Net Fine:</span>
                      <strong className="text-red-900 font-bold">NPR {finalFineCollected.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                </div>

              </div>

              {/* REASON INPUT */}
              {requiresApprovalReason && (
                <div className="p-2.5 bg-amber-100/70 border border-amber-300 rounded-xl">
                  <label className="block font-bold text-amber-900 text-[11px] mb-0.5">Executive Approval / Waiver Reason *</label>
                  <input
                    type="text"
                    placeholder="e.g. Relief discount approved by Executive Committee Chair"
                    value={waiverReason}
                    onChange={(e) => setWaiverReason(e.target.value)}
                    required={requiresApprovalReason}
                    className="w-full p-1.5 border border-amber-400 rounded-lg bg-white text-slate-900 text-xs font-medium"
                  />
                </div>
              )}

              {/* CASH INPUT */}
              <div className="p-3 bg-emerald-50 border-2 border-emerald-300 rounded-xl space-y-1.5">
                <label className="block font-black text-emerald-950 text-xs flex items-center gap-1.5">
                  <Banknote size={16} className="text-emerald-700" /> Enter Total Cash Received From Member (NPR) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={cashCollectedInput}
                  onChange={(e) => setCustomCashInput(e.target.value)}
                  placeholder="e.g. 20000"
                  className="w-full p-2 border border-emerald-400 rounded-lg bg-white font-mono font-black text-base text-emerald-950 shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {/* WATERFALL SPLIT READOUT */}
              <div className="p-3 bg-slate-900 text-white rounded-xl space-y-1.5 font-mono text-xs shadow-md">
                <div className="flex justify-between items-center border-b border-slate-800 pb-1 font-sans">
                  <span className="font-extrabold text-slate-300 text-[10px] flex items-center gap-1">
                    <Sparkles size={13} className="text-amber-400" /> Real-Time Waterfall Cash Split
                  </span>
                  <span className="text-amber-300 font-mono font-bold text-[11px]">
                    Cash Received: NPR {waterfall.totalPaid.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-0.5 text-center">
                  <div className="p-1.5 bg-slate-800/80 rounded border border-slate-700">
                    <span className="text-[9px] text-slate-400 font-sans block">1. Late Fine</span>
                    <strong className="text-red-400 text-xs font-bold">NPR {waterfall.finePaid.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="p-1.5 bg-slate-800/80 rounded border border-slate-700">
                    <span className="text-[9px] text-slate-400 font-sans block">2. Interest</span>
                    <strong className="text-purple-300 text-xs font-bold">NPR {waterfall.interestPaid.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="p-1.5 bg-slate-800/80 rounded border border-slate-700">
                    <span className="text-[9px] text-slate-400 font-sans block">3. Principal</span>
                    <strong className="text-emerald-400 text-xs font-bold">NPR {waterfall.principalPaid.toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-800 font-sans">
                  <span>New Outstanding Principal: <strong className="text-white font-mono">NPR {waterfall.newPrincipalBalance.toLocaleString('en-IN')}</strong></span>
                  {waterfall.unpaidInterestRemaining > 0 && (
                    <span className="text-amber-300">Unpaid Interest: NPR {waterfall.unpaidInterestRemaining.toLocaleString('en-IN')}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5 text-[11px]">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full p-1.5 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-0.5 text-[11px] flex items-center gap-1">
                    <FileText size={11} /> Reference Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. eSewa / Cash counter"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    className="w-full p-1.5 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={waterfall.totalPaid <= 0}
                className="w-full py-3 bg-emerald-900 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-black text-xs rounded-xl transition-colors inline-flex justify-center items-center gap-2 cursor-pointer shadow-md"
              >
                <ShieldCheck size={16} /> Confirm & Record Cash Repayment
              </button>

            </form>
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs text-slate-400 space-y-2">
              <ShieldAlert size={32} className="mx-auto text-red-700/60" />
              <h4 className="font-extrabold text-slate-700 text-sm">No Loan Selected</h4>
              <p className="text-xs max-w-xs mx-auto">
                Select an overdue borrower from the directory on the left to enter cash collected and execute settlement.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Confirmation Modal */}
      {showConfirmation && selectedLoan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-left font-sans">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden space-y-3 p-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-700" /> Confirm Repayment Transaction
              </h3>
              <button 
                type="button"
                onClick={() => setShowConfirmation(false)} 
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-xl space-y-1">
              <strong className="block font-bold">Please verify cash allocation before saving:</strong>
              <p className="text-[11px] text-emerald-800">
                This transaction will record a formal repayment voucher and update the borrower's ledger.
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 divide-y divide-slate-200 space-y-1.5 font-mono">
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500 font-sans">Borrower:</span>
                <strong className="text-slate-900 font-sans">{selectedLoan.borrower?.full_name} ({selectedLoan.borrower?.account_id})</strong>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500 font-sans">Loan Code:</span>
                <strong className="text-slate-900">{selectedLoan.loan_code || `LN-${selectedLoan.id}`}</strong>
              </div>

              <div className="pt-1.5 text-[11px] space-y-0.5 font-sans">
                <div className="flex justify-between text-red-900">
                  <span>1. Late Fine Portion Paid:</span>
                  <strong className="font-mono">NPR {waterfall.finePaid.toLocaleString('en-IN')}{fineDiscountGranted > 0 ? ` (NPR ${fineDiscountGranted} Relief)` : ''}</strong>
                </div>
                <div className="flex justify-between text-purple-900">
                  <span>2. Interest Portion Paid:</span>
                  <strong className="font-mono">NPR {waterfall.interestPaid.toLocaleString('en-IN')}{interestDiscountGranted > 0 ? ` (NPR ${interestDiscountGranted} Relief)` : ''}</strong>
                </div>
                <div className="flex justify-between text-emerald-900">
                  <span>3. Principal Portion Reduced:</span>
                  <strong className="font-mono">NPR {waterfall.principalPaid.toLocaleString('en-IN')}</strong>
                </div>
              </div>

              <div className="flex justify-between py-1 pt-1.5 border-t border-slate-300 font-bold text-sm font-sans">
                <span className="text-slate-900">Total Cash Received:</span>
                <strong className="text-emerald-950 font-mono text-base">NPR {waterfall.totalPaid.toLocaleString('en-IN')}</strong>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowConfirmation(false)}
                className="w-1/2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
              >
                Edit Cash Amount
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={executeConfirmedSubmit}
                className="w-1/2 py-2 bg-emerald-900 hover:bg-emerald-800 text-white font-bold rounded-xl flex justify-center items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {loading ? 'Processing...' : 'Confirm & Print Slip'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}