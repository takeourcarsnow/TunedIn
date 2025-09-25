export const SESSION_KEY = 'TunedIn.space/session@v1';
export const GUEST_KEY = 'TunedIn.space/guest@v1';

// Only use sessionStorage for local/guest mode. Supabase manages its own session persistence.
export function getSession() {
  // For local/guest mode only
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}
export function setSession(s) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
export function clearSession() { sessionStorage.removeItem(SESSION_KEY); }

// Guest mode can remain in localStorage (not sensitive)
export function isGuestMode() { return localStorage.getItem(GUEST_KEY) === '1'; }
export function setGuestMode(on) { if (on) localStorage.setItem(GUEST_KEY, '1'); else localStorage.removeItem(GUEST_KEY); }