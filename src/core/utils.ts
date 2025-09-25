export function formatPostBody(s?: string): string {
  if (!s) return '';
  let out = esc(s);
  out = out.replace(/\bhttps?:\/\/[^\s<]+/g, url => `<a href="${url}" target="_blank" rel="noopener">${url}</a>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  out = out.replace(/\*([^*]+)\*/g, '<i>$1</i>');
  out = out.replace(/\n/g, '<br>');
  return out;
}

export function isValidEmailFormat(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

export const $ = (sel: string, root: Document | HTMLElement = document) => root.querySelector<HTMLElement>(sel);
export function $$<T extends Element = Element>(a: string | Element, b?: string): T[] {
  if (!b) return Array.from(document.querySelectorAll(a as string)) as T[];
  const root = (typeof a === 'string') ? document.querySelector(a) : (a as Element | null);
  return Array.from(root ? root.querySelectorAll(b) : []) as T[];
}

export const raf = (fn: FrameRequestCallback) => requestAnimationFrame(fn);
export const debounce = <F extends (...args: any[]) => void>(fn: F, ms = 200) => { let t: any; return (...args: Parameters<F>) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; };
export const safeClone = <T>(o: T): T => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));

export const uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36);

export const esc = (s: any) => String(s).replace(/[&<>"']/g, (m) => (({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' } as Record<string, string>)[m] ?? m));

export const fmtTime = (ts: number) => {
  const d = new Date(ts);
  const diff = Date.now() - ts;
  const sec = Math.round(diff / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);
  if (sec < 45) return 'just now';
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 7) return `${day}d ago`;
  return d.toLocaleString();
};

export const liveSay = (msg: string) => { const n = $('#live') as HTMLElement | null; if (n) n.textContent = msg; };

export function copyText(t: string) {
  if (navigator.clipboard && location.protocol !== 'file:') {
    return navigator.clipboard.writeText(t);
  } else {
    const ta = document.createElement('textarea');
    ta.value = t; document.body.appendChild(ta);
    ta.select(); ta.setSelectionRange(0, 99999);
    const ok = (document as any).execCommand && (document as any).execCommand('copy');
    ta.remove();
    return ok ? Promise.resolve() : Promise.reject();
  }
}

export function toast(anchor: HTMLElement | null | undefined, msg: string, warn?: boolean) {
  const note = document.createElement('div');
  note.className = 'notice small';
  note.textContent = msg;
  if (warn) note.classList.add('warn');
  (anchor?.parentNode || document.body).insertBefore(note, (anchor as any)?.nextSibling || null);
  setTimeout(() => note.remove(), 1500);
}

export function approxSize(str: string) {
  const bytes = new Blob([str]).size;
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

export function fmtBytes(n: number) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  if (n < 1024 * 1024 * 1024) return (n / 1024 / 1024).toFixed(2) + ' MB';
  return (n / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

export function applyAccent(color?: string) {
  try {
    document.documentElement.style.setProperty('--acc', color || '#8ab4ff');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', '#0b0d10');
  } catch {}
}

export function applyDensity(d?: 'cozy' | 'compact' | string) {
  document.documentElement.setAttribute('data-density', d || 'cozy');
}
