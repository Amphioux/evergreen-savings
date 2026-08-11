import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { logoutUser } from '@/app/actions';
import { LayoutDashboard, Users, Banknote, Landmark, LogOut, PiggyBank } from 'lucide-react';

export default async function Navbar() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  return (
    <header className="bg-emerald-900 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
        <div>
          <Link href="/">
            <h1 className="font-bold text-base sm:text-lg tracking-tight">Evergreen</h1>
            <p className="text-[10px] sm:text-xs text-emerald-200">Saving & Credit Group</p>
          </Link>
        </div>
        
        <nav className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm">
          <Link href="/" className="flex items-center gap-1 hover:text-emerald-300 transition-colors">
            <LayoutDashboard size={18} />
            <span className="hidden sm:inline">Overview</span>
          </Link>
          <Link href="/members" className="flex items-center gap-1 hover:text-emerald-300 transition-colors">
            <Users size={18} />
            <span className="hidden sm:inline">Members</span>
          </Link>
          <Link href="/deposits" className="flex items-center gap-1 hover:text-emerald-300 transition-colors">
            <PiggyBank size={18} />
            <span className="hidden sm:inline">Deposits</span>
          </Link>
          <Link href="/loans" className="flex items-center gap-1 hover:text-emerald-300 transition-colors">
            <Banknote size={18} />
            <span className="hidden sm:inline">Loans</span>
          </Link>
          <Link href="/treasury" className="flex items-center gap-1 hover:text-emerald-300 transition-colors">
            <Landmark size={18} />
            <span className="hidden sm:inline">Treasury</span>
          </Link>

          <form action={logoutUser} className="ml-2">
            <button type="submit" className="flex items-center gap-1 bg-emerald-800 hover:bg-emerald-700 px-2.5 py-1 rounded-md text-xs font-semibold text-emerald-100 transition-colors">
              <LogOut size={14} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}