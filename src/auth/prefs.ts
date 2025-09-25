import { applyAccent, applyDensity } from '../core/utils';

type Theme = 'light' | 'dark' | 'system';

const THEME_KEY = 'TunedIn.space/theme@v1';
const PREFS_PREFIX = 'TunedIn.space/pref/';

export function getTheme(): Theme {
  try { return (localStorage.getItem(THEME_KEY) as Theme) || 'system'; } catch { return 'system'; }
}
export function setTheme(theme: Theme) {
  try { localStorage.setItem(THEME_KEY, theme); } catch {}
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    const resolved = theme === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
    root.dataset.theme = resolved;
  }
}

export function getPref<T = any>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFS_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function setPref(key: string, value: any) {
  try { localStorage.setItem(PREFS_PREFIX + key, JSON.stringify(value)); } catch {}
}

// Legacy-style app preferences used across feed/features
export const PREF_KEY = 'TunedIn.space/prefs@v2';
export const defaultPrefs = {
  autoScroll: true,
  sort: 'new' as 'new' | 'likes' | 'comments',
  search: '',
  filterTag: null as string | null,
  accent: '#ff6b6b',
  density: 'cozy',
  shuffle: false,
  repeat: 'off' as 'off' | 'all' | 'one'
};

let PREFS: typeof defaultPrefs | null = null;
export function loadPrefs() {
  if (PREFS) return PREFS;
  const raw = (() => { try { return localStorage.getItem(PREF_KEY); } catch { return null; } })();
  if (!raw) {
    PREFS = { ...defaultPrefs };
    applyAccent(PREFS.accent); applyDensity(PREFS.density);
    return PREFS;
  }
  try { PREFS = { ...defaultPrefs, ...JSON.parse(raw) }; }
  catch { PREFS = { ...defaultPrefs }; }
  applyAccent(PREFS!.accent); applyDensity(PREFS!.density);
  return PREFS!;
}

export function savePrefs(p: Partial<typeof defaultPrefs>) {
  const cur = loadPrefs();
  PREFS = { ...cur, ...p } as typeof defaultPrefs;
  try { localStorage.setItem(PREF_KEY, JSON.stringify(PREFS)); } catch {}
  if ('accent' in (p || {})) applyAccent(PREFS!.accent);
  if ('density' in (p || {})) applyDensity(PREFS!.density);
  return PREFS!;
}

export function resetPrefsCache() { PREFS = null; }
