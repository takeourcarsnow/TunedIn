// Enable mouse drag-to-scroll for .tag-cloud on desktop
import { loadPrefs, savePrefs } from '../auth/prefs.js';

export function enableTagCloudDragScroll(tagCloud) {
  if (!tagCloud) tagCloud = document.querySelector('.tag-cloud');
  if (!tagCloud) return;
  // Bulletproof: block tab swipe at the source for all touch events on tag cloud
  function blockTabSwipeOnTagCloud(e) {
    e.stopPropagation();
    e.preventDefault();
  }
  tagCloud.addEventListener('touchstart', blockTabSwipeOnTagCloud, { passive: false });
  tagCloud.addEventListener('touchmove', blockTabSwipeOnTagCloud, { passive: false });
  // Restore scroll position if saved
  if (typeof window !== 'undefined' && typeof window._tagCloudScrollLeft === 'number') {
    tagCloud.scrollLeft = window._tagCloudScrollLeft;
    // Only restore once
    delete window._tagCloudScrollLeft;
  }
  // Attach to window for global use
  if (typeof window !== 'undefined') {
    window.enableTagCloudDragScroll = enableTagCloudDragScroll;
  }

  let isDown = false;
  let startX, startY;
  let scrollLeft;
  let tagCloudRect;
  let downTag = null;
  let drag = false;
  let pointerId = null;
  const DRAG_THRESHOLD = 5; // px, same for all devices for consistency

  function pointerDown(e) {
    // Only left mouse button or single touch
    if ((e.type === 'mousedown' && e.button !== 0) || (e.type === 'pointerdown' && e.pointerType === 'mouse' && e.button !== 0)) return;
    isDown = true;
    drag = false;
    pointerId = e.pointerId || null;
    tagCloud.classList.add('dragging');
    tagCloudRect = tagCloud.getBoundingClientRect();
    if (e.type.startsWith('touch')) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    } else {
      startX = e.clientX;
      startY = e.clientY;
    }
    scrollLeft = tagCloud.scrollLeft;
    // Track tag under pointer down
    let el = e.target;
    if (el && el.classList && el.classList.contains('tag')) {
      downTag = el;
    } else if (el && el.closest && el.closest('.tag')) {
      downTag = el.closest('.tag');
    } else {
      downTag = null;
    }
    // Prevent the event from bubbling to parent handlers (like tab swipe)
    e.stopPropagation && e.stopPropagation();
    e.preventDefault && e.preventDefault();

    // Robustly block tab swipe: set global flag for main_view.js to see
    if (typeof window !== 'undefined') {
      window.ignoreSwipeFromTagCloud = true;
    }

    // For pointer events, capture the pointer so moves outside the element
    // still target us and won't trigger parent gestures.
    try {
      if (e.pointerId && tagCloud.setPointerCapture) tagCloud.setPointerCapture(e.pointerId);
    } catch (err) {
      // ignore setPointerCapture errors on some browsers
    }
  }

  function pointerMove(e) {
    if (!isDown) return;
    let clientX, clientY;
    if (e.type.startsWith('touch')) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const dx = clientX - startX;
    const dy = clientY - startY;
    if (!drag && Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
      drag = true;
    }
    if (!tagCloudRect) tagCloudRect = tagCloud.getBoundingClientRect();
    const x = clientX - tagCloudRect.left;
    tagCloud.scrollLeft = scrollLeft - (x - (startX - tagCloudRect.left));
    e.stopPropagation && e.stopPropagation();
    e.preventDefault && e.preventDefault();
  }

  function pointerUp(e) {
    if (!isDown) return;
    let clientX, clientY;
    if (e.type.startsWith('touch')) {
      clientX = (e.changedTouches && e.changedTouches[0].clientX) || startX;
      clientY = (e.changedTouches && e.changedTouches[0].clientY) || startY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const dx = clientX - startX;
    const dy = clientY - startY;
    // Only select if no drag and pointer up is on the same tag as pointer down
    if (!drag && downTag) {
      const el = document.elementFromPoint(clientX, clientY);
      let tagEl = null;
      if (el && el.classList && el.classList.contains('tag')) {
        tagEl = el;
      } else if (el && el.closest && el.closest('.tag')) {
        tagEl = el.closest('.tag');
      }
        if (tagEl === downTag) {
          // Use the prefs API to persist the filter and trigger a render.
          // This avoids fragile direct mutations of window globals and
          // ensures behavior is identical to the central action handler.
          try {
            const tag = tagEl.getAttribute('data-tag');
            const prefsNow = loadPrefs();
            if (prefsNow && prefsNow.filterTag === tag) {
              savePrefs({ filterTag: null });
            } else {
              savePrefs({ filterTag: tag, search: '' });
            }
            if (typeof window.renderApp === 'function') {
              window.renderApp();
            } else {
              // Fallback: dispatch click so delegated handlers can run if renderApp unavailable
              try {
                const ev = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
                tagEl.dispatchEvent(ev);
              } catch (err) {
                try { tagEl.click(); } catch (e) {}
              }
            }
          } catch (err) {
      // Reset the global swipe block flag
      if (typeof window !== 'undefined') {
        window.ignoreSwipeFromTagCloud = false;
      }
            // Best-effort: fallback to clicking the element
            try { tagEl.click(); } catch (e) {}
          }
        }
    }
    // Release pointer capture if we captured it
    try {
      if (pointerId && tagCloud.releasePointerCapture) tagCloud.releasePointerCapture(pointerId);
    } catch (err) {
      // ignore
    }

    isDown = false;
    downTag = null;
    drag = false;
    pointerId = null;
    tagCloud.classList.remove('dragging');
    tagCloudRect = null;
    e.stopPropagation && e.stopPropagation();
    e.preventDefault && e.preventDefault();
  }


  // Use pointer events if available, else fallback to mouse/touch
  if (window.PointerEvent) {
    tagCloud.addEventListener('pointerdown', pointerDown, { passive: false });
    tagCloud.addEventListener('pointermove', pointerMove, { passive: false });
    tagCloud.addEventListener('pointerup', pointerUp, { passive: false });
    tagCloud.addEventListener('pointercancel', pointerUp, { passive: false });
  } else {
    tagCloud.addEventListener('mousedown', pointerDown, { passive: false });
    document.addEventListener('mousemove', pointerMove, { passive: false });
    document.addEventListener('mouseup', pointerUp, { passive: false });
    tagCloud.addEventListener('touchstart', pointerDown, { passive: false });
    tagCloud.addEventListener('touchmove', pointerMove, { passive: false });
    tagCloud.addEventListener('touchend', pointerUp, { passive: false });
    tagCloud.addEventListener('touchcancel', pointerUp, { passive: false });
  }
}
