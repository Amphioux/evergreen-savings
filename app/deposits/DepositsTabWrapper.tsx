'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import DepositsClientContainer from './DepositsClientContainer';
import SavingsDefaultersDetailTable from './SavingsDefaultersDetailTable';
import GroupSavingsDirectoryContainer from './GroupSavingsDirectoryContainer';
import LateFeeCollectionTab from './LateFeeCollectionTab';
import DepositTransactionsSection from './DepositTransactionsSection';
import { BookOpen, ShieldAlert, Receipt } from 'lucide-react';

interface DepositsTabWrapperProps {
  isAdmin: boolean;
  activeMembers: any[];
  depositList: any[];
  allProfiles: any[];
  fineRulesList: any[];
  rulesList: any[];
  fullDefaultersList: any[];
  myDeposits: any[];
  currentUserId: string;
}

export default function DepositsTabWrapper({
  isAdmin,
  activeMembers = [],
  depositList = [],
  allProfiles = [],
  fineRulesList = [],
  rulesList = [],
  fullDefaultersList = [],
  myDeposits = [],
  currentUserId,
}: DepositsTabWrapperProps) {
  const searchParams = useSearchParams();
  const queryTab = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'LATE_FEES' | 'TRANSACTIONS'>('DIRECTORY');

  useEffect(() => {
    if (queryTab === 'LATE_FEES') {
      setActiveTab('LATE_FEES');
    } else if (queryTab === 'TRANSACTIONS') {
      setActiveTab('TRANSACTIONS');
    }
  }, [queryTab]);

  return (
    <div className="space-y-6">
      
      {/* Admin Tab Switcher */}
      {isAdmin && (
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2 print:hidden">
          <button
            onClick={() => setActiveTab('DIRECTORY')}
            className={`px-4 py-2 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'DIRECTORY' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <BookOpen size={15} /> Member-Grouped Directory
          </button>

          <button
            onClick={() => setActiveTab('LATE_FEES')}
            className={`px-4 py-2 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'LATE_FEES' ? 'bg-amber-900 text-white shadow-xs' : 'bg-amber-100 text-amber-950 hover:bg-amber-200'
            }`}
          >
            <ShieldAlert size={15} /> Late Fee Collection Terminal ({fullDefaultersList.length})
          </button>

          <button
            onClick={() => setActiveTab('TRANSACTIONS')}
            className={`px-4 py-2 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'TRANSACTIONS' ? 'bg-emerald-900 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Receipt size={15} /> Deposit Transactions Stream
          </button>
        </div>
      )}

      {/* TAB 1: Member Grouped Directory & Defaulters Radar */}
      {activeTab === 'DIRECTORY' && (
        <>
          {isAdmin && (
            <DepositsClientContainer 
              activeMembers={activeMembers} 
              deposits={depositList} 
              allProfiles={allProfiles}
              fineRules={fineRulesList}
              contributionRules={rulesList}
            />
          )}

          {isAdmin && fullDefaultersList.length > 0 && (
            <SavingsDefaultersDetailTable 
              defaultersList={fullDefaultersList} 
              fineRules={fineRulesList} 
              contributionRules={rulesList}
              onSelectLateFeeTab={() => setActiveTab('LATE_FEES')}
            />
          )}

          <GroupSavingsDirectoryContainer
            depositList={depositList}
            myDeposits={myDeposits}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
          />
        </>
      )}

      {/* TAB 2: Dedicated Late Fee Collection Terminal */}
      {activeTab === 'LATE_FEES' && isAdmin && (
        <LateFeeCollectionTab
          defaultersList={fullDefaultersList}
          fineRules={fineRulesList}
          contributionRules={rulesList}
        />
      )}

      {/* TAB 3: Transactions Stream */}
      {activeTab === 'TRANSACTIONS' && isAdmin && (
        <DepositTransactionsSection
          depositList={depositList}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
        />
      )}

    </div>
  );
}