'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { logoutUser } from '@/app/actions';
import { User, KeyRound, LogOut, ShieldCheck, ChevronDown } from 'lucide-react';

interface UserProfileDropdownProps {
  userProfile: {
    id?: string;
    full_name?: string;
    account_id?: string;
    email?: string;
    committee_position?: string;
    role?: string;
    photo_url?: string | null;
  } | null;
  isAdmin: boolean;
}

export default function UserProfileDropdown({ userProfile, isAdmin }: UserProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = userProfile?.full_name
    ? userProfile.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <div
      className="relative"
      ref={dropdownRef}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Profile Avatar Circle Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 p-1 rounded-full hover:bg-slate-800 transition-colors focus:outline-none ring-2 ring-transparent focus:ring-emerald-500"
        aria-label="User menu"
      >
        <div className="relative w-9 h-9 rounded-full overflow-hidden bg-emerald-800 text-emerald-100 font-bold flex items-center justify-center text-xs border-2 border-emerald-500/60 shadow-xs">
          {userProfile?.photo_url ? (
            <img
              src={userProfile.photo_url}
              alt={userProfile.full_name || 'User Avatar'}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <ChevronDown size={13} className="text-slate-400" />
      </button>

      {/* Hover & Click Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-1 w-60 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 text-xs font-sans text-left space-y-1">
          
          {/* User Dossier Header */}
          <div className="px-4 py-2.5 border-b border-slate-800">
            <p className="font-bold text-slate-100 text-sm truncate">
              {userProfile?.full_name || 'Member Account'}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[11px] text-emerald-400">
              <span>{userProfile?.account_id || 'ACC-N/A'}</span>
              {isAdmin && (
                <span className="px-1.5 py-0.2 bg-blue-950 text-blue-300 border border-blue-800 rounded text-[9px] font-sans font-bold flex items-center gap-0.5">
                  <ShieldCheck size={10} /> Admin
                </span>
              )}
            </div>
            {userProfile?.committee_position && (
              <p className="text-[10px] text-slate-400 font-medium truncate mt-1">
                {userProfile.committee_position}
              </p>
            )}
          </div>

          {/* Menu Options */}
          <div className="p-1 space-y-0.5">
            {/* View 360° Profile is hidden for Admins and rendered ONLY for General Members */}
            {!isAdmin && (
              <Link
                href="/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <User size={15} className="text-emerald-400" />
                <span>View 360° Profile</span>
              </Link>
            )}

            <Link
              href="/change-password"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <KeyRound size={15} className="text-blue-400" />
              <span>Reset / Change Password</span>
            </Link>
          </div>

          {/* Logout Action */}
          <div className="border-t border-slate-800 p-1 pt-1">
            <form action={logoutUser}>
              <button
                type="submit"
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-400 hover:bg-red-950/50 hover:text-red-300 transition-colors text-left font-bold"
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </form>
          </div>

        </div>
      )}
    </div>
  );
}