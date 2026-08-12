'use client';

import { useState, useMemo } from 'react';
import { Landmark, Building2, ShieldAlert, Calendar, Search, RotateCcw, Printer } from 'lucide-react';
import EditBankInterestModal from './EditBankInterestModal';
import EditAssetModal from './EditAssetModal';

export default function TreasuryListViews({ bankInterestList, assetList, auditLogs, isAdmin }: any) {
  const [activeTab, setActiveTab] = useState<'INTEREST' | 'ASSETS' | 'AUDIT'>('INTEREST');

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [auditYear, setAuditYear] = useState('ALL');

  function resetFilters() {
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setAuditYear('ALL');
  }

  // Extract unique years from Audit Logs for the dropdown
  const uniqueAuditYears = useMemo(() => {
    const years = new Set(auditLogs.map((log: any) => log.created_at ? log.created_at.substring(0, 4) : null).filter(Boolean));
    return Array.from(years).sort().reverse() as string[];
  }, [auditLogs]);

  // Filter Logic
  const filteredInterest = useMemo(() => {
    return bankInterestList.filter((item: any) => {
      const matchesSearch = !searchQuery || item.notes?.toLowerCase().includes(searchQuery.toLowerCase()) || item.recorded_by_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStart = !startDate || item.credit_date >= startDate;
      const matchesEnd = !endDate || item.credit_date <= endDate;
      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [bankInterestList, searchQuery, startDate, endDate]);

  const filteredAssets = useMemo(() => {
    return assetList.filter((item: any) => {
      const matchesSearch = !searchQuery || item.asset_name.toLowerCase().includes(searchQuery.toLowerCase()) || item.asset_type.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStart = !startDate || item.purchase_date >= startDate;
      const matchesEnd = !endDate || item.purchase_date <= endDate;
      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [assetList, searchQuery, startDate, endDate]);

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((item: any) => {
      const logYear = item.created_at ? item.created_at.substring(0, 4) : '';
      const matchesSearch = !searchQuery || item.entity_type.toLowerCase().includes(searchQuery.toLowerCase()) || item.action.toLowerCase().includes(searchQuery.toLowerCase()) || item.reason?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesYear = auditYear === 'ALL' || logYear === auditYear;
      return matchesSearch && matchesYear;
    });
  }, [auditLogs, searchQuery, auditYear]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden font-sans text-left print:border-none print:shadow-none">
      
      {/* Print Header (Visible only when printing) */}
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-bold text-black uppercase">
          {activeTab === 'INTEREST' && 'Bank Interest Records'}
          {activeTab === 'ASSETS' && 'Property & Assets Directory'}
          {activeTab === 'AUDIT' && 'Compliance Audit Logs'}
        </h1>
        <p className="text-sm text-gray-500">Printed on: {new Date().toLocaleString()}</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-slate-200 bg-slate-50/80 p-2 gap-2 text-xs font-bold print:hidden">
        <button onClick={() => setActiveTab('INTEREST')} className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors ${activeTab === 'INTEREST' ? 'bg-emerald-800 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'}`}>
          <Landmark size={15} /> Interest Records ({filteredInterest.length})
        </button>
        <button onClick={() => setActiveTab('ASSETS')} className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors ${activeTab === 'ASSETS' ? 'bg-purple-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'}`}>
          <Building2 size={15} /> Assets Directory ({filteredAssets.length})
        </button>
        
        {/* ONLY ADMINS SEE THIS TAB */}
        {isAdmin && (
          <button onClick={() => setActiveTab('AUDIT')} className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors ${activeTab === 'AUDIT' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'}`}>
            <ShieldAlert size={15} /> Audit Logs ({filteredAuditLogs.length})
          </button>
        )}

        <button onClick={() => window.print()} className="ml-auto px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer">
          <Printer size={15} /> Print View
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs print:hidden">
        <div className="relative sm:col-span-3">
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="w-full pl-8 pr-2 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900" />
        </div>

        {activeTab !== 'AUDIT' ? (
          <>
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2 sm:col-span-3">
              <Calendar size={13} className="text-slate-400 shrink-0" />
              <span className="text-[10px] text-slate-500 font-bold uppercase shrink-0">From:</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full py-1.5 text-slate-900 border-0 focus:outline-none" />
            </div>
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2 sm:col-span-3">
              <Calendar size={13} className="text-slate-400 shrink-0" />
              <span className="text-[10px] text-slate-500 font-bold uppercase shrink-0">To:</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full py-1.5 text-slate-900 border-0 focus:outline-none" />
            </div>
          </>
        ) : (
          <div className="sm:col-span-6 flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase shrink-0 pl-1">Filter Year:</span>
            <select value={auditYear} onChange={(e) => setAuditYear(e.target.value)} className="w-full py-1.5 text-slate-900 border-0 focus:outline-none font-bold">
              <option value="ALL">All Years</option>
              {uniqueAuditYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
        )}

        <button onClick={resetFilters} className="sm:col-span-3 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer">
          <RotateCcw size={13} /> Reset
        </button>
      </div>

      {/* Tab Contents */}
      <div className="overflow-x-auto">
        
        {/* BANK INTEREST TABLE */}
        {activeTab === 'INTEREST' && (
          <table className="w-full text-left text-xs font-sans print:text-[10px]">
            <thead className="bg-slate-100 text-slate-500 uppercase font-semibold text-[10px] print:bg-gray-200 print:text-black">
              <tr>
                <th className="p-3 print:p-2 border-b">Credit Date</th>
                <th className="p-3 print:p-2 border-b">Amount Credited</th>
                <th className="p-3 print:p-2 border-b">Notes / Source</th>
                <th className="p-3 print:p-2 border-b">Recorded By</th>
                {isAdmin && <th className="p-3 print:hidden border-b text-center">Action</th>}
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
                    <td className="p-3 print:hidden text-center">
                      <EditBankInterestModal item={item} />
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
                {isAdmin && <th className="p-3 print:hidden border-b text-center">Action</th>}
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
                    <td className="p-3 print:hidden text-center">
                      <EditAssetModal asset={asset} />
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
    </div>
  );
}