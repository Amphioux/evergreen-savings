'use client';

import { useState } from 'react';
import { Printer, Receipt, X } from 'lucide-react';

interface RepaymentReceiptModalProps {
  receipt: any;
  profiles?: any[];
}

// Helper: Strips (Admin), (Superadmin), or similar tags from display names
function cleanName(name?: string | null): string {
  if (!name) return '';
  return name.replace(/\s*\((Admin|Superadmin)\)/gi, '').trim();
}

export default function RepaymentReceiptModal({ receipt, profiles = [] }: RepaymentReceiptModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!receipt) return null;

  const paymentCode = receipt.payment_code || `PY-${receipt.id}`;
  const paymentDate = receipt.payment_date || new Date().toISOString().split('T')[0];
  
  const rawBorrowerName = receipt.borrower_name || receipt.borrower?.full_name || 'Borrower';
  const borrowerName = cleanName(rawBorrowerName);
  
  const accountId = receipt.borrower_account_id || receipt.borrower?.account_id || 'N/A';
  const loanCode = receipt.loan_code || receipt.loan?.loan_code || `LN-${receipt.loan_id}`;
  const currentRate = receipt.current_rate || receipt.loan?.current_rate || 12.0;

  // Extract Recorded By Details
  const rawAdminName = receipt.recorded_by_name || receipt.recorded_by || 'System Admin';
  const adminFullName = cleanName(rawAdminName);

  // Dynamic Profile Lookup for older historical records
  const editorProfile = profiles.find(
    (p) => String(p.id) === String(receipt.recorded_by_id) || cleanName(p.full_name) === adminFullName
  );

  const rawDesignation = 
    receipt.recorded_by_designation || 
    receipt.committee_position || 
    editorProfile?.committee_position;

  let adminDesignation = rawDesignation;

  if (!adminDesignation || adminDesignation === 'SUPER_ADMIN' || adminDesignation === 'ADMIN') {
    const role = editorProfile?.role || receipt.role;
    if (role === 'SUPER_ADMIN') {
      adminDesignation = 'Chairperson / President';
    } else if (role === 'ADMIN') {
      adminDesignation = 'Committee Secretary';
    } else {
      adminDesignation = 'Executive Committee Member';
    }
  }

  const recordedByFullText = `${adminFullName} (${adminDesignation})`;

  // Amounts & Relief Breakdown
  const principalPaid = Number(receipt.principal_paid ?? receipt.principalPaid ?? 0);
  const interestPaid = Number(receipt.interest_paid ?? receipt.interestPaid ?? 0);
  const finePaid = Number(receipt.fine_paid ?? receipt.finePaid ?? receipt.penalty_paid ?? 0);

  const fineDiscount = Number(receipt.fine_discount_amount ?? receipt.fineWaived ?? 0);
  const interestWaived = Number(receipt.interest_waived ?? receipt.interestWaived ?? 0);
  const waiverReason = (receipt.waiver_reason || receipt.waiverReason || '').trim();

  const isFineSettlement = finePaid > 0 || fineDiscount > 0 || interestWaived > 0 || Boolean(receipt.fine_waived);

  // Total Cash Payment Received calculation
  const totalPaid = Number(receipt.total_paid ?? receipt.totalPaid ?? (principalPaid + interestPaid + finePaid));

  // Historical remaining principal balance AFTER this specific payment was made
  const explicitHistoricalBalance = 
    receipt.computed_remaining_balance ?? 
    receipt.new_principal_balance ?? 
    receipt.remaining_balance ?? 
    receipt.remainingBalance;

  const initialPrincipal = Number(receipt.loan?.principal_amount ?? receipt.principal_amount ?? 0);
  
  const remainingBalance = (explicitHistoricalBalance !== undefined && explicitHistoricalBalance !== null)
    ? Number(explicitHistoricalBalance)
    : (initialPrincipal > 0 
        ? Math.max(0, initialPrincipal - principalPaid) 
        : Number(receipt.loan?.remaining_balance ?? 0));

  function handlePrintReceipt() {
    const printWindow = window.open('', '_blank', 'width=850,height=800,scrollbars=yes');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${isFineSettlement ? 'Fine Settlement Voucher' : 'Loan Repayment Voucher'} - ${paymentCode}</title>
          <style>
            @page {
              size: portrait;
              margin: 10mm;
            }
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              padding: 10px 15px; 
              color: #0f172a; 
              max-width: 600px; 
              margin: 0 auto; 
              box-sizing: border-box;
            }
            .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
            .header h1 { margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 0.5px; }
            .header p { margin: 2px 0 0; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; }
            .badge { display: inline-block; background: ${isFineSettlement ? '#fff1f2' : '#ecfdf5'}; color: ${isFineSettlement ? '#9f1239' : '#065f46'}; border: 1px solid ${isFineSettlement ? '#fecdd3' : '#a7f3d0'}; font-size: 9px; font-weight: 800; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; margin-top: 4px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px; margin-bottom: 12px; }
            .box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 10px; border-radius: 6px; }
            .box span { font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 700; display: block; }
            .box strong { font-size: 12px; color: #0f172a; font-family: monospace; }
            .breakdown { border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; margin-bottom: 12px; }
            .row { display: flex; justify-content: space-between; padding: 6px 12px; font-size: 11px; border-bottom: 1px solid #f1f5f9; font-family: monospace; }
            .row.relief { background: #fffbe3; color: #b45309; font-weight: bold; }
            .row.total { background: #0f172a; color: white; font-weight: 900; font-size: 13px; border-bottom: none; }
            .row.total span { color: #94a3b8; font-family: system-ui; }
            .reason-box { background: #fefce8; padding: 8px 10px; border-radius: 6px; margin-bottom: 12px; font-size: 10px; color: #78350f; border: 1px solid #fde047; }
            .reason-box strong { display: block; font-size: 9px; text-transform: uppercase; color: #854d0e; margin-bottom: 2px; }
            .audit-footer { font-size: 10px; color: #64748b; font-family: monospace; border-top: 1px dashed #cbd5e1; padding-top: 6px; margin-top: 12px; text-align: left; }
            .signatures { display: flex; justify-content: space-between; margin-top: 24px; font-size: 11px; color: #475569; text-align: center; page-break-inside: avoid; }
            .sig-line { border-top: 1px solid #cbd5e1; width: 200px; padding-top: 4px; font-weight: bold; }
            @media print { 
              button { display: none !important; } 
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div style="text-align: right; margin-bottom: 8px;">
            <button onclick="window.print()" style="padding: 6px 14px; background: #0f172a; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 12px;">
              🖨️ Print Voucher
            </button>
          </div>

          <div class="header">
            <h1>Cooperative Savings & Credit</h1>
            <p>${isFineSettlement ? 'Overdue Fine & Relief Settlement Voucher' : 'Official Loan Repayment Voucher Proof'}</p>
            <div class="badge">${isFineSettlement ? 'Penalty Settlement Audited' : 'Payment Verified & Audited'}</div>
          </div>

          <div class="grid">
            <div class="box">
              <span>Voucher / Receipt Code</span>
              <strong>${paymentCode}</strong>
            </div>
            <div class="box">
              <span>Payment Date</span>
              <strong>${paymentDate}</strong>
            </div>
            <div class="box">
              <span>Borrower Name</span>
              <strong>${borrowerName}</strong>
            </div>
            <div class="box">
              <span>Account / Loan Code</span>
              <strong>Acc: ${accountId} (${loanCode})</strong>
            </div>
          </div>

          <div class="breakdown">
            ${finePaid > 0 ? `
              <div class="row" style="color: #991b1b;">
                <span style="font-family: system-ui;">1. Late Fine Portion Collected:</span>
                <strong>NPR ${finePaid.toLocaleString('en-IN')}</strong>
              </div>
            ` : ''}
            <div class="row" style="color: #581c87;">
              <span style="font-family: system-ui;">2. Interest Portion Collected (${currentRate}% p.a.):</span>
              <strong>NPR ${interestPaid.toLocaleString('en-IN')}</strong>
            </div>
            <div class="row" style="color: #065f46;">
              <span style="font-family: system-ui;">3. Principal Portion Reduced:</span>
              <strong>NPR ${principalPaid.toLocaleString('en-IN')}</strong>
            </div>

            ${fineDiscount > 0 ? `
              <div class="row relief">
                <span style="font-family: system-ui;">Executive Late Fine Relief Granted:</span>
                <strong>- NPR ${fineDiscount.toLocaleString('en-IN')}</strong>
              </div>
            ` : ''}

            ${interestWaived > 0 ? `
              <div class="row relief">
                <span style="font-family: system-ui;">Executive Interest Relief Waived:</span>
                <strong>- NPR ${interestWaived.toLocaleString('en-IN')}</strong>
              </div>
            ` : ''}

            <div class="row total">
              <span>Total Cash Received:</span>
              <strong style="color: #34d399;">NPR ${totalPaid.toLocaleString('en-IN')}</strong>
            </div>
          </div>

          ${waiverReason ? `
            <div class="reason-box">
              <strong>Executive Board Relief Authorization Justification:</strong>
              "${waiverReason}"
            </div>
          ` : ''}

          <div class="box" style="margin-bottom: 12px; text-align: center;">
            <span style="font-size: 10px; text-transform: uppercase;">Remaining Outstanding Principal Balance</span>
            <strong style="font-size: 15px; color: #0f172a;">NPR ${remainingBalance.toLocaleString('en-IN')}</strong>
          </div>

          <div class="audit-footer">
            <span>Entry Logged & Processed By: <strong>${recordedByFullText}</strong></span>
          </div>

          <div class="signatures">
            <div class="sig-line">
              Member Borrower Signature<br/>
              <span style="font-size: 10px; font-weight: normal; color: #64748b;">${borrowerName}</span>
            </div>
            <div class="sig-line">
              ${adminDesignation} Signature<br/>
              <span style="font-size: 10px; font-weight: normal; color: #64748b;">${adminFullName}</span>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] rounded-lg inline-flex items-center gap-1 transition-colors cursor-pointer border border-slate-300"
        title="View & Print Repayment Receipt"
      >
        <Printer size={12} /> Receipt
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-left font-sans">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden space-y-0">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-emerald-400" />
                <h3 className="font-bold text-sm">
                  {isFineSettlement ? 'Fine Settlement Voucher' : 'Loan Payment Receipt'} ({paymentCode})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-800">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Borrower:</span>
                  <strong className="text-slate-900 font-sans">{borrowerName} ({accountId})</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Loan Code:</span>
                  <strong className="text-blue-900">{loanCode}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Date:</span>
                  <strong className="text-slate-900">{paymentDate}</strong>
                </div>

                <div className="border-t border-slate-200 pt-2 space-y-1">
                  {finePaid > 0 && (
                    <div className="flex justify-between text-red-900">
                      <span className="font-sans text-[11px]">Fine Paid:</span>
                      <strong className="font-bold">NPR {finePaid.toLocaleString('en-IN')}</strong>
                    </div>
                  )}
                  <div className="flex justify-between text-purple-900">
                    <span className="font-sans text-[11px]">Interest Portion ({currentRate}%):</span>
                    <strong className="font-bold">NPR {interestPaid.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="flex justify-between text-emerald-900">
                    <span className="font-sans text-[11px]">Principal Portion:</span>
                    <strong className="font-bold">NPR {principalPaid.toLocaleString('en-IN')}</strong>
                  </div>

                  {fineDiscount > 0 && (
                    <div className="flex justify-between text-amber-800 font-sans">
                      <span>Fine Relief Granted:</span>
                      <strong className="font-mono text-amber-900">- NPR {fineDiscount.toLocaleString('en-IN')}</strong>
                    </div>
                  )}

                  {interestWaived > 0 && (
                    <div className="flex justify-between text-amber-800 font-sans">
                      <span>Interest Relief Waived:</span>
                      <strong className="font-mono text-amber-900">- NPR {interestWaived.toLocaleString('en-IN')}</strong>
                    </div>
                  )}
                </div>

                <div className="border-t-2 border-slate-900 pt-2 flex justify-between items-center text-sm font-sans">
                  <span className="font-bold text-slate-900">Total Payment:</span>
                  <strong className="text-emerald-950 font-mono font-black text-base">
                    NPR {totalPaid.toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>

              {waiverReason && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-950 space-y-0.5 font-sans">
                  <span className="font-bold text-amber-900 block text-[10px] uppercase">Waiver Justification Reason:</span>
                  <p className="italic">"{waiverReason}"</p>
                </div>
              )}

              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 space-y-2 font-mono">
                <div className="text-center border-b border-slate-200 pb-1.5">
                  <span className="text-[10px] text-slate-500 block uppercase font-sans">Remaining Principal Balance</span>
                  <strong className="text-sm font-extrabold text-slate-900">
                    NPR {remainingBalance.toLocaleString('en-IN')}
                  </strong>
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-600 font-sans pt-0.5">
                  <span>Recorded By:</span>
                  <strong className="text-slate-900 font-mono">{recordedByFullText}</strong>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="w-1/2 py-2.5 bg-emerald-900 hover:bg-emerald-800 text-white font-bold rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer size={14} /> Open & Print Voucher
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}