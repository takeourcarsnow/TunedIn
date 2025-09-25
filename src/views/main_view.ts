import { $ } from '../core/utils';
import { loadPrefs } from '../auth/prefs';
import { renderHeader } from '../core/header';
import { renderFeed, renderTags, setStateRef } from '../features/feed';
import { onActionClick, onDelegatedSubmit } from '../features/actions';

export async function renderMain(root: HTMLElement, state: any, DB: any, render: () => void) {
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
  const banner = document.getElementById('ascii-banner'); if (banner) (banner as HTMLElement).style.display = '';
  document.body.classList.add('show-header');

  // Basic two-column layout for desktop; simple feed container for mobile
  root.innerHTML = '';
  const isMobile = window.matchMedia('(max-width: 600px)').matches;
  if (!isMobile) {
    const grid = document.createElement('div'); grid.className = 'grid';
    const left = document.createElement('div'); const right = document.createElement('div');
    grid.appendChild(left); grid.appendChild(right); root.appendChild(grid);
    try { const header = document.querySelector('header[role="banner"]'); if (header && document.querySelector('.wrap')) { document.querySelector('.wrap')!.prepend(header); } } catch {}
    // Minimal: render feed scaffold and a compose/profile placeholders
    const tagsBox = document.createElement('div'); tagsBox.className = 'box'; tagsBox.id = 'tagsBoxMain'; tagsBox.innerHTML = `<div class="muted small">&gt; tags</div><div id="tags"></div>`;
    const feedBox = document.createElement('div'); feedBox.className = 'box'; feedBox.innerHTML = `<div id="feed"></div><div id="pager" class="hstack" style="justify-content:center; margin-top:8px"></div>`;
  left.appendChild(tagsBox); left.appendChild(feedBox);
  setStateRef(state);
  const prefs = loadPrefs();
  renderFeed(feedBox.querySelector('#feed') as HTMLElement, feedBox.querySelector('#pager') as HTMLElement, state, DB, prefs as any);
  renderTags(tagsBox.querySelector('#tags') as HTMLElement, DB, prefs as any);
    // Right column: compose and profile boxes
    try {
      const composeMod = await import('./main_view_compose');
      composeMod.renderComposeBox(right, state, DB, render);
    } catch { const fallback = document.createElement('div'); fallback.className = 'box'; fallback.innerHTML = `<div class="muted small">&gt; compose</div>`; right.appendChild(fallback); }
    try {
      const profileMod = await import('./main_view_profile');
      profileMod.renderProfileBox(right, state, DB, render);
    } catch { const fallback = document.createElement('div'); fallback.className = 'box'; fallback.innerHTML = `<div class="muted small">&gt; profile</div>`; right.appendChild(fallback); }
    // TODO: notifications box can be added here later
  } else {
  const container = document.createElement('div'); container.className = 'box';
    container.innerHTML = `<div id="feed"></div><div id="pager" class="hstack" style="justify-content:center; margin-top:8px"></div>`;
    root.appendChild(container);
  setStateRef(state);
  const prefs = loadPrefs();
  renderFeed(container.querySelector('#feed') as HTMLElement, container.querySelector('#pager') as HTMLElement, state, DB, prefs as any);
  const tagsBox = document.createElement('div'); tagsBox.className = 'box'; tagsBox.id = 'tagsBoxMain'; tagsBox.innerHTML = `<div class="muted small">&gt; tags</div><div id="tags"></div>`; root.prepend(tagsBox);
  renderTags(tagsBox.querySelector('#tags') as HTMLElement, DB, prefs as any);
    // Basic mobile tab bar scaffold
    const oldTabBar = document.querySelector('.mobile-tab-bar'); if (oldTabBar) (oldTabBar as HTMLElement).remove();
    const tabBar = document.createElement('nav'); tabBar.className = 'mobile-tab-bar'; tabBar.setAttribute('role','tablist');
    tabBar.innerHTML = `
      <div class="tab-indicator"></div>
      <button data-tab="feed" class="active" aria-label="Feed" role="tab" aria-selected="true" tabindex="0"><span>🏠</span></button>
      <button data-tab="compose" aria-label="Compose" role="tab" aria-selected="false" tabindex="-1"><span>✍️</span></button>
      <button data-tab="profile" aria-label="Profile" role="tab" aria-selected="false" tabindex="-1"><span>👤</span></button>
    `;
    document.body.appendChild(tabBar);
  }

  renderHeader();

  // Event delegation for actions and form submit
  const rootEl = document.getElementById('app');
  if (rootEl) {
    rootEl.addEventListener('click', (e) => onActionClick(e as any, state, DB, () => renderMain(root, state, DB, render)));
    rootEl.addEventListener('submit', (e) => onDelegatedSubmit(e as any, state, DB, () => renderMain(root, state, DB, render)));
  }
}
