'use client';

import { useState, useRef, useEffect } from 'react';
import { registerUserByAdmin, getNextAccountId, getNextExternalAccountId } from '@/app/actions';
import { UserPlus, MapPin, IdCard, Lock, Shield, Check, X, Camera, FileUp, FileText, Eye, Heart, Users, Briefcase } from 'lucide-react';

// Helper: Calculate Age from Date of Birth String
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

export default function RegisterMemberForm({ nextAccountId }: { nextAccountId: string }) {
  const [userType, setUserType] = useState('MEMBER');
  const [assignedId, setAssignedId] = useState(nextAccountId);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState('');
  const [status, setStatus] = useState<{ error?: string; success?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const age = calculateAge(dob);

  // Update preview ID badge dynamically
  useEffect(() => {
    async function updateIdPreview() {
      if (userType === 'MEMBER') {
        const id = await getNextAccountId();
        setAssignedId(id);
      } else {
        const id = await getNextExternalAccountId();
        setAssignedId(id);
      }
    }
    updateIdPreview();
  }, [userType]);

  // File Upload & Preview States
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [kycError, setKycError] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [kycPreview, setKycPreview] = useState<{ name: string; size: string; url: string } | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const kycInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      if (kycPreview?.url) URL.revokeObjectURL(kycPreview.url);
    };
  }, [photoPreview, kycPreview]);

  const passwordCriteria = {
    length: password.length >= 8,
    capital: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  const isPasswordValid =
    passwordCriteria.length &&
    passwordCriteria.capital &&
    passwordCriteria.number &&
    passwordCriteria.special;

  function removePhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    setPhotoError(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
  }

  function removeKyc() {
    if (kycPreview?.url) URL.revokeObjectURL(kycPreview.url);
    setKycPreview(null);
    setKycError(null);
    if (kycInputRef.current) kycInputRef.current.value = '';
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPhotoError(null);
    const file = e.target.files?.[0];

    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        setPhotoError('Photo file size must be less than 1 MB.');
        removePhoto();
        return;
      }
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        setPhotoError('Photo must be in JPG or PNG format.');
        removePhoto();
        return;
      }

      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhotoPreview(URL.createObjectURL(file));
    }
  }

  function handleKycChange(e: React.ChangeEvent<HTMLInputElement>) {
    setKycError(null);
    const file = e.target.files?.[0];

    if (file) {
      if (file.type !== 'application/pdf') {
        setKycError('KYC document must be uploaded in PDF format.');
        removeKyc();
        return;
      }
      if (file.size > 1 * 1024 * 1024) {
        setKycError('KYC document size must be less than 1 MB.');
        removeKyc();
        return;
      }

      const formattedSize =
        file.size < 1024 * 1024
          ? `${(file.size / 1024).toFixed(1)} KB`
          : `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

      if (kycPreview?.url) URL.revokeObjectURL(kycPreview.url);
      setKycPreview({
        name: file.name,
        size: formattedSize,
        url: URL.createObjectURL(file),
      });
    }
  }

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);

    const formData = new FormData(e.currentTarget);

    if (phone && phone.length !== 10) {
      setStatus({ error: 'Nepali phone number must be exactly 10 digits.' });
      return;
    }

    const fullPhone = phone ? `+977${phone}` : '';
    formData.set('phone', fullPhone);

    if (userType === 'MEMBER' && !isPasswordValid) {
      setStatus({
        error: 'Password must be at least 8 characters long and contain 1 uppercase letter, 1 number, and 1 special character.',
      });
      return;
    }

    setLoading(true);
    const res = await registerUserByAdmin(formData);
    setLoading(false);

    if (res?.error) {
      setStatus({ error: res.error });
    } else if (res?.success) {
      setStatus({ success: res.success });
      formRef.current?.reset();
      setPhone('');
      setPassword('');
      setDob('');
      removePhoto();
      removeKyc();
    }
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 text-left">
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2 font-bold text-slate-900 text-base">
          <UserPlus size={20} className="text-emerald-700" />
          <h3>Register New Account / Borrower</h3>
        </div>
        <div className="bg-emerald-100 border border-emerald-300 text-emerald-950 font-mono text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
          <span>Assigned ID:</span>
          <span className="text-emerald-800 underline">{assignedId}</span>
        </div>
      </div>

      {status?.error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg">
          {status.error}
        </div>
      )}

      {status?.success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg">
          {status.success}
        </div>
      )}

      <form ref={formRef} onSubmit={handleFormSubmit} className="space-y-4">
        {/* Classification */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Registration Type *</label>
            <select
              name="user_type"
              value={userType}
              onChange={(e) => setUserType(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white font-bold text-slate-900"
            >
              <option value="MEMBER">Group Member (Savings & Portal)</option>
              <option value="NON_MEMBER">External Non-Member Borrower</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Joined Date *</label>
            <input
              name="joined_date"
              required
              type="date"
              defaultValue={new Date().toISOString().split('T')[0]}
              className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900"
            />
          </div>
        </div>

        {/* Basic Personal & Contact Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
            <input
              name="full_name"
              required
              placeholder="e.g. Ram Bahadur Shrestha"
              className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number (Nepal +977) *</label>
            <div className="flex rounded-lg border border-slate-300 overflow-hidden bg-white">
              <span className="bg-slate-100 text-slate-600 px-3 py-2 text-xs font-bold border-r border-slate-300 flex items-center">
                +977
              </span>
              <input
                type="text"
                required
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="9800000000"
                className="w-full p-2 text-sm text-slate-900 focus:outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Demographic & Family Details Section */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Heart size={15} className="text-rose-600" />
            <span>Demographics & Lineage Details *</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Date of Birth *</span>
                {age !== null && (
                  <span className="text-emerald-800 font-bold font-mono text-[10px]">
                    Age: {age} yrs
                  </span>
                )}
              </label>
              <input
                name="dob"
                required
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded text-sm bg-white text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Gender *</label>
              <select
                name="gender"
                required
                defaultValue="MALE"
                className="w-full p-2 border border-slate-300 rounded text-sm bg-white font-bold text-slate-900"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Marital Status *</label>
              <select
                name="marital_status"
                required
                defaultValue="SINGLE"
                className="w-full p-2 border border-slate-300 rounded text-sm bg-white font-bold text-slate-900"
              >
                <option value="SINGLE">Single</option>
                <option value="MARRIED">Married</option>
                <option value="DIVORCED">Divorced</option>
                <option value="WIDOWED">Widowed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Father's Name *</label>
              <input
                name="father_name"
                required
                placeholder="e.g. Hari Bahadur Shrestha"
                className="w-full p-2 border border-slate-300 rounded text-sm bg-white text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Grandfather's Name *</label>
              <input
                name="grandfather_name"
                required
                placeholder="e.g. Krishna Bahadur Shrestha"
                className="w-full p-2 border border-slate-300 rounded text-sm bg-white text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Spouse's Name (If Married)</label>
              <input
                name="spouse_name"
                placeholder="e.g. Sita Shrestha"
                className="w-full p-2 border border-slate-300 rounded text-sm bg-white text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Briefcase size={13} className="text-slate-500" /> Occupation / Profession *
            </label>
            <input
              name="occupation"
              required
              placeholder="e.g. Agriculture / Business / Private Service"
              className="w-full p-2 border border-slate-300 rounded text-sm bg-white text-slate-900"
            />
          </div>
        </div>

        {/* Mandatory National Identification Details */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <IdCard size={15} className="text-blue-700" />
            <span>National Identification Details *</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Citizenship Number *</label>
              <input
                name="citizenship_no"
                required
                placeholder="12-01-75-00123"
                className="w-full p-2 border border-slate-300 rounded text-sm bg-white text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">National ID (NID) Number *</label>
              <input
                name="nid_no"
                required
                placeholder="123-456-7890"
                className="w-full p-2 border border-slate-300 rounded text-sm bg-white text-slate-900 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Citizenship Issue Date *</label>
              <input
                name="citizenship_issue_date"
                required
                type="date"
                className="w-full p-2 border border-slate-300 rounded text-sm bg-white text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Issue District *</label>
              <input
                name="citizenship_issue_district"
                required
                placeholder="e.g. Parsa / Chitwan"
                className="w-full p-2 border border-slate-300 rounded text-sm bg-white text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Mandatory Address Details */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <MapPin size={15} className="text-emerald-700" />
            <span>Address Details *</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Municipality / VDC *</label>
              <input
                name="municipality_vdc"
                required
                placeholder="Birgunj Metro"
                className="w-full p-2 border border-slate-300 rounded text-sm bg-white text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ward No. *</label>
              <input
                name="ward_no"
                required
                type="number"
                min="1"
                placeholder="5"
                className="w-full p-2 border border-slate-300 rounded text-sm bg-white text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Village / Tole Name *</label>
              <input
                name="village_name"
                required
                placeholder="Adarshnagar"
                className="w-full p-2 border border-slate-300 rounded text-sm bg-white text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Media Attachments */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Camera size={15} className="text-purple-700" />
            <span>Photo & Identification Document Uploads *</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Member Passport Photo * <span className="text-slate-500 font-normal">(JPG or PNG, Max 1 MB)</span>
              </label>
              <input
                ref={photoInputRef}
                name="photo"
                required
                type="file"
                accept="image/jpeg,image/png"
                onChange={handlePhotoChange}
                className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-purple-100 file:text-purple-800 hover:file:bg-purple-200 border border-slate-300 rounded-lg p-1 bg-white"
              />
              {photoError && <p className="text-[11px] font-bold text-red-600 mt-1">{photoError}</p>}

              {photoPreview && (
                <div className="relative inline-block mt-2">
                  <div className="p-1 bg-white border-2 border-purple-300 rounded-xl shadow-sm flex items-center gap-3 pr-4">
                    <img
                      src={photoPreview}
                      alt="Passport Photo Preview"
                      className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                    />
                    <div className="text-left">
                      <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-900 text-[10px] font-bold rounded-md">
                        Photo Ready
                      </span>
                      <p className="text-[11px] text-slate-500 font-medium mt-1">Passport Portrait Preview</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute -top-2 -right-2 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md transition-colors"
                    title="Remove Photo"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1">
                <FileUp size={13} className="text-blue-700" />
                KYC Document Scan * <span className="text-slate-500 font-normal">(PDF Format, Max 1 MB)</span>
              </label>
              <input
                ref={kycInputRef}
                name="kyc_document"
                required
                type="file"
                accept="application/pdf"
                onChange={handleKycChange}
                className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-100 file:text-blue-800 hover:file:bg-blue-200 border border-slate-300 rounded-lg p-1 bg-white"
              />
              {kycError && <p className="text-[11px] font-bold text-red-600 mt-1">{kycError}</p>}

              {kycPreview && (
                <div className="relative inline-block mt-2 w-full">
                  <div className="p-3 bg-blue-50 border-2 border-blue-300 rounded-xl shadow-sm flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="p-2 bg-red-100 text-red-700 rounded-lg flex-shrink-0">
                        <FileText size={20} />
                      </div>
                      <div className="text-left overflow-hidden">
                        <p className="text-xs font-bold text-slate-900 truncate max-w-[180px]">
                          {kycPreview.name}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">{kycPreview.size}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a
                        href={kycPreview.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-blue-800 hover:bg-blue-700 text-white rounded-md text-[11px] font-bold flex items-center gap-1 transition-colors"
                      >
                        <Eye size={12} /> View PDF
                      </a>
                      <button
                        type="button"
                        onClick={removeKyc}
                        className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                        title="Remove Document"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Credentials */}
        {userType === 'MEMBER' && (
          <div className="p-3.5 bg-emerald-50 rounded-lg border border-emerald-200 space-y-3">
            <div className="text-xs font-bold text-emerald-950 flex items-center gap-1">
              <Lock size={14} /> Portal Credentials
            </div>

            <input type="hidden" name="role" value="MEMBER" />

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Personal Email *</label>
              <input
                name="email"
                type="email"
                required
                placeholder="e.g. member@gmail.com"
                className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password *</label>
                <input
                  name="password"
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900"
                />

                <div className="mt-2 text-[11px] space-y-1 font-sans">
                  <div className={`flex items-center gap-1 ${passwordCriteria.length ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                    {passwordCriteria.length ? <Check size={12} /> : <X size={12} />} Minimum 8 characters
                  </div>
                  <div className={`flex items-center gap-1 ${passwordCriteria.capital ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                    {passwordCriteria.capital ? <Check size={12} /> : <X size={12} />} At least 1 Capital Letter (A-Z)
                  </div>
                  <div className={`flex items-center gap-1 ${passwordCriteria.number ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                    {passwordCriteria.number ? <Check size={12} /> : <X size={12} />} At least 1 Number (0-9)
                  </div>
                  <div className={`flex items-center gap-1 ${passwordCriteria.special ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                    {passwordCriteria.special ? <Check size={12} /> : <X size={12} />} At least 1 Special Character (!@#$...)
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Portal Access Level</label>
                <div className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-slate-100 font-semibold text-slate-700 flex items-center gap-1.5 cursor-not-allowed">
                  <Shield size={14} className="text-emerald-700" />
                  <span>General Member (View Only)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          disabled={loading || Boolean(photoError) || Boolean(kycError)}
          type="submit"
          className="w-full bg-emerald-900 hover:bg-emerald-800 disabled:bg-slate-400 text-white font-bold text-sm py-2.5 rounded-lg transition-colors"
        >
          {loading ? 'Processing Registration...' : 'Register Account'}
        </button>
      </form>
    </div>
  );
}