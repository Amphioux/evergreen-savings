import Link from 'next/link';
import { getCurrentUserRole } from '@/lib/getUserRole';
import { getPhotoSignedUrl } from '@/app/actions';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import UserProfileDropdown from './UserProfileDropDown';
import { 
  LayoutDashboard, 
  Users, 
  PiggyBank, 
  Banknote, 
  Building2, 
  Receipt, 
  ShieldCheck, 
  Search 
} from 'lucide-react';

async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/+$/, ''),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );
}

export default async function Navbar() {
  const supabaseServer = await getSupabaseServerClient();
  const { data: { user } } = await supabaseServer.auth.getUser();

  if (!user) {
    return null;
  }

  const { isAdmin } = await getCurrentUserRole();

  // Fetch logged-in user profile & resolve profile photo signed URL
  const { data: userProfile } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, account_id, committee_position, role, email, photo_path')
    .eq('id', user.id)
    .single();

  const photo_url = userProfile?.photo_path 
    ? await getPhotoSignedUrl(userProfile.photo_path) 
    : null;

  const profileData = userProfile ? { ...userProfile, photo_url } : null;

  return (
    <nav className="bg-slate-900 text-white border-b border-slate-800 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <Link href="/" className="font-bold text-lg text-emerald-400 flex items-center gap-2">
              <PiggyBank size={24} />
              <span>Evergreen Group</span>
            </Link>
          </div>

          {/* Core Navigation Links */}
          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-semibold overflow-x-auto">
            <Link href="/" className="px-3 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-1.5 transition-colors whitespace-nowrap">
              <LayoutDashboard size={16} />
              <span>Overview</span>
            </Link>

            <Link href="/members" className="px-3 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-1.5 transition-colors whitespace-nowrap">
              <Users size={16} />
              <span>Members</span>
            </Link>

            <Link href="/deposits" className="px-3 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-1.5 transition-colors whitespace-nowrap">
              <PiggyBank size={16} />
              <span>Savings</span>
            </Link>

            <Link href="/loans" className="px-3 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-1.5 transition-colors whitespace-nowrap">
              <Banknote size={16} />
              <span>Loans</span>
            </Link>

            <Link href="/treasury" className="px-3 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-1.5 transition-colors whitespace-nowrap">
              <Building2 size={16} />
              <span>Treasury</span>
            </Link>

            <Link href="/expenses" className="px-3 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-1.5 transition-colors whitespace-nowrap">
              <Receipt size={16} />
              <span>Expenses</span>
            </Link>

            {/* Admin Restricted Links */}
            {isAdmin && (
              <>
                <Link 
                  href="/admin/user-lookup" 
                  className="px-3 py-2 rounded-lg bg-blue-950/60 hover:bg-blue-900 text-blue-200 border border-blue-800 flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <Search size={16} className="text-blue-400" />
                  <span>360° Lookup</span>
                </Link>

                <Link 
                  href="/users" 
                  className="px-3 py-2 rounded-lg bg-purple-950/60 hover:bg-purple-900 text-purple-200 border border-purple-800 flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <ShieldCheck size={16} className="text-purple-400" />
                  <span>Access</span>
                </Link>
              </>
            )}
          </div>

          {/* Right Side: Uncrowded Profile Avatar Dropdown */}
          <div className="flex items-center">
            <UserProfileDropdown userProfile={profileData} isAdmin={isAdmin} />
          </div>

        </div>
      </div>
    </nav>
  );
}