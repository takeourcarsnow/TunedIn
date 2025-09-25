
import { safeGetUser } from '../core/auth_helpers.js';

export async function currentUser(DB) {
  // Always use Supabase Auth for user identity
  if (DB.isRemote && DB.supabase && DB.supabase.auth && DB.supabase.auth.getUser) {
    try {
      const u = await safeGetUser(DB.supabase);
      if (u) {
        const name = u.user_metadata?.name || u.email || 'user';
        // Ensure user exists in DB
        try { await DB.ensureUser(name); } catch {}
        return { id: u.id, name, email: u.email };
      }
    } catch (err) {
      // safeGetUser handles sign-out on failure; fallthrough to unauthenticated
      console.warn('currentUser: safeGetUser failed', err && err.message ? err.message : err);
    }
  }
  // Not authenticated
  return null;
}