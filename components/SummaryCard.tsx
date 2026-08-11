import { ReactNode } from 'react';

interface SummaryCardProps {
  title: string;
  amount: number;
  icon: ReactNode;
  subtitle?: string;
  highlight?: boolean;
}

export default function SummaryCard({ title, amount, icon, subtitle, highlight = false }: SummaryCardProps) {
  return (
    <div className={`p-5 rounded-xl border shadow-sm transition-all ${
      highlight 
        ? 'bg-emerald-900 text-white border-emerald-800' 
        : 'bg-white text-slate-800 border-slate-200'
    }`}>
      <div className="flex justify-between items-start mb-2">
        <span className={`text-xs font-semibold uppercase tracking-wider ${highlight ? 'text-emerald-200' : 'text-slate-500'}`}>
          {title}
        </span>
        <div className={`p-2 rounded-lg ${highlight ? 'bg-emerald-800 text-emerald-200' : 'bg-slate-100 text-emerald-800'}`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold tracking-tight">
        NPR {amount.toLocaleString('en-IN')}
      </div>
      {subtitle && (
        <p className={`text-xs mt-1 ${highlight ? 'text-emerald-200' : 'text-slate-500'}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}