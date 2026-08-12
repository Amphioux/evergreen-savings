'use client';

import { useState, useMemo, useEffect } from 'react';
import RepaymentReceiptModal from '@/app/loans/RepaymentReceiptModal';
import DepositReceiptModal from '@/app/deposits/DepositReceiptModal';
import { getKycSignedUrl, getPhotoSignedUrl, getLoanDocSignedUrl } from '@/app/actions';
import { 
  Search, 
  UserSearch, 
  PiggyBank, 
  Landmark, 
  ShieldCheck, 
  Receipt, 
  TrendingUp, 
  Printer, 
  Phone, 
  Mail, 
  Calendar, 
  MapPin, 
  CreditCard, 
  FileText, 
  Layers,
  ExternalLink,
  Award,
  User,
  Users
} from 'lucide-react';

interface User360LookupProps {
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  currentAdminName?: string;
  defaultUserId?: string;
  profiles?: any[];
  deposits?: any[];
  loans?: any[];
  payments?: any[];
  dividendPayouts?: any[];
  dividendDistributions?: any[];
}

function getKathmanduPrintTimestamp() {
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

export default function User360Lookup({
  isAdmin = true,
  isSuperAdmin = false,
  currentAdminName = 'System Admin',
  defaultUserId = '',
  profiles = [],
  deposits = [],
  loans = [],
  payments = [],
  dividendPayouts = [],
  dividendDistributions = [],
}: User360LookupProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>(defaultUserId);
  const [docLoading, setDocLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loanDocLoadingPath, setLoanDocLoadingPath] = useState<string | null>(null);

  useEffect(() => {
    if (defaultUserId) {
      setSelectedUserId(defaultUserId);
    }
  }, [defaultUserId]);

  // Array Guards
  const safeProfiles = useMemo(() => (Array.isArray(profiles) ? profiles : []), [profiles]);
  const safeDeposits = useMemo(() => (Array.isArray(deposits) ? deposits : []), [deposits]);
  const safeLoans = useMemo(() => (Array.isArray(loans) ? loans : []), [loans]);
  const safePayments = useMemo(() => (Array.isArray(payments) ? payments : []), [payments]);
  const safeDividendPayouts = useMemo(() => (Array.isArray(dividendPayouts) ? dividendPayouts : []), [dividendPayouts]);
  const safeDividendDistributions = useMemo(() => (Array.isArray(dividendDistributions) ? dividendDistributions : []), [dividendDistributions]);

  // 1. Filter member profiles eligible for lookup
  const memberProfiles = useMemo(() => {
    return safeProfiles.filter((p: any) => {
      const isRoleAdmin = p.role === 'ADMIN' || p.role === 'SUPER_ADMIN';
      const isAccAdmin = p.account_id?.startsWith('ADMIN-') || p.account_id?.startsWith('SA-');
      return !isRoleAdmin && !isAccAdmin;
    });
  }, [safeProfiles]);

  const filteredProfiles = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return memberProfiles;

    return memberProfiles.filter((p: any) => {
      return (
        (p.full_name && p.full_name.toLowerCase().includes(q)) ||
        (p.account_id && p.account_id.toLowerCase().includes(q)) ||
        (p.phone && p.phone.includes(q)) ||
        (p.citizenship_no && p.citizenship_no.toLowerCase().includes(q)) ||
        (p.father_name && p.father_name.toLowerCase().includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q))
      );
    });
  }, [searchTerm, memberProfiles]);

  // String coercion for selectedUser lookup
  const selectedUser = useMemo(() => {
    if (!selectedUserId) return null;
    return safeProfiles.find((p: any) => String(p.id) === String(selectedUserId));
  }, [selectedUserId, safeProfiles]);

  useEffect(() => {
    async function loadPhoto() {
      if (selectedUser?.photo_path) {
        const url = await getPhotoSignedUrl(selectedUser.photo_path);
        setPhotoUrl(url);
      } else {
        setPhotoUrl(null);
      }
    }
    loadPhoto();
  }, [selectedUser]);

  // 2. User Savings Deposits Ledger (String coercion comparison)
  const userDeposits = useMemo(() => {
    if (!selectedUser) return [];
    return safeDeposits
      .filter((d: any) => String(d.member_id) === String(selectedUser.id))
      .sort((a: any, b: any) => new Date(b.for_month).getTime() - new Date(a.for_month).getTime());
  }, [selectedUser, safeDeposits]);

  const totalSavingsDeposited = useMemo(() => {
    return userDeposits.reduce((sum: number, d: any) => sum + Number(d.amount_paid || 0), 0);
  }, [userDeposits]);

  // 3. User Borrowed Loans & Grouped Repayments
  const groupedUserLoans = useMemo(() => {
    if (!selectedUser) return [];

    const userLoans = safeLoans
      .filter((l: any) => String(l.borrower_id) === String(selectedUser.id))
      .sort((a: any, b: any) => new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime());

    return userLoans.map((loan: any) => {
      const loanPayments = safePayments
        .filter((p: any) => String(p.loan_id) === String(loan.id))
        .sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());

      const repaidPrincipal = loanPayments.reduce((sum: number, p: any) => sum + Number(p.principal_paid || 0), 0);
      const repaidInterest = loanPayments.reduce((sum: number, p: any) => sum + Number(p.interest_paid || 0), 0);
      const remainingBalance = Math.max(0, Number(loan.principal_amount || 0) - repaidPrincipal);

      return {
        ...loan,
        repaidPrincipal,
        repaidInterest,
        remainingBalance,
        loanPayments: loanPayments || [],
        isPaidOff: remainingBalance <= 0,
      };
    });
  }, [selectedUser, safeLoans, safePayments]);

  const overallLoanKpis = useMemo(() => {
    let activeLoanBalance = 0;
    let totalPrincipalPaid = 0;
    let totalInterestPaid = 0;

    groupedUserLoans.forEach((loan: any) => {
      totalPrincipalPaid += loan.repaidPrincipal;
      totalInterestPaid += loan.repaidInterest;
      if (loan.status === 'ACTIVE' && loan.remainingBalance > 0) {
        activeLoanBalance += loan.remainingBalance;
      }
    });

    return {
      activeLoanBalance,
      totalPrincipalPaid,
      totalInterestPaid,
    };
  }, [groupedUserLoans]);

  // 4. Guarantor Responsibilities
  const guaranteedLoans = useMemo(() => {
    if (!selectedUser) return [];
    return safeLoans
      .filter((l: any) => String(l.guarantor_id) === String(selectedUser.id))
      .sort((a: any, b: any) => new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime())
      .map((loan: any) => {
        const borrower = safeProfiles.find((p: any) => String(p.id) === String(loan.borrower_id));
        const loanPayments = safePayments.filter((p: any) => String(p.loan_id) === String(loan.id));
        const repaid = loanPayments.reduce((sum: number, p: any) => sum + Number(p.principal_paid || 0), 0);
        const remainingBalance = Math.max(0, Number(loan.principal_amount || 0) - repaid);

        return {
          ...loan,
          borrower_name: borrower?.full_name || 'Borrower',
          borrower_account_id: borrower?.account_id || 'N/A',
          remainingBalance,
        };
      });
  }, [selectedUser, safeLoans, safeProfiles, safePayments]);

  const totalGuaranteedExposure = useMemo(() => {
    return guaranteedLoans.reduce((sum: number, l: any) => sum + l.remainingBalance, 0);
  }, [guaranteedLoans]);

  // 5. Dividend Payout History
  const userDividends = useMemo(() => {
    if (!selectedUser) return [];
    return safeDividendPayouts
      .filter((dp: any) => String(dp.member_id) === String(selectedUser.id))
      .map((dp: any) => {
        const dist = safeDividendDistributions.find((d: any) => String(d.id) === String(dp.distribution_id));
        return {
          ...dp,
          distribution_code: dist?.distribution_code || 'DIV-001',
          title: dist?.title || 'Dividend Payout',
          distributed_at: dist?.distributed_at || dp.created_at,
        };
      })
      .sort((a: any, b: any) => new Date(b.distributed_at).getTime() - new Date(a.distributed_at).getTime());
  }, [selectedUser, safeDividendPayouts, safeDividendDistributions]);

  const totalDividendsEarned = useMemo(() => {
    return userDividends.reduce((sum: number, d: any) => sum + Number(d.dividend_amount || 0), 0);
  }, [userDividends]);

  // Handlers
  async function handleViewDocument() {
    if (!selectedUser?.kyc_document_path) return;
    setDocLoading(true);
    const url = await getKycSignedUrl(selectedUser.kyc_document_path);
    setDocLoading(false);
    if (url) window.open(url, '_blank');
  }

  async function handleViewLoanApplication(path: string) {
    if (!path) return;
    setLoanDocLoadingPath(path);
    const url = await getLoanDocSignedUrl(path);
    setLoanDocLoadingPath(null);
    if (url) window.open(url, '_blank');
  }

  function handlePrintProfile() {
    window.print();
  }

  return (
    <div className="space-y-6 text-left">
      
      {/* Search Bar & Member Dropdown */}
      {isAdmin && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between print:hidden">
          <div className="relative w-full sm:w-96">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Name, Account ID, Phone, Citizenship, Father..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-700"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full sm:w-80 p-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-xs font-bold"
            >
              <option value="">-- Choose Member ({filteredProfiles.length} Available) --</option>
              {filteredProfiles.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.account_id || (p.user_type === 'NON_MEMBER' ? 'External' : 'Member')}) {p.committee_position ? `[${p.committee_position}]` : ''}
                </option>
              ))}
            </select>

            {selectedUser && (
              <button
                onClick={handlePrintProfile}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Printer size={14} /> Print Dossier
              </button>
            )}
          </div>
        </div>
      )}

      {/* Print Button for Self View */}
      {!isAdmin && selectedUser && (
        <div className="flex justify-end print:hidden">
          <button
            onClick={handlePrintProfile}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Printer size={14} /> Print Dossier
          </button>
        </div>
      )}

      {/* EMPTY STATE */}
      {!selectedUser && (
        <div className="p-12 bg-white rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-3 print:hidden">
          <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <UserSearch size={28} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">No Member Selected</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Please choose a member from the dropdown menu above or use search to view their complete 360° financial dossier and loan repayments.
            </p>
          </div>
        </div>
      )}

      {/* PRINTABLE DOSSIER CONTAINER */}
      {selectedUser && (
        <div className="space-y-6 print:p-0 print:m-0 print:max-w-none print:w-full">

          {/* Printable Group Header */}
          <div className="hidden print:block text-center border-b border-slate-300 pb-3 space-y-0.5 mb-4">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">EVERGREEN SAVINGS GROUP</h1>
            <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">Official 360° Member Financial Audit Dossier</p>
          </div>

          {/* Identity Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5 print:border-slate-300 print:shadow-none print:p-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 print:border-slate-300 pb-4">
              <div className="flex items-center gap-4">
                
                {/* Profile Photo */}
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-200 flex-shrink-0 flex items-center justify-center print:border-slate-300">
                  {photoUrl ? (
                    <img src={photoUrl} alt={selectedUser.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-blue-100 text-blue-900 flex items-center justify-center font-extrabold text-xl print:bg-slate-200 print:text-slate-800">
                      {selectedUser.full_name?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{selectedUser.full_name}</h3>
                    {selectedUser.committee_position && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold rounded-md uppercase flex items-center gap-1">
                        <Award size={12} /> {selectedUser.committee_position}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                      selectedUser.status === 'SETTLED' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {selectedUser.status || 'ACTIVE'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                    <span>Account ID: <strong className="text-blue-900">{selectedUser.account_id || 'N/A'}</strong></span>
                    <span>•</span>
                    <span>Type: <strong>{selectedUser.user_type || 'MEMBER'}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="text-right font-mono text-xs text-slate-500 space-y-0.5">
                  <div>Joined Date: <strong className="text-slate-800">{selectedUser.joined_date || 'N/A'}</strong></div>
                  {selectedUser.settled_at && (
                    <div className="text-red-700 font-bold">Settled Date: {selectedUser.settled_at}</div>
                  )}
                </div>

                {selectedUser.kyc_document_path && (
                  <button
                    onClick={handleViewDocument}
                    disabled={docLoading}
                    className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold rounded-lg text-xs flex items-center gap-1 border border-blue-200 transition-colors print:hidden"
                  >
                    <ExternalLink size={13} /> {docLoading ? 'Opening...' : 'View KYC Scan (PDF)'}
                  </button>
                )}
              </div>
            </div>

            {/* Demographics & Identity Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono p-4 bg-slate-50 rounded-xl border border-slate-200 print:bg-white print:border-slate-300">
              
              {/* Personal & Contact */}
              <div className="space-y-2 font-sans">
                <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1 print:border-slate-300">
                  <User size={13} className="text-blue-700 print:hidden" /> Personal & Contact
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div>
                    <span className="text-slate-500 block text-[9px] font-sans font-bold uppercase">Date of Birth</span>
                    <strong className="text-slate-900">{selectedUser.dob || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] font-sans font-bold uppercase">Gender</span>
                    <strong className="text-slate-900">{selectedUser.gender || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] font-sans font-bold uppercase">Marital Status</span>
                    <strong className="text-slate-900">{selectedUser.marital_status || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] font-sans font-bold uppercase">Occupation</span>
                    <strong className="text-slate-900 truncate block">{selectedUser.occupation || 'N/A'}</strong>
                  </div>
                  <div className="col-span-2 border-t border-slate-200/60 pt-1.5 print:border-slate-300">
                    <span className="text-slate-500 block text-[9px] font-sans font-bold uppercase">Phone & Email</span>
                    <strong className="text-slate-900 block truncate">{selectedUser.phone || 'N/A'}</strong>
                    <span className="text-slate-600 block text-[10px] truncate">{selectedUser.email || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Family Lineage */}
              <div className="space-y-2 font-sans">
                <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1 print:border-slate-300">
                  <Users size={13} className="text-purple-700 print:hidden" /> Family & Lineage Line
                </h4>
                <div className="space-y-2 text-[11px] font-mono">
                  <div>
                    <span className="text-slate-500 block text-[9px] font-sans font-bold uppercase">Father's Full Name</span>
                    <strong className="text-slate-900">{selectedUser.father_name || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] font-sans font-bold uppercase">Grandfather's Full Name</span>
                    <strong className="text-slate-900">{selectedUser.grandfather_name || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] font-sans font-bold uppercase">Spouse Name</span>
                    <strong className="text-slate-900">{selectedUser.spouse_name || 'N/A (Unmarried / Blank)'}</strong>
                  </div>
                </div>
              </div>

              {/* National Identity & Residence */}
              <div className="space-y-2 font-sans">
                <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1 print:border-slate-300">
                  <CreditCard size={13} className="text-emerald-700 print:hidden" /> National ID & Address
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div>
                    <span className="text-slate-500 block text-[9px] font-sans font-bold uppercase">Citizenship No.</span>
                    <strong className="text-slate-900">{selectedUser.citizenship_no || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] font-sans font-bold uppercase">National ID (NID)</span>
                    <strong className="text-slate-900">{selectedUser.nid_no || 'N/A'}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block text-[9px] font-sans font-bold uppercase">Citizenship Issue Details</span>
                    <strong className="text-slate-900">
                      {selectedUser.citizenship_issue_district || 'N/A'} ({selectedUser.citizenship_issue_date || 'N/A'})
                    </strong>
                  </div>
                  <div className="col-span-2 border-t border-slate-200/60 pt-1.5 print:border-slate-300">
                    <span className="text-slate-500 block text-[9px] font-sans font-bold uppercase">Permanent Residence</span>
                    <strong className="text-slate-900 block leading-tight">
                      {selectedUser.village_name || 'N/A'}, {selectedUser.municipality_vdc || 'N/A'} {selectedUser.ward_no ? `(Ward ${selectedUser.ward_no})` : ''}
                    </strong>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="p-3.5 bg-emerald-50 border-2 border-emerald-200 rounded-xl space-y-1 print:border-slate-300 print:bg-white">
              <div className="flex justify-between items-center text-emerald-800 text-[10px] font-bold uppercase">
                <span>Total Savings</span>
                <PiggyBank size={15} className="print:hidden" />
              </div>
              <div className="text-base font-black text-emerald-950 font-mono">
                NPR {totalSavingsDeposited.toLocaleString('en-IN')}
              </div>
              <p className="text-[10px] text-emerald-700 font-semibold">{userDeposits.length} Deposits</p>
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1 print:border-slate-300 print:bg-white">
              <div className="flex justify-between items-center text-amber-800 text-[10px] font-bold uppercase">
                <span>Active Loan Bal.</span>
                <Landmark size={15} className="print:hidden" />
              </div>
              <div className="text-base font-black text-amber-950 font-mono">
                NPR {overallLoanKpis.activeLoanBalance.toLocaleString('en-IN')}
              </div>
              <p className="text-[10px] text-amber-800 font-semibold">{groupedUserLoans.length} Loans Borrowed</p>
            </div>

            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-1 print:border-slate-300 print:bg-white">
              <div className="flex justify-between items-center text-blue-800 text-[10px] font-bold uppercase">
                <span>Principal Repaid</span>
                <Receipt size={15} className="print:hidden" />
              </div>
              <div className="text-base font-black text-blue-950 font-mono">
                NPR {overallLoanKpis.totalPrincipalPaid.toLocaleString('en-IN')}
              </div>
              <p className="text-[10px] text-blue-700 font-semibold">Total Recovered</p>
            </div>

            <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl space-y-1 print:border-slate-300 print:bg-white">
              <div className="flex justify-between items-center text-purple-800 text-[10px] font-bold uppercase">
                <span>Interest Paid</span>
                <TrendingUp size={15} className="print:hidden" />
              </div>
              <div className="text-base font-black text-purple-950 font-mono">
                NPR {overallLoanKpis.totalInterestPaid.toLocaleString('en-IN')}
              </div>
              <p className="text-[10px] text-purple-700 font-semibold">Pool Contribution</p>
            </div>

            <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-1 print:bg-white print:text-slate-900 print:border print:border-slate-300">
              <div className="flex justify-between items-center text-amber-400 print:text-slate-800 text-[10px] font-bold uppercase">
                <span>Dividends Earned</span>
                <ShieldCheck size={15} className="print:hidden" />
              </div>
              <div className="text-base font-black text-emerald-400 print:text-slate-900 font-mono">
                NPR {totalDividendsEarned.toLocaleString('en-IN')}
              </div>
              <p className="text-[10px] text-slate-400 print:text-slate-600 font-semibold">Profit Share Payouts</p>
            </div>
          </div>

          {/* SECTION 1: LOAN ACCOUNTS & REPAYMENTS */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-0 print:border-slate-300">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-900 text-xs uppercase flex items-center justify-between print:border-slate-300 print:bg-slate-100">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-blue-800 print:hidden" />
                <span>Borrowed Loan Accounts & Repayments ({groupedUserLoans.length} Loans)</span>
              </div>
              <span className="font-mono text-amber-900 font-extrabold">
                Active Balance: NPR {overallLoanKpis.activeLoanBalance.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="p-4 space-y-6">
              {groupedUserLoans.map((loan: any) => (
                <div key={loan.id} className="border border-slate-200 rounded-xl overflow-hidden print:border-slate-300">
                  
                  {/* Loan Header */}
                  <div className="p-3 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-blue-900 font-extrabold text-sm">{loan.loan_code || `LN-${loan.id}`}</strong>
                      <span className="text-slate-500">| Disbursed: {loan.issue_date}</span>
                      <span className="text-slate-500">| Rate: {loan.current_rate}% p.a.</span>
                      
                      {loan.application_doc_path && (
                        <button
                          onClick={() => handleViewLoanApplication(loan.application_doc_path)}
                          disabled={loanDocLoadingPath === loan.application_doc_path}
                          className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold rounded text-[10px] flex items-center gap-1 border border-blue-200 transition-colors print:hidden"
                        >
                          <FileText size={11} />
                          {loanDocLoadingPath === loan.application_doc_path ? 'Loading...' : 'Application PDF'}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div>Principal: <strong>NPR {Number(loan.principal_amount).toLocaleString('en-IN')}</strong></div>
                      <div>Balance: <strong className="text-amber-900">NPR {loan.remainingBalance.toLocaleString('en-IN')}</strong></div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-sans ${
                        loan.isPaidOff ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {loan.isPaidOff ? 'PAID OFF' : 'ACTIVE'}
                      </span>
                    </div>
                  </div>

                  {/* Repayments Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Payment ID</th>
                          <th className="p-2.5">Payment Date</th>
                          <th className="p-2.5 text-right">Principal Reduced</th>
                          <th className="p-2.5 text-right">Interest Paid</th>
                          <th className="p-2.5 text-right">Total Received</th>
                          <th className="p-2.5">Recorded By Admin</th>
                          <th className="p-2.5 text-right print:hidden">Slip</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(loan.loanPayments || []).map((p: any) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold text-blue-900">{p.payment_code || `PY-${p.id}`}</td>
                            <td className="p-2.5 text-slate-700 font-bold">{p.payment_date}</td>
                            <td className="p-2.5 text-right font-bold text-emerald-900">
                              NPR {Number(p.principal_paid || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="p-2.5 text-right font-bold text-purple-900">
                              NPR {Number(p.interest_paid || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="p-2.5 text-right font-black text-slate-900">
                              NPR {(Number(p.principal_paid || 0) + Number(p.interest_paid || 0)).toLocaleString('en-IN')}
                            </td>
                            <td className="p-2.5 text-slate-600 font-sans">{p.recorded_by_name || 'Admin'}</td>
                            <td className="p-2.5 text-right print:hidden">
                              <RepaymentReceiptModal receipt={{
                                ...p,
                                loan_code: loan.loan_code,
                                current_rate: loan.current_rate,
                                borrower_name: selectedUser.full_name,
                                borrower_account_id: selectedUser.account_id,
                                total_paid: Number(p.principal_paid || 0) + Number(p.interest_paid || 0),
                              }} />
                            </td>
                          </tr>
                        ))}
                        {(!loan.loanPayments || loan.loanPayments.length === 0) && (
                          <tr>
                            <td colSpan={7} className="p-4 text-center text-slate-400 font-sans text-xs">
                              No repayments recorded yet for this loan account.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>
              ))}

              {groupedUserLoans.length === 0 && (
                <div className="p-6 text-center text-slate-400 font-sans text-xs">
                  No loan accounts found for this member.
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: SAVINGS DEPOSIT LEDGER */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:border-slate-300">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-900 text-xs uppercase flex items-center justify-between print:bg-slate-100 print:border-slate-300">
              <div className="flex items-center gap-2">
                <PiggyBank size={16} className="text-emerald-700 print:hidden" />
                <span>Savings Deposit Ledger ({userDeposits.length} Months)</span>
              </div>
              <span className="font-mono text-emerald-900 font-extrabold">
                Total Savings: NPR {totalSavingsDeposited.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Deposit ID</th>
                    <th className="p-2.5">For Month</th>
                    <th className="p-2.5">Recorded Date</th>
                    <th className="p-2.5 text-right">Amount Paid</th>
                    <th className="p-2.5 text-right print:hidden">Slip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {userDeposits.map((d: any) => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-blue-900">{d.deposit_code || `DEP-${d.id}`}</td>
                      <td className="p-2.5 font-sans font-bold text-slate-800">{d.for_month?.slice(0, 7)}</td>
                      <td className="p-2.5 text-slate-500">{d.created_at ? new Date(d.created_at).toLocaleDateString('en-US') : 'N/A'}</td>
                      <td className="p-2.5 text-right font-bold text-emerald-900">NPR {Number(d.amount_paid).toLocaleString('en-IN')}</td>
                      
                      {/* USING YOUR DepositReceiptModal COMPONENT */}
                      <td className="p-2.5 text-right print:hidden">
                        <DepositReceiptModal
                          receipt={{
                            deposit_code: d.deposit_code || `DEP-${d.id}`,
                            for_month: d.for_month,
                            amount_paid: Number(d.amount_paid),
                            created_at: d.created_at,
                            member_name: selectedUser.full_name,
                            member_account_id: selectedUser.account_id,
                            recorded_by_name: d.recorded_by_name,
                            recorded_by_designation: d.recorded_by_designation,
                          }}
                          triggerLabel="Slip"
                        />
                      </td>
                    </tr>
                  ))}
                  {userDeposits.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400 font-sans text-xs">
                        No savings deposits recorded for this account.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 3: GUARANTOR RESPONSIBILITIES */}
          {guaranteedLoans.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:border-slate-300">
              <div className="p-4 bg-amber-50/80 border-b border-amber-200 font-bold text-amber-900 text-xs uppercase flex items-center justify-between print:bg-slate-100 print:border-slate-300">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-amber-700 print:hidden" />
                  <span>Guarantor Liabilities for Others ({guaranteedLoans.length} Loans)</span>
                </div>
                <span className="font-mono font-extrabold">Risk Exposure: NPR {totalGuaranteedExposure.toLocaleString('en-IN')}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Loan Code</th>
                      <th className="p-2.5">Backed Borrower</th>
                      <th className="p-2.5">Issue Date</th>
                      <th className="p-2.5 text-right">Principal</th>
                      <th className="p-2.5 text-right">Outstanding Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {guaranteedLoans.map((loan: any) => (
                      <tr key={loan.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-blue-900">{loan.loan_code}</td>
                        <td className="p-2.5 font-sans font-bold text-slate-900">
                          {loan.borrower_name} <span className="text-slate-400 font-mono">({loan.borrower_account_id})</span>
                        </td>
                        <td className="p-2.5 text-slate-600">{loan.issue_date}</td>
                        <td className="p-2.5 text-right font-bold">NPR {Number(loan.principal_amount).toLocaleString('en-IN')}</td>
                        <td className="p-2.5 text-right font-black text-amber-900">NPR {loan.remainingBalance.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION 4: DIVIDEND PAYOUT HISTORY */}
          {userDividends.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:border-slate-300">
              <div className="p-4 bg-purple-50 border-b border-purple-200 font-bold text-purple-900 text-xs uppercase flex items-center justify-between print:bg-slate-100 print:border-slate-300">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-purple-700 print:hidden" />
                  <span>Dividend & Profit Share Ledger ({userDividends.length} Payouts)</span>
                </div>
                <span className="font-mono font-extrabold">Total Earned: NPR {totalDividendsEarned.toLocaleString('en-IN')}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-100 text-slate-500 uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Distribution Code</th>
                      <th className="p-2.5">Fiscal Year / Title</th>
                      <th className="p-2.5">Date Distributed</th>
                      <th className="p-2.5 text-right">Savings Snapshot</th>
                      <th className="p-2.5 text-right">Dividend Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {userDividends.map((div: any) => (
                      <tr key={div.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-purple-900">{div.distribution_code}</td>
                        <td className="p-2.5 font-sans font-bold text-slate-800">{div.title}</td>
                        <td className="p-2.5 text-slate-600">{div.distributed_at}</td>
                        <td className="p-2.5 text-right font-bold text-slate-700">NPR {Number(div.member_savings_snapshot).toLocaleString('en-IN')}</td>
                        <td className="p-2.5 text-right font-black text-emerald-900">NPR {Number(div.dividend_amount).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PRINT AUDIT SIGNATURE FOOTER */}
          <div className="pt-8 border-t-2 border-slate-900 mt-8 grid grid-cols-2 gap-8 text-xs text-slate-800 font-mono">
            <div className="space-y-1">
              <div className="font-sans font-bold text-slate-900 uppercase">Document Audit Trail:</div>
              <div>Printed / Verified By: <strong className="text-blue-950 font-black">{currentAdminName}</strong></div>
              <div>Print Date & Time: <strong>{getKathmanduPrintTimestamp()}</strong> (Kathmandu Time)</div>
              <p className="text-[10px] text-slate-500 font-sans mt-2">
                This official 360° audit dossier is compiled directly from verified group treasury records.
              </p>
            </div>

            <div className="text-center flex flex-col justify-end items-center">
              <div className="border-b border-slate-400 w-56 mb-1 h-10"></div>
              <span className="font-bold font-sans text-slate-900 uppercase text-[11px]">Authorized Committee Seal & Signature</span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}