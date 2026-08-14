import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import PrintControls from '../ledger-print/PrintControls';

export const revalidate = 0;

function getKathmanduTimestamp() {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kathmandu',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(new Date());
}

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function FineReceiptPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const paymentCode = String(params.payment_code || `PFN-${Date.now().toString().slice(-6)}`);
  const paymentDate = String(params.payment_date || getKathmanduTimestamp());
  const borrowerName = String(params.borrower_name || 'Valued Borrower');
  const borrowerAccountId = String(params.borrower_account_id || 'N/A');
  const loanCode = String(params.loan_code || 'N/A');
  
  const daysOverdue = Number(params.days_overdue || 0);
  const missedMonthsCount = Number(params.missed_months_count || 0);
  
  const finePaid = Number(params.fine_paid || 0);
  const interestPaid = Number(params.interest_paid || 0);
  const principalPaid = Number(params.principal_paid || 0);
  const totalPaid = Number(params.total_paid || finePaid + interestPaid + principalPaid);
  
  const fineWaived = Number(params.fine_waived || 0);
  const interestWaived = Number(params.interest_waived || 0);
  const waiverReason = String(params.waiver_reason || '');
  const newPrincipalBalance = Number(params.new_principal_balance || 0);
  const recordedBy = String(params.recorded_by || 'Treasury Admin');

  const hasWaiver = fineWaived > 0 || interestWaived > 0;

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 font-sans text-left print:bg-white print:p-0 print:min-h-0">
      
      <style type="text/css" media="print">
        {`
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body * {
            visibility: hidden !important;
          }
          .printable-fine-slip, .printable-fine-slip * {
            visibility: visible !important;
          }
          .printable-fine-slip {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
        `}
      </style>

      {/* Top Action Bar for Window */}
      <PrintControls title={`Penalty Settlement Slip - ${paymentCode}`} />

      {/* Printable Receipt Card */}
      <div className="printable-fine-slip max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-xl p-8 space-y-5 text-slate-900 font-mono text-xs print:border-none print:shadow-none print:p-0">
        
        {/* Institution Header */}
        <div className="text-center border-b-2 border-red-900 pb-3 space-y-1">
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-wide font-sans">
            EVERGREEN SAVINGS & CREDIT COOPERATIVE
          </h1>
          <p className="text-[10px] text-red-900 font-bold uppercase tracking-widest font-sans">
            Official Penalty Fee & Overdue Settlement Receipt
          </p>
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-100 text-red-950 text-[10px] font-bold rounded-full font-sans">
            <CheckCircle2 size={11} className="text-red-700" /> Verified Settlement Voucher
          </div>
        </div>

        {/* Receipt Metadata Grid */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-red-50/60 border border-red-200 rounded-xl">
          <div>
            <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">Voucher / Receipt Code:</span>
            <strong className="text-red-950 text-xs font-black">{paymentCode}</strong>
          </div>
          <div className="text-right">
            <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">Settlement Date:</span>
            <strong className="text-slate-900 text-xs font-bold">{paymentDate}</strong>
          </div>

          <div className="pt-1">
            <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">Borrower Name & Acc:</span>
            <strong className="text-slate-900 font-sans text-xs">{borrowerName}</strong>
            <span className="text-[10px] text-slate-600 block">Acc ID: {borrowerAccountId}</span>
          </div>
          <div className="text-right pt-1">
            <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">Loan Reference:</span>
            <strong className="text-slate-900 text-xs">{loanCode}</strong>
            {daysOverdue > 0 && (
              <span className="text-[10px] text-red-800 font-bold block">
                Overdue Term: {daysOverdue} Days ({missedMonthsCount} Mo Unpaid)
              </span>
            )}
          </div>
        </div>

        {/* Itemized Recovery Breakdown Table */}
        <div className="border border-slate-300 rounded-xl overflow-hidden">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-slate-100 text-slate-800 uppercase font-bold border-b border-slate-300 text-[10px]">
              <tr>
                <th className="p-2.5 font-sans">Recovery Head Description</th>
                <th className="p-2.5 text-right font-sans">Accrued / Due</th>
                <th className="p-2.5 text-right font-sans">Waiver / Relief</th>
                <th className="p-2.5 text-right font-sans font-black">Net Cash Collected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="p-2.5 font-sans font-bold text-slate-900">1. Late Penalty Charges</td>
                <td className="p-2.5 text-right">NPR {(finePaid + fineWaived).toLocaleString('en-IN')}</td>
                <td className="p-2.5 text-right text-amber-800">{fineWaived > 0 ? `- NPR ${fineWaived.toLocaleString('en-IN')}` : 'NPR 0'}</td>
                <td className="p-2.5 text-right font-bold text-red-900">NPR {finePaid.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-sans font-bold text-slate-900">2. Accrued Loan Interest</td>
                <td className="p-2.5 text-right">NPR {(interestPaid + interestWaived).toLocaleString('en-IN')}</td>
                <td className="p-2.5 text-right text-amber-800">{interestWaived > 0 ? `- NPR ${interestWaived.toLocaleString('en-IN')}` : 'NPR 0'}</td>
                <td className="p-2.5 text-right font-bold text-purple-900">NPR {interestPaid.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-sans font-bold text-slate-900">3. Principal Reduction Portion</td>
                <td className="p-2.5 text-right">NPR {principalPaid.toLocaleString('en-IN')}</td>
                <td className="p-2.5 text-right text-slate-400">NPR 0</td>
                <td className="p-2.5 text-right font-bold text-emerald-900">NPR {principalPaid.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
            <tfoot className="bg-red-950 text-white font-bold text-sm">
              <tr>
                <td colSpan={3} className="p-2.5 font-sans font-black uppercase text-xs">Total Net Cash Received</td>
                <td className="p-2.5 text-right font-black text-amber-300">NPR {totalPaid.toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Relief & Approval Notes */}
        {hasWaiver && waiverReason && (
          <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-[11px] space-y-0.5">
            <strong className="text-amber-950 block font-sans uppercase text-[10px]">Executive Relief Approval Note:</strong>
            <p className="text-slate-800 font-sans italic">{waiverReason}</p>
          </div>
        )}

        {/* Updated Loan Status */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-xs">
          <span className="font-sans text-slate-600 font-bold">New Outstanding Principal Balance:</span>
          <strong className="font-mono font-black text-slate-900 text-sm">
            NPR {newPrincipalBalance.toLocaleString('en-IN')}
          </strong>
        </div>

        {/* Signatures */}
        <div className="pt-8 border-t-2 border-slate-900 grid grid-cols-2 gap-8 text-center text-[10px] font-sans font-bold">
          <div>
            <div className="border-b border-slate-400 w-44 mx-auto mb-1 h-8"></div>
            <span>Member / Depositor Signature</span>
          </div>
          <div>
            <div className="border-b border-slate-400 w-44 mx-auto mb-1 h-8"></div>
            <span>Authorized Teller / Treasury Collector</span>
            <div className="text-[9px] text-slate-500 font-normal">Officer: {recordedBy}</div>
          </div>
        </div>

        {/* Footer Audit Stamp */}
        <div className="text-center text-[9px] text-slate-400 font-sans pt-2 border-t border-slate-200">
          Printed: {getKathmanduTimestamp()} • System Slip ID: {paymentCode} • Computer Generated Settlement Slip
        </div>

      </div>
    </div>
  );
}