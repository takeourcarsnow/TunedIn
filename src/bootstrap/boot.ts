'use client';

import DB from '../core/db';
import { state, refreshUser } from '../core/app_state';
import { loadQueueInto } from '../features/queue';
import Ticker from '../core/ticker';
import { renderLogin } from '../views/login_view';
import { renderHeader, renderMainContainers } from '../core/header';
import { renderMain } from '../views/main_view';

export async function bootApp() {
  await (DB as any).init();
  (window as any).DB = DB;
  (window as any).state = state;
  await refreshUser();
  // Restore persisted queue into state if present
  try { loadQueueInto(state); } catch {}

  function computeAndPublishCooldown() {
    try {
      if (!state.user || !DB || typeof (DB as any).getAll !== 'function') {
        (window as any).composeCooldown = { isCooldown: false, countdown: '' };
        return;
      }
      const db = (DB as any).getAll() || { posts: [] };
      const me = state.user;
      const now = Date.now();
      const lastPost = (db.posts || []).filter((p: any) => p.userId === me.id).sort((a: any, b: any) => b.createdAt - a.createdAt)[0];
      if (lastPost && now - lastPost.createdAt < 24 * 60 * 60 * 1000) {
        const timeLeft = 24 * 60 * 60 * 1000 - (now - lastPost.createdAt);
        const hours = Math.floor(timeLeft / (60 * 60 * 1000));
        const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
        const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);
        const countdown = `${hours}h ${minutes}m ${seconds}s`;
        (window as any).composeCooldown = { isCooldown: true, countdown };
      } else {
        (window as any).composeCooldown = { isCooldown: false, countdown: '' };
      }
      try { document.dispatchEvent(new CustomEvent('composeCooldownUpdated', { detail: (window as any).composeCooldown })); } catch {}
    } catch {}
  }

  computeAndPublishCooldown();
  const unsub = Ticker.subscribe(() => {
    if (document.hidden) return;
    computeAndPublishCooldown();
  });
  window.addEventListener('beforeunload', () => { try { unsub(); } catch {} });
  // Render UI: if no user or guest mode, show login; else render main app (to be ported)
  renderMainContainers();
  const root = document.getElementById('app') as HTMLElement | null;
  if (!root) return;
  const doRenderMain = () => { renderMain(root, (window as any).state, DB, () => doRenderMain()); };
  if (!state.user) {
    renderLogin(root, DB, doRenderMain);
  } else {
    doRenderMain();
    try {
      import('../tests/queue_harness').then((m) => { try { m.default((window as any).state, DB); } catch {} });
    } catch {}
  }
}
