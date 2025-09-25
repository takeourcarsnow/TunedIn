import { esc, formatPostBody, fmtTime, toast } from '../core/utils';
import { fetchOEmbed } from './oembed';
import { buildEmbed } from './embed';
import { queueNext, markNowPlaying, updateDock } from './queue';

export type Prefs = {
  autoScroll: boolean;
  sort: 'new' | 'likes' | 'comments';
  search: string;
  filterTag: string | null;
  accent: string; density: string; shuffle: boolean; repeat: 'off' | 'all' | 'one';
};

export function getFilteredPosts(DB: any, prefs: Prefs) {
  const db = DB.getAll();
  let posts = [...(db.posts || [])];
  if (prefs.filterTag) posts = posts.filter((p) => Array.isArray(p.tags) && p.tags.map((t: string) => (t || '').toLowerCase()).includes(prefs.filterTag!.toLowerCase()));
  if (prefs.search) {
    const q = prefs.search.toLowerCase();
    posts = posts.filter((p) =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.artist || '').toLowerCase().includes(q) ||
      (Array.isArray(p.tags) ? p.tags.join(' ') : '').toLowerCase().includes(q)
    );
  }
  if (prefs.sort === 'likes') posts.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
  else if (prefs.sort === 'comments') posts.sort((a, b) => (b.comments?.length || 0) - (a.comments?.length || 0));
  else posts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return posts;
}

export function renderPostHTML(p: any, state: any, DB: any) {
  const db = DB.getAll();
  const user = (db.users || []).find((u: any) => u.id === p.userId) || null;
  const me = state.user;
  const liked = me ? (p.likes || []).includes(me.id) : false;
  const commentsHTML = (p.comments || []).map((c: any) => renderCommentHTML(c, p.id, state, DB)).join('');

  // Determine thumbnail
  let thumbnailUrl = '/assets/logo.png';
  if (p.thumbnail) {
    thumbnailUrl = esc(p.thumbnail);
  } else if (p.url) {
    const ytMatch = p.url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([\w-]{11})/);
    if (ytMatch) {
      thumbnailUrl = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
    } else if (/soundcloud\.com/.test(p.url)) {
      thumbnailUrl = '/assets/logo.png';
    } else if (/spotify\.com/.test(p.url)) {
      thumbnailUrl = '/assets/spotify-logo.png';
    }
  }

  const artistHTML = p.artist ? `<span class="post-artist-twolines muted thin">by ${esc(p.artist)}</span>` : '';
  const userBy = p.artist ? '' : 'by ';

  return `
    <article class="post" id="post-${esc(p.id)}" data-post="${esc(p.id)}" aria-label="${esc(p.title)}">
      <div class="post-inner">
        <div class="post-thumbnail-wrap">
          <img class="post-thumbnail" src="${thumbnailUrl}" srcset="${thumbnailUrl} 1x" width="320" height="180" alt="post thumbnail" loading="lazy" data-action="toggle-player" data-post="${esc(p.id)}" style="cursor:pointer;" />
        </div>
        <div class="post-header-twolines">
          <div class="post-title-twolines">${esc(p.title)} ${artistHTML}</div>
          <div class="small meta-twolines">
            <a href="#" data-action="view-user" data-uid="${user ? esc(user.id) : ''}">
              <img class="avatar avatar-sm" src="${user && user.avatarUrl ? esc(user.avatarUrl) : '/assets/android-chrome-512x512.png'}" alt="avatar" />
            </a>
            <span class="muted">${userBy}${user ? `<a href="#" data-action="view-user" data-uid="${esc(user.id)}">${esc(user.name)}</a>` : 'anon'}</span>
            <span class="muted sep-slash">/</span>
            <span class="muted" title="${new Date(p.createdAt).toLocaleString()}">${fmtTime(p.createdAt)}</span>
          </div>
        </div>
  ${p.body ? `<div class="sep"></div><div class="post-body">${formatPostBody(p.body)}</div>` : ''}
  ${Array.isArray(p.tags) && p.tags.length ? `<div class="post-tags" style="margin-top:6px;">${(p.tags || []).map((t: string) => `<button class="tag small" data-action="filter-tag" data-tag="${esc(t)}">#${esc(t)}</button>`).join(' ')}</div>` : ''}
        <div class="actions hstack" style="margin-top:8px">
          <button class="btn" data-action="toggle-player">[ play ]</button>
          <button class="btn ${liked ? 'like-on' : ''}" data-action="like" aria-pressed="${liked}">[ ♥ ${(p.likes || []).length} ]</button>
          <button class="btn" data-action="comment">[ comments ${(p.comments || []).length} ]</button>
          <button class="btn btn-ghost" data-action="show-lyrics" data-artist="${esc(p.artist || '')}" data-title="${esc(p.title || '')}" data-post="${esc(p.id)}">[ lyrics ]</button>
          ${p.url ? `<a class="btn btn-ghost" href="${esc(p.url)}" target="_blank" rel="noopener">[ open ]</a>` : ''}
          ${me && me.id === p.userId ? `<button class="btn btn-ghost" data-action="edit" data-post="${esc(p.id)}">[ edit ]</button>` : ''}
        </div>
        <div class="lyrics-box small muted" id="lyrics-${esc(p.id)}" style="display:none;margin-top:8px;white-space:pre-line;position:relative;"></div>
        <div id="player-${esc(p.id)}" class="player" aria-live="polite"></div>
        <div class="comment-box" id="cbox-${esc(p.id)}">
          <div class="sep"></div>
          <div id="comments-${esc(p.id)}">${commentsHTML}</div>
          ${(me) ? `
            <form class="hstack" data-action="comment-form" data-post="${esc(p.id)}">
              <label class="sr-only" for="c-${esc(p.id)}">Write a comment</label>
              <input class="field" id="c-${esc(p.id)}" placeholder="write a comment…" maxlength="500" aria-label="Write a comment" />
              <button class="btn">[ send ]</button>
            </form>` : `<div class="muted small">login to comment</div>`}
        </div>
      </div>
    </article>
  `;
}

export function renderCommentHTML(c: any, postId: string, state: any, DB: any) {
  const user = (DB.getAll().users || []).find((u: any) => u.id === c.userId) || null;
  const who = user ? user.name : 'anon';
  const when = typeof c.createdAt === 'number' ? fmtTime(c.createdAt) : '';
  return `
    <div class="comment" data-comment="${esc(c.id)}">
      <span class="muted small">${esc(who)}</span>
      <span class="muted small" style="opacity:.7;">${esc(when)}</span>
      <div>${formatPostBody(c.text || '')}</div>
    </div>
  `;
}

export function renderFeed(feedEl: HTMLElement | null, pagerEl: HTMLElement | null, state: any, DB: any, prefs: Prefs) {
  if (!feedEl || !pagerEl) return;
  if (!state.pageSize || typeof state.pageSize !== 'number' || state.pageSize < 1) state.pageSize = 5;
  if (!state.page || typeof state.page !== 'number' || state.page < 1) state.page = 1;
  const posts = getFilteredPosts(DB, prefs);
  const total = posts.length;
  const end = Math.min(total, state.page * state.pageSize);
  const slice = posts.slice(0, end);
  // If first page, replace; if later pages, append only new ones
  if (state.page === 1) feedEl.innerHTML = slice.map((p) => renderPostHTML(p, state, DB)).join('');
  else {
    const startIdx = Math.max(0, (state.page - 1) * state.pageSize);
    const add = slice.slice(startIdx);
    feedEl.insertAdjacentHTML('beforeend', add.map((p) => renderPostHTML(p, state, DB)).join(''));
  }
  // Pager
  if (end < total) {
    pagerEl.innerHTML = `<button class="btn btn-ghost" data-action="load-more">[ load more (${end}/${total}) ]</button>`;
    const btn = pagerEl.querySelector('button[data-action="load-more"]') as HTMLButtonElement | null;
    if (btn) btn.onclick = (e) => { e.preventDefault(); if ((window as any)._loadMoreInFeed) (window as any)._loadMoreInFeed(); };
  } else {
    pagerEl.innerHTML = `<div class="small muted">${total} loaded</div>`;
  }
  // Global helper to load next page used by header/scroll handlers
  (window as any)._loadMoreInFeed = function () {
    const postsNow = getFilteredPosts(DB, prefs);
    const current = Math.min(postsNow.length, state.page * state.pageSize);
    if (current >= postsNow.length) return false;
    state.page++;
    renderFeed(feedEl, pagerEl, state, DB, prefs);
    return true;
  };

  // Autoload on scroll / intersection: if prefs.autoScroll is enabled, automatically
  // call _loadMoreInFeed when the pager element comes into view. Use IntersectionObserver
  // with a small debounce. Fall back to a scroll handler for old browsers.
  try {
    // cleanup previous handlers
  if ((window as any)._feedObserver) { try { (window as any)._feedObserver.disconnect(); } catch {} (window as any)._feedObserver = null; }
  if ((window as any)._feedScrollHandler) { try { (window as any).removeEventListener('scroll', (window as any)._feedScrollHandler); } catch {} (window as any)._feedScrollHandler = null; }

    if (prefs && (prefs as any).autoScroll && end < total) {
      if ('IntersectionObserver' in window) {
        let pending = false;
        const obs = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              if (pending) return;
              pending = true;
              // small debounce to avoid rapid multiple loads
              setTimeout(() => {
                try { (window as any)._loadMoreInFeed && (window as any)._loadMoreInFeed(); } catch {}
                pending = false;
              }, 200);
            }
          }
        }, { rootMargin: '300px', threshold: 0.1 });
        try { obs.observe(pagerEl); } catch {}
        (window as any)._feedObserver = obs;
      } else {
        const handler = () => {
          try {
            const rect = pagerEl.getBoundingClientRect();
            const vh = window.innerHeight || document.documentElement.clientHeight;
            if (rect.top < vh + 300) {
              (window as any)._loadMoreInFeed && (window as any)._loadMoreInFeed();
            }
          } catch (e) {}
        };
        (window as any).addEventListener('scroll', handler);
        (window as any)._feedScrollHandler = handler;
        // trigger once in case pager already in view
        try { handler(); } catch {}
      }
    }
  } catch (e) { /* non-fatal */ }

  // Background: replace Spotify logo placeholders with actual thumbnails via Spotify oEmbed
  async function scheduleReplaceSpotifyThumbnails() {
    try {
      const spotifyPosts = slice.filter(p => p.url && /spotify\.com/.test(p.url));
      if (!spotifyPosts.length) return;
      for (const p of spotifyPosts) {
        try {
          if (!p.thumbnail || (p.thumbnail && p.thumbnail.includes('spotify-logo'))) {
            const md = await fetchOEmbed(p.url);
            if (md && (md as any).thumbnail_url) {
              try { p.thumbnail = (md as any).thumbnail_url; } catch {}
              if ((window as any).DB && typeof (window as any).DB.updatePost === 'function') {
                try { await (window as any).DB.updatePost(p.id, { thumbnail: (md as any).thumbnail_url }); } catch (e) { /* ignore DB update errors */ }
              }
              const img = document.querySelector(`#post-${p.id} .post-thumbnail`) as HTMLImageElement | null;
              if (img) {
                try { img.removeAttribute('srcset'); } catch {}
                img.src = (md as any).thumbnail_url;
                try { img.srcset = (md as any).thumbnail_url + ' 1x'; } catch {}
                img.dataset.spotifyThumb = '1';
              }
            }
          }
        } catch (e) { /* per-post ignored */ }
      }
    } catch (e) { /* overall ignored */ }
  }
  if (typeof window !== 'undefined') {
    if ('requestIdleCallback' in window) try { (window as any).requestIdleCallback(() => scheduleReplaceSpotifyThumbnails(), { timeout: 2000 }); } catch { setTimeout(() => scheduleReplaceSpotifyThumbnails(), 1200); }
    else setTimeout(() => scheduleReplaceSpotifyThumbnails(), 1200);
  }

  // Attach event delegation for post thumbnail click to play post
  if (!window._thumbnailPlayHandlerAttached) {
    // When a user clicks the thumbnail we must create the embed during that real user gesture
    // so browsers allow autoplay. Instead of dispatching a synthetic click, build the embed here.
    try { console.debug && console.debug('feed: attaching thumbnail click handler'); } catch {}
    feedEl.addEventListener('click', function(e) {
      const target = (e.target as HTMLElement).closest('.post-thumbnail[data-action="toggle-player"]') as HTMLElement | null;
      if (!target) return;
      e.preventDefault();
      e.stopPropagation();
      const postId = target.getAttribute('data-post');
      try { console.debug && console.debug('feed: thumbnail click for', postId); } catch {}
      if (!postId) return;

      const pl = document.getElementById('player-' + postId) as HTMLElement | null;
      if (!pl) return;
      try { console.debug && console.debug('thumbnail click for', postId); } catch {}

      // toggle behavior: if active, cleanup; if not, build embed immediately under user gesture
      if (pl.classList.contains('active')) {
        pl.classList.remove('active');
        try { (pl as any)._cleanup && (pl as any)._cleanup(); } catch {}
        pl.innerHTML = '';
        const playingCard = document.querySelector('.post.is-playing') as HTMLElement | null;
        playingCard?.classList.remove('is-playing');
        try { console.debug && console.debug('thumbnail: cleaned up player for', postId); } catch {}
        return;
      }

      // close other players
      document.querySelectorAll('.player.active').forEach((el) => { el.classList.remove('active'); try { (el as any)._cleanup && (el as any)._cleanup(); } catch {}; (el as HTMLElement).innerHTML = ''; el.parentElement?.classList.remove('is-playing'); });
    pl.classList.add('active');
    try { console.debug && console.debug('feed: marked player element active for', postId); } catch {}

  try { console.debug && console.debug('thumbnail: building embed for', postId); } catch {}

      const db = DB.getAll();
      const p = (db.posts || []).find((x: any) => String(x.id) === String(postId));
  if (!p) { try { console.debug && console.debug('feed: no post found for', postId); } catch {} ; return; }
  try { console.debug && console.debug('feed: post url for', postId, 'is', p.url); } catch {}

      // Build queue from current feed order
      const posts = document.querySelectorAll('#feed .post');
      state.queue = Array.from(posts).map((n) => (n as HTMLElement).dataset.post as string);
      state.qIndex = state.queue.indexOf(postId);

  buildEmbed(p, pl, { autoplay: true, onEnded: () => queueNext(true, state, DB) });
      // Diagnostic: if the player container is still empty shortly after a user gesture,
      // surface a toast and a console message so we can see why the embed did not render.
      setTimeout(() => {
        try {
          const inner = (pl && pl.innerHTML) ? pl.innerHTML.trim() : '';
          if (!inner) {
            try { console.debug && console.debug('feed: player container empty after buildEmbed for', postId); } catch {}
            try { toast(pl, 'embed failed to load', true); } catch {}
          } else {
            try { console.debug && console.debug('feed: player container has children for', postId, pl.querySelectorAll('*').length); } catch {}
          }
        } catch (e) { /* ignore */ }
      }, 500);
      markNowPlaying(postId, state, DB);
      updateDock(true, state, DB);
      const card = document.getElementById('post-' + postId);
      card?.scrollIntoView({ block: 'center' });
    });
    window._thumbnailPlayHandlerAttached = true;
  }
}

export function renderTags(tagsEl: HTMLElement | null, DB: any, prefs: Prefs) {
  if (!tagsEl) return;
  const tags = new Map<string, number>();
  for (const p of DB.getAll().posts || []) {
    for (const t of p.tags || []) { const tag = String(t || '').toLowerCase(); if (!tag) continue; tags.set(tag, (tags.get(tag) || 0) + 1); }
  }
  const items = Array.from(tags.entries()).sort((a, b) => b[1] - a[1]).slice(0, 50);
  // Build a horizontal, scrollable tag cloud so CSS can style it as a carousel
  const tagCloudDiv = document.createElement('div');
  tagCloudDiv.className = 'tag-cloud';
  tagCloudDiv.innerHTML = items.map(([t, n]) => `<button type="button" class="tag" data-action="filter-tag" data-tag="${esc(t)}">#${esc(t)} <span class="muted">${n}</span></button>`).join(' ');
  // Replace contents and attach click handler
  tagsEl.innerHTML = '';
  tagsEl.appendChild(tagCloudDiv);
  tagCloudDiv.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('[data-action="filter-tag"]') as HTMLElement | null;
    if (!btn) return;
    e.preventDefault();
    const tag = btn.getAttribute('data-tag');
    (window as any).filterPostsByUserId = null;
    if (prefs) (prefs as any).filterTag = tag;
    const feed = document.getElementById('feed'); const pager = document.getElementById('pager');
    renderFeed(feed, pager, stateRef, DB, prefs);
  });
}

// Simple shared state reference for tag click rerender (set by main_view)
let stateRef: any = null;
export function setStateRef(s: any) { stateRef = s; }
