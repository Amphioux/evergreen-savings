'use client';

import { useState, useEffect } from 'react';
import { updateUserProfile, settleAndDeactivateMember, getKycSignedUrl, getPhotoSignedUrl } from '@/app/actions';
import { Eye, Edit3, UserX, X, MapPin, IdCard, CheckCircle2, User, FileText, Download, Camera, FileUp, Tag, Heart, Lock } from 'lucide-react';

function calculateAge(dobString: string): number | null {
  if (!dobString) return null;
  const birthDate = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

export default function MemberDetailModal({
  member,
  financials,
  isAdmin,
  isSuperAdmin = true,
}: {
  member: any;
  financials: { totalDeposits: number; activeLoanBalance: number; totalLoansTaken: number };
  isAdmin: boolean;
  isSuperAdmin?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'VIEW' | 'EDIT' | 'SETTLE'>('VIEW');
  const [exitCharge, setExitCharge] = useState('500');
  const [waiveExit, setWaiveExit] = useState(false);
  const [status, setStatus] = useState<{ error?: string; success?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [kycLoading, setKycLoading] = useState(false);

  const calculatedAge = calculateAge(member.dob);
  const appliedExitCharge = waiveExit ? 0 : Number(exitCharge) || 0;
  const netRefund = Math.max(0, financials.totalDeposits - appliedExitCharge);
  const memberTypeRoleLabel = member.user_type === 'NON_MEMBER' ? 'External Member' : 'Internal Member';

  useEffect(() => {
    if (isOpen && member?.photo_path) {
      getPhotoSignedUrl(member.photo_path).then((url) => {
        if (url) setPhotoUrl(url);
      });
    }
  }, [isOpen, member?.photo_path]);

  async function handleViewKyc() {
    if (!isAdmin || !member?.kyc_document_path) return;
    setKycLoading(true);
    const signedUrl = await getKycSignedUrl(member.kyc_document_path);
    setKycLoading(false);
    if (signedUrl) {
      window.open(signedUrl, '_blank');
    } else {
      alert('Unable to generate secure document URL.');
    }
  }

  async function handleUpdateProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isAdmin) return;
    setStatus(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.append('user_id', member.id);

    const res = await updateUserProfile(formData);
    setLoading(false);

    if (res?.error) setStatus({ error: res.error });
    if (res?.success) {
      setStatus({ success: res.success });
      setActiveTab('VIEW');
    }
  }

  async function handleSettleAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isAdmin) return;
    setStatus(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.append('user_id', member.id);
    formData.append('waive_exit_charge', String(waiveExit));

    const res = await settleAndDeactivateMember(formData);
    setLoading(false);

    if (res?.error) setStatus({ error: res.error });
    if (res?.success) {
      setStatus({ success: res.success });
      setTimeout(() => setIsOpen(false), 1500);
    }
  }

  const memberStatus = member.status || 'ACTIVE';

  return (
    <>
      <button
        onClick={() => { setIsOpen(true); setActiveTab('VIEW'); setStatus(null); }}
        className="px-2.5 py-1 text-xs font-bold bg-slate-100 text-slate-800 hover:bg-slate-200 rounded flex items-center gap-1 ml-auto transition-colors"
      >
        <Eye size={13} /> View
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 text-left">
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-slate-700 bg-slate-800 flex items-center justify-center flex-shrink-0">
                  {photoUrl ? (
                    <img src={photoUrl} alt={member.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <User size={24} className="text-slate-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base">{member.full_name}</h3>
                    <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                      memberStatus === 'SETTLED' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                      memberStatus === 'INACTIVE' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {memberStatus}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300 font-mono mt-0.5">
                    <span>Account ID: {isAdmin ? (member.account_id || 'N/A') : '••••••••'}</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-sans font-bold">{memberTypeRoleLabel}</span>
                  </div>
                </div>
              </div>

              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white p-1 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Sub Tabs */}
            <div className="flex border-b bg-slate-50 text-xs font-bold">
              <button
                onClick={() => setActiveTab('VIEW')}
                className={`px-4 py-3 border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'VIEW' ? 'border-emerald-700 text-emerald-900 bg-white font-extrabold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Eye size={14} /> Profile Overview
              </button>
              {isAdmin && (
                <button
                  onClick={() => setActiveTab('EDIT')}
                  className={`px-4 py-3 border-b-2 flex items-center gap-1.5 ${
                    activeTab === 'EDIT' ? 'border-blue-700 text-blue-900 bg-white font-extrabold' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Edit3 size={14} /> Edit Profile
                </button>
              )}
              {isAdmin && memberStatus !== 'SETTLED' && (
                <button
                  onClick={() => setActiveTab('SETTLE')}
                  className={`px-4 py-3 border-b-2 flex items-center gap-1.5 ${
                    activeTab === 'SETTLE' ? 'border-red-700 text-red-900 bg-white font-extrabold' : 'text-slate-500 hover:text-red-900'
                  }`}
                >
                  <UserX size={14} /> Account Settlement
                </button>
              )}
            </div>

            {/* Feedback Messages */}
            <div className="p-5 space-y-4">
              {status?.error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg">
                  {status.error}
                </div>
              )}
              {status?.success && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2">
                  <CheckCircle2 size={16} /> {status.success}
                </div>
              )}

              {/* TAB 1: OVERVIEW */}
              {activeTab === 'VIEW' && (
                <div className="space-y-4 text-xs">
                  
                  {/* Financial Overview (Totals only) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-stretch">
                    <div className="p-3.5 bg-emerald-50/90 border-2 border-emerald-300 rounded-xl shadow-xs flex flex-col justify-center">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                        Accumulated Savings
                      </span>
                      <div className="text-xl font-black text-emerald-950 font-mono mt-0.5">
                        NPR {financials.totalDeposits.toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-col justify-center">
                      <span className="text-[10px] font-bold uppercase text-amber-800">
                        Active Loan Balance
                      </span>
                      <div className="text-base font-extrabold text-amber-950 font-mono mt-0.5">
                        NPR {financials.activeLoanBalance.toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex flex-col justify-center">
                      <span className="text-[10px] font-bold uppercase text-blue-800">
                        Lifetime Loans
                      </span>
                      <div className="text-base font-extrabold text-blue-950 font-mono mt-0.5">
                        {financials.totalLoansTaken} Loans
                      </div>
                    </div>
                  </div>

                  {/* Public Classification Banner */}
                  <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag size={16} className="text-emerald-700" />
                      <span className="font-semibold text-slate-700">Classification:</span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-md font-bold text-xs ${
                      member.user_type === 'NON_MEMBER' 
                        ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    }`}>
                      {memberTypeRoleLabel}
                    </span>
                  </div>

                  {/* Public Profile Fields */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 flex items-center gap-1 text-xs">
                      <User size={14} className="text-blue-700" /> Public Details
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div><span className="text-slate-400 block text-[10px]">Full Name</span> <strong className="text-slate-900">{member.full_name}</strong></div>
                      <div><span className="text-slate-400 block text-[10px]">Committee Designation</span> <strong className="text-slate-900">{member.committee_position || 'General Member'}</strong></div>
                      <div><span className="text-slate-400 block text-[10px]">Joined Date</span> <strong className="text-slate-900 font-mono">{member.joined_date || 'N/A'}</strong></div>
                    </div>
                  </div>

                  {/* RESTRICTED / SENSITIVE DATA SECTION (ADMIN ONLY) */}
                  {isAdmin ? (
                    <>
                      {/* Demographics & Lineage Info */}
                      <div className="space-y-2">
                        <h4 className="font-bold text-slate-800 flex items-center gap-1 text-xs">
                          <Heart size={14} className="text-rose-600" /> Demographics & Lineage (Restricted)
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono">
                          <div>
                            <span className="text-slate-400 block text-[10px] font-sans">Date of Birth</span>
                            <strong className="text-slate-900">
                              {member.dob ? `${member.dob} ${calculatedAge !== null ? `(${calculatedAge} yrs)` : ''}` : 'N/A'}
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-sans">Gender</span>
                            <strong className="text-slate-900 capitalize font-sans">{member.gender?.toLowerCase() || 'N/A'}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-sans">Marital Status</span>
                            <strong className="text-slate-900 capitalize font-sans">{member.marital_status?.toLowerCase() || 'N/A'}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-sans">Occupation</span>
                            <strong className="text-slate-900 font-sans">{member.occupation || 'N/A'}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-sans">Father's Name</span>
                            <strong className="text-slate-900 font-sans">{member.father_name || 'N/A'}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-sans">Grandfather's Name</span>
                            <strong className="text-slate-900 font-sans">{member.grandfather_name || 'N/A'}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-sans">Spouse's Name</span>
                            <strong className="text-slate-900 font-sans">{member.spouse_name || 'N/A'}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-sans">Phone Number</span>
                            <strong className="text-slate-900">{member.phone || 'N/A'}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Identity Details */}
                      <div className="space-y-2">
                        <h4 className="font-bold text-slate-800 flex items-center gap-1 text-xs">
                          <IdCard size={14} className="text-purple-700" /> Legal Identification (Restricted)
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono">
                          <div><span className="text-slate-400 block text-[10px] font-sans">Citizenship No.</span> <strong className="text-slate-900">{member.citizenship_no || 'N/A'}</strong></div>
                          <div><span className="text-slate-400 block text-[10px] font-sans">National ID (NID)</span> <strong className="text-slate-900">{member.nid_no || member.national_id || 'N/A'}</strong></div>
                          <div><span className="text-slate-400 block text-[10px] font-sans">Issue Date</span> <strong className="text-slate-900">{member.citizenship_issue_date || 'N/A'}</strong></div>
                          <div><span className="text-slate-400 block text-[10px] font-sans">Issue District</span> <strong className="text-slate-900 font-sans">{member.citizenship_issue_district || 'N/A'}</strong></div>
                        </div>
                      </div>

                      {/* Address Details */}
                      <div className="space-y-2">
                        <h4 className="font-bold text-slate-800 flex items-center gap-1 text-xs">
                          <MapPin size={14} className="text-emerald-700" /> Address Details (Restricted)
                        </h4>
                        <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <div><span className="text-slate-400 block text-[10px]">Municipality / VDC</span> <strong className="text-slate-900">{member.municipality_vdc || member.municipality || 'N/A'}</strong></div>
                          <div><span className="text-slate-400 block text-[10px]">Ward Number</span> <strong className="text-slate-900 font-mono">{member.ward_no || 'N/A'}</strong></div>
                          <div><span className="text-slate-400 block text-[10px]">Village / Tole Name</span> <strong className="text-slate-900">{member.village_name || member.tole_name || 'N/A'}</strong></div>
                        </div>
                      </div>

                      {/* KYC Verification Card */}
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText size={18} className="text-blue-700" />
                          <div>
                            <h5 className="font-bold text-blue-950">KYC Verification Scan</h5>
                            <p className="text-[10px] text-blue-700">Official Citizenship / NID PDF Document</p>
                          </div>
                        </div>

                        {member.kyc_document_path ? (
                          <button
                            onClick={handleViewKyc}
                            disabled={kycLoading}
                            className="px-3 py-1.5 bg-blue-800 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors"
                          >
                            <Download size={13} /> {kycLoading ? 'Generating Link...' : 'View PDF'}
                          </button>
                        ) : (
                          <span className="text-slate-400 font-bold text-[11px]">No PDF Uploaded</span>
                        )}
                      </div>
                    </>
                  ) : (
                    /* Notice for Regular Non-Admin Members */
                    <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-2 text-slate-600 text-xs">
                      <Lock size={14} className="text-slate-400 flex-shrink-0" />
                      <span>Contact details, national ID records, addresses, and document scans are restricted to Committee Admins for member privacy.</span>
                    </div>
                  )}

                </div>
              )}

              {/* TAB 2: EDIT PROFILE (ADMIN ONLY) */}
              {activeTab === 'EDIT' && isAdmin && (
                <form onSubmit={handleUpdateProfile} className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                      <input name="full_name" required defaultValue={member.full_name} className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900" />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                      <input name="phone" defaultValue={member.phone || ''} className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-mono" />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                      <input name="email" type="email" defaultValue={member.email || ''} className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900" />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Heart size={14} className="text-rose-600" /> Demographics & Lineage
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Date of Birth</label>
                        <input name="dob" type="date" defaultValue={member.dob || ''} className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900 font-mono" />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Gender</label>
                        <select name="gender" defaultValue={member.gender || 'MALE'} className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900 font-bold">
                          <option value="MALE">Male</option>
                          <option value="FEMALE">Female</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Marital Status</label>
                        <select name="marital_status" defaultValue={member.marital_status || 'SINGLE'} className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900 font-bold">
                          <option value="SINGLE">Single</option>
                          <option value="MARRIED">Married</option>
                          <option value="DIVORCED">Divorced</option>
                          <option value="WIDOWED">Widowed</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Father's Name</label>
                        <input name="father_name" defaultValue={member.father_name || ''} className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900" />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Grandfather's Name</label>
                        <input name="grandfather_name" defaultValue={member.grandfather_name || ''} className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900" />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Spouse's Name</label>
                        <input name="spouse_name" defaultValue={member.spouse_name || ''} className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900" />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Occupation</label>
                      <input name="occupation" defaultValue={member.occupation || ''} className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Joined Date</label>
                      <input name="joined_date" type="date" defaultValue={member.joined_date} className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900" />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Committee Position</label>
                      <input name="committee_position" defaultValue={member.committee_position || ''} placeholder="e.g. TREASURER" className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900" />
                    </div>
                    {isSuperAdmin && (
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Portal Role</label>
                        <select name="role" defaultValue={member.role || 'MEMBER'} className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold text-slate-900">
                          <option value="MEMBER">General Member</option>
                          <option value="ADMIN">Committee Admin</option>
                          <option value="SUPER_ADMIN">Superadmin</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <MapPin size={14} className="text-emerald-700" /> Address Details
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Municipality / VDC</label>
                        <input name="municipality_vdc" defaultValue={member.municipality_vdc || member.municipality || ''} className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900" />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Ward No.</label>
                        <input name="ward_no" type="number" defaultValue={member.ward_no || ''} className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900 font-mono" />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Village / Tole Name</label>
                        <input name="village_name" defaultValue={member.village_name || member.tole_name || ''} className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900" />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <IdCard size={14} className="text-purple-700" /> National Identification Details
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Citizenship Number</label>
                        <input name="citizenship_no" defaultValue={member.citizenship_no || ''} className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900 font-mono" />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">National ID (NID)</label>
                        <input name="nid_no" defaultValue={member.nid_no || member.national_id || ''} className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900 font-mono" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Issue Date</label>
                        <input name="citizenship_issue_date" type="date" defaultValue={member.citizenship_issue_date || ''} className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900" />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Issue District</label>
                        <input name="citizenship_issue_district" defaultValue={member.citizenship_issue_district || ''} className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900" />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="font-bold text-slate-800">Replace Uploaded Documents (Optional)</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                          <Camera size={13} /> Replace Passport Photo
                        </label>
                        <input name="photo" type="file" accept="image/jpeg,image/png" className="w-full text-xs text-slate-600 border border-slate-300 rounded p-1 bg-white" />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                          <FileUp size={13} /> Replace KYC PDF Document
                        </label>
                        <input name="kyc_document" type="file" accept="application/pdf" className="w-full text-xs text-slate-600 border border-slate-300 rounded p-1 bg-white" />
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={loading}
                    type="submit"
                    className="w-full bg-blue-900 hover:bg-blue-800 disabled:bg-slate-400 text-white font-bold py-2.5 rounded-lg transition-colors"
                  >
                    {loading ? 'Saving Changes...' : 'Update Member Details'}
                  </button>
                </form>
              )}

              {/* TAB 3: ACCOUNT SETTLEMENT (ADMIN ONLY) */}
              {activeTab === 'SETTLE' && isAdmin && (
                <form onSubmit={handleSettleAccount} className="space-y-4 text-xs">
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-2">
                    <div className="font-bold text-red-950 flex items-center gap-1">
                      <UserX size={16} /> Final Account Settlement & Exit
                    </div>
                    <p className="text-[11px] text-red-800">
                      Settled accounts are archived and prevented from logging into the portal.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3 font-mono">
                    <div className="flex justify-between items-center text-slate-700">
                      <span>Total Accumulated Savings:</span>
                      <strong className="text-emerald-800 font-bold">NPR {financials.totalDeposits.toLocaleString('en-IN')}</strong>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t font-sans">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Exit Charge (NPR)</label>
                        <input
                          type="number"
                          name="exit_charge"
                          disabled={waiveExit}
                          value={exitCharge}
                          onChange={(e) => setExitCharge(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900 font-mono font-bold disabled:bg-slate-100"
                        />
                      </div>
                      <div className="flex items-center pt-5">
                        <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-bold text-xs">
                          <input
                            type="checkbox"
                            checked={waiveExit}
                            onChange={(e) => setWaiveExit(e.target.checked)}
                            className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-700"
                          />
                          <span>Waive / Relieve Exit Charge</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-sm pt-3 border-t font-sans">
                      <span className="font-bold text-slate-900">Net Savings Refund Payable:</span>
                      <strong className="text-emerald-900 font-extrabold text-base font-mono">
                        NPR {netRefund.toLocaleString('en-IN')}
                      </strong>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Settlement Date *</label>
                    <input
                      name="settled_at"
                      required
                      type="date"
                      defaultValue={new Date().toISOString().split('T')[0]}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Settlement Notes & Audit Reasons</label>
                    <textarea
                      name="notes"
                      rows={2}
                      placeholder="e.g. Full financial payout handed over. Relieved exit charge per committee decision."
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900"
                    />
                  </div>

                  <button
                    disabled={loading}
                    type="submit"
                    className="w-full bg-red-800 hover:bg-red-700 disabled:bg-slate-400 text-white font-bold py-2.5 rounded-lg transition-colors"
                  >
                    {loading ? 'Processing Settlement...' : 'Finalize Settlement & Close Account'}
                  </button>
                </form>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
}