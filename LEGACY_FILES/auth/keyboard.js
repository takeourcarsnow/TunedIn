import { $, $$ } from '../core/utils.js';
import { queueNext, queuePrev, getActiveQueueId } from '../features/queue.js';
import { openHelpOverlay } from '../views/overlays.js';

export function onKey(e, state) {
  const tag = e.target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea') return;

  const posts = $$('#app', '.post');
  const currentId = getActiveQueueId(state);
  const currentEl = currentId ? document.getElementById('post-' + currentId) : null;
  let focusCard = currentEl || posts[0];

  if (e.key === '/') { e.preventDefault(); $('#search')?.focus(); return; }
  if (e.key.toLowerCase() === 'n') { $('#f_title')?.focus(); return; }
  if (e.key.toLowerCase() === 'j') { e.preventDefault(); queueNext(false, state); return; }
  if (e.key.toLowerCase() === 'k') { e.preventDefault(); queuePrev(state); return; }
  if (e.key === '?') { openHelpOverlay(); return; }
  if (e.key.toLowerCase() === 'l' && focusCard) {
    const likeBtn = focusCard.querySelector('[data-action="like"]');
    likeBtn?.click(); return;
  }
  if (e.key.toLowerCase() === 'o' && focusCard) {
    const playBtn = focusCard.querySelector('[data-action="toggle-player"]');
    playBtn?.click(); return;
  }
}