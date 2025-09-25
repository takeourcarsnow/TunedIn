import { esc, fmtTime, $, formatPostBody } from '../core/utils.js';
import { fetchOEmbed } from './oembed.js';
import { openEditInline } from './posts.js';
import { enableTagCloudDragScroll } from './tagcloud_scroll.js';
import { renderTagCloud } from './tags.js';
import Ticker from '../core/ticker.js';

function userName(id, state, DB) {
  const db = DB.getAll();
  const u = db.users.find(x => x.id === id);
  if (u) return u.name;
  if (state.user && state.user.id === id) return state.user.name || 'user';
  return 'anon';
}

export function getFilteredPosts(DB, prefs) {
  const db = DB.getAll();
  let posts = db.posts.slice();

  if (prefs.filterTag) {
    posts = posts.filter(p => (p.tags || []).includes(prefs.filterTag));
  }
  if (prefs.search) {
    const q = prefs.search.toLowerCase();
    posts = posts.filter(p => {
      return (p.title || '').toLowerCase().includes(q)
        || (p.artist || '').toLowerCase().includes(q)
        || (p.tags || []).some(t => t.includes(q))
        || (p.body || '').toLowerCase().includes(q);
    });
  }
  if (prefs.sort === 'likes') {
    posts.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0) || b.createdAt - a.createdAt);
  } else if (prefs.sort === 'comments') {
    posts.sort((a, b) => (b.comments?.length || 0) - (a.comments?.length || 0) || b.createdAt - a.createdAt);
  } else {
    posts.sort((a, b) => b.createdAt - a.createdAt);
  }
  return posts;
}

export function renderCommentHTML(c, postId, state, DB) {
  const canDel = state.user && c.userId === state.user.id;
  const db = DB.getAll();
  const u = db.users.find(x => x.id === c.userId) || null;
  const uname = userName(c.userId, state, DB);
  const avatarUrl = u && u.avatarUrl ? esc(u.avatarUrl) : '/assets/android-chrome-512x512.png';
    return `<div class="comment small" data-comment="${c.id}" data-post="${postId}">
      <img class="avatar avatar-sm" src="${avatarUrl}" alt="avatar" />
      <span class="muted">${fmtTime(c.createdAt)}</span> <b>${u ? `<a href="#" data-action="view-user" data-uid="${esc(u.id)}">${esc(uname)}</a>` : esc(uname)}</b>: ${esc(c.text)}
      ${canDel ? ` <button class="btn btn-ghost small" data-action="delete-comment" data-post="${postId}" data-comment="${c.id}">[ delete ]</button>` : ''}
    </div>`;
}

export function renderPostHTML(p, state, DB) {
  const db = DB.getAll();
  const user = db.users.find(u => u.id === p.userId);
  const me = state.user;
  const liked = me ? (p.likes || []).includes(me.id) : false;
  // Highlight selected tag
  const selectedTag = state && state.prefs && state.prefs.filterTag;
  const tgs = (p.tags || []).map(t =>
    `<a href="#" class="tag small${selectedTag && t === selectedTag ? ' tag-selected' : ''}" data-action="filter-tag" data-tag="${esc(t)}">#${esc(t)}</a>`
  ).join(' ');
  const perma = `${location.origin ? (location.origin + location.pathname) : location.pathname}#post-${p.id}`;
  const canEdit = !!(me && p.userId === me.id);
  const likeCount = p.likes ? p.likes.length : 0;
  const commentsCount = p.comments ? p.comments.length : 0;
  const commentsHTML = (p.comments || []).map(c => renderCommentHTML(c, p.id, state, DB)).join('');

  const authorAvatar = user && user.avatarUrl ? esc(user.avatarUrl) : '/assets/android-chrome-512x512.png';
  // Only show 'by' before artist or username, not both
  const artistHTML = p.artist ? `<span class="post-artist-twolines muted thin">by ${esc(p.artist)}</span>` : '';
  const userBy = p.artist ? '' : 'by ';
  // Determine thumbnail: keep lightweight defaults and add width/height to avoid CLS
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
  return `
  <article class="post" id="post-${p.id}" data-post="${p.id}" aria-label="${esc(p.title)}">
    <div class="post-inner">
      <div class="post-thumbnail-wrap">
        <img class="post-thumbnail" src="${thumbnailUrl}" srcset="${thumbnailUrl} 1x" width="320" height="180" alt="post thumbnail" loading="lazy" data-action="toggle-player" data-post="${p.id}" style="cursor:pointer;" />
      </div>
      <div class="post-header-twolines">
        <div class="post-title-twolines">${esc(p.title)} ${artistHTML}</div>
        <div class="small meta-twolines">
          <a href="#" data-action="view-user" data-uid="${user ? esc(user.id) : ''}">
            <img class="avatar avatar-sm" src="${authorAvatar}" alt="avatar" />
          </a>
          <span class="muted">${userBy}${user ? `<a href=\"#\" data-action=\"view-user\" data-uid=\"${esc(user.id)}\">${esc(user.name)}</a>` : 'anon'}</span>
          <span class="muted sep-slash">/</span>
          <span class="muted" title="${(() => { const d = new Date(p.createdAt); let m = d.getMinutes(); m = m < 15 ? 0 : m < 45 ? 30 : 0; if (m === 0 && d.getMinutes() >= 45) d.setHours(d.getHours() + 1); d.setMinutes(m, 0, 0); return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); })()}">${fmtTime(p.createdAt)}</span>
          ${tgs ? `<span class="muted sep-slash">/</span> <div class="tag-cloud post-tags-twolines">${tgs}</div>` : ''}
        </div>
      </div>
      ${p.body ? `<div class="sep"></div><div class="post-body">${formatPostBody(p.body)}</div>` : ''}
      <div class="actions hstack" style="margin-top:8px">
        <button class="btn" data-action="toggle-player">[ play ]</button>
        <button class="btn ${liked ? 'like-on' : ''}" data-action="like" aria-pressed="${liked}" title="like">[ ♥ ${likeCount} ]</button>
        <button class="btn" data-action="comment" title="comments">[ comments ${commentsCount} ]</button>
        <button class="btn btn-ghost" data-action="show-lyrics" data-artist="${esc(p.artist || '')}" data-title="${esc(p.title || '')}" data-post="${p.id}">[ lyrics ]</button>
        <button class="btn btn-ghost" data-action="queue" title="add to queue">[ add to queue ]</button>
        <button class="btn btn-ghost" data-action="share" data-perma="${esc(perma)}" title="share/copy link">[ share ]</button>
        ${canEdit ? `
          <button class="btn btn-ghost" data-action="edit" data-post="${p.id}">[ edit ]</button>
          <button class="btn btn-ghost" data-action="delete">[ delete ]</button>
        ` : ''}
      </div>
      <div class="lyrics-box small muted" id="lyrics-${p.id}" style="display:none;margin-top:8px;white-space:pre-line;position:relative;"></div>
      <div class="player" id="player-${p.id}" aria-label="player"></div>
      <div class="comment-box" id="cbox-${p.id}">
        <div class="sep"></div>
        <div id="comments-${p.id}">
          ${commentsHTML}
        </div>
        ${state.user ? `
          <form class="hstack" data-action="comment-form" data-post="${p.id}">
            <label class="sr-only" for="c-${p.id}">Write a comment</label>
            <input class="field" id="c-${p.id}" placeholder="write a comment…" maxlength="500" aria-label="Write a comment" />
            <button class="btn">[ send ]</button>
          </form>
        ` : `<div class="muted small">login to comment</div>`}
      </div>
    </div>
  </article>
  `;
}

export function renderFeed(el, pager, state, DB, prefs) {
  // --- Swipe gesture support for feed navigation ---
  // Attach touch handlers once per feed element to avoid leaking handlers
  if (!el._touchHandlersAttached) {
    let touchStartX = null;
    let touchEndX = null;
    const minSwipeDist = 60;
    function handleTouchStart(e) {
      if (e.touches && e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
      }
    }
    function handleTouchMove(e) {
      if (e.touches && e.touches.length === 1) {
        touchEndX = e.touches[0].clientX;
      }
    }
    function handleTouchEnd() {
      try {
        if (touchStartX !== null && touchEndX !== null) {
          const dist = touchEndX - touchStartX;
          if (Math.abs(dist) > minSwipeDist) {
            // Use current total from dataset (set later) to avoid referencing undefined 'total'
            const total = Number(el.dataset._total || 0);
            if (dist < 0 && state.page * state.pageSize < total) {
              // Swipe left: next page
              state.page++;
              renderFeed(el, pager, state, DB, prefs);
            } else if (dist > 0 && state.page > 1) {
              // Swipe right: previous page
              state.page--;
              renderFeed(el, pager, state, DB, prefs);
            }
          }
        }
      } catch (e) {
        // swallow errors from gesture handling
      }
      touchStartX = null;
      touchEndX = null;
    }
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    el._touchHandlersAttached = true;
  }
  // --- Preserve open comment boxes and their input values ---
  const openComments = Array.from(document.querySelectorAll('.comment-box.active')).map(box => box.id);
  // Map of comment box id -> input value
  const commentInputs = {};
  openComments.forEach(id => {
    const box = document.getElementById(id);
    if (box) {
      const inp = box.querySelector('input.field');
      if (inp) commentInputs[id] = inp.value;
    }
  });

  // Attach prefs to state for tag highlighting
  state = { ...state, prefs };
  // Read DB once for this render to avoid repeated getAll calls
  const dbSnapshot = DB.getAll();
  let posts = getFilteredPosts(DB, prefs);
  // User filter support (from prefs or global)
  const userId = prefs._userFilterId || window.filterPostsByUserId;
  if (userId) {
    posts = posts.filter(p => p.userId === userId);
  }
  const total = posts.length;
  // Expose total for touch handlers that run outside render to avoid referencing undefined
  try { el.dataset._total = String(total); } catch (e) {}

  // Ensure sane paging defaults
  if (!state.pageSize || typeof state.pageSize !== 'number' || state.pageSize < 1) state.pageSize = 5;
  if (!state.page || typeof state.page !== 'number' || state.page < 1) state.page = 1;

  const limit = Math.min(total, state.page * state.pageSize);
  const postsToShow = posts.slice(0, limit);

  if (total === 0) {
    el.innerHTML = `<div class="notice small">No posts yet. Add one on the right.</div>`;
    pager.innerHTML = '';
    return;
  }

  // If this is the first page (or feed empty) do a full replace to preserve
  // comment box state and other UI. On subsequent pages, append only new posts.
  const existingIds = Array.from(el.querySelectorAll('.post')).map(x => x.getAttribute('data-post'));
  // Batch DOM writes: build fragment then replace/append
  const frag = document.createDocumentFragment();
  const container = document.createElement('div');
  container.innerHTML = postsToShow.map(p => renderPostHTML(p, state, DB)).join('');
  // Move children into fragment
  while (container.firstChild) frag.appendChild(container.firstChild);
  if (state.page === 1 || existingIds.length === 0) {
    el.innerHTML = '';
    el.appendChild(frag);
  } else {
    // Only append posts that are not already present
    const existingSet = new Set(existingIds);
    const nodesToAppend = Array.from(frag.childNodes).filter(n => !existingSet.has(n.getAttribute && n.getAttribute('data-post')));
    nodesToAppend.forEach(n => el.appendChild(n));
  }

  // Background: replace Spotify logo placeholders with actual thumbnails via Spotify oEmbed
  function scheduleReplaceSpotifyThumbnails() {
    const task = async () => {
      try {
        const spotifyPosts = postsToShow.filter(p => p.url && /spotify\.com/.test(p.url));
        if (!spotifyPosts.length) return;
        for (const p of spotifyPosts) {
          try {
            if (!p.thumbnail || (p.thumbnail && p.thumbnail.includes('spotify-logo'))) {
              const md = await fetchOEmbed(p.url);
              if (md && md.thumbnail_url) {
                try { p.thumbnail = md.thumbnail_url; } catch {}
                // Update main DB post as well
                if (window.DB && typeof window.DB.updatePost === 'function') {
                  try { await window.DB.updatePost(p.id, { thumbnail: md.thumbnail_url }); } catch (e) { /* ignore DB update errors */ }
                }
                const img = document.querySelector(`#post-${p.id} .post-thumbnail`);
                if (img) {
                  // Ensure srcset is updated/removed so the browser doesn't keep using the placeholder
                  try { img.removeAttribute('srcset'); } catch (e) {}
                  img.src = md.thumbnail_url;
                  try { img.srcset = md.thumbnail_url + ' 1x'; } catch (e) {}
                  img.dataset.spotifyThumb = '1';
                  try { img.complete = false; } catch (e) {}
                  // do not log to console
                }
              }
            }
          } catch (e) {
            // per-post failure ignored
          }
        }
      } catch (e) {
        // overall failure ignored
      }
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      try { requestIdleCallback(task, { timeout: 2000 }); } catch (e) { setTimeout(task, 1200); }
    } else {
      setTimeout(task, 1200);
    }
  }
  scheduleReplaceSpotifyThumbnails();

  // --- Restore open comment boxes and their input values ---
  openComments.forEach(id => {
    const box = document.getElementById(id);
    if (box) {
      box.classList.add('active');
      const inp = box.querySelector('input.field');
      if (inp && commentInputs[id] !== undefined) inp.value = commentInputs[id];
    }
  });

  // Save for edit restore
  setFeedGlobals(state, DB);

  // Lazy-init players when post is visible using IntersectionObserver
  try {
    if (typeof IntersectionObserver !== 'undefined') {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const postEl = entry.target;
          const postId = postEl.getAttribute('data-post');
          // Initialize player only when needed (placeholder behavior)
          const player = postEl.querySelector('.player');
          if (player && !player.dataset.inited) {
            // Mark as inited; actual heavy init happens on play
            player.dataset.inited = '1';
          }
          io.unobserve(postEl);
        });
      }, { root: null, rootMargin: '200px', threshold: 0.01 });
      document.querySelectorAll('.post').forEach(p => io.observe(p));
    }
  } catch (e) { /* ignore */ }

  // Restore edit panel if editingPostId is set
  if (window.editingPostId) {
    const card = document.getElementById('post-' + window.editingPostId);
    const editBoxId = 'editbox-' + window.editingPostId;
    const editPanel = document.getElementById(editBoxId);
    if (card && editPanel && editPanel.parentNode !== card) {
      // Move the existing edit panel back into the card (no animation, no re-creation)
      card.appendChild(editPanel);
    } else if (card && !editPanel) {
      // If not present at all, create it (no animation on restore)
      openEditInline(window.editingPostId, state, DB, { noAnimation: true });
    }
  }
// Attach edit button handler globally (once)
if (!window._editBtnHandlerAttached) {
  document.addEventListener('click', function(e) {
    // Edit button
    const editBtn = e.target.closest('button[data-action="edit"][data-post]');
    if (editBtn) {
      const postId = editBtn.getAttribute('data-post');
      const card = document.getElementById('post-' + postId);
      // Close lyrics panel if open
      const lyricsBox = document.getElementById('lyrics-' + postId);
      if (lyricsBox && lyricsBox.style.display === 'block') {
        lyricsBox.classList.remove('fade-in');
        lyricsBox.classList.add('fade-out');
        setTimeout(() => {
          lyricsBox.style.display = 'none';
          lyricsBox.textContent = '';
          lyricsBox.classList.remove('fade-out');
        }, 180);
      }
      const editBoxId = 'editbox-' + postId;
      const opened = card ? card.querySelector('#' + editBoxId) : null;
      if (opened) {
        // If already open, close it
        opened.classList.remove('fade-in');
        opened.classList.add('fade-out');
        setTimeout(() => {
          if (opened.parentNode) opened.parentNode.removeChild(opened);
          if (window.editingPostId == postId) window.editingPostId = null;
        }, 180);
      } else {
        openEditInline(postId, window._lastFeedState, window._lastFeedDB);
      }
      e.preventDefault();
      return;
    }
    // Comment button
    const commentBtn = e.target.closest('button[data-action="comment"][data-post],button[data-action="comment"]');
    if (commentBtn) {
      const postId = commentBtn.getAttribute('data-post') || (commentBtn.closest('.post') && commentBtn.closest('.post').dataset.post);
      if (postId) {
        // Close lyrics panel if open
        const lyricsBox = document.getElementById('lyrics-' + postId);
        if (lyricsBox && lyricsBox.style.display === 'block') {
          lyricsBox.classList.remove('fade-in');
          lyricsBox.classList.add('fade-out');
          setTimeout(() => {
            lyricsBox.style.display = 'none';
            lyricsBox.textContent = '';
            lyricsBox.classList.remove('fade-out');
          }, 180);
        }
      }
    }
    // ...existing code...
  });
  window._editBtnHandlerAttached = true;
}

// Save last state/DB for edit restore
function setFeedGlobals(state, DB) {
  window._lastFeedState = state;
  window._lastFeedDB = DB;
}

  // Pager: show how many are loaded vs total
  pager.innerHTML = `<div class="small muted">${Math.min(limit, total)}/${total} loaded</div>`;

  // If we've loaded everything, disconnect any global observer used for infinite-scroll
  try {
    if (typeof window !== 'undefined' && window._feedObserver && limit >= total) {
      try { window._feedObserver.disconnect(); } catch (e) {}
    }
  } catch (e) {}

  const h = (location.hash || '').trim();
  if (h.startsWith('#post-')) {
    const id = h.slice(6);
    const node = document.getElementById('post-' + id);
    if (node) {
      node.classList.add('highlight');
      node.scrollIntoView({ block: 'start' });
      setTimeout(() => node.classList.remove('highlight'), 1500);
    }
    history.replaceState(null, '', location.pathname);
  }

  // Always enable drag-to-scroll for each feed post's tag list
  document.querySelectorAll('.tag-cloud.post-tags-twolines').forEach(tc => {
    enableTagCloudDragScroll(tc);
  });

  // Attach event delegation for post thumbnail click to play post
  if (!window._thumbnailPlayHandlerAttached) {
    el.addEventListener('click', function(e) {
      const thumb = e.target.closest('.post-thumbnail[data-action="toggle-player"]');
      if (thumb) {
        e.preventDefault();
        e.stopPropagation();
        const postId = thumb.getAttribute('data-post');
        const playBtn = document.querySelector(`#post-${postId} .btn[data-action="toggle-player"]`);
        if (playBtn) {
          // Dispatch a real click event to trigger all listeners
          playBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        }
      }
    });
    window._thumbnailPlayHandlerAttached = true;
  }
}

export function renderTags(el, DB, prefs) {
  // Delegate to centralized tag renderer
  try {
    renderTagCloud(el, DB, prefs, { limit: 80 });
  } catch (e) {
    // Fallback: no-op
    el.innerHTML = '<span class="muted small">no tags yet</span>';
  }
}