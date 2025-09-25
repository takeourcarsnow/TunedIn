// js/views/main_view_refresh.js
import { $ } from '../core/utils.js';
import { loadPrefs } from '../auth/prefs.js';
import { renderFeed, renderTags, getFilteredPosts } from '../features/feed.js';

async function smartRefresh(state, DB) {
  if (typeof DB.refresh !== 'function') return;

  const activePlayer = document.querySelector('.player.active');
  await DB.refresh();

  const feedEl = $('#feed');
  const pagerEl = $('#pager');
  const tagsEl = $('#tags');
  if (!feedEl || !pagerEl || !tagsEl) return; // Not on main view

  if (!activePlayer) {
    // Save tag cloud scroll position before rerender
    const tagCloud = document.querySelector('.tag-cloud');
    if (tagCloud) {
      window._tagCloudScrollLeft = tagCloud.scrollLeft;
    }
    const prefs = loadPrefs();
    renderFeed(feedEl, pagerEl, state, DB, prefs);
    renderTags(tagsEl, DB, prefs);
    return;
  }

  const prefs = loadPrefs();
  const posts = getFilteredPosts(DB, prefs);

  // Update like counts and comment counts for visible posts
  posts.forEach(p => {
    const postEl = document.getElementById('post-' + p.id);
    if (postEl) {
      const likeBtn = postEl.querySelector('[data-action="like"]');
      if (likeBtn) {
        likeBtn.innerHTML = `[ ♥ ${p.likes ? p.likes.length : 0} ]`;
        const pressed = (p.likes || []).includes(state.user && state.user.id) ? 'true' : 'false';
        likeBtn.setAttribute('aria-pressed', pressed);
        if (pressed === 'true') likeBtn.classList.add('like-on');
        else likeBtn.classList.remove('like-on');
      }
      const commentBtn = postEl.querySelector('[data-action="comment"]');
      if (commentBtn) commentBtn.innerHTML = `[ comments ${p.comments ? p.comments.length : 0} ]`;
    }
  });

  // Append new posts if any
  const existingIds = Array.from(feedEl.querySelectorAll('.post')).map(el => el.getAttribute('data-post'));
  const newPosts = posts.filter(p => !existingIds.includes(String(p.id)));
  if (newPosts.length > 0) {
    const mod = await import('../features/feed.js'); // dynamic import from features
    const html = newPosts.map(p => mod.renderPostHTML(p, state, DB)).join('');
    feedEl.insertAdjacentHTML('beforeend', html);
  }

  // Update pager and tags
  const loaded = existingIds.length;
  if (posts.length > loaded) {
    pagerEl.innerHTML = `<button class="btn btn-ghost" data-action="load-more">[ load more (${loaded}/${posts.length}) ]</button>`;
    // Wire the button to call the shared loadMore helper
    const btn = pagerEl.querySelector('button[data-action="load-more"]');
    if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); if (window._loadMoreInFeed) window._loadMoreInFeed(); });
  } else {
    pagerEl.innerHTML = `<div class="small muted">${posts.length} loaded</div>`;
  }
  renderTags(tagsEl, DB, prefs);
}

export function setupAutoRefresh(state, DB) {
  if (!window._autoFeedRefresh) {
    window._autoFeedRefresh = setInterval(() => {
      smartRefresh(state, DB).catch(console.error);
    }, 600000); // 10 minutes
  }
}

export function setupVisibilityRefresh(state, DB) {
  // To re-enable auto-refresh on page refocus or visibility change, uncomment the code below:
  /*
  if (!window._feedVisibilityHandler) {
    const instantRefresh = () => smartRefresh(state, DB).catch(console.error);
    window.addEventListener('focus', instantRefresh);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') instantRefresh();
    });
    window._feedVisibilityHandler = true;
  }
  */
}