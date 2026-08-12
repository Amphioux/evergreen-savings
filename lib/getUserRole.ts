import { createServerSupabaseClient } from '@/lib/supabaseServer';

export async function getCurrentUserRole() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { isLogged: false, isAdmin: false, isSuperAdmin: false, role: 'MEMBER', userId: null };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const roleUpper = profile?.role?.trim()?.toUpperCase() || 'MEMBER';

  return {
    isLogged: true,
    isSuperAdmin: roleUpper === 'SUPER_ADMIN',
    isAdmin: roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN',
    role: roleUpper,
    email: user.email,
    userId: user.id,
  };
}