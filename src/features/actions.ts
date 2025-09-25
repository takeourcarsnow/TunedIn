import { $, toast, uid, liveSay } from '../core/utils';
import { buildEmbed } from './embed';
import { renderPostHTML } from './feed';
import { updateDock, queuePrev, queueNext, getActiveQueueId, markNowPlaying } from './queue';
import { loadPrefs, savePrefs } from '../auth/prefs';
import { renderCommentHTML } from './feed';

// Open and start playback for a given post id immediately under the current
// user gesture (click). This avoids synthetic clicks that break autoplay
// policies in browsers.
function openAndPlay(postId: string, state: any, DB: any) {
  const pl = document.getElementById('player-' + postId) as HTMLElement | null;
  if (!pl) return false;
  // Close others
  document.querySelectorAll('.player.active').forEach((el) => {
    el.classList.remove('active');
    try { (el as any)._cleanup && (el as any)._cleanup(); } catch {}
    (el as HTMLElement).innerHTML = '';
    el.parentElement?.classList.remove('is-playing');
  });
  pl.classList.add('active');
  const db = DB.getAll();
  const p = (db.posts || []).find((x: any) => String(x.id) === String(postId));
  if (!p) return false;
  try { console.debug && console.debug('actions.openAndPlay: post url for', postId, 'is', p.url); } catch {}
  try {
    try { console.debug && console.debug('actions.openAndPlay: building embed for', postId, 'under user gesture'); } catch {}
    buildEmbed(p, pl, { autoplay: true, onEnded: () => queueNext(true, state, DB) });
  } catch (err) {
    console.error('buildEmbed failed', err);
    return false;
  }
  markNowPlaying(postId, state, DB);
  updateDock(true, state, DB);
  const card = document.getElementById('post-' + postId);
  card?.scrollIntoView({ block: 'center' });
  return true;
}

export async function onActionClick(e: MouseEvent, state: any, DB: any, render: () => void) {
  const target = (e.target as HTMLElement);
  const btn = target.closest('[data-action]') as HTMLElement | null;
  const action = btn ? btn.getAttribute('data-action') : null;
  const card = target.closest('.post') as HTMLElement | null;
  const postId = card?.getAttribute('data-post') || null;
  const root = $('#app');

  // Handle link to login/register view
  if (action === 'go-login') {
    try {
      const rootEl = document.getElementById('app') as HTMLElement | null;
      if (!rootEl) return;
      const mod = await import('../views/login_view');
      try { mod.renderLogin(rootEl, DB, render); } catch (e) { /* ignore */ }
    } catch (e) { /* ignore */ }
    return;
  }

  if (action === 'like' && postId) {
    if (!state.user) { toast(card || root, 'login to like', true); return; }
    const updated = await DB.toggleLike(postId, state.user.id);
    if (updated && card) {
      const likeBtn = card.querySelector('[data-action="like"]') as HTMLElement | null;
      if (likeBtn) {
        if ((updated.likes || []).includes(state.user.id)) {
          likeBtn.classList.add('like-on');
          likeBtn.setAttribute('aria-pressed', 'true');
        } else {
          likeBtn.classList.remove('like-on');
          likeBtn.setAttribute('aria-pressed', 'false');
        }
        likeBtn.innerHTML = `[ ♥ ${(updated.likes ? updated.likes.length : 0)} ]`;
      }
    }
    return;
  }

  if (action === 'comment' && postId) {
    const cbox = document.getElementById('cbox-' + postId);
    if (!cbox) return;
    const isActive = cbox.classList.contains('active');
    cbox.classList.toggle('active', !isActive);
    if (!isActive) {
      setTimeout(() => { const inp = cbox.querySelector('input.field') as HTMLInputElement | null; inp?.focus({ preventScroll: true }); }, 10);
    }
    return;
  }

  if (action === 'show-lyrics' && postId) {
    const artist = btn?.getAttribute('data-artist') || '';
    const title = btn?.getAttribute('data-title') || '';
    const lyricsBox = document.getElementById('lyrics-' + postId) as HTMLElement | null;
    const db = DB.getAll();
    const post = (db.posts || []).find((x: any) => String(x.id) === String(postId));
    if (!lyricsBox) return;
    if (lyricsBox.style.display === 'block') {
      lyricsBox.classList.remove('fade-in');
      lyricsBox.classList.add('fade-out');
      setTimeout(() => {
        lyricsBox.style.display = 'none';
        lyricsBox.textContent = '';
        lyricsBox.classList.remove('fade-out');
      }, 180);
      return;
    }
    // Close comment or edit panels in this card
    if (card) {
      const commentBox = card.querySelector('.comment-box.active') as HTMLElement | null;
      if (commentBox) commentBox.classList.remove('active');
      const editPanel = card.querySelector('[id^="editbox-"]') as HTMLElement | null;
      if (editPanel) {
        editPanel.classList.remove('fade-in');
        editPanel.classList.add('fade-out');
        setTimeout(() => { editPanel.parentNode && editPanel.parentNode.removeChild(editPanel); if ((window as any).editingPostId == postId) (window as any).editingPostId = null; }, 180);
      }
    }
    lyricsBox.style.display = 'block';
    lyricsBox.classList.remove('fade-out');
    lyricsBox.classList.add('fade-in');
    let lyricsText = lyricsBox.querySelector('.lyrics-text') as HTMLElement | null;
    if (!lyricsText) {
      lyricsText = document.createElement('span');
      lyricsText.className = 'lyrics-text';
      (lyricsText as HTMLElement).style.whiteSpace = 'pre-line';
      lyricsBox.appendChild(lyricsText);
    }
    let copyBtn = lyricsBox.querySelector('.copy-lyrics-btn') as HTMLButtonElement | null;
    if (!copyBtn) {
      copyBtn = document.createElement('button');
      copyBtn.className = 'copy-lyrics-btn';
      copyBtn.type = 'button';
      copyBtn.title = 'Copy all lyrics';
      copyBtn.textContent = '⧉';
      copyBtn.style.position = 'absolute';
      copyBtn.style.top = '8px';
      copyBtn.style.right = '10px';
      copyBtn.style.fontSize = '1em';
      copyBtn.style.background = 'rgba(30,40,50,0.18)';
      copyBtn.style.border = 'none';
      copyBtn.style.color = '#bfc7d5';
      copyBtn.style.cursor = 'pointer';
      copyBtn.style.padding = '2px 7px';
      copyBtn.style.borderRadius = '6px';
      copyBtn.style.zIndex = '2';
      copyBtn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        const text = lyricsText?.textContent || '';
        if (text) {
          try { (navigator.clipboard as any)?.writeText ? navigator.clipboard.writeText(text) : (function () { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); })(); } catch {}
          toast(copyBtn, 'Copied!');
        }
      });
      lyricsBox.appendChild(copyBtn);
    }
    if (post && post.lyrics && post.lyrics.trim()) {
      lyricsText.textContent = post.lyrics;
      return;
    }
    if (!artist || !title) {
      lyricsBox.textContent = 'Artist or title missing.';
      return;
    }
    lyricsBox.textContent = 'Fetching lyrics...';
    const apiUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
    try {
      const resp = await fetch(apiUrl);
      if (!resp.ok) {
        const text = await resp.text();
        console.error('[Lyrics Fetch] Error response:', text);
        throw new Error('No lyrics found');
      }
      const data = await resp.json();
      if (data.lyrics) {
        lyricsBox.textContent = data.lyrics;
      } else {
        lyricsBox.textContent = 'Lyrics not found.';
      }
    } catch (err: any) {
      if (err instanceof TypeError && err.message && err.message.includes('Failed to fetch')) {
        lyricsBox.textContent = 'Network error or CORS issue. Try reloading or check your connection.';
      } else {
        lyricsBox.textContent = 'Lyrics not found. (' + (err && err.message ? err.message : err) + ')';
      }
      console.error('[Lyrics Fetch] Error:', err);
    }
    return;
  }

  if (action === 'toggle-player' && postId) {
    const pl = document.getElementById('player-' + postId) as HTMLElement | null;
    if (!pl) return;
    const active = pl.classList.contains('active');
    if (active) {
      pl.classList.remove('active');
      try { (pl as any)._cleanup && (pl as any)._cleanup(); } catch {}
      pl.innerHTML = '';
      const playingCard = document.querySelector('.post.is-playing') as HTMLElement | null;
      playingCard?.classList.remove('is-playing');
      try { console.debug && console.debug('actions: toggle-player cleanup for', postId); } catch {}
    } else {
      try { console.debug && console.debug('actions: toggle-player opening player for', postId); } catch {}
      // Build queue from current feed order
      const posts = document.querySelectorAll('#feed .post');
      state.queue = Array.from(posts).map((n) => (n as HTMLElement).dataset.post as string);
      state.qIndex = state.queue.indexOf(postId);
      if (!openAndPlay(postId, state, DB)) {
        toast(card || root, 'Could not load post for playback', true);
      }
    }
    return;
  }

  if (action === 'load-more') {
    const userInitiated = !!(e && (e as any).isTrusted);
    const fn = (window as any)._loadMoreInFeed;
    if (typeof fn === 'function') {
      const ok = fn({ userInitiated });
      if (!ok && userInitiated) { state.page++; render(); }
    } else if (userInitiated) { state.page++; render(); }
    return;
  }

  if (action === 'q-stop') {
    const activePlayer = document.querySelector('.player.active') as HTMLElement | null;
    if (activePlayer) {
      try { activePlayer.querySelectorAll('audio,video').forEach((el: any) => { try { el.pause(); } catch {}; try { el.currentTime = 0; } catch {}; }); } catch {}
      try { activePlayer.querySelectorAll('iframe').forEach((ifr) => { try { (ifr as HTMLIFrameElement).src = 'about:blank'; } catch {}; }); } catch {}
      try { (activePlayer as any)._cleanup && (activePlayer as any)._cleanup(); } catch {}
      activePlayer.innerHTML = '';
      activePlayer.classList.remove('active');
      activePlayer.parentElement?.classList.remove('is-playing');
      try { console.debug && console.debug('actions: q-stop cleaned active player'); } catch {}
    }
    // do not clear queue, just stop playback
    updateDock(true, state, DB);
    return;
  }
  if (action === 'q-prev') { queuePrev(state, DB); updateDock(true, state, DB); return; }
  if (action === 'q-next') { queueNext(false, state, DB); updateDock(true, state, DB); return; }
  if (action === 'q-clear') { state.queue = []; state.qIndex = 0; updateDock(false, state, DB); return; }
  if (action === 'q-shuffle') { const prefs = loadPrefs(); savePrefs({ shuffle: !prefs.shuffle }); updateDock(true, state, DB); return; }
  if (action === 'q-repeat') {
    const order = ['off', 'all', 'one'] as const;
    const prefs = loadPrefs();
    const cur = (prefs.repeat as any) || 'off';
    const next = order[(order.indexOf(cur as any) + 1) % order.length];
    savePrefs({ repeat: next as any });
    updateDock(true, state, DB);
    return;
  }
  if (action === 'q-play-all' || action === 'play-all') {
    const posts = Array.from(document.querySelectorAll('#feed .post')) as HTMLElement[];
    if (!posts.length) return;
    state.queue = posts.map((n) => n.dataset.post as string);
    state.qIndex = 0;
    const first = state.queue[0];
    // Start playback directly under this user gesture
    openAndPlay(first, state, DB);
    updateDock(true, state, DB);
    return;
  }
  if (action === 'q-play-from') {
    const idxAttr = btn?.getAttribute('data-queue-index');
    const idAttr = btn?.getAttribute('data-queue-id');
    const idx = idxAttr ? parseInt(idxAttr, 10) : -1;
    if (!state.queue || !state.queue.length) return;
    if (idx >= 0 && idx < state.queue.length) {
      state.qIndex = idx;
      const id = idAttr || state.queue[idx];
      openAndPlay(id, state, DB);
      updateDock(true, state, DB);
    }
    return;
  }

  // Allow clicking anywhere on a dock queue row to start that item
  if (!action) {
    const row = (e.target as HTMLElement).closest('.dock-queue-row') as HTMLElement | null;
    if (row) {
      const idxAttr = row.getAttribute('data-queue-index');
      const idAttr = row.getAttribute('data-queue-id');
      const idx = idxAttr ? parseInt(idxAttr, 10) : -1;
      if (idx >= 0 && state.queue && idx < state.queue.length) {
        state.qIndex = idx;
        const id = idAttr || state.queue[idx];
        openAndPlay(id, state, DB);
        updateDock(true, state, DB);
      }
      return;
    }
  }

  if (action === 'edit' && postId) {
    const db = DB.getAll();
    const p = (db.posts || []).find((x: any) => x.id === postId);
    if (!p) return;
    if (!state.user || p.userId !== state.user.id) { toast(card || root, 'you can only edit your posts', true); return; }
    // Simple inline editor replacing body, tags, title, artist, url
    const edit = document.createElement('div');
    edit.className = 'box';
    edit.innerHTML = `
      <div class="muted small">edit post</div>
      <form class="stack" data-action="edit-form" data-post="${p.id}">
        <input class="field" name="artist" value="${p.artist || ''}" placeholder="Artist" />
        <input class="field" name="title" value="${p.title || ''}" required maxlength="120" placeholder="Title" />
        <input class="field" name="url" value="${p.url || ''}" placeholder="Link (YouTube / Spotify / Bandcamp, etc)" />
        <input class="field" name="tags" value="${(p.tags || []).join(' ')}" placeholder="#Tags go here" />
        <textarea class="field" name="body" rows="4" maxlength="500" placeholder="Details">${p.body || ''}</textarea>
        <textarea class="field" name="lyrics" rows="4" maxlength="4000" placeholder="Paste lyrics here (optional)">${p.lyrics || ''}</textarea>
        <div class="hstack"><button class="btn" type="submit">[ save ]</button><button class="btn btn-ghost small" type="button" data-action="cancel-edit">[ cancel ]</button></div>
      </form>`;
    // Remove existing editor if any
    card?.querySelectorAll('.box form[data-action="edit-form"]').forEach((n) => (n as HTMLElement).closest('.box')?.remove());
    card?.appendChild(edit);
    return;
  }

  if (action === 'delete' && postId) {
    const db = DB.getAll();
    const p = (db.posts || []).find((x: any) => x.id === postId);
    if (!p) return;
    if (!state.user || p.userId !== state.user.id) { toast(card || root, 'you can only delete your posts', true); return; }
    await DB.deletePost(postId);
    card?.remove();
    return;
  }
}

export async function onDelegatedSubmit(e: SubmitEvent, state: any, DB: any, render: () => void) {
  const form = (e.target as HTMLElement).closest('form');
  if (!form) return;
  const act = form.getAttribute('data-action');
  if (!act) return;
  e.preventDefault();

  if (act === 'comment-form') {
    const pid = form.getAttribute('data-post'); if (!pid) return;
    if (!state.user) { toast($('#app'), 'login to comment', true); return; }
    const input = form.querySelector('input') as HTMLInputElement | null;
    const text = (input?.value || '').trim(); if (!text) return;
    const c = { id: uid('c'), userId: state.user.id, text, createdAt: Date.now() };
    await DB.addComment(pid, c);
    if (input) input.value = '';
    const updated = DB.getAll().posts.find((x: any) => x.id === pid);
    const cwrap = document.getElementById('comments-' + pid);
    if (cwrap) cwrap.innerHTML = (updated?.comments || []).map((x: any) => renderCommentHTML(x, pid, state, DB)).join('');
    liveSay('comment added');
    return;
  }

  if (act === 'edit-form') {
    const pid = form.getAttribute('data-post'); if (!pid) return;
    const title = (form.querySelector('[name=title]') as HTMLInputElement).value.trim();
    const artist = (form.querySelector('[name=artist]') as HTMLInputElement).value.trim();
    const url = (form.querySelector('[name=url]') as HTMLInputElement).value.trim();
    const body = (form.querySelector('[name=body]') as HTMLTextAreaElement).value.trim();
    const lyrics = ((form.querySelector('[name=lyrics]') as HTMLTextAreaElement) || { value: '' } as any).value.trim();
    const tagsRaw = (form.querySelector('[name=tags]') as HTMLInputElement).value.trim();
    const tags = tagsRaw.split(/[#,\s]+/g).map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 12);
    await DB.updatePost(pid, { title, artist, url, body, tags, lyrics });
    const updated = DB.getAll().posts.find((x: any) => x.id === pid);
    const card = document.getElementById('post-' + pid);
    if (updated && card) card.outerHTML = renderPostHTML(updated, state, DB);
    liveSay('post updated');
    return;
  }
}
