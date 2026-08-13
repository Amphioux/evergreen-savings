'use client';

import { Printer, X } from 'lucide-react';

export default function PrintControls() {
  return (
    <div className="flex items-center justify-between bg-slate-900 text-white p-3.5 rounded-xl mb-6 shadow-md print:hidden">
      <div>
        <span className="font-extrabold text-xs block text-slate-100">Print Preview Document</span>
        <span className="text-[10px] text-slate-400 font-mono">Click 'Print Document' to send to printer or export as PDF</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
        >
          <Printer size={15} /> Print Document
        </button>

        <button
          type="button"
          onClick={() => window.close()}
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <X size={15} /> Close
        </button>
      </div>
    </div>
  );
}