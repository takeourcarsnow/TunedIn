export async function safeGetUser(supabase: any): Promise<any | null> {
  if (!supabase || !supabase.auth || !supabase.auth.getUser) return null;
  try {
    const res = await supabase.auth.getUser();
    const user = res?.data?.user ?? res?.user ?? null;
    return user || null;
  } catch (err: any) {
    if (supabase && supabase.auth && supabase.auth.signOut) {
      try { await supabase.auth.signOut(); } catch {}
    }
    return null;
  }
}
