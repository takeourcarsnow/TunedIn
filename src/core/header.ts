import { POST_LIMIT_MESSAGES, POST_READY_MESSAGES, GUEST_HEADER_MESSAGES, POST_NO_COOLDOWN_MESSAGES, UPDATE_HEADER_MESSAGE } from './constants';
import { runIdle } from './idle';

declare global {
  interface Window {
    DB?: any; state?: any; _asciiHeaderInterval?: any; composeCooldown?: { isCooldown: boolean; countdown: string };
    _guestMsgIndex?: number;
  }
}

export async function renderHeader() {
  if (window.DB && typeof window.DB.init === 'function') await window.DB.init();
  if (window.DB && typeof window.DB.refresh === 'function') await window.DB.refresh();

  const frameWidth = 41;
  function padLine(str: string) {
    const plain = str.replace(/<[^>]*>/g, '');
    const len = plain.length;
    if (len < frameWidth) {
      const pad = frameWidth - len; const left = Math.floor(pad / 2); const right = pad - left;
      return '\u00A0'.repeat(left) + str + '\u00A0'.repeat(right);
    }
    return str;
  }

  function _pickRandomIndex(len: number, exclude?: number) {
    if (!len || len <= 1) return 0; let idx: number;
    do { idx = Math.floor(Math.random() * len); } while (typeof exclude === 'number' && idx === exclude);
    return idx;
  }

  let postLimitMsgIndex = _pickRandomIndex(POST_LIMIT_MESSAGES.length || 0);
  let noCooldownMsgIndex = _pickRandomIndex(POST_NO_COOLDOWN_MESSAGES.length || 0);

  function padAsciiUpdateCenter(str: string) {
    const plain = str.replace(/<[^>]*>/g, '');
    const len = plain.length; if (len < frameWidth) { const pad = frameWidth - len; const left = Math.floor(pad / 2); const right = pad - left; return '\u00A0'.repeat(left) + str + '\u00A0'.repeat(right); }
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

  if (!document.getElementById('ascii-update-msg-style')) {
    const style = document.createElement('style'); style.id = 'ascii-update-msg-style';
    style.textContent = `
      #ascii-update-msg { animation: ascii-update-fade 2.8s ease-in-out infinite alternate; color: #2e8b57; transition: color 0.5s; }
      @keyframes ascii-update-fade { 0% { opacity: 0.7; } 100% { opacity: 1; } }
    `; document.head.appendChild(style);
  }

  const oldHeader = document.querySelector('header[role="banner"]'); if (oldHeader) oldHeader.remove();
  if (window._asciiHeaderInterval) { clearInterval(window._asciiHeaderInterval); window._asciiHeaderInterval = null; }

  runIdle(() => {
    const info = document.getElementById('ascii-post-limit'); if (!info) return;
    if (window && window.DB && typeof window.DB.refresh === 'function') { window.DB.refresh(); }

    let hover = false; let lastType = '';
    const readyMessages = POST_READY_MESSAGES;
    let readyMsgIndex = _pickRandomIndex(readyMessages.length || 0);
    let readyMsgAnimTimer: any = null; let readyMsgFading = false;

    if (!document.getElementById('ascii-post-limit-fade-style')) {
      const style = document.createElement('style'); style.id = 'ascii-post-limit-fade-style';
      style.textContent = `#ascii-post-limit.fade { transition: opacity 0.35s cubic-bezier(.4,0,.2,1); opacity: 0.25; } #ascii-post-limit { font-family: inherit; }`;
      document.head.appendChild(style);
    }

    function getCooldownInfo() {
      if (window.composeCooldown) { const { isCooldown, countdown } = window.composeCooldown; return { isGuest: false, isCooldown, countdown }; }
      try {
        const db = (window.DB && typeof window.DB.getAll === 'function') ? window.DB.getAll() : { posts: [] };
        const me = window.state && window.state.user; if (!me) return { isGuest: true, isCooldown: false, countdown: '' };
        const now = Date.now();
        const lastPost = (db.posts || []).filter((p: any) => p.userId === me.id).sort((a: any, b: any) => b.createdAt - a.createdAt)[0];
        if (lastPost && now - lastPost.createdAt < 24 * 60 * 60 * 1000) {
          const timeLeft = 24 * 60 * 60 * 1000 - (now - lastPost.createdAt);
          const hours = Math.floor(timeLeft / (60 * 60 * 1000)); const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000)); const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);
          const countdown = `${hours}h ${minutes}m ${seconds}s`; window.composeCooldown = { isCooldown: true, countdown };
          try { document.dispatchEvent(new CustomEvent('composeCooldownUpdated', { detail: window.composeCooldown })); } catch {}
          return { isGuest: false, isCooldown: true, countdown };
        }
        window.composeCooldown = { isCooldown: false, countdown: '' };
      } catch {}
      if (!window.state || !window.state.user) { return { isGuest: true, isCooldown: false, countdown: '' }; }
      let posts: any[] = [];
      if (window.DB && typeof window.DB.getAll === 'function') { const db = window.DB.getAll(); posts = db.posts || []; }
      const me = window.state.user; const now = Date.now();
      const lastPost = posts.filter((p: any) => p.userId === me.id).sort((a, b) => b.createdAt - a.createdAt)[0];
      if (lastPost && now - lastPost.createdAt < 24 * 60 * 60 * 1000) {
        const timeLeft = 24 * 60 * 60 * 1000 - (now - lastPost.createdAt);
        const hours = Math.floor(timeLeft / (60 * 60 * 1000)); const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000)); const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);
        return { isGuest: false, isCooldown: true, countdown: `${hours}h ${minutes}m ${seconds}s` };
      }
      return { isGuest: false, isCooldown: false, countdown: '' };
    }

    function setTextWithFade(newText: string, typeChanged: string | boolean) {
      if ((info as HTMLElement).innerHTML === newText) return;
      if (typeChanged && (lastType === 'ready' || typeChanged === 'ready')) {
        readyMsgFading = true; (info as HTMLElement).classList.add('fade');
        setTimeout(() => { (info as HTMLElement).innerHTML = newText; (info as HTMLElement).classList.remove('fade'); setTimeout(() => { readyMsgFading = false; }, 350); }, 350);
      } else { (info as HTMLElement).innerHTML = newText; }
    }

    async function updatePostLimitInfo() {
      if (window && window.DB && typeof window.DB.refresh === 'function') { try { await window.DB.refresh(); } catch {} }
      let newText = '', type = '';
      const { isGuest, isCooldown, countdown } = getCooldownInfo();
      if (isGuest) {
        const guestMessages = GUEST_HEADER_MESSAGES;
        if (typeof window._guestMsgIndex !== 'number' || window._guestMsgIndex < 0 || window._guestMsgIndex >= guestMessages.length) {
          window._guestMsgIndex = Math.floor(Math.random() * guestMessages.length);
        }
        newText = padLine(guestMessages[window._guestMsgIndex]); type = 'guest';
        if (!readyMsgAnimTimer && lastType !== 'guest') {
          readyMsgAnimTimer = setTimeout(function cycleGuestMsg() {
            let nextIdx; do { nextIdx = Math.floor(Math.random() * guestMessages.length); } while (guestMessages.length > 1 && nextIdx === window._guestMsgIndex);
            window._guestMsgIndex = nextIdx; updatePostLimitInfo();
            const nextDelay = 4500 + Math.random() * 3500; readyMsgAnimTimer = setTimeout(cycleGuestMsg, nextDelay);
          }, 4500 + Math.random() * 3500);
        }
      } else if (isCooldown) {
        if (hover) {
          if (readyMsgAnimTimer) { clearTimeout(readyMsgAnimTimer); readyMsgAnimTimer = null; }
          let timeMsg = `You can post again in ${countdown}.`;
          if (timeMsg.length > 42) timeMsg = `Next post available in ${countdown}.`;
          if (timeMsg.length > 42) timeMsg = `Time left: ${countdown}`;
          newText = padLine(timeMsg); type = 'countdown';
        } else {
          if (!readyMsgAnimTimer && lastType !== 'ready') {
            newText = padLine(POST_LIMIT_MESSAGES[postLimitMsgIndex]); type = 'ready';
            readyMsgAnimTimer = setTimeout(() => {
              postLimitMsgIndex = (postLimitMsgIndex + 1) % POST_LIMIT_MESSAGES.length; updatePostLimitInfo();
              const scheduleNext = () => {
                const nextDelay = 4500 + Math.random() * 3500;
                readyMsgAnimTimer = setTimeout(() => {
                  if (!readyMsgFading) { postLimitMsgIndex = _pickRandomIndex(POST_LIMIT_MESSAGES.length, postLimitMsgIndex); updatePostLimitInfo(); scheduleNext(); }
                  else { readyMsgAnimTimer = setTimeout(scheduleNext, 500); }
                }, nextDelay);
              }; scheduleNext();
            }, 4500 + Math.random() * 3500);
          } else if (readyMsgAnimTimer) { newText = padLine(POST_LIMIT_MESSAGES[postLimitMsgIndex]); type = 'ready'; }
        }
      } else {
        if (!readyMsgAnimTimer && lastType !== 'ready') {
          newText = padLine(POST_NO_COOLDOWN_MESSAGES[noCooldownMsgIndex]); type = 'ready';
          readyMsgAnimTimer = setTimeout(() => {
            noCooldownMsgIndex = _pickRandomIndex(POST_NO_COOLDOWN_MESSAGES.length, noCooldownMsgIndex); updatePostLimitInfo();
            const scheduleNext = () => {
              const nextDelay = 4500 + Math.random() * 3500;
              readyMsgAnimTimer = setTimeout(() => {
                if (!readyMsgFading) { noCooldownMsgIndex = _pickRandomIndex(POST_NO_COOLDOWN_MESSAGES.length, noCooldownMsgIndex); updatePostLimitInfo(); scheduleNext(); }
                else { readyMsgAnimTimer = setTimeout(scheduleNext, 500); }
              }, nextDelay);
            }; scheduleNext();
          }, 4500 + Math.random() * 3500);
        } else if (readyMsgAnimTimer) { newText = padLine(POST_NO_COOLDOWN_MESSAGES[noCooldownMsgIndex]); type = 'ready'; }
      }
      const typeChanged = type !== lastType; lastType = type; setTextWithFade(newText, typeChanged);
    }

    document.addEventListener('composeCooldownUpdated', () => { try { updatePostLimitInfo(); } catch {} });
    info.addEventListener('mouseenter', () => { hover = true; updatePostLimitInfo(); });
    info.addEventListener('mouseleave', () => { hover = false; updatePostLimitInfo(); });
    let touchActive = false;
    info.addEventListener('touchend', (e) => { e.preventDefault(); touchActive = !touchActive; hover = touchActive; updatePostLimitInfo(); });
    updatePostLimitInfo(); window._asciiHeaderInterval = setInterval(updatePostLimitInfo, 1000);
  }, { timeout: 800, fallbackDelay: 10 } as any);

  const header = document.createElement('header'); header.setAttribute('role', 'banner'); header.innerHTML = headerHTML;
  document.querySelector('.wrap')?.prepend(header);
}

export function renderMainContainers() {
  const wrap = document.querySelector('.wrap') as HTMLElement | null; if (!wrap) return;
  if (!document.getElementById('app')) { const main = document.createElement('main'); main.id = 'app'; main.setAttribute('role', 'main'); wrap.appendChild(main); }
  if (!document.getElementById('live')) { const live = document.createElement('div'); live.id = 'live'; live.className = 'sr-only'; live.setAttribute('aria-live', 'polite'); wrap.appendChild(live); }
}
