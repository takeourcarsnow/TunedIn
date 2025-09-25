// Safe auth helper to call supabase.auth.getUser() and handle refresh-token errors.
// If an invalid/expired refresh token is detected, attempt to sign out to clear state
// and return null so callers can handle unauthenticated state safely.
export async function safeGetUser(supabase) {
  if (!supabase || !supabase.auth || !supabase.auth.getUser) return null;
  try {
    const res = await supabase.auth.getUser();
    // supabase-js v2 returns { data: { user } }
    return res?.data?.user || res?.user || null;
  } catch (err) {
    // Best-effort: if auth is in a bad state (invalid refresh token), sign out to clear stored session
    try {
      if (supabase && supabase.auth && supabase.auth.signOut) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      // ignore
    }
    // Surface a console warning for debugging, but return null so callers treat as unauthenticated
    console.warn('safeGetUser: failed to get auth user, cleared session', err && err.message ? err.message : err);
    return null;
  }
}
