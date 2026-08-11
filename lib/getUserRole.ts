import { createServerSupabaseClient } from '@/lib/supabaseServer';

export async function getCurrentUserRole(): Promise<{ isLogged: boolean; isAdmin: boolean; email?: string }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { isLogged: false, isAdmin: false };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return {
    isLogged: true,
    isAdmin: profile?.role === 'ADMIN',
    email: user.email,
  };
}