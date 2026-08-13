'use client';

import { useState, useMemo } from 'react';
import { Landmark, Building2, ShieldAlert, Calendar, Search, RotateCcw, Printer, TrendingUp, Trash2, AlertTriangle, Layers } from 'lucide-react';
import EditBankInterestModal from './EditBankInterestModal';
import EditAssetModal from './EditAssetModal';
import DividendReceiptModal from './DividendReceiptModal';
import { deleteBankInterest, deleteAsset, deleteDividendDistribution } from '@/app/actions';

interface DeleteDetail {
  label: string;
  value: string | number;
}

export default function TreasuryListViews({
  bankInterestList = [],
  assetList = [],
  auditLogs = [],
  dividendList = [],
  isAdmin,
  isSuperAdmin,
}: any) {
  const [activeTab, setActiveTab] = useState<'INTEREST' | 'ASSETS' | 'DIVIDENDS' | 'AUDIT'>('INTEREST');

  // Custom Delete Modal State
  const [deleteState, setDeleteState] = useState<{
    isOpen: boolean;
    type: 'interest' | 'asset' | 'dividend';
    id: number;
    displayRef: string;
    details: DeleteDetail[];
    loading: boolean;
  }>({ isOpen: false, type: 'interest', id: 0, displayRef: '', details: [], loading: false });

  // Tab-Isolated Filter States
  const [interestFilters, setInterestFilters] = useState({ search: '', startDate: '', endDate: '' });
  const [assetFilters, setAssetFilters] = useState({ search: '', startDate: '', endDate: '' });
  const [dividendFilters, setDividendFilters] = useState({ search: '', startDate: '', endDate: '', selectedBatch: 'ALL' });
  const [auditFilters, setAuditFilters] = useState({ search: '', startDate: '', endDate: '' });

  function resetFilters() {
    if (activeTab === 'INTEREST') {
      setInterestFilters({ search: '', startDate: '', endDate: '' });
    } else if (activeTab === 'ASSETS') {
      setAssetFilters({ search: '', startDate: '', endDate: '' });
    } else if (activeTab === 'DIVIDENDS') {
      setDividendFilters({ search: '', startDate: '', endDate: '', selectedBatch: 'ALL' });
    } else if (activeTab === 'AUDIT') {
      setAuditFilters({ search: '', startDate: '', endDate: '' });
    }
  }

  function openDeleteModal(type: 'interest' | 'asset' | 'dividend', id: number, displayRef: string, details: DeleteDetail[]) {
    setDeleteState({ isOpen: true, type, id, displayRef, details, loading: false });
  }

  async function executeDelete() {
    setDeleteState((prev) => ({ ...prev, loading: true }));
    const formData = new FormData();
    formData.append('id', String(deleteState.id));

    let res;
    if (deleteState.type === 'interest') res = await deleteBankInterest(formData);
    else if (deleteState.type === 'asset') res = await deleteAsset(formData);
    else if (deleteState.type === 'dividend') res = await deleteDividendDistribution(formData);

    setDeleteState((prev) => ({ ...prev, loading: false, isOpen: false }));
    if (res?.error) alert(`Error: ${res.error}`);
  }

  const uniqueBatches = useMemo(() => {
    const map = new Map();
    dividendList.forEach((d: any) => {
      if (d.distribution_code && !map.has(d.distribution_code)) {
        map.set(d.distribution_code, { code: d.distribution_code, title: d.title });
      }
    });
    return Array.from(map.values());
  }, [dividendList]);

  // Tab-Isolated Filter Computations
  const filteredInterest = useMemo(() => {
    const { search, startDate, endDate } = interestFilters;
    return bankInterestList.filter((item: any) => {
      const matchesSearch = !search || 
        item.notes?.toLowerCase().includes(search.toLowerCase()) || 
        item.recorded_by_name?.toLowerCase().includes(search.toLowerCase());
      const matchesStart = !startDate || item.credit_date >= startDate;
      const matchesEnd = !endDate || item.credit_date <= endDate;
      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [bankInterestList, interestFilters]);

  const filteredAssets = useMemo(() => {
    const { search, startDate, endDate } = assetFilters;
    return assetList.filter((item: any) => {
      const matchesSearch = !search || 
        item.asset_name?.toLowerCase().includes(search.toLowerCase()) || 
        item.asset_type?.toLowerCase().includes(search.toLowerCase());
      const matchesStart = !startDate || item.purchase_date >= startDate;
      const matchesEnd = !endDate || item.purchase_date <= endDate;
      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [assetList, assetFilters]);

  const filteredDividends = useMemo(() => {
    const { search, startDate, endDate, selectedBatch } = dividendFilters;
    return dividendList.filter((item: any) => {
      const matchesSearch = !search || 
        item.distribution_code?.toLowerCase().includes(search.toLowerCase()) || 
        item.title?.toLowerCase().includes(search.toLowerCase()) || 
        item.member_name?.toLowerCase().includes(search.toLowerCase());
      const matchesStart = !startDate || item.distributed_at >= startDate;
      const matchesEnd = !endDate || item.distributed_at <= endDate;
      const matchesBatch = selectedBatch === 'ALL' || item.distribution_code === selectedBatch;
      return matchesSearch && matchesStart && matchesEnd && matchesBatch;
    });
  }, [dividendList, dividendFilters]);

  const filteredAuditLogs = useMemo(() => {
    const { search, startDate, endDate } = auditFilters;
    return auditLogs.filter((item: any) => {
      const logDate = item.created_at ? item.created_at.slice(0, 10) : '';
      const matchesSearch = !search || 
        item.entity_type?.toLowerCase().includes(search.toLowerCase()) || 
        item.action?.toLowerCase().includes(search.toLowerCase()) || 
        item.reason?.toLowerCase().includes(search.toLowerCase()) ||
        item.changed_by_email?.toLowerCase().includes(search.toLowerCase());
      const matchesStart = !startDate || logDate >= startDate;
      const matchesEnd = !endDate || logDate <= endDate;
      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [auditLogs, auditFilters]);

  // --- Open Member Vouchers in a Dedicated Tab (6-per-Page A4 Grid) ---
  function openBatchSlipsInNewTab() {
    if (filteredDividends.length === 0) return alert('No dividend payout records found for the selected batch.');

    const newWindow = window.open('', '_blank');
    if (!newWindow) return alert('Pop-up blocked. Please allow pop-ups for this site.');

    const slipsHtml = filteredDividends.map((p: any) => `
      <div class="slip-card">
        <div class="slip-header">
          <h2>EVERGREEN SAVINGS GROUP</h2>
          <p>Dividend Payout Voucher</p>
          <div class="receipt-id">${p.distribution_code || `DIV-${p.id}`}</div>
        </div>

        <div class="member-box">
          <div>
            <span class="lbl">Member Name</span><br/>
            <strong>${p.member_name || 'Member'}</strong> <small style="color:#64748b;">(${p.member_account_id || 'N/A'})</small>
          </div>
          <div style="text-align: right;">
            <span class="lbl">Date</span><br/>
            <strong>${p.distributed_at || ''}</strong>
          </div>
        </div>

        <div class="details-body">
          <div class="row"><span>Event Title:</span> <strong>${p.title || p.event_title || 'Dividend'}</strong></div>
          <div class="row"><span>Savings (Cutoff ${p.cutoff_month || 'N/A'}):</span> <span>NPR ${Number(p.member_savings_snapshot || 0).toLocaleString('en-IN')}</span></div>
          <div class="row"><span>Share / Method:</span> <strong>${p.share_percentage || 0}% (${p.payment_method || 'CASH'})</strong></div>
          ${p.deposit_note ? `<div class="row"><span>Note:</span> <strong>${p.deposit_note}</strong></div>` : ''}

          <div class="total-row">
            <span>Payout:</span>
            <strong>NPR ${Number(p.dividend_amount || 0).toLocaleString('en-IN')}</strong>
          </div>
        </div>

        <div class="slip-footer">
          <div>
            <span style="font-size: 7px; color: #94a3b8; text-transform: uppercase; font-weight: bold; display: block;">Recorded By:</span>
            <strong>${p.recorded_by_name || 'System Admin'}</strong>
            <small style="color:#64748b; font-size:6.5px; display:block;">${p.recorded_by_designation || 'Executive Officer'}</small>
          </div>
          <div style="text-align: center;">
            <div style="border-bottom: 1px solid #94a3b8; width: 70px; margin: 0 auto 1px auto; height: 10px;"></div>
            <strong style="color: #475569; font-size: 7.5px;">Signature</strong>
          </div>
        </div>
      </div>
    `).join('');

    const batchTitle = dividendFilters.selectedBatch !== 'ALL' ? dividendFilters.selectedBatch : 'Batch Vouchers';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Member Dividend Slips - ${batchTitle}</title>
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
            <div><strong>Member Payout Vouchers</strong> (${filteredDividends.length} Total - 6 Per Page)</div>
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

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden font-sans text-left print:border-none print:shadow-none relative">
      
      {/* Table Print Header */}
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-bold text-black uppercase">
          {activeTab === 'INTEREST' && 'Bank Interest Records'}
          {activeTab === 'ASSETS' && 'Property & Assets Directory'}
          {activeTab === 'DIVIDENDS' && (dividendFilters.selectedBatch !== 'ALL' ? `Dividend Summary: ${dividendFilters.selectedBatch}` : 'All Dividend Distributions')}
          {activeTab === 'AUDIT' && 'Compliance Audit Logs'}
        </h1>
        <p className="text-sm text-gray-500" suppressHydrationWarning>
          Printed on: {new Date().toLocaleString()}
        </p>
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-wrap border-b border-slate-200 bg-slate-50/80 p-2 gap-2 text-xs font-bold print:hidden">
        <button onClick={() => setActiveTab('INTEREST')} className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors ${activeTab === 'INTEREST' ? 'bg-emerald-800 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'}`}>
          <Landmark size={15} /> Interest ({filteredInterest.length})
        </button>
        <button onClick={() => setActiveTab('ASSETS')} className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors ${activeTab === 'ASSETS' ? 'bg-purple-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'}`}>
          <Building2 size={15} /> Assets ({filteredAssets.length})
        </button>
        <button onClick={() => setActiveTab('DIVIDENDS')} className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors ${activeTab === 'DIVIDENDS' ? 'bg-blue-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'}`}>
          <TrendingUp size={15} /> Dividends ({filteredDividends.length})
        </button>
        {isAdmin && (
          <button onClick={() => setActiveTab('AUDIT')} className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors ${activeTab === 'AUDIT' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'}`}>
            <ShieldAlert size={15} /> Audits ({filteredAuditLogs.length})
          </button>
        )}

        <div className="ml-auto flex gap-2">
          {activeTab === 'DIVIDENDS' && dividendFilters.selectedBatch !== 'ALL' && (
            <button onClick={openBatchSlipsInNewTab} className="px-3 py-2 bg-purple-900 hover:bg-purple-800 text-white rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs">
              <Layers size={15} /> Print Member Vouchers
            </button>
          )}
          <button onClick={() => window.print()} className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer">
            <Printer size={15} /> Print Summary Table
          </button>
        </div>
      </div>

      {/* Tab-Isolated Filter Bar */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs print:hidden">
        {/* Search Field */}
        <div className="relative sm:col-span-4 lg:col-span-3">
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            value={
              activeTab === 'INTEREST' ? interestFilters.search :
              activeTab === 'ASSETS' ? assetFilters.search :
              activeTab === 'DIVIDENDS' ? dividendFilters.search :
              auditFilters.search
            }
            onChange={(e) => {
              const val = e.target.value;
              if (activeTab === 'INTEREST') setInterestFilters((prev) => ({ ...prev, search: val }));
              else if (activeTab === 'ASSETS') setAssetFilters((prev) => ({ ...prev, search: val }));
              else if (activeTab === 'DIVIDENDS') setDividendFilters((prev) => ({ ...prev, search: val }));
              else setAuditFilters((prev) => ({ ...prev, search: val }));
            }}
            placeholder="Search..."
            className="w-full pl-8 pr-2 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </div>

        {/* Date From Field */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2 sm:col-span-3 lg:col-span-2.5">
          <Calendar size={13} className="text-slate-400 shrink-0" />
          <span className="text-[10px] text-slate-500 font-bold uppercase shrink-0">From:</span>
          <input
            type="date"
            value={
              activeTab === 'INTEREST' ? interestFilters.startDate :
              activeTab === 'ASSETS' ? assetFilters.startDate :
              activeTab === 'DIVIDENDS' ? dividendFilters.startDate :
              auditFilters.startDate
            }
            onChange={(e) => {
              const val = e.target.value;
              if (activeTab === 'INTEREST') setInterestFilters((prev) => ({ ...prev, startDate: val }));
              else if (activeTab === 'ASSETS') setAssetFilters((prev) => ({ ...prev, startDate: val }));
              else if (activeTab === 'DIVIDENDS') setDividendFilters((prev) => ({ ...prev, startDate: val }));
              else setAuditFilters((prev) => ({ ...prev, startDate: val }));
            }}
            className="w-full py-1.5 text-slate-900 border-0 focus:outline-none"
          />
        </div>

        {/* Date To Field */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2 sm:col-span-3 lg:col-span-2.5">
          <Calendar size={13} className="text-slate-400 shrink-0" />
          <span className="text-[10px] text-slate-500 font-bold uppercase shrink-0">To:</span>
          <input
            type="date"
            value={
              activeTab === 'INTEREST' ? interestFilters.endDate :
              activeTab === 'ASSETS' ? assetFilters.endDate :
              activeTab === 'DIVIDENDS' ? dividendFilters.endDate :
              auditFilters.endDate
            }
            onChange={(e) => {
              const val = e.target.value;
              if (activeTab === 'INTEREST') setInterestFilters((prev) => ({ ...prev, endDate: val }));
              else if (activeTab === 'ASSETS') setAssetFilters((prev) => ({ ...prev, endDate: val }));
              else if (activeTab === 'DIVIDENDS') setDividendFilters((prev) => ({ ...prev, endDate: val }));
              else setAuditFilters((prev) => ({ ...prev, endDate: val }));
            }}
            className="w-full py-1.5 text-slate-900 border-0 focus:outline-none"
          />
        </div>

        {/* Batch Event Dropdown (Dividends Tab Only) */}
        {activeTab === 'DIVIDENDS' ? (
          <div className="sm:col-span-4 lg:col-span-2.5 flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase shrink-0">Batch:</span>
            <select
              value={dividendFilters.selectedBatch}
              onChange={(e) => setDividendFilters((prev) => ({ ...prev, selectedBatch: e.target.value }))}
              className="w-full py-1.5 text-slate-900 border-0 focus:outline-none font-bold"
            >
              <option value="ALL">All Batches</option>
              {uniqueBatches.map((batch: any) => (
                <option key={batch.code} value={batch.code}>{batch.code} - {batch.title}</option>
              ))}
            </select>
          </div>
        ) : null}

        {/* Reset Button */}
        <button
          onClick={resetFilters}
          className={`${activeTab === 'DIVIDENDS' ? 'sm:col-span-2 lg:col-span-1.5' : 'sm:col-span-2 lg:col-span-1.5'} px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer`}
        >
          <RotateCcw size={13} /> Reset
        </button>
      </div>

      {/* Main Table Content */}
      <div className={`overflow-x-auto ${deleteState.loading ? 'opacity-50 pointer-events-none' : ''}`}>
        
        {/* BANK INTEREST TABLE */}
        {activeTab === 'INTEREST' && (
          <table className="w-full text-left text-xs font-sans print:text-[10px]">
            <thead className="bg-slate-100 text-slate-500 uppercase font-semibold text-[10px] print:bg-gray-200 print:text-black">
              <tr>
                <th className="p-3 print:p-2 border-b">Credit Date</th>
                <th className="p-3 print:p-2 border-b">Amount Credited</th>
                <th className="p-3 print:p-2 border-b">Notes / Source</th>
                <th className="p-3 print:p-2 border-b">Recorded By</th>
                {isAdmin && <th className="p-3 print:hidden border-b text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInterest.map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="p-3 print:p-2 font-mono font-bold text-slate-900 print:text-black">{item.credit_date}</td>
                  <td className="p-3 print:p-2 font-mono font-black text-emerald-800 print:text-black text-sm print:text-[10px]">+ NPR {Number(item.amount).toLocaleString('en-IN')}</td>
                  <td className="p-3 print:p-2 text-slate-700 print:text-black">{item.notes || '-'}</td>
                  <td className="p-3 print:p-2 font-medium text-slate-700 print:text-black">{item.recorded_by_name || 'Admin'}</td>
                  {isAdmin && (
                    <td className="p-3 print:hidden text-right flex items-center justify-end">
                      <EditBankInterestModal item={item} />
                      {isSuperAdmin && (
                        <button onClick={() => openDeleteModal('interest', item.id, `Bank Interest: ${item.credit_date}`, [
                            { label: 'Credit Date', value: item.credit_date },
                            { label: 'Amount', value: `NPR ${Number(item.amount).toLocaleString('en-IN')}` },
                            { label: 'Notes', value: item.notes || 'N/A' },
                          ])} 
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded transition-colors ml-1" title="Delete Record">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {filteredInterest.length === 0 && (
                <tr><td colSpan={isAdmin ? 5 : 4} className="p-6 text-center text-slate-400">No records found.</td></tr>
              )}
            </tbody>
          </table>
        )}

        {/* ASSETS TABLE */}
        {activeTab === 'ASSETS' && (
          <table className="w-full text-left text-xs font-sans print:text-[10px]">
            <thead className="bg-slate-100 text-slate-500 uppercase font-semibold text-[10px] print:bg-gray-200 print:text-black">
              <tr>
                <th className="p-3 print:p-2 border-b">Asset Name & Type</th>
                <th className="p-3 print:p-2 border-b">Purchase Date</th>
                <th className="p-3 print:p-2 border-b">Purchase Price</th>
                <th className="p-3 print:p-2 border-b">Current Valuation</th>
                {isAdmin && <th className="p-3 print:hidden border-b text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssets.map((asset: any) => (
                <tr key={asset.id} className="hover:bg-slate-50">
                  <td className="p-3 print:p-2">
                    <div className="font-bold text-slate-900 print:text-black">{asset.asset_name}</div>
                    <span className="text-[10px] text-slate-500 print:text-black">{asset.asset_type}</span>
                  </td>
                  <td className="p-3 print:p-2 font-mono text-slate-600 print:text-black">{asset.purchase_date}</td>
                  <td className="p-3 print:p-2 font-mono font-bold text-slate-800 print:text-black">NPR {Number(asset.purchase_price).toLocaleString('en-IN')}</td>
                  <td className="p-3 print:p-2 font-mono font-black text-purple-900 print:text-black text-sm print:text-[10px]">NPR {Number(asset.current_value).toLocaleString('en-IN')}</td>
                  {isAdmin && (
                    <td className="p-3 print:hidden text-right flex items-center justify-end">
                      <EditAssetModal asset={asset} />
                      {isSuperAdmin && (
                        <button onClick={() => openDeleteModal('asset', asset.id, `Asset: ${asset.asset_name}`, [
                            { label: 'Asset Name', value: asset.asset_name },
                            { label: 'Type', value: asset.asset_type },
                            { label: 'Purchase Price', value: `NPR ${Number(asset.purchase_price).toLocaleString('en-IN')}` },
                            { label: 'Current Valuation', value: `NPR ${Number(asset.current_value).toLocaleString('en-IN')}` },
                          ])} 
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded transition-colors ml-1" title="Delete Asset">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {filteredAssets.length === 0 && (
                <tr><td colSpan={isAdmin ? 5 : 4} className="p-6 text-center text-slate-400">No assets found.</td></tr>
              )}
            </tbody>
          </table>
        )}

        {/* DIVIDENDS TABLE */}
        {activeTab === 'DIVIDENDS' && (
          <table className="w-full text-left text-xs font-sans print:text-[10px]">
            <thead className="bg-slate-100 text-slate-500 uppercase font-semibold text-[10px] print:bg-gray-200 print:text-black">
              <tr>
                <th className="p-3 print:p-2 border-b font-mono">Receipt Code</th>
                <th className="p-3 print:p-2 border-b">Event Title & Member</th>
                <th className="p-3 print:p-2 border-b">Date</th>
                <th className="p-3 print:p-2 border-b text-right">Savings Snapshot</th>
                <th className="p-3 print:p-2 border-b text-right">Share (%)</th>
                <th className="p-3 print:p-2 border-b text-right">Dividend Amount</th>
                <th className="p-3 print:p-2 border-b">Method & Reference Note</th>
                <th className="p-3 print:hidden border-b text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDividends.map((payout: any) => (
                <tr key={payout.id} className="hover:bg-slate-50">
                  <td className="p-3 print:p-2 font-mono font-bold text-purple-900 print:text-black">
                    {payout.distribution_code || `DIV-${payout.id}`}
                  </td>
                  <td className="p-3 print:p-2 font-sans">
                    <div className="font-bold text-slate-900 print:text-black">{payout.title || payout.event_title}</div>
                    <div className="text-[10px] text-slate-500 font-mono">Member: <strong className="text-slate-800">{payout.member_name}</strong></div>
                  </td>
                  <td className="p-3 print:p-2 font-mono text-slate-600 print:text-black">{payout.distributed_at}</td>
                  <td className="p-3 print:p-2 font-mono text-right text-slate-700 print:text-black">NPR {Number(payout.member_savings_snapshot || 0).toLocaleString('en-IN')}</td>
                  <td className="p-3 print:p-2 font-mono text-right font-bold text-purple-900 print:text-black">{payout.share_percentage}%</td>
                  <td className="p-3 print:p-2 font-mono text-right font-black text-purple-950 text-sm print:text-[10px] print:text-black">NPR {Number(payout.dividend_amount || 0).toLocaleString('en-IN')}</td>
                  <td className="p-3 print:p-2 font-sans">
                    <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-700 block w-fit mb-0.5 print:border-none">
                      {payout.payment_method || 'CASH'}
                    </span>
                    <span className="text-[10px] text-blue-900 font-mono print:text-black">{payout.deposit_note || 'Direct Payout'}</span>
                  </td>
                  <td className="p-3 print:hidden text-right flex items-center justify-end gap-1">
                    <DividendReceiptModal receipt={{
                      distribution_code: payout.distribution_code || `DIV-${payout.id}`,
                      title: payout.title || payout.event_title || 'Profit Share',
                      distributed_at: payout.distributed_at,
                      cutoff_month: payout.cutoff_month || 'N/A', 
                      member_name: payout.member_name,
                      member_account_id: payout.member_account_id || 'N/A',
                      savings_snapshot: Number(payout.member_savings_snapshot || 0),
                      share_percentage: Number(payout.share_percentage || 0),
                      dividend_amount: Number(payout.dividend_amount || 0),
                      payment_method: payout.payment_method || 'CASH',
                      deposit_note: payout.deposit_note,
                      recorded_by_name: payout.recorded_by_name || 'System Admin',
                      recorded_by_designation: payout.recorded_by_designation || 'Executive Officer',
                    }} />
                    
                    {isSuperAdmin && (
                      <button 
                        onClick={() => openDeleteModal('dividend', payout.distribution_id, `Batch: ${payout.distribution_code || `DIV-${payout.id}`}`, [
                          { label: 'Event Title', value: payout.title || payout.event_title },
                          { label: 'Distribution Code', value: payout.distribution_code || `DIV-${payout.id}` },
                          { label: 'Distributed At', value: payout.distributed_at },
                          { label: 'Cutoff Month', value: payout.cutoff_month || 'N/A' },
                        ])} 
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded transition-colors ml-1" 
                        title="Rollback Entire Event"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredDividends.length === 0 && (
                <tr><td colSpan={8} className="p-6 text-center text-slate-400 font-sans">No dividend distribution records found.</td></tr>
              )}
            </tbody>
          </table>
        )}

        {/* AUDIT LOGS TABLE */}
        {activeTab === 'AUDIT' && isAdmin && (
          <table className="w-full text-left text-xs font-sans print:text-[10px]">
            <thead className="bg-slate-100 text-slate-500 uppercase font-semibold text-[10px] print:bg-gray-200 print:text-black">
              <tr>
                <th className="p-3 print:p-2 border-b">Timestamp</th>
                <th className="p-3 print:p-2 border-b">Entity & Action</th>
                <th className="p-3 print:p-2 border-b">Audit Details / Changes</th>
                <th className="p-3 print:p-2 border-b">Author</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs print:text-[9px]">
              {filteredAuditLogs.map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="p-3 print:p-2 text-slate-500 print:text-black">{log.created_at ? log.created_at.replace('T', ' ').slice(0, 16) : 'N/A'}</td>
                  <td className="p-3 print:p-2">
                    <span className="font-bold text-slate-900 block print:text-black">{log.entity_type}</span>
                    <span className="text-amber-700 font-bold text-[10px] print:text-black">{log.action}</span>
                  </td>
                  <td className="p-3 print:p-2 text-slate-800 break-all font-sans print:text-black">
                    <div className="font-medium text-[11px] mb-1 italic text-slate-500">{log.reason}</div>
                    {log.old_value ? `Old: ${JSON.stringify(log.old_value)} -> New: ${JSON.stringify(log.new_value)}` : JSON.stringify(log.new_value)}
                  </td>
                  <td className="p-3 print:p-2 font-semibold text-slate-800 font-sans print:text-black">{log.changed_by_email || 'System'}</td>
                </tr>
              ))}
              {filteredAuditLogs.length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center text-slate-400 font-sans">No audit logs found for the selected criteria.</td></tr>
              )}
            </tbody>
          </table>
        )}

      </div>

      {/* Delete Confirmation Modal */}
      {deleteState.isOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4 border-2 border-red-200">
            <div className="mx-auto w-12 h-12 bg-red-100 text-red-700 rounded-full flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>
            
            <h3 className="font-black text-lg text-slate-900 uppercase">Confirm Deletion</h3>
            
            <p className="text-xs text-slate-600 font-medium pb-2">
              Are you absolutely sure you want to permanently delete this record?
            </p>

            {deleteState.details.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-left space-y-1.5 mb-2">
                {deleteState.details.map((detail, idx) => (
                  <div key={idx} className="flex justify-between text-xs border-b border-slate-100 last:border-0 pb-1.5 last:pb-0">
                    <span className="text-slate-500 font-sans">{detail.label}:</span>
                    <strong className="text-slate-900 font-mono text-right">{detail.value}</strong>
                  </div>
                ))}
              </div>
            )}

            {deleteState.type === 'dividend' && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-[10px] p-3 rounded-lg text-left shadow-xs">
                <strong className="block mb-1 text-red-900">CRITICAL WARNING:</strong>
                This will rollback the ENTIRE Dividend Distribution Event and instantly delete <strong>ALL</strong> individual member payouts associated with it!
              </div>
            )}

            <p className="text-[10px] text-slate-400">
              This action cannot be undone. A secure audit log will be generated identifying your account.
            </p>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setDeleteState(prev => ({ ...prev, isOpen: false }))} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors" disabled={deleteState.loading}>
                Cancel
              </button>
              <button type="button" onClick={executeDelete} disabled={deleteState.loading} className="flex-1 py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl text-xs transition-colors flex justify-center items-center">
                {deleteState.loading ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}