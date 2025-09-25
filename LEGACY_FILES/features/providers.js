// --- Provider detection & embed building ---

function safeURL(u) {
  try { return new URL(u); } catch { return null; }
}

function isHTTPOrigin(origin) {
  return typeof origin === 'string' && /^https?:\/\//i.test(origin);
}

// --- Modern robust provider detection ---
export function parseProvider(url) {
  const u = (url || '').trim();
  const l = u.toLowerCase();
  const parsed = safeURL(u);

  // Direct audio (file extension or Supabase Storage public audio URL)
  if (/\.(mp3|ogg|wav|m4a)(?:$|\?)/i.test(l)
    || /\/storage\/v1\/object\/public\/audio\//.test(l)) {
    return { provider: 'audio', id: u };
  }

  // YouTube and Shorts
  if (parsed && /(^|\.)youtube\.com$|(^|\.)m\.youtube\.com$|(^|\.)music\.youtube\.com$|(^|\.)youtu\.be$/.test(parsed.hostname)) {
    const sp = parsed.searchParams;
    const list = sp.get('list');
    const path = parsed.pathname.replace(/\/+$/, '');

    // Extract video ID
    let id = sp.get('v');
    if (!id && /\/shorts\//i.test(path)) {
      id = path.split('/').filter(Boolean).pop();
    }
    if (!id && /\/embed\//i.test(path)) {
      id = path.split('/').filter(Boolean).pop();
    }
    if (!id && /youtu\.be$/i.test(parsed.hostname)) {
      id = path.split('/').filter(Boolean).shift();
    }

    // If video ID is present, always return video (even if playlist param exists)
    if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) {
      return { provider: 'youtube', id };
    }
    // Playlist detection (only if no video ID)
    if (list) return { provider: 'youtube_playlist', id: list };
  }

  // Spotify
  if (parsed && /(^|\.)open\.spotify\.com$/.test(parsed.hostname)) {
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      const kind = parts[0].toLowerCase(); // track|album|playlist|episode|show
      const id = parts[1];
      if (/^(track|album|playlist|episode|show)$/i.test(kind) && id) {
        return { provider: 'spotify', kind, id };
      }
    }
  }

  // Bandcamp (page or EmbeddedPlayer URL)
  if (parsed && /bandcamp\.com$/i.test(parsed.hostname) || /bandcamp\.com$/i.test(l)) {
    return { provider: 'bandcamp', id: u };
  }

  // SoundCloud
  if (parsed && /(^|\.)soundcloud\.com$/.test(parsed.hostname) || /soundcloud\.com/i.test(l)) {
    return { provider: 'soundcloud', id: u };
  }

  // Fallback
  return { provider: 'link', id: u };
}

// --- Robust embedder ---
export function buildEmbed(post, container, opts = {}) {
  const p = post.provider || parseProvider(post.url || post.id || '');
  const wrap = container;
  // cleanup any previous listeners
  try { wrap._cleanup && wrap._cleanup(); } catch {}
  wrap._cleanup = null;
  wrap.innerHTML = '';
  const autoplay = !!opts.autoplay;

  // YouTube video
  if (p.provider === 'youtube') {
    const origin = isHTTPOrigin(location.origin) ? location.origin : 'https://localhost';
    const params = new URLSearchParams({
      rel: '0',
      modestbranding: '1',
      playsinline: '1',
      enablejsapi: '1',
      origin,
    });
    if (autoplay) {
      params.set('autoplay', '1');
      // params.set('mute', '1'); // removed to allow sound on start
    }
    const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(p.id)}?${params.toString()}`;

    const ifr = document.createElement('iframe');
    ifr.className = 'yt';
    ifr.src = src;
    ifr.frameBorder = '0';
    ifr.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    ifr.allowFullscreen = true;
    ifr.loading = 'lazy';
    ifr.referrerPolicy = 'strict-origin-when-cross-origin';
    ifr.style.width = '100%';
    ifr.style.aspectRatio = '16/9';
    ifr.style.minHeight = '515px'; // Ensure a minimum height for better visibility

    wrap.appendChild(ifr);

    // Track play state and try to resume playback when page becomes visible
    // again (helps in desktop DevTools mobile emulation where iframe may
    // be paused when the tab loses focus). We use postMessage events from
    // the YouTube player to detect state changes and call playVideo on
    // visibilitychange if it was playing before.
    let __yt_wasPlaying = false;
    const __onYtMessageState = (ev) => {
      if (ev.source !== ifr.contentWindow) return;
      let data = ev.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch { }
      }
      if (!data || typeof data !== 'object') return;
      if (data.event === 'onStateChange') {
        // 1 = playing, 2 = paused, 0 = ended
        if (data.info === 1) __yt_wasPlaying = true;
        if (data.info === 2 || data.info === 0) __yt_wasPlaying = false;
      }
    };
    const __onVisibility = () => {
      if (document.visibilityState === 'visible' && __yt_wasPlaying) {
        try {
          ifr.contentWindow && ifr.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: '' }), '*');
        } catch (err) { }
      }
    };
    window.addEventListener('message', __onYtMessageState);
    document.addEventListener('visibilitychange', __onVisibility);

    // Support queueNext on end using postMessage events
    if (typeof opts.onEnded === 'function') {
      const onMessage = (ev) => {
        if (ev.source !== ifr.contentWindow) return;
        let data = ev.data;
        if (typeof data === 'string') {
          try { data = JSON.parse(data); } catch {}
        }
        if (!data || typeof data !== 'object') return;

        if (data.event === 'onStateChange' && data.info === 0) {
          // ended
          opts.onEnded();
        }
      };
      const postListening = () => {
        try {
          ifr.contentWindow && ifr.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*');
        } catch {}
      };
      window.addEventListener('message', onMessage);
      ifr.addEventListener('load', postListening);
      // also try after a tick
      setTimeout(postListening, 500);

      wrap._cleanup = () => {
        try { window.removeEventListener('message', onMessage); } catch (e) {}
        try { window.removeEventListener('message', __onYtMessageState); } catch (e) {}
        try { document.removeEventListener('visibilitychange', __onVisibility); } catch (e) {}
      };
    }
    return;
  }

  // YouTube playlist
  if (p.provider === 'youtube_playlist') {
    const params = new URLSearchParams({ list: p.id, rel: '0', modestbranding: '1', playsinline: '1' });
    if (autoplay) params.set('autoplay', '1');
    const src = `https://www.youtube-nocookie.com/embed/videoseries?${params.toString()}`;
    wrap.innerHTML = `
      <iframe class="yt" src="${src}" frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"
        style="width:100%;aspect-ratio:16/9;"></iframe>
    `;
    // Attach listeners for playlist iframe to attempt resume on visibility
    setTimeout(() => {
      try {
        const iframe = wrap.querySelector('iframe.yt');
        if (!iframe) return;
        let wasPlaying = false;
        const onMsg = (ev) => {
          if (ev.source !== iframe.contentWindow) return;
          let data = ev.data;
          if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch {}
          }
          if (!data || typeof data !== 'object') return;
          if (data.event === 'onStateChange') {
            if (data.info === 1) wasPlaying = true;
            if (data.info === 2 || data.info === 0) wasPlaying = false;
          }
        };
        const onVis = () => {
          if (document.visibilityState === 'visible' && wasPlaying) {
            try { iframe.contentWindow && iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: '' }), '*'); } catch {}
          }
        };
        window.addEventListener('message', onMsg);
        document.addEventListener('visibilitychange', onVis);
        wrap._cleanup = () => {
          try { window.removeEventListener('message', onMsg); } catch {}
          try { document.removeEventListener('visibilitychange', onVis); } catch {}
        };
      } catch (err) { /* ignore */ }
    }, 200);
    return;
  }

  // Spotify
  if (p.provider === 'spotify') {
    const src = `https://open.spotify.com/embed/${p.kind}/${p.id}`;
    const webUrl = `https://open.spotify.com/${p.kind}/${p.id}`;
    // Render the Spotify embed and a message. Use a shorter message on mobile
    // to avoid taking too much vertical space; desktop keeps the full text.
    const isMobile = (typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent))
      || (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width:600px)').matches);

    const desktopMsg = 'Spotify only allows short previews. <b></b>';
    const mobileMsg = 'Preview may be limited.';

      wrap.innerHTML = `
        <iframe class="sp" src="${src}" frameborder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy" referrerpolicy="strict-origin-when-cross-origin"
          style="width:100%;min-height:80px;"></iframe>
        <div class="muted small spotify-note" style="margin-top:10px;">
          <img src="/assets/spotify-logo.png" alt="Spotify" class="spotify-note-logo">
          <div class="spotify-note-body">
            <div class="spotify-note-text">${isMobile ? mobileMsg : desktopMsg}</div>
            <div class="spotify-note-actions">
              <a class="btn btn-primary spotify-open" href="${webUrl}" target="_blank" rel="noopener noreferrer">Open in Spotify</a>
            </div>
          </div>
        </div>
    `;
    return;
  }

  // Bandcamp (universal embed)
  if (p.provider === 'bandcamp') {
    const url = post.url || p.id;
    const embedUrl = `https://bandcamp.com/EmbeddedPlayer/?url=${encodeURIComponent(url)}&size=large&bgcol=ffffff&linkcol=0687f5&transparent=true`;
    wrap.innerHTML = `
      <iframe class="bc" style="width:100%; min-height:120px; max-height:450px;" frameborder="0" allowtransparency="true" allow="autoplay; encrypted-media"
        src="${embedUrl}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>
    `;
    return;
  }

  // SoundCloud (direct iframe embed)
  if (p.provider === 'soundcloud') {
    // Extract the track or playlist URL
    const url = post.url || p.id;
    // Build the SoundCloud player embed URL
    // See https://developers.soundcloud.com/docs/api/html5-widget#examples
    const playerUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%230066cc&auto_play=${opts.autoplay ? 'true' : 'false'}&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`;
    wrap.innerHTML = `
      <iframe class="sc" width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay"
        src="${playerUrl}"
        style="width:100%; min-height:166px; max-height:450px;"
        loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>
    `;
    return;
  }

  // Direct audio
  if (p.provider === 'audio') {
    // Add audio-only class for compact styling
    if (wrap.classList) wrap.classList.add('audio-only');
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.className = 'audio';
    audio.src = p.id;
    audio.preload = 'metadata';
    audio.playsInline = true;
    if (autoplay) setTimeout(() => { audio.play().catch(() => {}); }, 0);
    audio.addEventListener('ended', () => { if (typeof opts.onEnded === 'function') opts.onEnded(); });
    wrap.appendChild(audio);
    return;
  }

  // Fallback: just a link
  fallbackLink(post.url || p.id, wrap, 'Open link');
}

function fallbackLink(href, wrap, label) {
  wrap.innerHTML = '';
  const a = document.createElement('a');
  a.href = href;
  a.textContent = label;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  wrap.appendChild(a);
}