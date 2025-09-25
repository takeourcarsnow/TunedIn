import { esc } from '../core/utils';
import { loadPrefs, savePrefs } from '../auth/prefs';

export function parseTags(raw?: string) {
  if (!raw) return [] as string[];
  return Array.from(new Set(
    raw
      .split(/[#\s,]+/g)
      .map((t: string) => (t || '').trim().toLowerCase())
      .filter(Boolean)
  ));
}

export function formatTagsForInput(tags?: string[]) {
  if (!tags || !tags.length) return '';
  return tags.map(t => '#' + t).join(' ') + ' ';
}

export function getPopularTags(DB: any, limit = 20) {
  const db = DB.getAll();
  const m = new Map<string, number>();
  (db.posts || []).forEach((p: any) => (p.tags || []).forEach((t: string) => m.set(t, (m.get(t) || 0) + 1)));
  return Array.from(m.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([t]) => t);
}

export function renderTagCloud(el: HTMLElement | null, DB: any, prefs: any, opts: any = {}) {
  if (!el) return;
  const prevSortUIs = el.querySelectorAll('.tag-sort-ui');
  prevSortUIs.forEach(ui => ui.remove());
  el.innerHTML = '';
  const db = DB.getAll();
  const m = new Map<string, number>();
  (db.posts || []).forEach((p: any) => (p.tags || []).forEach((t: string) => m.set(t, (m.get(t) || 0) + 1)));
  let sortMode = window.localStorage.getItem('tagSortMode') || 'freq';
  function setSortMode(mode: string) { sortMode = mode; window.localStorage.setItem('tagSortMode', mode); renderTagCloud(el, DB, prefs, opts); }
  let items = Array.from(m.entries());
  if (sortMode === 'freq') items = items.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  else items = items.sort((a, b) => a[0].localeCompare(b[0]) || b[1] - a[1]);
  items = items.slice(0, opts.limit || 80);
  if (!items.length) { el.innerHTML = '<span class="muted small">no tags yet</span>'; return; }
  const tagCloudDiv = document.createElement('div');
  tagCloudDiv.className = 'tag-cloud';
  // Make the tag cloud behave like a single-line horizontal carousel
  tagCloudDiv.style.display = 'flex';
  tagCloudDiv.style.flexWrap = 'nowrap';
  tagCloudDiv.style.overflowX = 'auto';
  tagCloudDiv.style.gap = '8px';
  tagCloudDiv.style.padding = '6px 4px';
  tagCloudDiv.style.alignItems = 'center';
  // vendor-prefixed property set via index to satisfy TS
  (tagCloudDiv.style as any)['-webkit-overflow-scrolling'] = 'touch';
  const selectedTag = prefs && prefs.filterTag;
  tagCloudDiv.innerHTML = items.map(([t, c]) => `<button class="tag${selectedTag === t ? ' tag-selected' : ''}" data-action="filter-tag" data-tag="${esc(t)}" aria-pressed="${selectedTag===t}"><span class="tag-label">#${esc(t)}</span></button>`).join(' ');
  el.appendChild(tagCloudDiv);
  const sortUI = document.createElement('div');
  sortUI.className = 'tag-sort-ui'; sortUI.style.display = 'inline-flex'; sortUI.style.gap = '10px'; sortUI.style.marginTop = '6px'; sortUI.style.fontSize = '0.93em';
  sortUI.innerHTML = `
    <a href="#" data-sort="freq" class="tag-sort-link">frequency</a>
    <span style="color:#444;opacity:0.5;">|</span>
    <a href="#" data-sort="az" class="tag-sort-link" tabindex="0">a - z</a>
  `;
  function updateSortActive() {
    const links = sortUI.querySelectorAll('.tag-sort-link');
    try { console.debug('renderTagCloud:updateSortActive', { sortMode, links: Array.from(links).map(l => ({sort: l.getAttribute('data-sort'), cls: l.className})) }); } catch (e) {}
    links.forEach(link => {
      const isActive = link.getAttribute('data-sort') === sortMode;
      if (isActive) link.classList.add('active'); else link.classList.remove('active');
      (link as HTMLElement).style.color = isActive ? 'var(--acc, #8ab4ff)' : '';
      (link as HTMLElement).style.fontWeight = isActive ? '600' : '';
      link.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }
  updateSortActive();
  sortUI.addEventListener('click', e => {
    const link = (e.target as Element).closest('a[data-sort]');
    if (link) { e.preventDefault(); setSortMode(link.getAttribute('data-sort') || 'freq'); }
  });
  el.appendChild(sortUI);
  (function scheduleRestore() {
    const task = () => {
      try {
        if (typeof window !== 'undefined' && typeof (window as any)._tagCloudScrollLeft === 'number') {
          const val = (window as any)._tagCloudScrollLeft;
          try { tagCloudDiv.scrollLeft = val; } catch (e) {}
          try { delete (window as any)._tagCloudScrollLeft; } catch (e) {}
          return;
        }
        if (selectedTag) {
          requestAnimationFrame(() => {
            try {
              const tagEl = tagCloudDiv.querySelector('.tag-selected');
              if (tagEl && tagCloudDiv.scrollLeft < 5) {
                const tagRect = (tagEl as HTMLElement).getBoundingClientRect();
                const cloudRect = tagCloudDiv.getBoundingClientRect();
                if (tagRect.left < cloudRect.left || tagRect.right > cloudRect.right) {
                  const offset = (tagEl as HTMLElement).offsetLeft + tagRect.width / 2 - cloudRect.width / 2;
                  tagCloudDiv.scrollLeft = offset;
                }
              }
            } catch (e) {}
          });
        }
      } catch (e) {}
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      try { (requestIdleCallback as any)(task, { timeout: 1000 }); } catch (e) { setTimeout(task, 300); }
    } else setTimeout(task, 300);
  })();
  if (typeof (window as any).enableTagCloudDragScroll === 'function') {
    try { (window as any).enableTagCloudDragScroll(tagCloudDiv); } catch (e) {}
  }
}

export function initTagInput(f_tags: HTMLInputElement | null, tagSuggestions: HTMLElement | null, DB: any) {
  if (!f_tags || !tagSuggestions) return;
  function dedupeTagsInput() { const val = f_tags!.value || ''; const tags = parseTags(val); f_tags!.value = formatTagsForInput(tags); }
  function renderTagSuggestions(filter = '') {
    const tags = getPopularTags(DB, 20);
    const used = parseTags(f_tags!.value || '');
    let filtered = tags.filter(t => !used.includes(t.toLowerCase()));
    if (filter) filtered = filtered.filter(t => t.toLowerCase().includes(filter.toLowerCase()));
    if (!filtered.length) { tagSuggestions!.innerHTML = ''; tagSuggestions!.style.display = 'none'; return; }
    tagSuggestions!.innerHTML = filtered.map(t => `<button type="button" class="tag small tag-suggestion" data-tag="${esc(t)}">#${esc(t)}</button>`).join(' ');
    tagSuggestions!.style.display = 'flex';
  }
  function maybeShow() { const val = f_tags!.value || ''; if (document.activeElement === f_tags || val.length > 0) { const last = (val.split(/[ ,]/).pop() || '').replace(/^#/, ''); renderTagSuggestions(last); } else { tagSuggestions!.style.display = 'none'; } }
  f_tags.addEventListener('input', maybeShow); f_tags.addEventListener('focus', maybeShow); f_tags.addEventListener('blur', () => setTimeout(() => { dedupeTagsInput(); tagSuggestions!.style.display = 'none'; }, 120));
  tagSuggestions.addEventListener('mousedown', (e) => e.preventDefault());
  tagSuggestions.addEventListener('click', (e) => {
    const btn = (e.target as Element).closest('.tag-suggestion') as HTMLElement | null;
    if (!btn) return;
    const tag = btn.getAttribute('data-tag') || (btn.textContent||'').replace(/^#/, '');
    let cur = f_tags!.value || '';
    const selStart = (f_tags!.selectionStart as number) || cur.length;
    const before = cur.slice(0, selStart).replace(/[#]*([^#\s,]*)$/, '');
    const after = cur.slice(selStart);
    let out = before; if (out && !/\s$/.test(out)) out += ' ';
    out += '#' + tag; if (after && !/^\s*$/.test(after)) out += ' ' + after.trim();
    f_tags!.value = out.trim() + ' ';
    f_tags!.dispatchEvent(new Event('input'));
    f_tags!.focus();
  });
  tagSuggestions.style.display = 'none';
}
