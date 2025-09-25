import { applyAccent, applyDensity } from '../core/utils.js';

export const PREF_KEY = 'TunedIn.space/prefs@v2';

export const defaultPrefs = {
  autoScroll: true,
  sort: 'new', // new | likes | comments
  search: '',
  filterTag: null,
  accent: '#ff6b6b',
  density: 'cozy',
  shuffle: false,
  repeat: 'off' // off | all | one
};

let PREFS = null;

export function loadPrefs() {
  if (PREFS) return PREFS;
  const raw = localStorage.getItem(PREF_KEY);
  if (!raw) {
    PREFS = { ...defaultPrefs };
    applyAccent(PREFS.accent);
    applyDensity(PREFS.density);
    return PREFS;
  }
  try {
    PREFS = { ...defaultPrefs, ...JSON.parse(raw) };
  } catch {
    PREFS = { ...defaultPrefs };
  }
  applyAccent(PREFS.accent);
  applyDensity(PREFS.density);
  return PREFS;
}

export function savePrefs(p) {
  PREFS = { ...loadPrefs(), ...p };
  try { localStorage.setItem(PREF_KEY, JSON.stringify(PREFS)); } catch {}
  if (p && ('accent' in p)) applyAccent(PREFS.accent);
  if (p && ('density' in p)) applyDensity(PREFS.density);
  return PREFS;
}

export function resetPrefsCache() {
  PREFS = null;
}