import { $, esc } from '../core/utils';
import { loadPrefs, savePrefs } from '../auth/prefs';

const QUEUE_KEY = 'TunedIn.space/queue@v1';

export function saveQueue(state: any) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify({ queue: state.queue || [], qIndex: state.qIndex || 0 })); } catch {}
}

export function loadQueueInto(state: any) {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.queue)) state.queue = parsed.queue;
    state.qIndex = typeof parsed.qIndex === 'number' ? parsed.qIndex : 0;
  } catch {}
}

function ensureDock(): HTMLElement {
  let dock = document.getElementById('dock') as HTMLElement | null;
  if (!dock) {
    dock = document.createElement('div');
    dock.id = 'dock';
    dock.className = 'dock';
    dock.innerHTML = `
    <div class="hstack" style="justify-content:center; align-items:center; flex-wrap:wrap; gap:18px;">
      <div class="hstack" style="gap:18px;">
        <button class="btn" data-action="q-prev" title="previous in queue (k)">&#9198;</button>
        <button class="btn" data-action="q-stop" title="stop">&#9632;</button>
        <button class="btn" data-action="q-next" title="next in queue (j)">&#9197;</button>
        <button class="btn" data-action="q-shuffle" id="dockShuffle" aria-pressed="false" title="shuffle">&#8646;</button>
        <button class="btn btn-ghost" data-action="q-clear" title="clear queue"><span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;"><svg width="13" height="13" viewBox="0 0 13 13" style="display:block;margin:auto;" xmlns="http://www.w3.org/2000/svg"><line x1="3" y1="3" x2="10" y2="10" stroke="#39ff14" stroke-width="1.7" stroke-linecap="round"/><line x1="10" y1="3" x2="3" y2="10" stroke="#39ff14" stroke-width="1.7" stroke-linecap="round"/></svg></span></button>
      </div>
    </div>
    <div class="dock-info">
      <div class="nowplaying-marquee-wrap">
        <span id="nowPlaying" class="muted nowplaying-marquee"></span>
      </div>
      <div class="queue-info small" style="text-align:center; margin-top:2px;">
        queue <span id="qPos">0</span>/<span id="qLen">0</span>
      </div>
    </div>`;
    const appRoot = document.getElementById('app');
    if (appRoot) appRoot.appendChild(dock); else document.body.appendChild(dock);
  }
  return dock;
}

export function getActiveQueueId(state: any): string | null {
  const ids = state.queue || [];
  const idx = typeof state.qIndex === 'number' ? state.qIndex : 0;
  return ids.length ? ids[Math.max(0, Math.min(ids.length - 1, idx))] : null;
}

export function markNowPlaying(postId: string, state?: any, DB?: any) {
  document.querySelectorAll('.post.is-playing').forEach((el) => el.classList.remove('is-playing'));
  const card = document.getElementById('post-' + postId);
  card?.classList.add('is-playing');
  try { if (state && DB) updateDock(true, state, DB); } catch {}
}

export function updateDock(show: boolean, state: any, DB: any) {
  const dock = ensureDock();
  const prefs = loadPrefs();
  const curId = getActiveQueueId(state);
  let label = '';
  if (curId) {
    const p = DB.getAll().posts.find((x: any) => String(x.id) === String(curId));
    if (p) label = `${esc(p.title || '')}${p.artist ? ' — ' + esc(p.artist) : ''}`;
  }
  // Render queue list inside dock (clickable entries)
  const renderQueueList = () => {
    try {
      const listWrapId = 'dockQueueList';
      let listWrap = dock.querySelector('#' + listWrapId) as HTMLElement | null;
      if (!listWrap) {
        listWrap = document.createElement('div');
        listWrap.id = listWrapId;
        listWrap.className = 'dock-queue-list';
        (dock.querySelector('.dock-inner') as HTMLElement).appendChild(listWrap);
      }
      const q = state.queue || [];
      listWrap.innerHTML = q.map((id: string, idx: number) => {
        const p = DB.getAll().posts.find((x: any) => String(x.id) === String(id));
        if (!p) return '';
        const title = esc(p.title || 'unknown');
        const artist = p.artist ? esc(p.artist) : '';
        const active = (state.qIndex || 0) === idx ? ' active' : '';
        const thumb = (p.avatarUrl || p.thumb || '') ? `<img src="${esc(p.avatarUrl || p.thumb || '')}" class="thumb" />` : '';
        return `<div class="dock-queue-row${active}" data-queue-index="${idx}" data-queue-id="${esc(id)}">
          <div class="dock-queue-left">${thumb}<div class="dock-queue-meta"><div class="q-title">${title}</div><div class="q-artist muted small">${artist}</div></div></div>
          <div class="dock-queue-actions"><button class="btn btn-ghost tiny" data-action="q-play-from" data-queue-index="${idx}" data-queue-id="${esc(id)}">play</button></div>
        </div>`;
      }).join('');
    } catch {}
  };
  const nowEl = document.getElementById('nowPlaying');
  if (nowEl) nowEl.textContent = label || 'Now playing';
  // update queue counters and queue-info
  const qLenEl = document.getElementById('qLen');
  const qPosEl = document.getElementById('qPos');
  if (qLenEl) qLenEl.textContent = String((state.queue || []).length);
  if (qPosEl) qPosEl.textContent = String((state.queue && state.queue.length) ? (Math.min((state.qIndex || 0) + 1, state.queue.length)) : 0);
  const queueInfoEl = dock.querySelector('.queue-info') as HTMLElement | null;
  if (queueInfoEl) {
    // show a compact now-playing line; DB may be missing during tests so guard
    try {
      const curId = getActiveQueueId(state);
      let info = '';
      if (curId) {
        const p = DB.getAll().posts.find((x: any) => String(x.id) === String(curId));
        if (p) {
          const user = DB.getAll().users?.find((u: any) => u.id === p.userId);
          const by = user ? `by ${esc(user.name)}` : '';
          const ago = p.createdAt ? ` | ${new Date(p.createdAt).toLocaleString()}` : '';
          info = `<span class="muted small">${by}${ago}</span>`;
        }
      }
      if ((state.queue || []).length > 1) {
        info += ` <span class="muted small">| queue ${qPosEl?.textContent || '0'}/${qLenEl?.textContent || '0'}</span>`;
      }
      queueInfoEl.innerHTML = info;
    } catch (e) { /* ignore */ }
  }
  const repBtn = document.getElementById('dockRepeat');
  if (repBtn) repBtn.textContent = `[ repeat: ${prefs.repeat || 'off'} ]`;
  const shBtn = document.getElementById('dockShuffle');
  if (shBtn) {
    // Keep legacy icon-only look; just reflect state via aria-pressed
    shBtn.setAttribute('aria-pressed', String(!!prefs.shuffle));
  }
  renderQueueList();
  dock.style.display = show ? '' : 'none';
}

export function queuePrev(state: any, DB: any) {
  const prefs = loadPrefs();
  if (!state.queue || !state.queue.length) return;
  if (prefs.shuffle && state.queue.length > 1) {
    let next; do { next = Math.floor(Math.random() * state.queue.length); } while (next === state.qIndex);
    state.qIndex = next;
  } else {
    state.qIndex = (state.qIndex - 1 + state.queue.length) % state.queue.length;
  }
  const id = getActiveQueueId(state); if (!id) return;
  const btn = document.querySelector(`#post-${CSS.escape(id)} [data-action="toggle-player"]`) as HTMLElement | null;
  if (btn) {
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  } else {
    // fallback: nothing to click - update dock and mark now playing
    markNowPlaying(id);
    updateDock(true, state, DB);
  }
  saveQueue(state);
}

export function queueNext(auto: boolean, state: any, DB: any) {
  const prefs = loadPrefs();
  if (!state.queue || !state.queue.length) return;
  if (prefs.repeat === 'one' && !auto) {
    // manual next overrides repeat one
  } else if (prefs.repeat === 'one' && auto) {
    // replay same index
  } else if (prefs.shuffle && state.queue.length > 1) {
    let next; do { next = Math.floor(Math.random() * state.queue.length); } while (next === state.qIndex);
    state.qIndex = next;
  } else {
    const atEnd = state.qIndex >= state.queue.length - 1;
    if (atEnd) {
      if (prefs.repeat === 'all') {
        state.qIndex = 0;
      } else {
        // stop: no more tracks; cleanup active player and hide dock
        try {
          document.querySelectorAll('.player.active').forEach((el) => { try { (el as any)._cleanup && (el as any)._cleanup(); } catch {}; (el as HTMLElement).innerHTML = ''; el.classList.remove('active'); el.parentElement?.classList.remove('is-playing'); });
        } catch {}
        state.queue = [];
        state.qIndex = 0;
        updateDock(false, state, DB);
        return;
      }
    } else {
      state.qIndex++;
    }
  }
  const id = getActiveQueueId(state); if (!id) return;
  const btn = document.querySelector(`#post-${CSS.escape(id)} [data-action="toggle-player"]`) as HTMLElement | null;
  if (btn) {
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  } else {
    markNowPlaying(id);
    updateDock(true, state, DB);
  }
  saveQueue(state);
}
