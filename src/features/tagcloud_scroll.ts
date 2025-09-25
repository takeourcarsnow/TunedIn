// Port of js/features/tagcloud_scroll.js
import { loadPrefs, savePrefs } from '../auth/prefs';

export function enableTagCloudDragScroll(tagCloud?: HTMLElement | null) {
  if (!tagCloud) tagCloud = document.querySelector('.tag-cloud') as HTMLElement | null;
  if (!tagCloud) return;

  function blockTabSwipeOnTagCloud(e: Event) {
    e.stopPropagation();
    e.preventDefault();
  }
  tagCloud.addEventListener('touchstart', blockTabSwipeOnTagCloud as EventListener, { passive: false });
  tagCloud.addEventListener('touchmove', blockTabSwipeOnTagCloud as EventListener, { passive: false });

  if (typeof window !== 'undefined' && typeof (window as any)._tagCloudScrollLeft === 'number') {
    tagCloud.scrollLeft = (window as any)._tagCloudScrollLeft;
    delete (window as any)._tagCloudScrollLeft;
  }

  if (typeof window !== 'undefined') (window as any).enableTagCloudDragScroll = enableTagCloudDragScroll;

  let isDown = false;
  let startX = 0, startY = 0;
  let scrollLeft = 0;
  let tagCloudRect: DOMRect | null = null;
  let downTag: Element | null = null;
  let drag = false;
  let pointerId: number | null = null;
  const DRAG_THRESHOLD = 5;

  function pointerDown(e: any) {
    if ((e.type === 'mousedown' && e.button !== 0) || (e.type === 'pointerdown' && e.pointerType === 'mouse' && e.button !== 0)) return;
    isDown = true; drag = false; pointerId = e.pointerId || null;
    tagCloud!.classList.add('dragging');
    tagCloudRect = tagCloud!.getBoundingClientRect();
    if (e.type.startsWith('touch')) { startX = e.touches[0].clientX; startY = e.touches[0].clientY; }
    else { startX = e.clientX; startY = e.clientY; }
    scrollLeft = tagCloud!.scrollLeft;
    let el = e.target as Element | null;
    if (el && el.classList && el.classList.contains('tag')) downTag = el;
    else if (el && (el as Element).closest) downTag = (el as Element).closest('.tag');
    else downTag = null;
    e.stopPropagation && e.stopPropagation(); e.preventDefault && e.preventDefault();
    if (typeof window !== 'undefined') (window as any).ignoreSwipeFromTagCloud = true;
    try { if (e.pointerId && (tagCloud as any).setPointerCapture) (tagCloud as any).setPointerCapture(e.pointerId); } catch (err) {}
  }

  function pointerMove(e: any) {
    if (!isDown) return;
    let clientX = 0, clientY = 0;
    if (e.type.startsWith('touch')) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; }
    else { clientX = e.clientX; clientY = e.clientY; }
    const dx = clientX - startX; const dy = clientY - startY;
    if (!drag && Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) drag = true;
    if (!tagCloudRect) tagCloudRect = tagCloud!.getBoundingClientRect();
    const x = clientX - tagCloudRect.left;
    tagCloud!.scrollLeft = scrollLeft - (x - (startX - tagCloudRect.left));
    e.stopPropagation && e.stopPropagation(); e.preventDefault && e.preventDefault();
  }

  function pointerUp(e: any) {
    if (!isDown) return;
    let clientX = 0, clientY = 0;
    if (e.type.startsWith('touch')) { clientX = (e.changedTouches && e.changedTouches[0].clientX) || startX; clientY = (e.changedTouches && e.changedTouches[0].clientY) || startY; }
    else { clientX = e.clientX; clientY = e.clientY; }
    const dx = clientX - startX; const dy = clientY - startY;
    if (!drag && downTag) {
      const el = document.elementFromPoint(clientX, clientY) as Element | null;
      let tagEl: Element | null = null;
      if (el && el.classList && el.classList.contains('tag')) tagEl = el;
      else if (el && (el as Element).closest) tagEl = (el as Element).closest('.tag');
      if (tagEl === downTag) {
        try {
          const tag = tagEl.getAttribute('data-tag');
          const prefsNow = loadPrefs();
          if (prefsNow && prefsNow.filterTag === tag) savePrefs({ filterTag: null });
          else savePrefs({ filterTag: tag, search: '' });
          if (typeof (window as any).renderApp === 'function') (window as any).renderApp();
          else {
            try { const ev = new MouseEvent('click', { bubbles: true, cancelable: true, view: window }); tagEl.dispatchEvent(ev); } catch (err) { try { (tagEl as HTMLElement).click(); } catch (e) {} }
          }
        } catch (err) {
          if (typeof window !== 'undefined') (window as any).ignoreSwipeFromTagCloud = false;
          try { (downTag as HTMLElement).click(); } catch (e) {}
        }
      }
    }
    try { if (pointerId && (tagCloud as any).releasePointerCapture) (tagCloud as any).releasePointerCapture(pointerId); } catch (err) {}
    isDown = false; downTag = null; drag = false; pointerId = null; tagCloud!.classList.remove('dragging'); tagCloudRect = null;
    e.stopPropagation && e.stopPropagation(); e.preventDefault && e.preventDefault();
  }

  if ((window as any).PointerEvent) {
    tagCloud.addEventListener('pointerdown', pointerDown as EventListener, { passive: false });
    tagCloud.addEventListener('pointermove', pointerMove as EventListener, { passive: false });
    tagCloud.addEventListener('pointerup', pointerUp as EventListener, { passive: false });
    tagCloud.addEventListener('pointercancel', pointerUp as EventListener, { passive: false });
  } else {
    tagCloud.addEventListener('mousedown', pointerDown as EventListener, { passive: false });
    document.addEventListener('mousemove', pointerMove as EventListener, { passive: false });
    document.addEventListener('mouseup', pointerUp as EventListener, { passive: false });
    tagCloud.addEventListener('touchstart', pointerDown as EventListener, { passive: false });
    tagCloud.addEventListener('touchmove', pointerMove as EventListener, { passive: false });
    tagCloud.addEventListener('touchend', pointerUp as EventListener, { passive: false });
    tagCloud.addEventListener('touchcancel', pointerUp as EventListener, { passive: false });
  }
}
