// Client-side overlay helpers (ported from js/views/overlays.js)
// Lightweight DOM helpers for showing/hiding overlays

export function openLeaderboardOverlay(): void {
  const overlay = document.getElementById('leaderboard-overlay');
  if (overlay) overlay.classList.add('active');
}

export function closeLeaderboardOverlay(): void {
  const overlay = document.getElementById('leaderboard-overlay');
  if (overlay) overlay.classList.remove('active');
  document.dispatchEvent(new CustomEvent('leaderboardOverlayClosed'));
}

export function bindLeaderboardOverlay(): void {
  const overlay = document.getElementById('leaderboard-overlay');
  if (overlay) {
    overlay.onclick = function (e) {
      if (e.target === overlay) closeLeaderboardOverlay();
    };
  }
  document.addEventListener('click', (e) => {
    const target = e.target as Element | null;
    if (target && target.matches('[data-close-leaderboard]')) closeLeaderboardOverlay();
  });
}

let helpClickBound = false;

export function openHelpOverlay(): void {
  const help = document.getElementById('help');
  if (help) help.classList.add('active');
}

export function closeHelpOverlay(): void {
  const help = document.getElementById('help');
  if (help) help.classList.remove('active');
}

export function bindHelpOverlay(): void {
  const helpOverlay = document.getElementById('help');
  if (helpOverlay) {
    helpOverlay.onclick = function (e) {
      if (e.target === helpOverlay) closeHelpOverlay();
    };
  }
  if (!helpClickBound) {
    document.addEventListener('click', (e) => {
      const target = e.target as Element | null;
      if (target && target.matches('[data-close-help]')) closeHelpOverlay();
    });
    helpClickBound = true;
  }
}
