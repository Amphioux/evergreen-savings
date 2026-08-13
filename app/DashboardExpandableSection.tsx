'use client';

import { useState, ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface DashboardExpandableSectionProps {
  children: ReactNode[];
  initialCount?: number;
  label?: string;
  emptyMessage?: ReactNode;
  isTable?: boolean;
  colSpan?: number;
}

export default function DashboardExpandableSection({
  children,
  initialCount = 3,
  label = 'Items',
  emptyMessage,
  isTable = false,
  colSpan = 10,
}: DashboardExpandableSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const totalItems = children.length;

  if (totalItems === 0) {
    if (isTable) {
      return (
        <tbody>
          <tr>
            <td colSpan={colSpan}>{emptyMessage}</td>
          </tr>
        </tbody>
      );
    }
    return <>{emptyMessage}</>;
  }

  const visibleItems = isExpanded ? children : children.slice(0, initialCount);
  const hasMore = totalItems > initialCount;

  // Render HTML for <table> sections (NO internal <div> tags allowed)
  if (isTable) {
    return (
      <tbody className="divide-y divide-slate-100 font-mono">
        {visibleItems}

        {hasMore && (
          <tr className="bg-slate-50 border-t border-slate-200">
            <td colSpan={colSpan} className="p-2.5 text-center font-sans">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                {isExpanded ? (
                  <>
                    Show Less <ChevronUp size={14} />
                  </>
                ) : (
                  <>
                    Show All {totalItems} {label} (+{totalItems - initialCount} more) <ChevronDown size={14} />
                  </>
                )}
              </button>
            </td>
          </tr>
        )}
      </tbody>
    );
  }

  // Render HTML for card list sections
  return (
    <div className="space-y-2">
      {visibleItems}

      {hasMore && (
        <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center rounded-b-2xl">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            {isExpanded ? (
              <>
                Show Less <ChevronUp size={14} />
              </>
            ) : (
              <>
                Show All {totalItems} {label} (+{totalItems - initialCount} more) <ChevronDown size={14} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}