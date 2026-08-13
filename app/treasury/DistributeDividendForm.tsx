'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { distributeDividends } from '@/app/actions';
import { TrendingUp, Sparkles, AlertTriangle, ChevronDown, ChevronUp, CalendarClock, Scale, CheckCircle2, FileText, Printer } from 'lucide-react';

interface MemberSavingsProp {
  id: string;
  full_name: string;
  account_id?: string;
  deposits: { for_month: string; amount_paid: number }[];
}

interface CurrentAdminProp {
  id: string;
  full_name: string;
  committee_position?: string;
  role?: string;
}

export default function DistributeDividendForm({
  internalMembers = [],
  currentAdmin,
}: {
  internalMembers: MemberSavingsProp[];
  currentAdmin?: CurrentAdminProp;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Post-Submit Success Data
  const [successData, setSuccessData] = useState<any>(null);

  const [profitPool, setProfitPool] = useState<number | string>(0);
  const [title, setTitle] = useState('');
  const [distributedAt, setDistributedAt] = useState(new Date().toISOString().split('T')[0]);
  const [cutoffMonth, setCutoffMonth] = useState(new Date().toISOString().slice(0, 7)); 

  const [allocatedTotal, setAllocatedTotal] = useState<number>(0);
  const numericProfitPool = Number(profitPool) || 0;

  const { memberBreakdown, totalEligibleSavings } = useMemo(() => {
    let poolSavings = 0;
    
    const mapped = internalMembers.map((m) => {
      const validDeposits = m.deposits.filter((d) => d.for_month.slice(0, 7) <= cutoffMonth);
      const totalSavings = validDeposits.reduce((sum, d) => sum + Number(d.amount_paid), 0);
      poolSavings += totalSavings;
      return { ...m, totalSavings };
    });

    let autoAllocatedSum = 0;

    const breakdown = mapped.map((m) => {
      const sharePct = poolSavings > 0 ? (m.totalSavings / poolSavings) * 100 : 0;
      const estimatedDividend = Math.round((sharePct / 100) * numericProfitPool);
      autoAllocatedSum += estimatedDividend;
      
      return { ...m, sharePct: sharePct.toFixed(2), estimatedDividend };
    }).sort((a, b) => b.totalSavings - a.totalSavings);

    return { memberBreakdown: breakdown, totalEligibleSavings: poolSavings, autoAllocatedSum };
  }, [internalMembers, cutoffMonth, numericProfitPool]);

  useEffect(() => {
    let sum = 0;
    memberBreakdown.forEach(m => sum += m.estimatedDividend);
    setAllocatedTotal(sum);
  }, [memberBreakdown]);

  const handleTableChange = () => {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    let currentSum = 0;
    internalMembers.forEach(m => {
      currentSum += Number(fd.get(`dividend_amount_${m.id}`)) || 0;
    });
    setAllocatedTotal(currentSum);
  };

  const isLedgerBalanced = Math.abs(allocatedTotal - numericProfitPool) < 0.05;

  async function executeDistribution() {
    if (!formRef.current) return;
    setLoading(true);
    setMessage(null);

    const formData = new FormData(formRef.current);
    
    const payoutsToPrint = memberBreakdown.map((m) => ({
      distribution_code: '',
      title,
      distributed_at: distributedAt,
      cutoff_month: cutoffMonth,
      member_name: m.full_name,
      member_account_id: m.account_id,
      member_savings_snapshot: m.totalSavings,
      share_percentage: m.sharePct,
      dividend_amount: Number(formData.get(`dividend_amount_${m.id}`)),
      payment_method: formData.get(`payment_method_${m.id}`) || 'CASH',
      deposit_note: formData.get(`deposit_note_${m.id}`) || '',
    }));

    const res = await distributeDividends(formData);

    setLoading(false);
    setShowConfirm(false);

    if (res?.error) {
      setMessage({ type: 'error', text: res.error });
    } else if (res?.success && res?.distCode) {
      const finalPayouts = payoutsToPrint.map(p => ({ ...p, distribution_code: res.distCode }));
      
      setSuccessData({
        distCode: res.distCode,
        title,
        totalProfitPool: numericProfitPool,
        totalEligibleSavings,
        distributedAt,
        cutoffMonth,
        payouts: finalPayouts,
        recordedByName: currentAdmin?.full_name || 'System Admin',
        recordedByDesignation: currentAdmin?.committee_position || (currentAdmin?.role === 'SUPER_ADMIN' ? 'Chairperson / President' : 'Committee Secretary')
      });
      
      setMessage({ type: 'success', text: res.success });
      formRef.current.reset();
      setProfitPool(0);
    }
  }

  function handleInitialSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (numericProfitPool <= 0 || !title) {
      setMessage({ type: 'error', text: 'Please fill in the title and profit pool.' });
      return;
    }
    if (totalEligibleSavings <= 0) {
      setMessage({ type: 'error', text: 'Total eligible savings is 0 for this cutoff month.' });
      return;
    }
    if (!isLedgerBalanced) {
      setMessage({ type: 'error', text: `Ledger Mismatch! Difference of NPR ${(numericProfitPool - allocatedTotal).toFixed(2)} must be balanced.` });
      return;
    }
    setShowConfirm(true);
  }

  // --- Open Summary Report in a New Dedicated Tab ---
  function openSummaryInNewTab() {
    if (!successData) return;

    const newWindow = window.open('', '_blank');
    if (!newWindow) return alert('Pop-up blocked. Please allow pop-ups for this site.');

    const rowsHtml = successData.payouts.map((p: any, idx: number) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${idx + 1}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1;">
          <strong>${p.member_name}</strong><br/>
          <small style="color: #64748b;">${p.member_account_id}</small>
        </td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">NPR ${Number(p.member_savings_snapshot).toLocaleString('en-IN')}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">${p.share_percentage}%</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold; color: #581c87;">NPR ${Number(p.dividend_amount).toLocaleString('en-IN')}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; font-size: 11px;">
          <strong>${p.payment_method}</strong><br/>${p.deposit_note || '-'}
        </td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Master Distribution Report - ${successData.distCode}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #0f172a; max-width: 900px; margin: 0 auto; }
            .top-bar { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 12px 16px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 24px; }
            .btn-print { background: #581c87; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 14px; }
            .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 24px; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 32px; }
            th { background: #f1f5f9; padding: 8px; border: 1px solid #cbd5e1; text-transform: uppercase; font-size: 10px; }
            tfoot tr { background: #f8fafc; font-weight: bold; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; text-align: center; margin-top: 48px; font-size: 12px; }
            .sig-line { border-bottom: 1px solid #94a3b8; width: 140px; margin: 0 auto 8px auto; height: 32px; }
            @media print {
              .top-bar { display: none !important; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="top-bar">
            <div><strong>Master Distribution Summary Report</strong> (${successData.distCode})</div>
            <button class="btn-print" onclick="window.print()">🖨️ Print Document</button>
          </div>

          <div class="header">
            <h1 style="margin: 0; font-size: 22px; text-transform: uppercase;">Evergreen Savings & Credit Group</h1>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b; font-weight: bold; letter-spacing: 1px;">OFFICIAL DIVIDEND DISTRIBUTION & PROFIT BREAKDOWN REPORT</p>
          </div>

          <div class="meta-grid">
            <div><span style="color: #64748b; font-size: 10px; font-weight: bold;">EVENT TITLE</span><br/><strong>${successData.title}</strong></div>
            <div><span style="color: #64748b; font-size: 10px; font-weight: bold;">DISTRIBUTION DATE</span><br/><strong>${successData.distributedAt}</strong></div>
            <div><span style="color: #64748b; font-size: 10px; font-weight: bold;">TOTAL PROFIT DISBURSED</span><br/><strong style="color: #581c87;">NPR ${successData.totalProfitPool.toLocaleString('en-IN')}</strong></div>
            <div><span style="color: #64748b; font-size: 10px; font-weight: bold;">SAVINGS CUTOFF MONTH</span><br/><strong>${successData.cutoffMonth}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th style="text-align: left;">Member Name & Account</th>
                <th style="text-align: right;">Eligible Savings</th>
                <th style="text-align: right;">Share (%)</th>
                <th style="text-align: right;">Disbursed Amount</th>
                <th style="text-align: left;">Method / Note</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 10px; text-align: right; border: 1px solid #cbd5e1;"><strong>Total Summary:</strong></td>
                <td style="padding: 10px; text-align: right; border: 1px solid #cbd5e1;">NPR ${successData.totalEligibleSavings.toLocaleString('en-IN')}</td>
                <td style="padding: 10px; text-align: right; border: 1px solid #cbd5e1;">100.00%</td>
                <td style="padding: 10px; text-align: right; border: 1px solid #cbd5e1; color: #581c87; font-size: 14px;">NPR ${successData.totalProfitPool.toLocaleString('en-IN')}</td>
                <td style="border: 1px solid #cbd5e1;"></td>
              </tr>
            </tfoot>
          </table>

          <div class="signatures">
            <div>
              <div class="sig-line"></div>
              <strong>${successData.recordedByName}</strong><br/>
              <small style="color: #64748b;">${successData.recordedByDesignation}</small><br/>
              <span style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: bold;">Recorded By (Author)</span>
            </div>
            <div>
              <div class="sig-line"></div>
              <strong>Secretary / Treasurer</strong><br/>
              <span style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: bold;">Audited By</span>
            </div>
            <div>
              <div class="sig-line"></div>
              <strong>Chairperson / President</strong><br/>
              <span style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: bold;">Approved By</span>
            </div>
          </div>
        </body>
      </html>
    `;

    newWindow.document.write(htmlContent);
    newWindow.document.close();
  }

  // --- Open Individual Member Slips in a New Tab (Ultra-Compact 6 Members Per Page Grid Layout) ---
  function openSlipsInNewTab() {
    if (!successData) return;

    const newWindow = window.open('', '_blank');
    if (!newWindow) return alert('Pop-up blocked. Please allow pop-ups for this site.');

    const slipsHtml = successData.payouts.map((p: any) => `
      <div class="slip-card">
        <div class="slip-header">
          <h2>EVERGREEN SAVINGS GROUP</h2>
          <p>Dividend Payout Voucher</p>
          <div class="receipt-id">${p.distribution_code}</div>
        </div>

        <div class="member-box">
          <div>
            <span class="lbl">Member Name</span><br/>
            <strong>${p.member_name}</strong> <small style="color:#64748b;">(${p.member_account_id})</small>
          </div>
          <div style="text-align: right;">
            <span class="lbl">Date</span><br/>
            <strong>${p.distributed_at}</strong>
          </div>
        </div>

        <div class="details-body">
          <div class="row"><span>Event Title:</span> <strong>${p.title}</strong></div>
          <div class="row"><span>Savings (Cutoff ${p.cutoff_month}):</span> <span>NPR ${Number(p.member_savings_snapshot).toLocaleString('en-IN')}</span></div>
          <div class="row"><span>Share / Method:</span> <strong>${p.share_percentage}% (${p.payment_method})</strong></div>
          ${p.deposit_note ? `<div class="row"><span>Note:</span> <strong>${p.deposit_note}</strong></div>` : ''}

          <div class="total-row">
            <span>Payout:</span>
            <strong>NPR ${Number(p.dividend_amount).toLocaleString('en-IN')}</strong>
          </div>
        </div>

        <div class="slip-footer">
          <div>
            <span style="font-size: 7px; color: #94a3b8; text-transform: uppercase; font-weight: bold; display: block;">Recorded By:</span>
            <strong>${successData.recordedByName}</strong>
          </div>
          <div style="text-align: center;">
            <div style="border-bottom: 1px solid #94a3b8; width: 70px; margin: 0 auto 1px auto; height: 10px;"></div>
            <strong style="color: #475569; font-size: 7.5px;">Signature</strong>
          </div>
        </div>
      </div>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Member Dividend Slips - ${successData.distCode}</title>
          <style>
            @page { size: A4 portrait; margin: 6mm; }
            * { box-sizing: border-box; }
            body { font-family: system-ui, -apple-system, sans-serif; padding: 10px; color: #0f172a; background: #f8fafc; margin: 0; }
            .top-bar { display: flex; justify-content: space-between; align-items: center; background: white; padding: 8px 14px; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 12px; }
            .btn-print { background: #0f172a; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 12px; }
            
            /* 2 Column x 3 Row Grid Layout (6 Members Per Page) */
            .vouchers-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              grid-template-rows: repeat(3, minmax(0, auto));
              gap: 8px;
            }

            .slip-card {
              background: white;
              border: 1px dashed #cbd5e1;
              border-radius: 8px;
              padding: 8px 10px;
              box-shadow: 0 1px 2px rgba(0,0,0,0.03);
              page-break-inside: avoid;
              break-inside: avoid;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              height: auto;
            }

            /* Force page break after every 6 vouchers */
            .vouchers-grid > div:nth-child(6n) {
              page-break-after: always;
              break-after: page;
            }

            .slip-header { text-align: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 4px; }
            .slip-header h2 { margin: 0; font-size: 11px; font-weight: 900; letter-spacing: 0.5px; }
            .slip-header p { margin: 1px 0 0 0; font-size: 7.5px; color: #64748b; text-transform: uppercase; font-weight: bold; }
            .receipt-id { font-family: monospace; font-size: 7.5px; color: #94a3b8; font-weight: bold; margin-top: 1px; }
            
            .member-box { display: flex; justify-content: space-between; background: #f8fafc; padding: 4px 6px; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 4px; font-size: 9px; }
            .lbl { font-size: 6.5px; text-transform: uppercase; color: #94a3b8; font-weight: bold; }
            
            .details-body { margin-bottom: 4px; }
            .row { display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid #f1f5f9; font-size: 8.5px; font-family: monospace; }
            .total-row { display: flex; justify-content: space-between; background: #f1f5f9; padding: 4px 6px; border-radius: 5px; border: 1px solid #e2e8f0; font-size: 10px; font-weight: bold; margin-top: 4px; }
            
            .slip-footer { display: grid; grid-template-columns: 1fr 1fr; margin-top: 6px; padding-top: 4px; border-top: 1px solid #0f172a; font-size: 7.5px; }

            @media print {
              .top-bar { display: none !important; }
              body { background: white; padding: 0; }
              .vouchers-grid { gap: 4mm; }
              .slip-card { border: 1px dashed #94a3b8; box-shadow: none; padding: 6px 8px; }
            }
          </style>
        </head>
        <body>
          <div class="top-bar">
            <div><strong>Member Payout Vouchers</strong> (${successData.payouts.length} Total - 6 Per Page)</div>
            <button class="btn-print" onclick="window.print()">🖨️ Print All Vouchers</button>
          </div>
          <div class="vouchers-grid">
            ${slipsHtml}
          </div>
        </body>
      </html>
    `;

    newWindow.document.write(htmlContent);
    newWindow.document.close();
  }

  // --- Render Post-Submission Success Screen ---
  if (successData) {
    return (
      <div className="bg-white rounded-2xl border-2 border-emerald-200 shadow-sm p-8 text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
          <CheckCircle2 size={32} />
        </div>
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Distribution Logged & Executed!</h3>
          <p className="text-xs font-medium text-slate-600 mt-1">
            Voucher Code: <strong className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-mono">{successData.distCode}</strong> | Total Disbursed: <strong className="font-mono text-purple-900">NPR {successData.totalProfitPool.toLocaleString('en-IN')}</strong>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Recorded By: <strong className="text-slate-800">{successData.recordedByName}</strong> ({successData.recordedByDesignation})
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <button 
            type="button"
            onClick={openSummaryInNewTab} 
            className="px-5 py-3 bg-purple-900 hover:bg-purple-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
          >
            <FileText size={16} /> Print Master Board Summary
          </button>
          
          <button 
            type="button"
            onClick={openSlipsInNewTab} 
            className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
          >
            <Printer size={16} /> Print Member Vouchers
          </button>

          <button 
            type="button"
            onClick={() => { setSuccessData(null); setIsExpanded(false); setMessage(null); }} 
            className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // --- Normal Form Input View ---
  return (
    <div className="bg-white rounded-2xl border border-purple-200 shadow-xs p-5 text-left space-y-4">
      <div className="flex items-center justify-between border-b border-purple-100 pb-3 cursor-pointer select-none" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-purple-100 text-purple-800 rounded-xl">
            <TrendingUp size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Distribute Group Dividends</h3>
            <p className="text-[11px] text-slate-500">
              Proportionally distribute profit across <strong>{internalMembers.length} Internal Members</strong>
            </p>
          </div>
        </div>
        <button type="button" className="p-2 hover:bg-slate-50 text-slate-400 rounded-full transition-colors">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {message && !showConfirm && (
        <div className={`p-3 rounded-xl text-xs font-semibold ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {isExpanded && (
        <form ref={formRef} onSubmit={handleInitialSubmit} className="space-y-5 text-xs mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Event Title *</label>
              <input type="text" name="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Annual Profit Share 2082/83" className="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-700 font-medium" />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Total Profit Pool (NPR) *</label>
              <input type="number" name="total_profit_pool" required min="1" value={profitPool} onChange={(e) => setProfitPool(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-purple-700" />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Distribution Date *</label>
              <input type="date" name="distributed_at" required value={distributedAt} onChange={(e) => setDistributedAt(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-purple-700" />
            </div>
          </div>

          <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-start gap-2.5">
              <CalendarClock size={18} className="text-blue-700 shrink-0 mt-0.5" />
              <div>
                <label className="block font-bold text-blue-900 mb-0.5">Savings Cutoff Month (Exclude Advance Payments)</label>
                <p className="text-[10px] text-blue-700 leading-tight">Only member deposits recorded <strong>for this month and earlier</strong> will be included.</p>
              </div>
            </div>
            <input type="month" name="cutoff_month" required value={cutoffMonth} onChange={(e) => setCutoffMonth(e.target.value)} className="p-2 border border-blue-200 rounded-lg bg-white text-blue-900 font-bold focus:outline-none focus:ring-1 focus:ring-blue-700 shrink-0" />
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex justify-between items-center text-slate-700 font-bold">
              <span className="flex items-center gap-1.5 text-[11px] text-purple-900 bg-purple-50 px-2 py-1 rounded">
                <Sparkles size={12} /> Auto-Calculation & Member Payout Configuration
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Eligible Pool Savings: NPR {totalEligibleSavings.toLocaleString('en-IN')}</span>
            </div>

            <div className="border border-purple-100 rounded-xl overflow-hidden bg-white max-h-[300px] overflow-y-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] sticky top-0 z-10 shadow-xs">
                  <tr>
                    <th className="p-2">Member</th>
                    <th className="p-2 text-right">Eligible Savings</th>
                    <th className="p-2 text-right">Share</th>
                    <th className="p-2 text-right text-purple-900">Est. Payout</th>
                    <th className="p-2">Final Override</th>
                    <th className="p-2">Method & Note</th>
                  </tr>
                </thead>
                <tbody key={`${numericProfitPool}-${cutoffMonth}`} onChange={handleTableChange} className="divide-y divide-slate-100">
                  {memberBreakdown.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="p-2 font-sans font-bold text-slate-900">
                        {m.full_name} <span className="block text-[9px] text-slate-400 font-mono">{m.account_id}</span>
                      </td>
                      <td className="p-2 text-right font-bold text-slate-600">NPR {m.totalSavings.toLocaleString('en-IN')}</td>
                      <td className="p-2 text-right font-bold text-purple-700">{m.sharePct}%</td>
                      <td className="p-2 text-right font-black text-purple-900">NPR {m.estimatedDividend.toLocaleString('en-IN')}</td>
                      <td className="p-2">
                        <input type="number" name={`dividend_amount_${m.id}`} defaultValue={m.estimatedDividend} className="w-20 p-1 border border-purple-200 rounded bg-purple-50 text-right text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-700" />
                      </td>
                      <td className="p-2 space-y-1">
                        <select name={`payment_method_${m.id}`} defaultValue="CASH" className="w-full p-1 border border-slate-200 rounded text-[10px] font-sans">
                          <option value="BANK_TRANSFER">Bank Transfer</option>
                          <option value="FONEPAY">Fonepay</option>
                          <option value="ESEWA">eSewa</option>
                          <option value="CASH">Cash</option>
                        </select>
                        <input type="text" name={`deposit_note_${m.id}`} placeholder="Reference Note..." className="w-full p-1 border border-slate-200 rounded text-[10px] font-sans" />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 sticky bottom-0 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={4} className="p-2.5 text-right font-bold font-sans text-slate-600">Total Allocated:</td>
                    <td className="p-2.5 text-right font-black text-purple-950 text-sm">NPR {allocatedTotal.toLocaleString('en-IN')}</td>
                    <td className="p-2.5">
                      {isLedgerBalanced ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-1 rounded w-fit">
                          <Scale size={12} /> Ledger Balanced
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-800 bg-red-100 px-2 py-1 rounded w-fit">
                          <AlertTriangle size={12} /> Diff: NPR {Math.abs(numericProfitPool - allocatedTotal).toFixed(2)}
                        </span>
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <button type="submit" disabled={internalMembers.length === 0 || totalEligibleSavings === 0 || !isLedgerBalanced} className="w-full py-3 bg-purple-900 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
            Prepare Distribution (NPR {numericProfitPool.toLocaleString('en-IN')})
          </button>
        </form>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4 border-2 border-purple-200">
            <div className="mx-auto w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>
            <h3 className="font-black text-lg text-slate-900">Confirm Distribution</h3>
            <p className="text-xs text-slate-600 font-medium">You are about to distribute a total profit pool of <strong className="text-purple-900">NPR {numericProfitPool.toLocaleString('en-IN')}</strong> to <strong>{internalMembers.length} active members</strong>.</p>
            <p className="text-[11px] font-bold text-blue-800 bg-blue-50 py-1.5 rounded-lg border border-blue-100 mt-2">Cutoff Month Filter: {cutoffMonth}</p>
            <p className="text-[10px] text-slate-400">This action will generate permanent receipt vouchers and audit logs.</p>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowConfirm(false)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer">Cancel</button>
              <button type="button" onClick={() => executeDistribution()} disabled={loading} className="flex-1 py-2.5 bg-purple-900 hover:bg-purple-800 text-white font-bold rounded-xl text-xs flex justify-center cursor-pointer">
                {loading ? 'Processing...' : 'Confirm & Execute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}