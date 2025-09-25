// js/views/main_view.js
import { $ } from '../core/utils.js';
import { loadPrefs, savePrefs } from '../auth/prefs.js';
import { updateDock } from '../features/queue.js';
import { onImport } from '../features/import_export.js';

import { setupFeedPane } from './main_view_feed.js';
import { renderProfileBox } from './main_view_profile.js';
import { renderComposeBox } from './main_view_compose.js';
import { setupAutoRefresh, setupVisibilityRefresh } from './main_view_refresh.js';

export async function renderMain(root, state, DB, render) {
  // Helper to attach scroll listener to feedPane for mobile infinite scroll
  function attachFeedPaneScrollListener() {
  // Autoloading removed: no automatic scroll-to-load behavior. Kept as no-op
  return;
  }

  // Robust scroll reset helper: tries immediate, rAF and timeout resets to cover
  // different browsers and transformed ancestors where scrollTop may lag.
  function resetScroll(el) {
    try {
      if (!el) return;
      el.scrollTop = 0;
      if (typeof el.scrollTo === 'function') {
        try { el.scrollTo(0, 0); } catch (e) {}
      }
    } catch (e) {}
    requestAnimationFrame(() => {
      try { el.scrollTop = 0; if (typeof el.scrollTo === 'function') el.scrollTo(0,0); } catch (e) {}
      setTimeout(() => {
        try { el.scrollTop = 0; if (typeof el.scrollTo === 'function') el.scrollTo(0,0); window.scrollTo(0,0); document.documentElement.scrollTop = 0; } catch (e) {}
      }, 30);
    });
  }
  // Save/restore helpers so we can preserve per-tab scroll positions
  function saveCurrentScroll(prevTab) {
    try {
      const tabToSave = prevTab || currentTab;
      if (window.matchMedia && window.matchMedia('(max-width: 600px)').matches) {
        // Mobile panes
  if (tabToSave === 'feed' && feedPane) feedTabState.scroll = feedPane.scrollTop || 0;
  if (tabToSave === 'compose' && composePane) composeTabState.scroll = composePane.scrollTop || 0;
  if (tabToSave === 'profile' && profilePane) profileTabState.scroll = profilePane.scrollTop || 0;
      } else {
        // Desktop uses document scroll
        if (tabToSave === 'feed') feedTabState.scroll = window.scrollY || window.pageYOffset || 0;
      }
    } catch (e) { /* ignore */ }
  }

  function restoreScrollFor(tab) {
    try {
      const isMobileQ = window.matchMedia && window.matchMedia('(max-width: 600px)').matches;
      const tryRestore = (pane, savedY, attempts) => {
        try {
          const maxY = Math.max(0, (pane.scrollHeight || 0) - (pane.clientHeight || 0));
          let y = typeof savedY === 'number' ? savedY : 0;
          if (y > maxY) y = maxY;
          if (y && typeof pane.scrollTo === 'function') pane.scrollTo(0, y);
          else if (y) pane.scrollTop = y;
          // If pane has no scrollable height yet and we have attempts left, retry
          if (attempts > 0 && maxY === 0 && (typeof savedY === 'number' && savedY > 0)) {
            setTimeout(() => tryRestore(pane, savedY, attempts - 1), 120);
          }
          // Post-check: after a short delay, ensure we didn't end up past
          // the new max (dynamic content may have shifted). Update saved
          // state to clamped value so future restores don't overshoot.
          setTimeout(() => {
            try {
              const maxNow = Math.max(0, (pane.scrollHeight || 0) - (pane.clientHeight || 0));
              if (pane.scrollTop > maxNow) pane.scrollTop = maxNow;
              // Update stored state mapping
              if (pane === feedPane) feedTabState.scroll = Math.min(savedY || 0, maxNow);
              else if (pane === composePane) composeTabState.scroll = Math.min(savedY || 0, maxNow);
              else if (pane === profilePane) profileTabState.scroll = Math.min(savedY || 0, maxNow);
            } catch (e) { /* ignore */ }
          }, 160);
          setTimeout(() => {
            try {
              const maxNow2 = Math.max(0, (pane.scrollHeight || 0) - (pane.clientHeight || 0));
              if (pane.scrollTop > maxNow2) pane.scrollTop = maxNow2;
              if (pane === feedPane) feedTabState.scroll = Math.min(feedTabState.scroll || 0, maxNow2);
              else if (pane === composePane) composeTabState.scroll = Math.min(composeTabState.scroll || 0, maxNow2);
              else if (pane === profilePane) profileTabState.scroll = Math.min(profileTabState.scroll || 0, maxNow2);
            } catch (e) { /* ignore */ }
          }, 420);
        } catch (e) { /* ignore */ }
      };

      if (isMobileQ) {
        if (tab === 'feed' && feedPane) {
          const y = feedTabState && typeof feedTabState.scroll === 'number' ? feedTabState.scroll : 0;
          tryRestore(feedPane, y, 3);
        }
        if (tab === 'compose' && composePane) {
          const y = composeTabState && typeof composeTabState.scroll === 'number' ? composeTabState.scroll : 0;
          tryRestore(composePane, y, 3);
        }
        if (tab === 'profile' && profilePane) {
          const y = profileTabState && typeof profileTabState.scroll === 'number' ? profileTabState.scroll : 0;
          tryRestore(profilePane, y, 3);
        }
      } else {
        // Desktop
        if (tab === 'feed') {
          const y = feedTabState && typeof feedTabState.scroll === 'number' ? feedTabState.scroll : 0;
          if (y && typeof window.scrollTo === 'function') window.scrollTo(0, y);
        }
      }
    } catch (e) { /* ignore */ }
  }
  // Autoloading removed: no observers or auto-click behavior for load-more.
  // Mobile tab bar logic
  let isMobile = window.matchMedia('(max-width: 600px)').matches;
  // Remove mobile tab bar if entering login/auth screen
  if (isMobile && state.forceLogin) {
    const oldTabBar = document.querySelector('.mobile-tab-bar');
    if (oldTabBar) oldTabBar.remove();
  }
  const prefs = loadPrefs();

  // Restore scrollbars and show header/banner
  // Restore scrollbars and show header/banner
  // Don't force-hide document scroll here. Instead, when in mobile pane
  // mode we move the header into the feed pane so it scrolls with the
  // pane (prevents header from appearing stuck when body overflow is
  // modified by other code or browsers).
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
  const banner = document.getElementById('ascii-banner');
  if (banner) banner.style.display = '';
  // Ensure header visibility is reset in case a previous drag left it hidden
  try {
    const hdr = document.querySelector('header[role="banner"]');
    if (hdr) hdr.style.visibility = '';
  } catch (e) { /* ignore */ }
  document.body.classList.add('show-header');

  // Layout containers with sliding wrapper for mobile
  // Per-tab state objects for independence
  let feedTabState = state.feedTabState || {};
  let composeTabState = state.composeTabState || {};
  let profileTabState = state.profileTabState || {};

  let slideWrapper, feedPane, composePane, profilePane, left, right;
  if (window.matchMedia('(max-width: 600px)').matches) {
    // On mobile, header will be moved dynamically depending on tab
    slideWrapper = document.createElement('div');
    slideWrapper.className = 'mobile-slide-wrapper';
    // Each pane is 100vw wide
    feedPane = document.createElement('div');
    feedPane.className = 'mobile-slide-pane feed-pane';
    composePane = document.createElement('div');
    composePane.className = 'mobile-slide-pane compose-pane';
    profilePane = document.createElement('div');
    profilePane.className = 'mobile-slide-pane profile-pane';
    slideWrapper.appendChild(feedPane);
    slideWrapper.appendChild(composePane);
    slideWrapper.appendChild(profilePane);
    // Ensure panes have a bounded scroll area equal to viewport minus header
    // This prevents restoring a saved scroll that exceeds the current content
    // height and produces large blank space.
    [feedPane, composePane, profilePane].forEach(p => {
      try {
        p.style.maxHeight = 'calc(100vh - var(--mobile-header-height, 64px))';
        p.style.overflowY = 'auto';
        p.style.webkitOverflowScrolling = 'touch';
        p.style.boxSizing = 'border-box';
      } catch (e) { /* ignore */ }
    });
    // Insert header above slideWrapper by default
    const header = document.querySelector('header[role="banner"]');
    if (header && header.parentNode !== root) {
      root.appendChild(header);
    }
    // Set a larger gap above the logo specifically for mobile, then
    // recompute the header height so panes use the updated measurement.
    try {
      document.documentElement.style.setProperty('--mobile-logo-gap', '32px');
      const hdr = document.querySelector('header[role="banner"]');
      if (hdr) {
        // Reflow to allow CSS variable to apply before measurement
        // (reading offsetHeight forces reflow)
        void hdr.offsetHeight;
        const h = hdr.getBoundingClientRect().height || 64;
        document.documentElement.style.setProperty('--mobile-header-height', h + 'px');
      }
    } catch (err) { /* ignore */ }
    root.appendChild(slideWrapper);
    // For compatibility with rest of code
    left = feedPane;
    right = composePane; // will be used for compose/profile

  // --- Swipe gesture support for mobile tabs ---
    // Bulletproof: block tab swipe at the earliest possible phase if touch is on tag cloud
    function blockTagCloudTouch(e) {
      if (e.target && e.target.closest && e.target.closest('.tag-cloud')) {
        e.stopPropagation();
        e.preventDefault();
      }
    }
    document.addEventListener('touchstart', blockTagCloudTouch, { capture: true, passive: false });
    document.addEventListener('touchmove', blockTagCloudTouch, { capture: true, passive: false });
  // Implement drag-follow during touchmove for a smooth, non-jumpy UX.
  let touchStartX = null, touchStartY = null, touchCurrentX = null, touchCurrentY = null;
  let isDragging = false;
    // If a touch starts inside the tag cloud, ignore the global tab-swipe handler
    let ignoreSwipeFromTagCloud = false;
    function isTagCloudSwipeBlocked() {
      return ignoreSwipeFromTagCloud || (typeof window !== 'undefined' && window.ignoreSwipeFromTagCloud);
    }
    const tabOrder = ['feed', 'compose', 'profile'];

    // Capture-phase listeners to detect touches that start inside interactive
    // child widgets (like the tag cloud) before the slideWrapper's bubble
    // handlers run. This prevents accidental tab swipes when interacting
    // with those widgets.
    function _captureTouchStart(e) {
      try {
        if (e.touches && e.touches.length >= 1) {
          if (e.target && e.target.closest && e.target.closest('.tag-cloud')) {
            ignoreSwipeFromTagCloud = true;
          }
        }
      } catch (err) { /* ignore */ }
    }
    function _captureTouchEnd() {
      ignoreSwipeFromTagCloud = false;
    }
    document.addEventListener('touchstart', _captureTouchStart, { capture: true, passive: true });
    document.addEventListener('touchend', _captureTouchEnd, { capture: true, passive: true });

  // Helpers for live dragging
  function getWidthPx() {
      return window.innerWidth || document.documentElement.clientWidth || 360;
    }

  slideWrapper.addEventListener('touchstart', function(e) {
      if (e.touches.length === 1) {
        // If capture-phase already detected a touch inside tag cloud, keep flag
        // otherwise evaluate here as a fallback.
        if (!ignoreSwipeFromTagCloud) {
          ignoreSwipeFromTagCloud = !!(e.target && e.target.closest && e.target.closest('.tag-cloud'));
        }
        if (isTagCloudSwipeBlocked()) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchCurrentX = touchStartX;
        touchCurrentY = touchStartY;
        isDragging = true;
  // no-op: we no longer clone or move the header during drag. Header
  // remains above the slideWrapper so it's visible for all tabs.
        // Disable CSS transition while dragging so movement tracks finger exactly
        try { slideWrapper.style.transition = 'none'; } catch (err) {}
      }
    }, { passive: false });

    slideWrapper.addEventListener('touchmove', function(e) {
  if (isTagCloudSwipeBlocked() || !isDragging) return;
      if (e.touches.length !== 1) return;
      touchCurrentX = e.touches[0].clientX;
      touchCurrentY = e.touches[0].clientY;
      const dx = touchCurrentX - touchStartX;
      const dy = touchCurrentY - touchStartY;
      // If mostly horizontal, prevent vertical scroll and update transform
      if (Math.abs(dx) > Math.abs(dy)) {
        e.preventDefault();
        const width = getWidthPx();
        const currentTab = slideWrapper.getAttribute('data-tab') || 'feed';
        const baseIndex = Math.max(0, tabOrder.indexOf(currentTab));
        const baseOffset = -baseIndex * width;
        let offset = baseOffset + dx;
        // Add gentle resistance at edges
        const maxOffset = 0;
        const minOffset = -((tabOrder.length - 1) * width);
        if (offset > maxOffset) offset = maxOffset + (offset - maxOffset) / 3;
        if (offset < minOffset) offset = minOffset + (offset - minOffset) / 3;
        slideWrapper.style.transform = `translateX(${offset}px)`;
      }
    }, { passive: false });

  slideWrapper.addEventListener('touchend', function(e) {
  if (isTagCloudSwipeBlocked()) {
        // Reset and ignore this swipe
        touchStartX = touchStartY = touchCurrentX = touchCurrentY = null;
  ignoreSwipeFromTagCloud = false;
  if (typeof window !== 'undefined') window.ignoreSwipeFromTagCloud = false;
        isDragging = false;
        try { slideWrapper.style.transition = ''; } catch (err) {}
        return;
      }
      if (!isDragging) return;
      isDragging = false;
      // Restore transition so snap/animate will use CSS timing
      try { slideWrapper.style.transition = ''; } catch (err) {}

      // Use changedTouches if available to get final Y as well
      let endX = touchCurrentX;
      let endY = touchCurrentY;
      if (e.changedTouches && e.changedTouches.length) {
        endX = e.changedTouches[0].clientX;
        endY = e.changedTouches[0].clientY;
      }
      if (touchStartX !== null && endX !== null) {
        const dx = endX - touchStartX;
        const dy = (endY || 0) - (touchStartY || 0);
        const width = getWidthPx();
        const minSwipeDist = Math.max(40, Math.round(width * 0.12));
        if (Math.abs(dx) > minSwipeDist && Math.abs(dx) > Math.abs(dy)) {
          let currentTab = slideWrapper.getAttribute('data-tab') || 'feed';
          let idx = tabOrder.indexOf(currentTab);
          if (dx < 0 && idx < tabOrder.length - 1) {
            idx = idx + 1;
          } else if (dx > 0 && idx > 0) {
            idx = idx - 1;
          }
          const nextTab = tabOrder[idx] || currentTab;
          // Trigger tab click so normal flow (rendering/aria/etc) runs
          const btn = document.querySelector('.mobile-tab-bar button[data-tab="' + nextTab + '"]');
          if (btn) btn.click();
          else {
            // Fallback: animate to index directly
            slideWrapper.style.transform = `translateX(-${idx * width}px)`;
            slideWrapper.setAttribute('data-tab', nextTab);
          }
        } else {
          // Snap back to current tab
          const currentTab = slideWrapper.getAttribute('data-tab') || 'feed';
          const idx = tabOrder.indexOf(currentTab);
          slideWrapper.style.transform = `translateX(-${idx * width}px)`;
        }
      }
      touchStartX = touchStartY = touchCurrentX = touchCurrentY = null;
  // no-op: no clone cleanup required since header isn't cloned or hidden
    });
  } else {
    // Desktop: use grid as before
    slideWrapper = null;
    const grid = document.createElement('div');
    grid.className = 'grid';
    left = document.createElement('div');
    right = document.createElement('div');
    grid.appendChild(left);
    grid.appendChild(right);
    root.appendChild(grid);
    try {
      const header = document.querySelector('header[role="banner"]');
      if (header && document.querySelector('.wrap')) {
        document.querySelector('.wrap').prepend(header);
      }
    } catch (e) { /* ignore */ }
  }

  // Responsive: re-render on device width change
  if (!window._tunedinMobileResizeHandler) {
    window._tunedinMobileResizeHandler = true;
    let lastIsMobile = isMobile;
    window.addEventListener('resize', () => {
      const nowMobile = window.matchMedia('(max-width: 600px)').matches;
      if (nowMobile !== lastIsMobile) {
        lastIsMobile = nowMobile;
        // Remove tab bar if present
        const oldTabBar = document.querySelector('.mobile-tab-bar');
        if (oldTabBar) oldTabBar.remove();
        // Re-render main view
        render();
      }
    });
  }
  let currentTab = 'feed';
  // Helper to show/hide views with sliding animation
  function showTab(tab) {
    if (!isMobile) {
        currentTab = tab;
        left.style.display = '';
        right.style.display = '';
        if (tab === 'profile') {
            right.innerHTML = '';
            renderProfileBox(right, state, DB, render);
            // Reset scroll position for profile tab
+            resetScroll(right);
        } else if (tab === 'compose') {
            right.innerHTML = '';
            renderComposeBox(right, state, DB, render);
            // Reset scroll position for compose tab
+            resetScroll(right);
        }
        // Update tab bar active state
        const tabBtns = document.querySelectorAll('.mobile-tab-bar button');
        tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
        return;
    }

    // Mobile: animate slide
    currentTab = tab;

  // Before changing tabs, save the current scroll position for the active tab
  const prevTab = slideWrapper && slideWrapper.getAttribute ? (slideWrapper.getAttribute('data-tab') || currentTab) : currentTab;
  saveCurrentScroll(prevTab);

  // Render content into correct pane, preserve per-tab state
    if (feedPane && composePane && profilePane) {
      if (tab === 'feed') {
  // header remains fixed above slides; feed pane content will sit
  // below it using padding-top from CSS variable.
        if (!feedPane.innerHTML.trim() || !feedTabState.rendered) {
          setupFeedPane({ root, left: feedPane, state, DB, prefs, render });
          feedTabState.rendered = true;
        }
        // restore previous scroll for feed tab instead of forcing to top
        restoreScrollFor('feed');
        // --- Scroll to currently playing post on mobile ---
        if (window.matchMedia && window.matchMedia('(max-width: 600px)').matches && state.queue && state.queue.length > 0 && typeof state.qIndex === 'number') {
          setTimeout(() => {
            const postId = state.queue[state.qIndex];
            if (postId) {
              const postEl = document.getElementById('post-' + postId);
              if (postEl && feedPane.contains(postEl)) {
                postEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }
          }, 150);
        }
      } else if (tab === 'compose') {
        composePane.innerHTML = '';
        renderComposeBox(composePane, state, DB, render);
  restoreScrollFor('compose');
        // header stays fixed above slideWrapper; pane already has padding
      } else if (tab === 'profile') {
        profilePane.innerHTML = '';
        renderProfileBox(profilePane, state, DB, render);
  restoreScrollFor('profile');
        // header stays fixed above slideWrapper; pane already has padding
      }

      // Slide to correct tab
      let slideIndex = 0;
      if (tab === 'feed') slideIndex = 0;
      if (tab === 'compose') slideIndex = 1;
      if (tab === 'profile') slideIndex = 2;
      slideWrapper.style.transform = `translateX(-${slideIndex * 100}vw)`;
      slideWrapper.setAttribute('data-tab', tab);

      // Update tab bar active state
      const tabBtns = document.querySelectorAll('.mobile-tab-bar button');
      tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
    }

    // Save per-tab state to global state for persistence
    state.feedTabState = feedTabState;
    state.composeTabState = composeTabState;
    state.profileTabState = profileTabState;

    // Restore player UI if feed tab is active
    if (tab === 'feed' && state.queue && state.queue.length > 0 && typeof state.qIndex === 'number') {
        setTimeout(() => {
            import('../features/queue.js').then(mod => {
                if (mod && typeof mod.jumpToQueueItem === 'function') {
                    mod.jumpToQueueItem(state.qIndex, state);
                }
            });
        }, 0);
    }
  }

  // Left side: topbar + dock + tags + feed
  if (window.matchMedia('(max-width: 600px)').matches) {
    // Only render feedPane initially, others are blank until tab is switched
    // If the feed pane DOM is new (innerHTML empty) we must call setup even
    // if the saved state says it was rendered previously. This happens when
    // the app is re-rendered (for example after changing prefs) and the
    // per-tab DOM nodes were recreated.
    if (!feedTabState.rendered || !feedPane.innerHTML.trim()) {
      setupFeedPane({ root, left: feedPane, state, DB, prefs, render });
      feedTabState.rendered = true;
      // Autoloading removed: no observer to attach after render
    }
    // Compose/profile panes will be rendered on tab switch
  } else {
    setupFeedPane({ root, left, state, DB, prefs, render });
  // Autoloading removed: no observer to attach for desktop feed
    // Right side: profile + compose (or guest prompt)
    if (state.user) {
      renderProfileBox(right, state, DB, render);
    }
    renderComposeBox(right, state, DB, render);
  }

  // Mobile tab bar injection with accessibility and keyboard navigation
  // Show if mobile and NOT in login/auth screen (state.forceLogin)
  if (isMobile && !state.forceLogin) {
    // Remove any existing tab bar
    const oldTabBar = document.querySelector('.mobile-tab-bar');
    if (oldTabBar) oldTabBar.remove();
    const tabBar = document.createElement('nav');
    tabBar.className = 'mobile-tab-bar';
    tabBar.setAttribute('role', 'tablist');
    tabBar.innerHTML = `
      <div class="tab-indicator"></div>
      <button data-tab="feed" class="active" aria-label="Feed" role="tab" aria-selected="true" tabindex="0">
        <span>🏠</span>
      </button>
      <button data-tab="compose" aria-label="Compose" role="tab" aria-selected="false" tabindex="-1">
        <span>✍️</span>
      </button>
      <button data-tab="profile" aria-label="Profile" role="tab" aria-selected="false" tabindex="-1">
        <span>👤</span>
      </button>
    `;
    document.body.appendChild(tabBar);

    const tabBtns = Array.from(tabBar.querySelectorAll('button[data-tab]'));
    const indicator = tabBar.querySelector('.tab-indicator');
    function moveIndicator(tab) {
      const idx = tabBtns.findIndex(b => b.dataset.tab === tab);
      if (idx !== -1 && indicator) {
        indicator.style.left = `calc(${idx} * 100% / 3)`;
      }
    }

    tabBar.addEventListener('keydown', (e) => {
      const idx = tabBtns.findIndex(btn => btn === document.activeElement);
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        let nextIdx = idx;
        if (e.key === 'ArrowRight') nextIdx = (idx + 1) % tabBtns.length;
        if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + tabBtns.length) % tabBtns.length;
        tabBtns[nextIdx].focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        tabBtns[0].focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        tabBtns[tabBtns.length - 1].focus();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (idx !== -1) tabBtns[idx].click();
      }
    });

    tabBar.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-tab]');
      if (btn) {
        showTab(btn.dataset.tab);
        // Update ARIA attributes and tabindex
        tabBtns.forEach(b => {
          b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
          b.tabIndex = b === btn ? 0 : -1;
        });
        btn.focus();
        moveIndicator(btn.dataset.tab);
      }
    });

    // Initial state
    showTab('feed');
    moveIndicator('feed');
    // Ensure first tab is focusable
    tabBtns[0].tabIndex = 0;

    // Keep mobile tab bar visible when scrolling up.
    // Some browsers or other handlers may hide/show UI on scroll; this listener
    // ensures the tab bar is forced visible when the user scrolls upward.
    if (!window._tunedinMobileTabScrollHandler) {
      window._tunedinMobileTabScrollHandler = true;
      // Use window scroll on desktop, but when mobile panes are used the
      // visible scrolling container is the feed pane. Observe that instead
      // so the tab bar still responds to user scrolling on mobile.
      let isPane = false;
      let scrollEl = window;
      try {
        const pane = document.querySelector('.mobile-slide-pane.feed-pane');
        if (pane) {
          isPane = true;
          scrollEl = pane;
        }
      } catch (e) { /* ignore */ }
      let _lastScrollY = 0;
      try {
        _lastScrollY = isPane ? (scrollEl.scrollTop || 0) : (window.scrollY || 0);
      } catch (e) { _lastScrollY = 0; }
      const handler = () => {
        try {
          const tab = document.querySelector('.mobile-tab-bar');
          if (!tab) return;
          const y = isPane ? (scrollEl.scrollTop || 0) : (window.scrollY || window.pageYOffset || 0);
          // If scrolling up (new y is less than previous), make sure tab is visible
          if (y < _lastScrollY) {
            tab.style.transform = 'translateY(0)';
            tab.style.opacity = '1';
            tab.classList.remove('hidden');
            tab.classList.remove('hide');
          }
          _lastScrollY = y;
        } catch (err) { /* ignore */ }
      };
      try {
        if (isPane && scrollEl && typeof scrollEl.addEventListener === 'function') scrollEl.addEventListener('scroll', handler, { passive: true });
        else window.addEventListener('scroll', handler, { passive: true });
      } catch (e) {
        // Fallback to window
        window.addEventListener('scroll', handler, { passive: true });
      }
    }
  }

  // Initialize dock UI
  updateDock(false, state, DB);

  // Auto-refresh and instant refresh (idempotent via window flags)
  setupAutoRefresh(state, DB);
  setupVisibilityRefresh(state, DB);

  // Delegated login button handler (top bar and right box)
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('#goLoginBtn, [data-action="go-login"]');
    if (btn) {
      e.preventDefault();
      state.forceLogin = true;
      render();
    }
  });

  // Optional external controls elsewhere in the page
  const importFile = $('#importFile');
  if (importFile) importFile.addEventListener('change', (e) => onImport(e, DB, state, render));

  const chk = $('#autoScroll');
  if (chk) chk.onchange = () => savePrefs({ autoScroll: chk.checked });

  // Restore player UI after re-render (fixes player closing on resize)
  if (state.queue && state.queue.length > 0 && typeof state.qIndex === 'number') {
    setTimeout(() => {
      import('../features/queue.js').then(mod => {
        if (mod && typeof mod.jumpToQueueItem === 'function') {
          mod.jumpToQueueItem(state.qIndex, state);
        }
      });
    }, 0);
  }
}