// Leaderboard overlay logic
export function openLeaderboardOverlay() {
  const overlay = document.getElementById('leaderboard-overlay');
  if (overlay) overlay.classList.add('active');
}

export function closeLeaderboardOverlay() {
  const overlay = document.getElementById('leaderboard-overlay');
  if (overlay) overlay.classList.remove('active');
  document.dispatchEvent(new CustomEvent('leaderboardOverlayClosed'));
}

export function bindLeaderboardOverlay() {
  const overlay = document.getElementById('leaderboard-overlay');
  if (overlay) {
    overlay.onclick = function (e) {
      if (e.target === overlay) closeLeaderboardOverlay();
    };
  }
  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-close-leaderboard]')) closeLeaderboardOverlay();
  });
}
let helpClickBound = false;

export function openHelpOverlay() {
  const help = document.getElementById('help');
  if (help) help.classList.add('active');
}

export function closeHelpOverlay() {
  const help = document.getElementById('help');
  if (help) help.classList.remove('active');
}

export function bindHelpOverlay() {
  const helpOverlay = document.getElementById('help');
  if (helpOverlay) {
    helpOverlay.onclick = function (e) {
      if (e.target === helpOverlay) closeHelpOverlay();
    };
  }
  if (!helpClickBound) {
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-close-help]')) closeHelpOverlay();
    });
    helpClickBound = true;
  }
}