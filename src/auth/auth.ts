import { safeGetUser } from '../core/auth_helpers';

export async function currentUser(DB: any): Promise<{ id: string; name: string; email?: string } | null> {
  if (DB.isRemote && DB.supabase && DB.supabase.auth && DB.supabase.auth.getUser) {
    try {
      const u = await safeGetUser(DB.supabase);
      if (u) {
        const name = (u.user_metadata?.name as string | undefined) || (u.email as string | undefined) || 'user';
        try { await DB.ensureUser(name); } catch {}
        return { id: u.id as string, name, email: u.email as string | undefined };
      }
    } catch (err) {
      console.warn('currentUser: safeGetUser failed', (err as any)?.message || err);
    }
  }
  return null;
}
