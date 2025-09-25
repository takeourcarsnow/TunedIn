import { approxSize, fmtBytes, toast } from '../core/utils';

export async function onImport(e: any, DB: any, state: any, render: any) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data || !Array.isArray(data.posts) || !Array.isArray(data.users)) {
      alert('Invalid export file.'); return;
    }
    if (DB.replaceAll) await DB.replaceAll({ ...data, version: 2 });
    toast(document.getElementById('app'), DB.isRemote ? 'imported to Supabase' : 'imported');
    state.queue = [];
    state.qIndex = 0;
    if (DB.refresh) await DB.refresh();
    render();
  } catch (err) {
    console.error(err);
    alert('Import failed.');
  } finally {
    e.target.value = '';
  }
}

export async function storageInfo(DB: any) {
  if (DB.isRemote) {
    return { text: 'Data synced with Supabase. Preferences and session are saved locally.', percent: null };
  }
  try {
    if ((navigator as any).storage && (navigator as any).storage.estimate) {
      const est = await (navigator as any).storage.estimate();
      const used = est.usage || 0;
      const quota = est.quota || 0;
      const pct = quota ? Math.min(100, Math.round((used / quota) * 100)) : null;
      return {
        text: `Storage approx: ${fmtBytes(used)}${quota ? ' of ' + fmtBytes(quota) : ''} used · Local-only.`,
        percent: pct
      };
    }
  } catch {}
  const raw = (localStorage.getItem('TunedIn.space/db@v2') || '') + (localStorage.getItem('TunedIn.space/prefs@v2') || '');
  return { text: 'Storage approx: ' + approxSize(raw) + ' · Local-only.', percent: null };
}
