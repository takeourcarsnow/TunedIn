import { $, esc, toast, liveSay, copyText, uid } from '../core/utils.js';
import { parseProvider, buildEmbed } from './providers.js';
import { loadPrefs, savePrefs, PREF_KEY, resetPrefsCache } from '../auth/prefs.js';
import { SESSION_KEY, GUEST_KEY, setGuestMode, clearSession } from '../auth/session.js';
import { renderFeed, renderPostHTML, renderCommentHTML, renderTags } from './feed.js';
import { notifyPostLike, notifyPostComment } from '../core/notify_helpers.js';
import { containsBannedWords, looksLikeSpam } from './automod.js';
import { openEditInline } from './posts.js';
import { showUserProfile } from '../views/profile.js';
import { supabase } from '../core/supabase_client.js';
import { pickAccent } from '../auth/theme.js';
import { updateDock, queuePrev, queueNext, markNowPlaying, getActiveQueueId } from './queue.js';
import { openHelpOverlay } from '../views/overlays.js';

export async function onActionClick(e, state, DB, render) {

// Helper: update the small header pill that shows the currently selected tag
// so the clear control (✕) appears immediately on mobile in-place updates.
function updateFeedHeaderTagPill(prefs) {
  try {
    const feedHeader = document.querySelector('.feed-header-bar .hstack');
    if (!feedHeader) return;
    // Find the container that currently holds pills (left side hstack)
    const leftHstack = feedHeader.closest('.feed-header-bar')?.querySelector('.hstack');
    // The markup in main_view_feed constructs the pill into the header via template
    // Recreate only the tag pill region to be safe.
    const pillContainer = feedHeader.querySelector('.pill');
    if (prefs && prefs.filterTag) {
      const html = `tag: #${prefs.filterTag} <a href="#" data-action="clear-tag" title="clear tag">✕</a>`;
      if (pillContainer) {
        pillContainer.innerHTML = html;
      } else {
        // Insert a new pill span into the left hstack
        const left = feedHeader.querySelector('div') || feedHeader;
        const span = document.createElement('span');
        span.className = 'pill';
        span.innerHTML = html;
        left.insertBefore(span, left.firstChild);
      }
    } else {
      // Remove any existing tag pill
      document.querySelectorAll('.feed-header-bar .pill').forEach(el => {
        // Only remove pills that contain 'tag:' text to avoid removing user filter
        if (el.textContent && el.textContent.trim().startsWith('tag:')) el.remove();
      });
    }
  } catch (err) {
    // silent fail
  }
}
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  if (action === 'q-stop') {
    const activePlayer = document.querySelector('.player.active');
    if (activePlayer) {
      // Pause and reset audio/video
      activePlayer.querySelectorAll('audio,video').forEach(el => {
        el.pause && el.pause();
        el.currentTime = 0;
      });
      // Stop and clear iframes (YouTube, etc.)
      const iframes = Array.from(activePlayer.querySelectorAll('iframe'));
      iframes.forEach(ifr => {
        // Try to use YouTube IFrame API if available
        try {
          if (ifr.contentWindow && ifr.src && ifr.src.includes('youtube')) {
            ifr.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'stopVideo', args: '' }), '*');
          }
        } catch (err) {}
        // Set src to about:blank to force stop
        try { ifr.src = 'about:blank'; } catch {}
      });
      // Wait 100ms before removing iframe and cleaning up
      setTimeout(() => {
        // Remove .player-portal wrapper if present (mobile YouTube fix)
        if (activePlayer._portal && activePlayer._portal.wrapper) {
          try { activePlayer._portal.wrapper.remove(); } catch {}
          try { window.removeEventListener('scroll', activePlayer._portal.update); } catch {}
          try { window.removeEventListener('resize', activePlayer._portal.update); } catch {}
          activePlayer._portal = null;
        }
        // Call any custom cleanup
        try { activePlayer._cleanup && activePlayer._cleanup(); } catch {}
        // Clear player content and reset styles
        activePlayer.innerHTML = '';
        try { activePlayer.style.zIndex = ''; activePlayer.style.position = ''; } catch {}
        activePlayer.classList.remove('active');
        const playingPost = document.querySelector('.post.is-playing');
        if (playingPost) playingPost.classList.remove('is-playing');
      }, 100);
    }
    return;
  }
  const root = $('#app');
  const card = e.target.closest('.post');
  const postId = card ? card.dataset.post : null;

  // Show Lyrics button handler
  if (action === 'show-lyrics' && postId) {
    const artist = btn.dataset.artist;
    const title = btn.dataset.title;
    const lyricsBox = document.getElementById('lyrics-' + postId);
    const db = DB.getAll();
    const post = db.posts.find(x => String(x.id) === String(postId));
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
    // Close open comment or edit panels in this post card
    if (card) {
      // Close comment box if open
      const commentBox = card.querySelector('.comment-box.active');
      if (commentBox) commentBox.classList.remove('active');
      // Close edit panel if open
      const editPanel = card.querySelector('[id^="editbox-"]');
      if (editPanel) {
        editPanel.classList.remove('fade-in');
        editPanel.classList.add('fade-out');
        setTimeout(() => {
          if (editPanel.parentNode) editPanel.parentNode.removeChild(editPanel);
          if (window.editingPostId == postId) window.editingPostId = null;
        }, 180);
      }
    }
    lyricsBox.style.display = 'block';
    lyricsBox.classList.remove('fade-out');
    lyricsBox.classList.add('fade-in');
    // Always use a wrapper span for lyrics text
    let lyricsText = lyricsBox.querySelector('.lyrics-text');
    if (!lyricsText) {
      lyricsText = document.createElement('span');
      lyricsText.className = 'lyrics-text';
      lyricsText.style.whiteSpace = 'pre-line';
      lyricsBox.appendChild(lyricsText);
    }
    // Add copy button if not present
    let copyBtn = lyricsBox.querySelector('.copy-lyrics-btn');
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
      copyBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const text = lyricsText.textContent;
        if (text) {
          copyText(text);
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
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        lyricsBox.textContent = 'Network error or CORS issue. Try reloading or check your connection.';
      } else {
        lyricsBox.textContent = 'Lyrics not found. (' + (err.message || err) + ')';
      }
      console.error('[Lyrics Fetch] Error:', err);
    }
    return;
  }

  if (action === 'toggle-player' && postId) {
    const pl = document.getElementById('player-' + postId);
    const active = pl.classList.contains('active');
    if (active) {
      pl.classList.remove('active');
      try { pl._cleanup && pl._cleanup(); } catch {}
      pl.innerHTML = '';
      // Reset any inline styles applied when activated
      try { pl.style.zIndex = ''; pl.style.position = ''; } catch (e) {}
      card.classList.remove('is-playing');
      // Clear queue and reset dock when closing the player
      state.queue = [];
      state.qIndex = 0;
      updateDock(false, state, DB);
    } else {
      // Close any other active players
      document.querySelectorAll('.player.active').forEach(otherPl => {
        if (otherPl !== pl) {
          otherPl.classList.remove('active');
          try { otherPl._cleanup && otherPl._cleanup(); } catch {}
          otherPl.innerHTML = '';
          try { otherPl.style.zIndex = ''; otherPl.style.position = ''; } catch (e) {}
          const otherCard = otherPl.closest('.post');
          if (otherCard) otherCard.classList.remove('is-playing');
        }
      });
      pl.classList.add('active');
      const db = DB.getAll();
      const p = db.posts.find(x => x.id === postId);
      if (!p || (!p.url && !(p.provider && p.provider.id))) {
        toast(card || root, 'Could not load post for playback', true);
        return;
      }
    // Set queue to all visible posts in the feed and set qIndex to the played post
    const posts = document.querySelectorAll('#feed .post');
    state.queue = Array.from(posts).map(n => n.dataset.post);
    state.qIndex = state.queue.indexOf(postId);
  buildEmbed(p, pl, { autoplay: true, onEnded: () => queueNext(true, state, DB) });
      // Ensure the active player is positioned above fixed UI (dock/tab bar)
      // so iframe controls are reachable on mobile devices.
      try { pl.style.position = 'relative'; pl.style.zIndex = '12000'; } catch (e) {}
      // Additionally, on mobile move the iframe into a top-level portal so it
      // is not inside transformed ancestors (the mobile sliding wrapper). This
      // prevents some mobile browsers from blocking pointer events on iframes.
  // Detect real mobile/touch devices more reliably. Avoid using only
        // the viewport width because Chrome's device emulation switches
        // viewport size while still running on desktop which can cause
        // undesired portal behavior (and playback pauses when alt-tabbing).
        const isTouch = (typeof navigator !== 'undefined') && (
          ('maxTouchPoints' in navigator && navigator.maxTouchPoints > 0) ||
          /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
        );
        const isSmall = (typeof window !== 'undefined') && window.matchMedia && window.matchMedia('(max-width: 600px)').matches;
        const isMobile = isTouch && isSmall;
        try {
          // Player portal (top-level iframe wrapper) can help on some real
          // mobile browsers where transformed ancestors stop pointer events
          // from reaching the iframe. However, moving the iframe out of the
          // normal flow causes playback to be paused in desktop DevTools
          // device emulation (alt-tab/background). Disable by default; can
          // be enabled if truly needed on problematic mobile devices.
          const ENABLE_PLAYER_PORTAL = false;
          if (ENABLE_PLAYER_PORTAL) {
            const isTouch = (typeof navigator !== 'undefined') && (
              ('maxTouchPoints' in navigator && navigator.maxTouchPoints > 0) ||
              /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
            );
            const isSmall = (typeof window !== 'undefined') && window.matchMedia && window.matchMedia('(max-width: 600px)').matches;
            const isMobile = isTouch && isSmall;
            if (isMobile) {
              const iframe = pl.querySelector('iframe');
              if (iframe && !pl._portal && iframe.classList.contains('yt')) {
                const r = pl.getBoundingClientRect();
                const wrapper = document.createElement('div');
                wrapper.className = 'player-portal';
                wrapper.style.position = 'absolute';
                wrapper.style.left = (r.left + window.scrollX) + 'px';
                wrapper.style.top = (r.top + window.scrollY) + 'px';
                wrapper.style.width = r.width + 'px';
                wrapper.style.height = r.height + 'px';
                wrapper.style.zIndex = '13000';
                wrapper.style.pointerEvents = 'auto';
                wrapper.appendChild(iframe);
                document.body.appendChild(wrapper);
                const update = () => {
                  const nr = pl.getBoundingClientRect();
                  wrapper.style.left = (nr.left + window.scrollX) + 'px';
                  wrapper.style.top = (nr.top + window.scrollY) + 'px';
                  wrapper.style.width = nr.width + 'px';
                  wrapper.style.height = nr.height + 'px';
                };
                window.addEventListener('scroll', update);
                window.addEventListener('resize', update);
                pl._portal = { wrapper, update };
              }
            }
          }
        } catch (err) { console.warn('player portal setup failed', err); }

      // Mark now playing and show dock, then optionally auto-scroll
      markNowPlaying(postId, state, DB);
      if (loadPrefs().autoScroll) card.scrollIntoView({ block: 'center' });
      // Show docked player when a post is played
      updateDock(true, state, DB);
    }
    return;
  }
  if (action === 'like' && postId) {
  
    if (!state.user) { toast(card || root, 'login to like', true); return; }
    const updated = await DB.toggleLike(postId, state.user.id);
    if (updated && card) {
      // Notify post author if not self
      const db = DB.getAll();
      const post = db.posts.find(x => x.id === postId);
      notifyPostLike(post, state.user);
      // Find the like button before updating
      const likeBtn = card.querySelector('[data-action="like"]');
      if (likeBtn) {
        likeBtn.classList.remove('like-animate');
        // Force reflow to restart animation
        void likeBtn.offsetWidth;
        likeBtn.classList.add('like-animate');
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
// ...existing code...

  if (action === 'delete' && postId) {
    const db = DB.getAll();
    const p = db.posts.find(x => x.id === postId);
    if (!p) return;
    if (!state.user || p.userId !== state.user.id) { toast(card || root, 'you can only delete your posts', true); return; }

    // Remove any existing confirm popup
    document.querySelectorAll('.post-delete-confirm').forEach(el => el.remove());

    // Create confirm popup (identical to comment delete)
    const confirmDiv = document.createElement('div');
    confirmDiv.className = 'comment-delete-confirm fadein';
    confirmDiv.innerHTML = `
      <div class="confirm-inner">
        <span><b>Delete this post?</b></span>
        <button class="btn small btn-danger confirm-yes" tabindex="0">OK</button>
        <button class="btn small confirm-no" tabindex="0">Cancel</button>
      </div>
    `;
    // Position near the button
    const rect = btn.getBoundingClientRect();
    confirmDiv.style.position = 'absolute';
    confirmDiv.style.zIndex = 10010;
    let left = rect.left + window.scrollX;
    const minWidth = 180;
    // Prevent offscreen right
    if (left + minWidth > window.innerWidth - 8) {
      left = window.innerWidth - minWidth - 8;
    }
    confirmDiv.style.left = left + 'px';
    confirmDiv.style.top = (rect.bottom + window.scrollY + 4) + 'px';

    document.body.appendChild(confirmDiv);

    // Remove popup helper (with fadeout)
    function removeConfirm() {
      confirmDiv.classList.remove('fadein');
      confirmDiv.classList.add('fadeout');
      setTimeout(() => confirmDiv.remove(), 180);
    }

    // Confirm
    confirmDiv.querySelector('.confirm-yes').onclick = async () => {
      removeConfirm();
      await DB.deletePost(postId);
      render();
    };
    // Cancel
    confirmDiv.querySelector('.confirm-no').onclick = removeConfirm;
    // Keyboard accessibility
    confirmDiv.onkeydown = (ev) => {
      if (ev.key === 'Enter') {
        confirmDiv.querySelector('.confirm-yes').click();
      } else if (ev.key === 'Escape') {
        removeConfirm();
      }
    };
    // Focus first button
    setTimeout(() => {
      confirmDiv.querySelector('.confirm-yes').focus();
    }, 10);
    // Dismiss on outside click
    setTimeout(() => {
      function outside(ev) {
        if (!confirmDiv.contains(ev.target)) {
          removeConfirm();
          document.removeEventListener('mousedown', outside);
        }
      }
      document.addEventListener('mousedown', outside);
    }, 0);
    return;
  }


  if (action === 'comment' && postId) {
    // Close any open edit form first
    if (window.editingPostId) {
      const lastCard = document.getElementById('post-' + window.editingPostId);
      const lastEditBoxId = 'editbox-' + window.editingPostId;
      const lastOpened = lastCard ? lastCard.querySelector('#' + lastEditBoxId) : null;
      if (lastOpened) {
        lastOpened.classList.remove('fade-in');
        lastOpened.classList.add('fade-out');
        setTimeout(() => {
          if (lastOpened.parentNode) lastOpened.parentNode.removeChild(lastOpened);
          if (window.editingPostId == lastEditBoxId.replace('editbox-', '')) window.editingPostId = null;
        }, 180);
      } else {
        window.editingPostId = null;
      }
    }
    // Close any other open comment box first
    if (window.openCommentId && window.openCommentId !== postId) {
      const lastCbox = document.getElementById('cbox-' + window.openCommentId);
      if (lastCbox && lastCbox.classList.contains('active')) {
        lastCbox.classList.remove('fade-in');
        lastCbox.classList.add('fade-out');
        setTimeout(() => {
          lastCbox.classList.remove('active');
          lastCbox.classList.remove('fade-out');
        }, 180);
      }
      window.openCommentId = null;
    }
    const cbox = document.getElementById('cbox-' + postId);
    if (cbox.classList.contains('active')) {
      // Animate out
      cbox.classList.remove('fade-in');
      cbox.classList.add('fade-out');
      setTimeout(() => {
        cbox.classList.remove('active');
        cbox.classList.remove('fade-out');
      }, 180);
      window.openCommentId = null;
    } else {
      cbox.classList.add('active');
      cbox.classList.remove('fade-out');
      cbox.classList.add('fade-in');
      window.openCommentId = postId;
      if (state.user) {
        // Focus input after animation, but prevent scroll jump
        setTimeout(() => {
          const inp = cbox.querySelector('input.field');
          if (inp) {
            const prevScroll = window.scrollY;
            inp.focus({ preventScroll: true });
            // If the cbox is not fully visible, restore scroll
            const rect = cbox.getBoundingClientRect();
            if (rect.bottom > window.innerHeight) {
              window.scrollTo({ top: prevScroll });
            }
          }
        }, 180);
      }
    }
    return;
  }

  if (action === 'delete-comment') {
    const pid = btn.dataset.post || postId;
    const cid = btn.dataset.comment;
    if (!pid || !cid) return;
    if (!state.user) { toast(card || root, 'login to delete comments', true); return; }
    const db = DB.getAll();
    const p = db.posts.find(x => x.id === pid);
    if (!p) return;
    const com = (p.comments || []).find(c => c.id === cid);
    if (!com) return;
    if (com.userId !== state.user.id) { toast(card || root, 'you can only delete your comments', true); return; }

    // Remove any existing confirm popup
    document.querySelectorAll('.comment-delete-confirm').forEach(el => el.remove());

    // Create confirm popup
    const confirmDiv = document.createElement('div');
    confirmDiv.className = 'comment-delete-confirm fadein';
    confirmDiv.innerHTML = `
      <div class="confirm-inner">
        <span>Delete this comment?</span>
        <button class="btn small btn-danger confirm-yes" tabindex="0">OK</button>
        <button class="btn small confirm-no" tabindex="0">Cancel</button>
      </div>
    `;
    // Position near the button
    const rect = btn.getBoundingClientRect();
    confirmDiv.style.position = 'absolute';
    confirmDiv.style.zIndex = 10010;
    let left = rect.left + window.scrollX;
    const minWidth = 180;
    // Prevent offscreen right
    if (left + minWidth > window.innerWidth - 8) {
      left = window.innerWidth - minWidth - 8;
    }
    confirmDiv.style.left = left + 'px';
    confirmDiv.style.top = (rect.bottom + window.scrollY + 4) + 'px';

    document.body.appendChild(confirmDiv);

    // Remove popup helper (with fadeout)
    function removeConfirm() {
      confirmDiv.classList.remove('fadein');
      confirmDiv.classList.add('fadeout');
      setTimeout(() => confirmDiv.remove(), 180);
    }

    // Confirm
    confirmDiv.querySelector('.confirm-yes').onclick = async () => {
      removeConfirm();
      await DB.deleteComment(pid, cid);
      const updated = DB.getAll().posts.find(x => x.id === pid);
      const cwrap = document.getElementById('comments-' + pid);
      cwrap.innerHTML = (updated?.comments || []).map(x => renderCommentHTML(x, pid, state, DB)).join('');
      liveSay('comment deleted');
    };
    // Cancel
    confirmDiv.querySelector('.confirm-no').onclick = removeConfirm;
    // Keyboard accessibility
    confirmDiv.onkeydown = (ev) => {
      if (ev.key === 'Enter') {
        confirmDiv.querySelector('.confirm-yes').click();
      } else if (ev.key === 'Escape') {
        removeConfirm();
      }
    };
    // Focus first button
    setTimeout(() => {
      confirmDiv.querySelector('.confirm-yes').focus();
    }, 10);
    // Dismiss on outside click
    setTimeout(() => {
      function outside(ev) {
        if (!confirmDiv.contains(ev.target)) {
          removeConfirm();
          document.removeEventListener('mousedown', outside);
        }
      }
      document.addEventListener('mousedown', outside);
    }, 0);
  }

  if (action === 'go-login') {
    setGuestMode(false);
    state.forceLogin = true;
    render();
    return;
  }

  if (action === 'share') {
    const perma = btn.dataset.perma || (location.pathname + '#post-' + postId);
    const db = DB.getAll();
    const p = postId ? db.posts.find(x => x.id === postId) : null;
  const title = p ? `${p.title}${p.artist ? ' — ' + p.artist : ''}` : 'TunedIn.space';
    if (navigator.share) {
      navigator.share({ title, url: perma }).catch(() => copyText(perma));
    } else {
      copyText(perma)
        .then(() => toast(card || root, 'permalink copied to clipboard'))
        .catch(() => toast(card || root, 'copy failed', true));
    }
  }

  if (action === 'queue' && postId) {
    if (!state.queue.includes(postId)) state.queue.push(postId);
    updateDock(true, state, DB);
    toast(card, 'added to queue');
  }

  if (action === 'filter-tag') {
    const t = btn.dataset.tag;
    // Prevent default anchor or button scroll behavior
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    savePrefs({ filterTag: t, search: '' });
    state.page = 1;
    // On narrow/mobile layouts the app uses sliding panes. Doing a full
    // re-render can recreate/move the panes and occasionally leave the
    // header/tab-bar visible while the feed pane becomes empty. To avoid
    // that janky behavior, update the feed and tag cloud in-place when on
    // small screens. On desktop keep the previous behavior.
    const isMobile = (typeof window !== 'undefined') && window.matchMedia && window.matchMedia('(max-width: 600px)').matches;
    if (isMobile) {
      try {
        const prefsNow = loadPrefs();
        // Update feed content and pager in-place
        renderFeed($('#feed'), $('#pager'), state, DB, prefsNow);
        // Update tag cloud so selected tag highlights correctly
        renderTags($('#tags'), DB, prefsNow);
  // Also update feed header pill so the clear control appears immediately
  updateFeedHeaderTagPill(prefsNow);
      } catch (err) {
        // Fallback to full render if something goes wrong
        render();
      }
    } else {
      render();
    }
    // Do not scroll the page
    return;
  }
  if (action === 'clear-tag') {
    // Prevent default anchor or button scroll behavior
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    savePrefs({ filterTag: null });
    state.page = 1;
    // Mirror filter-tag behavior: on small screens do an in-place update of
    // feed + tag cloud to avoid sliding-pane / transform reflow issues.
    const isMobile = (typeof window !== 'undefined') && window.matchMedia && window.matchMedia('(max-width: 600px)').matches;
    if (isMobile) {
      try {
        const prefsNow = loadPrefs();
        renderFeed($('#feed'), $('#pager'), state, DB, prefsNow);
        renderTags($('#tags'), DB, prefsNow);
        // Ensure the header pill for the selected tag is updated immediately
        updateFeedHeaderTagPill(prefsNow);
      } catch (err) {
        // Fallback to full render if anything goes wrong
        render();
      }
    } else {
      render();
    }
    // Do not scroll the page
    return;
  }

  if (action === 'q-prev' || action === 'q-next') {
    // Stop and clean up the currently active player before advancing
    const activePlayer = document.querySelector('.player.active');
    if (activePlayer) {
      activePlayer.querySelectorAll('audio,video').forEach(el => {
        el.pause && el.pause();
        el.currentTime = 0;
      });
      activePlayer.querySelectorAll('iframe').forEach(ifr => (ifr.src = ''));
      activePlayer.classList.remove('active');
      const playingPost = document.querySelector('.post.is-playing');
      if (playingPost) playingPost.classList.remove('is-playing');
    }
    if (action === 'q-prev') queuePrev(state, DB);
    if (action === 'q-next') queueNext(false, state, DB);
  }
  if (action === 'q-clear') { state.queue = []; state.qIndex = 0; updateDock(false, state, DB); }
  if (action === 'q-shuffle') { savePrefs({ shuffle: !loadPrefs().shuffle }); updateDock(false, state, DB); }
  if (action === 'q-repeat') {
    const order = ['off', 'all', 'one'];
    const cur = loadPrefs().repeat || 'off';
    const next = order[(order.indexOf(cur) + 1) % order.length];
    savePrefs({ repeat: next });
    updateDock(false, state, DB);
  }

  if (action === 'reset') {
    if (DB.isRemote) {
      alert('Reset all is only for local mode. For Supabase, use Import to replace remote data.');
      return;
    }
  if (confirm('Reset all TunedIn.space data (posts, users, prefs)? This cannot be undone.')) {
  localStorage.removeItem('TunedIn.space/db@v2');
  localStorage.removeItem('TunedIn.space/v1');
      localStorage.removeItem(PREF_KEY);
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(GUEST_KEY);
      resetPrefsCache();
      state.queue = [];
      state.qIndex = 0;
      await DB.init();
      render();
    }
  }

  if (action === 'accent-pick') pickAccent();
  if (action === 'toggle-density') {
    const cur = loadPrefs().density;
    const next = cur === 'cozy' ? 'compact' : 'cozy';
    savePrefs({ density: next });
    render();
  }
  if (action === 'load-more') {
    // Determine if this click was user-initiated. If this is a real user
    // click (isTrusted), allow bypassing the automatic-load cap.
    const userInitiated = !!(e && e.isTrusted);
    if (typeof window !== 'undefined' && typeof window._loadMoreInFeed === 'function') {
      const ok = window._loadMoreInFeed({ userInitiated });
      // Only perform the legacy fallback if this was a real user click.
      if (!ok && userInitiated) {
        state.page++;
        renderFeed($('#feed'), $('#pager'), state, DB, loadPrefs());
      }
    } else {
      // If the helper is missing, only allow manual user-initiated loads.
      if (userInitiated) {
        state.page++;
        renderFeed($('#feed'), $('#pager'), state, DB, loadPrefs());
      }
    }
  }

  if (action === 'show-help') openHelpOverlay();

  if (action === 'view-user') { e.preventDefault(); const uid = btn.dataset.uid; if (uid) showUserProfile(uid, DB); }

  if (action === 'go-edit-profile') {
    document.getElementById('profile')?.remove();
    document.getElementById('aboutMe')?.focus();
  }

  if (action === 'play-all') {
    // Build queue from current feed
    const posts = document.querySelectorAll('#feed .post');
    state.queue = Array.from(posts).map(n => n.dataset.post);
    state.qIndex = 0;
    updateDock(true, state, DB);
    // start first
    const first = state.queue[0];
    if (first) {
      const btn = document.querySelector(`#post-${first} [data-action="toggle-player"]`);
      btn?.click();
    }
  }

  if (action === 'logout') {
    // Clear all session and user data
    clearSession();
    setGuestMode(false);
    // Supabase: sign out from all sessions on this device
    if (DB.isRemote && DB.supabase && DB.supabase.auth && DB.supabase.auth.signOut) {
      try { await DB.supabase.auth.signOut(); } catch (e) { /* ignore */ }
    }
    // Clear all localStorage and sessionStorage
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    // Remove all cookies (best effort)
    if (document.cookie && document.cookie.length > 0) {
      document.cookie.split(';').forEach(function(c) {
        const eqPos = c.indexOf('=');
        const name = eqPos > -1 ? c.substr(0, eqPos) : c;
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
      });
    }
    // Reset prefs cache if available
    if (typeof resetPrefsCache === 'function') resetPrefsCache();
    // Force reload to ensure all in-memory state is reset
    location.reload();
  }
}

export async function onDelegatedSubmit(e, state, DB, render) {
  const form = e.target.closest('form[data-action="comment-form"], form[data-action="edit-form"], form[data-action="profile-form"]');
  if (!form) return;
  e.preventDefault();
  const pid = form.dataset.post;

  if (form.dataset.action === 'comment-form') {
    if (!state.user) { toast(document.getElementById('app'), 'login to comment', true); return; }
    const input = form.querySelector('input');
    const text = input.value.trim();
    if (!text) return;
    // Automoderation for comments
    if (containsBannedWords(text) || looksLikeSpam(text)) {
      // Remove any previous moderation message
      let modMsg = form.querySelector('.mod-msg');
      if (modMsg) modMsg.remove();
      // Find the send button
      const sendBtn = form.querySelector('button, input[type=submit], [data-action="send"]');
      // Create and insert the moderation message after the button
      modMsg = document.createElement('div');
      modMsg.className = 'mod-msg notice small warn';
      modMsg.textContent = 'Comment blocked by moderation.';
      if (sendBtn && sendBtn.parentNode) {
        sendBtn.parentNode.insertBefore(modMsg, sendBtn.nextSibling);
      } else {
        form.appendChild(modMsg);
      }
      return;
    }
    const c = { id: uid('c'), userId: state.user.id, text, createdAt: Date.now() };
    await DB.addComment(pid, c);
    input.value = '';
    const p = DB.getAll().posts.find(x => x.id === pid);
    // Notify post author if not self
    notifyPostComment(p, state.user);
    const cwrap = document.getElementById('comments-' + pid);
    cwrap.innerHTML = (p.comments || []).map(x => renderCommentHTML(x, pid, state, DB)).join('');
    liveSay('comment added');
    return;
  }

  if (form.dataset.action === 'edit-form') {
    const title = form.querySelector('[name=title]').value.trim();
    const artist = form.querySelector('[name=artist]').value.trim();
    const url = form.querySelector('[name=url]').value.trim();
    const body = form.querySelector('[name=body]').value.trim();
    const tagsRaw = form.querySelector('[name=tags]').value.trim();
    const tags = tagsRaw.split(/[#,\s]+/g).map(t => t.trim().toLowerCase()).filter(Boolean).slice(0, 12);
    const provider = parseProvider(url);
    const lyrics = form.querySelector('[name=lyrics]')?.value.trim() || '';
    const updated = await DB.updatePost(pid, { title, artist, url, body, tags, provider, lyrics });
    const card = document.getElementById('post-' + pid);
    if (card && updated) card.outerHTML = renderPostHTML(updated, state, DB);
    liveSay('post updated');
    return;
  }

  if (form.dataset.action === 'profile-form') {
    if (!state.user) {
      toast(document.getElementById('app'), 'login first', true);
      return;
    }
    const about = form.querySelector('[name=about]').value.trim();
    let avatarUrl = undefined;
    const fileInput = form.querySelector('[name=avatar]');
    const file = fileInput && fileInput.files && fileInput.files[0];
    if (file) {
      try {
        // Check bucket existence and permissions in Supabase dashboard if this fails
        const fileExt = file.name.split('.').pop();
        const filePath = `avatars/${state.user.id}_${Date.now()}.${fileExt}`;
        const uploadRes = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
        if (uploadRes.error) {
          console.error('Avatar upload error:', uploadRes.error);
          const msg = document.getElementById('profileMsg');
          if (msg) msg.textContent = 'Avatar upload failed: ' + uploadRes.error.message;
          return;
        }
        const publicUrlRes = supabase.storage.from('avatars').getPublicUrl(filePath);
        if (publicUrlRes.error) {
          console.error('Get public URL error:', publicUrlRes.error);
          const msg = document.getElementById('profileMsg');
          if (msg) msg.textContent = 'Avatar URL error: ' + publicUrlRes.error.message;
          return;
        }
        avatarUrl = publicUrlRes.data?.publicUrl || '';
      } catch (err) {
        console.error('Unexpected avatar upload error:', err);
        const msg = document.getElementById('profileMsg');
        if (msg) msg.textContent = 'Avatar upload failed (unexpected error)';
        return;
      }
    }
    try {
      const patch = avatarUrl ? { about, avatarUrl } : { about };
      await DB.updateUser(state.user.id, patch);
      await DB.refresh();
      toast(document.getElementById('app'), 'profile updated');
      render();
    } catch (err) {
      console.error('Profile update error:', err);
      const msg = document.getElementById('profileMsg');
      if (msg) msg.textContent = 'Save failed';
    }
    return;
  }
}