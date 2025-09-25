export const SESSION_KEY = 'TunedIn.space/session@v1';
export const GUEST_KEY = 'TunedIn.space/guest@v1';

export function getSession<T = any>(): T | null {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}
export function setSession(s: any) { try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch {} }
export function clearSession() { try { sessionStorage.removeItem(SESSION_KEY); } catch {} }

export function isGuestMode() { try { return localStorage.getItem(GUEST_KEY) === '1'; } catch { return false; } }
export function setGuestMode(on: boolean) { try { if (on) localStorage.setItem(GUEST_KEY, '1'); else localStorage.removeItem(GUEST_KEY); } catch {} }
