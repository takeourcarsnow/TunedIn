// Allow safe formatting in post descriptions (line breaks, links, bold, italics)
export function formatPostBody(s) {
  if (!s) return '';
  let out = esc(s);
  // Links: [text](url) or plain URLs
  out = out.replace(/\bhttps?:\/\/[^\s<]+/g, url => `<a href="${url}" target="_blank" rel="noopener">${url}</a>`);
  // Bold: **text**
  out = out.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  // Italic: *text*
  out = out.replace(/\*([^*]+)\*/g, '<i>$1</i>');
  // Line breaks
  out = out.replace(/\n/g, '<br>');
  return out;
}
// Simple email format validation
export function isValidEmailFormat(email) {
  // Basic regex for demonstration; adjust as needed for stricter validation
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}
export const $ = (sel, root=document) => root.querySelector(sel);
export function $$(a, b){
  if(!b) return Array.from(document.querySelectorAll(a));
  const root = (typeof a === 'string') ? document.querySelector(a) : a;
  return Array.from(root ? root.querySelectorAll(b) : []);
}
export const raf = (fn) => requestAnimationFrame(fn);
export const debounce = (fn, ms=200) => { let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); }; };
export const safeClone = (o)=> (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));

export const uid = (p='id') => p + '_' + Math.random().toString(36).slice(2,8) + Date.now().toString(36);

export const esc = s => String(s).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[m]));

export const fmtTime = ts => {
  const d = new Date(ts);
  const diff = Date.now() - ts;
  const sec = Math.round(diff/1000);
  const min = Math.round(sec/60);
  const hr  = Math.round(min/60);
  const day = Math.round(hr/24);
  if(sec < 45) return 'just now';
  if(min < 60) return `${min}m ago`;
  if(hr < 24)  return `${hr}h ago`;
  if(day < 7)  return `${day}d ago`;
  return d.toLocaleString();
};

export const liveSay = (msg) => { const n = $('#live'); if(n) n.textContent = msg; };

export function copyText(t){
  if(navigator.clipboard && location.protocol !== 'file:'){
    return navigator.clipboard.writeText(t);
  } else {
    const ta = document.createElement('textarea');
    ta.value = t; document.body.appendChild(ta);
    ta.select(); ta.setSelectionRange(0, 99999);
    const ok = document.execCommand && document.execCommand('copy');
    ta.remove();
    return ok ? Promise.resolve() : Promise.reject();
  }
}

export function toast(anchor, msg, warn){
  const note = document.createElement('div');
  note.className = 'notice small';
  note.textContent = msg;
  if(warn) note.classList.add('warn');
  (anchor?.parentNode || document.body).insertBefore(note, anchor?.nextSibling || null);
  setTimeout(()=> note.remove(), 1500);
}

export function approxSize(str){
  const bytes = new Blob([str]).size;
  if(bytes < 1024) return bytes+' B';
  if(bytes < 1024*1024) return (bytes/1024).toFixed(1)+' KB';
  return (bytes/1024/1024).toFixed(2)+' MB';
}
export function fmtBytes(n){
  if(n < 1024) return n+' B';
  if(n < 1024*1024) return (n/1024).toFixed(1)+' KB';
  if(n < 1024*1024*1024) return (n/1024/1024).toFixed(2)+' MB';
  return (n/1024/1024/1024).toFixed(2)+' GB';
}

export function applyAccent(color){
  try{
    document.documentElement.style.setProperty('--acc', color || '#8ab4ff');
    const meta = document.querySelector('meta[name="theme-color"]');
    if(meta) meta.setAttribute('content', '#0b0d10');
  }catch{}
}
export function applyDensity(d){
  document.documentElement.setAttribute('data-density', d || 'cozy');
}