// ...existing code...

import DB from './db.js';
import { $ } from './utils.js';
import { loadPrefs, PREF_KEY } from '../auth/prefs.js';
import { SESSION_KEY, GUEST_KEY, isGuestMode } from '../auth/session.js';
// defer heavy view modules until needed (dynamic import in renderApp)
import { onActionClick, onDelegatedSubmit } from '../features/actions.js';
import { onKey } from '../auth/keyboard.js';
import { seedDemo } from '../features/seed.js';
import { state } from './app_state.js';
import { runIdle } from './idle.js';
import Ticker from './ticker.js';

async function renderApp() {
  if (DB.refresh) await DB.refresh();
  // Keep state.user in sync
  const { refreshUser } = await import('./app_state.js');
  await refreshUser();
  // Compute and expose initial cooldown state so header (mobile) can display correct message
  function computeAndPublishCooldown() {
    try {
      if (!state.user || !DB || typeof DB.getAll !== 'function') {
        window.composeCooldown = { isCooldown: false, countdown: '' };
        return;
      }
      const db = DB.getAll() || { posts: [] };
      const me = state.user;
      const now = Date.now();
      const lastPost = (db.posts || []).filter(p => p.userId === me.id).sort((a, b) => b.createdAt - a.createdAt)[0];
      if (lastPost && now - lastPost.createdAt < 24 * 60 * 60 * 1000) {
        const timeLeft = 24 * 60 * 60 * 1000 - (now - lastPost.createdAt);
        const hours = Math.floor(timeLeft / (60 * 60 * 1000));
        const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
        const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);
        const countdown = `${hours}h ${minutes}m ${seconds}s`;
        window.composeCooldown = { isCooldown: true, countdown };
      } else {
        window.composeCooldown = { isCooldown: false, countdown: '' };
      }
      try { document.dispatchEvent(new CustomEvent('composeCooldownUpdated', { detail: window.composeCooldown })); } catch (e) {}
    } catch (e) { /* ignore */ }
  }
  // Use central ticker to update countdown once per second while page visible
  computeAndPublishCooldown();
  const unsub = Ticker.subscribe(() => {
    // bail if hidden
    if (document.hidden) return;
    computeAndPublishCooldown();
  });
  // Unsubscribe on beforeunload to avoid leaks
  window.addEventListener('beforeunload', () => { try { unsub(); } catch (e) {} });
  // Ensure window.state is always set for header logic
  window.state = state;
  const prefs = loadPrefs();

  const root = $('#app');
  const banner = document.getElementById('ascii-banner');
  const body = document.body;


  root.innerHTML = '';
  if (state.forceLogin) {
    state.forceLogin = false;
    if (banner) banner.style.display = 'none';
    body.classList.remove('show-header');
    try {
      const { renderLogin } = await import('../views/login_view.js');
      renderLogin(root, DB, renderApp);
    } catch (e) {
      // fallback: no-op
    }
    return;
  }
  if (!state.user && !isGuestMode()) {
    if (banner) banner.style.display = 'none';
    body.classList.remove('show-header');
    try {
      const { renderLogin } = await import('../views/login_view.js');
      renderLogin(root, DB, renderApp);
    } catch (e) {}
  } else {
    if (!document.querySelector('header[role="banner"]')) {
      const { renderHeader } = await import('./header.js');
      renderHeader();
    }
    if (banner) banner.style.display = '';
    body.classList.add('show-header');
    try {
      const { renderMain } = await import('../views/main_view.js');
      renderMain(root, state, DB, renderApp);
    } catch (e) {
      // renderMain failed, fallback to empty root
      root.innerHTML = '<div class="notice small">Unable to load app UI.</div>';
    }
  }

  try {
    const { bindHelpOverlay } = await import('../views/overlays.js');
    bindHelpOverlay();
  } catch (e) {}
}

// Global delegated events (bind once)
function bindGlobalHandlers() {
  const root = $('#app');
  root.addEventListener('click', (e) => onActionClick(e, state, DB, renderApp));
  root.addEventListener('submit', (e) => onDelegatedSubmit(e, state, DB, renderApp));
  // Also bind action clicks in help overlay
  const help = document.getElementById('help');
  if (help) {
    help.addEventListener('click', (e) => onActionClick(e, state, DB, renderApp));
  }
  // Avoid binding keyboard handlers on touch-first devices to reduce overhead
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!isTouch) document.addEventListener('keydown', (e) => onKey(e, state));

  // Double click to like, prevent text selection
  // Avoid double-click listener on touch devices (use tap handlers elsewhere)
  if (!isTouch) {
    document.addEventListener('dblclick', (e) => {
    const card = e.target.closest('.post');
    if (!card) return;
    // Ignore double-clicks inside comment, edit, or input areas
    if (
      e.target.closest('.comment') ||
      e.target.closest('.comment-box') ||
      e.target.closest('form[data-action="edit-form"]') ||
      e.target.closest('form[data-action="comment-form"]') ||
      e.target.closest('textarea') ||
      e.target.closest('input')
    ) {
      return;
    }
    // Prevent text selection on double click
    if (window.getSelection) {
      const sel = window.getSelection();
      if (sel && sel.type === 'Range') sel.removeAllRanges();
    }
    const likeBtn = card.querySelector('[data-action="like"]');
    likeBtn?.click();
    });
  }

  // Cross-tab sync
  window.addEventListener('storage', async (ev) => {
    if (ev.key === PREF_KEY || ev.key === SESSION_KEY || ev.key === GUEST_KEY) {
      await DB.refresh();
      renderApp();
    }
  });
}

async function boot() {
  await DB.init();
  bindGlobalHandlers();
  await renderApp();
  // expose seed helper
  window.seedDemo = () => seedDemo(DB, state, renderApp);
}

boot();

// Add header, main containers, and help overlay on DOMContentLoaded

// Ensure posts always fit the screen

window.addEventListener('DOMContentLoaded', function() {
  // Only render header if not about to show login/register in mobile tabbed mode
  (async function deferredDOMHelpers() {
    try {
      const [{ renderMainContainers }, { renderHelpOverlay }] = await Promise.all([
        import('./header.js'),
        import('./help.js')
      ]);
      if (typeof renderMainContainers === 'function') renderMainContainers();
      if (typeof renderHelpOverlay === 'function') renderHelpOverlay();
    } catch (e) {
      // non-fatal if these helpers fail to load
    }
  })();
  document.body.classList.add('header-logo-ready');

  // Add post limit info below ASCII header after header is rendered
  runIdle(() => {
    const banner = document.getElementById('ascii-banner');
    if (!banner) return;
    let info = document.getElementById('post-limit-info');
    if (!info) {
      info = document.createElement('div');
      info.id = 'post-limit-info';
      info.style.textAlign = 'center';
      info.style.fontSize = '0.98em';
      info.style.margin = '-8px 0 8px 0';
      info.style.color = '#888';
      info.style.display = 'none'; // Hide by default
      banner.parentNode.insertBefore(info, banner.nextSibling);
    } else {
      info.style.display = 'none'; // Hide if already exists
    }
    let hover = false;
    let lastType = '';
    let lastCountdown = '';
    // Add fade animation style
    if (!document.getElementById('post-limit-fade-style')) {
      const style = document.createElement('style');
      style.id = 'post-limit-fade-style';
      style.textContent = `
        #post-limit-info.fade {
          transition: opacity 0.35s cubic-bezier(.4,0,.2,1);
          opacity: 0.25;
        }
      `;
      document.head.appendChild(style);
    }
    function getCountdown() {
      if (!window.DB || !window.state || !window.state.user) return '';
      const db = window.DB.getAll ? window.DB.getAll() : { posts: [] };
      const me = window.state.user;
      const now = Date.now();
      const lastPost = (db.posts || []).filter(p => p.userId === me.id).sort((a, b) => b.createdAt - a.createdAt)[0];
      if (lastPost && now - lastPost.createdAt < 24 * 60 * 60 * 1000) {
        const timeLeft = 24 * 60 * 60 * 1000 - (now - lastPost.createdAt);
        const hours = Math.floor(timeLeft / (60 * 60 * 1000));
        const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
        const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);
        return `${hours}h ${minutes}m ${seconds}s`;
      }
      return '';
    }
    function setTextWithFade(newText, typeChanged) {
      if (info.textContent === newText) return;
      if (typeChanged) {
        info.classList.add('fade');
        setTimeout(() => {
          info.textContent = newText;
          info.classList.remove('fade');
        }, 180);
      } else {
        info.textContent = newText;
      }
    }
    function updatePostLimitInfo() {
      let newText, type;
      if (!window.DB || !window.state || !window.state.user) {
        newText = 'You can post once per day! Make it count!';
        type = 'info';
      } else {
        const countdown = getCountdown();
        if (hover && countdown) {
          newText = `Time left: ${countdown}`;
          type = 'countdown';
        } else {
          newText = 'You can post once per day! Make it count!';
          type = 'info';
        }
      }
      const typeChanged = type !== lastType;
      lastType = type;
      setTextWithFade(newText, typeChanged);
    }
    info.addEventListener('mouseenter', () => { hover = true; updatePostLimitInfo(); });
    info.addEventListener('mouseleave', () => { hover = false; updatePostLimitInfo(); });
    // Expose state and DB for this logic if not already
    if (!window.state) window.state = state;
    if (!window.DB) window.DB = DB;
    updatePostLimitInfo();
  // Reduce frequency on mobile to save battery; desktop can be more frequent
  const intervalMs = (('ontouchstart' in window || navigator.maxTouchPoints > 0) ? 5000 : 1000);
  setInterval(updatePostLimitInfo, intervalMs);
  }, { timeout: 500, fallbackDelay: 10 });
});

// Load non-critical modules after boot to avoid blocking initial render
(async function loadDeferredModules() {
  try {
    // notifications can be loaded in the background
    const mod = await import('./notifications_init.js');
    // If the module exposes an init function, call it
    if (mod && typeof mod.init === 'function') {
      try { mod.init(); } catch (e) { /* non-fatal */ }
    }
  } catch (e) {
    // ignore deferred load failures
  }
})();
// Defer help overlay and other non-critical UI until idle to reduce initial JS work on mobile
try {
  runIdle(async () => {
    try {
      const helpMod = await import('../views/overlays.js');
      if (helpMod && typeof helpMod.bindHelpOverlay === 'function') helpMod.bindHelpOverlay();
    } catch (e) {}
  }, { timeout: 2000, fallbackDelay: 50 });
} catch (e) {
  // runIdle may be unavailable during early boot; ignore
}