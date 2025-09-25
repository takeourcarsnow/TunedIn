// Header module: injects the header HTML into the page
import { POST_LIMIT_MESSAGES, POST_READY_MESSAGES, GUEST_HEADER_MESSAGES, POST_NO_COOLDOWN_MESSAGES } from './constants.js';
import { UPDATE_HEADER_MESSAGE } from './constants.js';
import { runIdle } from './idle.js';
export async function renderHeader() {
  // Ensure DB is initialized before rendering header
  if (window.DB && typeof window.DB.init === 'function') {
    await window.DB.init();
  }
  // Force refresh to ensure cache is up to date
  if (window.DB && typeof window.DB.refresh === 'function') {
    await window.DB.refresh();
  }
  // (debug log removed)
  // Use Unicode box-drawing for perfect frame, and wrap with invisible comment markers
  // Frame width: 36 chars (between | and |)
  const frameWidth = 41;
  function padLine(str) {
    // Remove any HTML tags for length calculation
    const plain = str.replace(/<[^>]*>/g, '');
    const len = plain.length;
    if (len < frameWidth) {
      const pad = frameWidth - len;
      const left = Math.floor(pad / 2);
      const right = pad - left;
      return '&nbsp;'.repeat(left) + str + '&nbsp;'.repeat(right);
    }
    return str;
  }
  // Post limit message variations (imported from constants)
  const postLimitMessages = POST_LIMIT_MESSAGES;
  const noCooldownMessages = POST_NO_COOLDOWN_MESSAGES;
  // Pick random starting indices so the header shows a random line on each load
  function _pickRandomIndex(len, exclude) {
    if (!len || len <= 1) return 0;
    let idx;
    do { idx = Math.floor(Math.random() * len); } while (typeof exclude === 'number' && idx === exclude);
    return idx;
  }

  let postLimitMsgIndex = _pickRandomIndex(postLimitMessages && postLimitMessages.length ? postLimitMessages.length : 0);
  let noCooldownMsgIndex = _pickRandomIndex(noCooldownMessages && noCooldownMessages.length ? noCooldownMessages.length : 0);
  // Helper to pad the update message for the ASCII frame
  // Helper to pad the update message to the right of the frame
  function padAsciiUpdateCenter(str) {
    // Center the message to the frame width (41)
    const plain = str.replace(/<[^>]*>/g, '');
    const len = plain.length;
    if (len < frameWidth) {
      const pad = frameWidth - len;
      const left = Math.floor(pad / 2);
      const right = pad - left;
      return '\u00A0'.repeat(left) + str + '\u00A0'.repeat(right);
    }
    return str;
  }
  const updateAsciiMsg = padAsciiUpdateCenter(`<span id="ascii-update-msg">${UPDATE_HEADER_MESSAGE}</span>`);
  const headerHTML = `
    <img src="/assets/logo.png" alt="Logo" class="login-logo-anim header-logo-anim" style="width:44px; height:44px; object-fit:contain; display:block; margin:0 auto 8px auto;" />
    <pre id="ascii-banner" class="head ascii-banner" aria-hidden="false" style="font-family:'Fira Mono','Consolas','Menlo','Monaco','Liberation Mono',monospace !important;font-size:1em;line-height:1.1;letter-spacing:0;white-space:pre;overflow-x:auto;margin:0 auto 8px auto;max-width:100vw;">
<!--ascii-start-->
●--------------------------- TunedIn.space --●
| <span id="ascii-post-limit">${padLine('')}</span> |
●--------------------------------------------●
${updateAsciiMsg}
<!--ascii-end-->
    </pre>
  `;
  // Inject subtle animation for the update message if not present
  if (!document.getElementById('ascii-update-msg-style')) {
    const style = document.createElement('style');
    style.id = 'ascii-update-msg-style';
    style.textContent = `
      #ascii-update-msg {
        animation: ascii-update-fade 2.8s ease-in-out infinite alternate;
        color: #2e8b57;
        transition: color 0.5s;
      }
      @keyframes ascii-update-fade {
        0% { opacity: 0.7; }
        100% { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
  // Remove any existing header to avoid duplicates and stale event listeners
  const oldHeader = document.querySelector('header[role="banner"]');
  if (oldHeader) oldHeader.remove();
  // Clear any previous updatePostLimitInfo intervals
  if (window._asciiHeaderInterval) {
    clearInterval(window._asciiHeaderInterval);
    window._asciiHeaderInterval = null;
  }
  // Animate and update the ascii-post-limit line — schedule during idle
  runIdle(() => {
  const info = document.getElementById('ascii-post-limit');
  if (!info) return;
    // Always use latest DB and state
    if (window && window.DB && typeof window.DB.refresh === 'function') {
      window.DB.refresh();
    }
    if (window && window.state && window.state.user && typeof window.state.user === 'object') {
      // Optionally refresh user if needed (if async, may need to await)
    }
    let hover = false;
    let lastType = '';
  const readyMessages = POST_READY_MESSAGES;
  // Start ready message at a random index so each load shows a different line
  let readyMsgIndex = _pickRandomIndex(readyMessages && readyMessages.length ? readyMessages.length : 0);
  let readyMsgAnimTimer = null;
  let readyMsgFading = false;
    // Add fade animation style if not present
    if (!document.getElementById('ascii-post-limit-fade-style')) {
      const style = document.createElement('style');
      style.id = 'ascii-post-limit-fade-style';
      style.textContent = `
        #ascii-post-limit.fade { transition: opacity 0.35s cubic-bezier(.4,0,.2,1); opacity: 0.25; }
        #ascii-post-limit { font-family: inherit; }
      `;
      document.head.appendChild(style);
    }
    function getCooldownInfo() {
      // Use compose box cooldown state if available
      if (window.composeCooldown) {
        const { isCooldown, countdown } = window.composeCooldown;
        return { isGuest: false, isCooldown, countdown };
      }
      // If compose hasn't initialized, compute cooldown from DB posts as a fallback and expose it
      // This helps mobile where compose may not be rendered yet
      try {
        const db = (window.DB && typeof window.DB.getAll === 'function') ? window.DB.getAll() : { posts: [] };
        const me = window.state && window.state.user;
        if (!me) return { isGuest: true, isCooldown: false, countdown: '' };
        const now = Date.now();
        const lastPost = (db.posts || []).filter(p => p.userId === me.id).sort((a, b) => b.createdAt - a.createdAt)[0];
        if (lastPost && now - lastPost.createdAt < 24 * 60 * 60 * 1000) {
          const timeLeft = 24 * 60 * 60 * 1000 - (now - lastPost.createdAt);
          const hours = Math.floor(timeLeft / (60 * 60 * 1000));
          const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
          const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);
          const countdown = `${hours}h ${minutes}m ${seconds}s`;
          // Expose to window so compose/header stay consistent
          window.composeCooldown = { isCooldown: true, countdown };
          try { document.dispatchEvent(new CustomEvent('composeCooldownUpdated', { detail: window.composeCooldown })); } catch (e) {}
          return { isGuest: false, isCooldown: true, countdown };
        }
        // Not cooldown
        window.composeCooldown = { isCooldown: false, countdown: '' };
      } catch (e) {
        // ignore
      }
      // Fallback to legacy logic if composeCooldown is not available
      if (!window.state || !window.state.user) {
        return { isGuest: true, isCooldown: false, countdown: '' };
      }
      let posts = [];
      if (window.DB && typeof window.DB.getAll === 'function') {
        const db = window.DB.getAll();
        posts = db.posts || [];
      }
      const me = window.state.user;
      const now = Date.now();
      const lastPost = posts.filter(p => p.userId === me.id).sort((a, b) => b.createdAt - a.createdAt)[0];
      if (lastPost && now - lastPost.createdAt < 24 * 60 * 60 * 1000) {
        const timeLeft = 24 * 60 * 60 * 1000 - (now - lastPost.createdAt);
        const hours = Math.floor(timeLeft / (60 * 60 * 1000));
        const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
        const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);
        return { isGuest: false, isCooldown: true, countdown: `${hours}h ${minutes}m ${seconds}s` };
      }
      return { isGuest: false, isCooldown: false, countdown: '' };
    }
    function padLine(str) {
      // Remove any HTML tags for length calculation
      const plain = str.replace(/<[^>]*>/g, '');
      const len = plain.length;
      if (len < frameWidth) {
        const pad = frameWidth - len;
        const left = Math.floor(pad / 2);
        const right = pad - left;
        return '\u00A0'.repeat(left) + str + '\u00A0'.repeat(right);
      }
      return str;
    }
    function setTextWithFade(newText, typeChanged) {
      // Only update if changed
      if (info.innerHTML === newText) return;
      // Only fade for ready messages, not for countdown/info
      if (typeChanged && (lastType === 'ready' || typeChanged === 'ready')) {
        readyMsgFading = true;
        info.classList.add('fade');
        setTimeout(() => {
          info.innerHTML = newText;
          info.classList.remove('fade');
          setTimeout(() => { readyMsgFading = false; }, 350); // allow fade in to finish
        }, 350); // fade out duration
      } else {
        info.innerHTML = newText;
      }
    }
  async function updatePostLimitInfo() {
  // Ensure DB is fresh before computing cooldown state (important on mobile)
  if (window && window.DB && typeof window.DB.refresh === 'function') {
    try { await window.DB.refresh(); } catch (e) { /* ignore refresh errors */ }
  }
      // Use getCooldownInfo for all cooldown state
      let newText = '', type = '';
      const { isGuest, isCooldown, countdown } = getCooldownInfo();
      if (isGuest) {
        // Guest mode: show a guest-appropriate message (cycled)
        const guestMessages = GUEST_HEADER_MESSAGES;
        // On first load, pick a random message index
        if (typeof window._guestMsgIndex !== 'number' || window._guestMsgIndex < 0 || window._guestMsgIndex >= guestMessages.length) {
          window._guestMsgIndex = Math.floor(Math.random() * guestMessages.length);
        }
        newText = padLine(guestMessages[window._guestMsgIndex]);
        type = 'guest';
        // Only set up the timer if not already running
        if (!readyMsgAnimTimer && lastType !== 'guest') {
          readyMsgAnimTimer = setTimeout(function cycleGuestMsg() {
            // Pick a random index different from the current one
            let nextIdx;
            do {
              nextIdx = Math.floor(Math.random() * guestMessages.length);
            } while (guestMessages.length > 1 && nextIdx === window._guestMsgIndex);
            window._guestMsgIndex = nextIdx;
            updatePostLimitInfo();
            const nextDelay = 4500 + Math.random() * 3500;
            readyMsgAnimTimer = setTimeout(cycleGuestMsg, nextDelay);
          }, 4500 + Math.random() * 3500);
        }
      } else if (isCooldown) {
        // On cooldown: show countdown on hover, otherwise show waiting messages
        if (hover) {
          if (readyMsgAnimTimer) {
            clearTimeout(readyMsgAnimTimer);
            readyMsgAnimTimer = null;
          }
          // Format a longer, friendlier countdown message (max 42 chars)
          let timeMsg = `You can post again in ${countdown}.`;
          if (timeMsg.length > 42) {
            timeMsg = `Next post available in ${countdown}.`;
          }
          if (timeMsg.length > 42) {
            timeMsg = `Time left: ${countdown}`;
          }
          newText = padLine(timeMsg);
          type = 'countdown';
        } else {
          // Not hovering: cycle waiting messages
          if (!readyMsgAnimTimer && lastType !== 'ready') {
            newText = padLine(postLimitMessages[postLimitMsgIndex]);
            type = 'ready';
            readyMsgAnimTimer = setTimeout(() => {
              postLimitMsgIndex = (postLimitMsgIndex + 1) % postLimitMessages.length;
              updatePostLimitInfo();
              // Start the normal animation loop
              const scheduleNext = () => {
                const nextDelay = 4500 + Math.random() * 3500;
                readyMsgAnimTimer = setTimeout(() => {
                  if (!readyMsgFading) {
                    // Pick a random next index (avoid repeating the same message when possible)
                    postLimitMsgIndex = _pickRandomIndex(postLimitMessages.length, postLimitMsgIndex);
                    updatePostLimitInfo();
                    scheduleNext();
                  } else {
                    readyMsgAnimTimer = setTimeout(scheduleNext, 500);
                  }
                }, nextDelay);
              };
              scheduleNext();
            }, 4500 + Math.random() * 3500);
          } else if (readyMsgAnimTimer) {
            newText = padLine(postLimitMessages[postLimitMsgIndex]);
            type = 'ready';
          }
        }
      } else {
        // Not on cooldown: show friendly no-cooldown messages (cycle through prompts)
        if (!readyMsgAnimTimer && lastType !== 'ready') {
          newText = padLine(noCooldownMessages[noCooldownMsgIndex]);
          type = 'ready';
          readyMsgAnimTimer = setTimeout(() => {
    // Pick a random next no-cooldown message
    noCooldownMsgIndex = _pickRandomIndex(noCooldownMessages.length, noCooldownMsgIndex);
            updatePostLimitInfo();
            const scheduleNext = () => {
              const nextDelay = 4500 + Math.random() * 3500;
              readyMsgAnimTimer = setTimeout(() => {
                if (!readyMsgFading) {
      // Next index should be random to keep things fresh
      noCooldownMsgIndex = _pickRandomIndex(noCooldownMessages.length, noCooldownMsgIndex);
                  updatePostLimitInfo();
                  scheduleNext();
                } else {
                  readyMsgAnimTimer = setTimeout(scheduleNext, 500);
                }
              }, nextDelay);
            };
            scheduleNext();
          }, 4500 + Math.random() * 3500);
        } else if (readyMsgAnimTimer) {
          newText = padLine(noCooldownMessages[noCooldownMsgIndex]);
          type = 'ready';
        }
      }
      const typeChanged = type !== lastType;
      lastType = type;
      setTextWithFade(newText, typeChanged);
    }
    // If compose updates cooldown state, refresh header immediately (fix mobile timing)
    document.addEventListener('composeCooldownUpdated', () => {
      try { updatePostLimitInfo(); } catch (e) { /* ignore */ }
    });
  info.addEventListener('mouseenter', () => { hover = true; updatePostLimitInfo(); });
  info.addEventListener('mouseleave', () => { hover = false; updatePostLimitInfo(); });
  // Mobile: tap to show countdown, tap again to hide
  let touchActive = false;
  info.addEventListener('touchend', (e) => {
    e.preventDefault();
    touchActive = !touchActive;
    hover = touchActive;
    updatePostLimitInfo();
  });
  updatePostLimitInfo();
  window._asciiHeaderInterval = setInterval(updatePostLimitInfo, 1000);
  }, { timeout: 800, fallbackDelay: 10 });
  const header = document.createElement('header');
  header.setAttribute('role', 'banner');
  header.innerHTML = headerHTML;
  document.querySelector('.wrap').prepend(header);
}

// Main app container module: ensures #app and #live exist
export function renderMainContainers() {
  const wrap = document.querySelector('.wrap');
  if (!document.getElementById('app')) {
    const main = document.createElement('main');
    main.id = 'app';
    main.setAttribute('role', 'main');
    wrap.appendChild(main);
  }
  if (!document.getElementById('live')) {
    const live = document.createElement('div');
    live.id = 'live';
    live.className = 'sr-only';
    live.setAttribute('aria-live', 'polite');
    wrap.appendChild(live);
  }
}
