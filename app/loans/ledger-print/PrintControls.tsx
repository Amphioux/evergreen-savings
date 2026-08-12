'use client';

import { Printer, ArrowLeft } from 'lucide-react';

export default function PrintControls({ title }: { title: string }) {
  return (
    <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
      <button
        onClick={() => window.close()}
        className="px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
      >
        <ArrowLeft size={15} /> Close & Return
      </button>

      <div className="text-center">
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        <p className="text-[10px] text-slate-400">Review document below before printing</p>
      </div>

      <button
        onClick={() => window.print()}
        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
      >
        <Printer size={15} /> Print Document
      </button>
    </div>
  );
}