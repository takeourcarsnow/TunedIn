export type BuildOptions = { autoplay?: boolean; onEnded?: () => void };

function clear(container: HTMLElement) {
  try { (container as any)._cleanup && (container as any)._cleanup(); } catch {}
  container.innerHTML = '';
}

function _debugHighlight(container: HTMLElement, ok: boolean) {
  try {
    container.style.outline = ok ? '3px solid rgba(50,205,50,0.9)' : '3px solid rgba(220,20,60,0.9)';
    setTimeout(() => { try { container.style.outline = ''; } catch {} }, 1800);
  } catch {}
}

export function buildEmbed(post: any, container: HTMLElement, opts: BuildOptions = {}) {
  clear(container);
  try { console.debug && console.debug('buildEmbed', post?.id || post?.url, opts && opts.autoplay); } catch {}
  const url = (post?.url || '').trim();
  if (!url) { try { console.debug && console.debug('embed: no url for post, aborting', post?.id); } catch {} ; try { _debugHighlight(container, false); } catch {} ; return; }

  // Helper: insert a small overlay button that lets users manually start playback
  function insertPlayOverlay(onClick: () => void) {
    try {
      const cs = getComputedStyle(container);
      if (!cs || cs.position === 'static') try { container.style.position = 'relative'; } catch {}
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'embed-play-overlay';
      // Minimal inline styling so this works without touching CSS files
      btn.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:1000;padding:10px 14px;font-size:18px;border-radius:999px;background:rgba(0,0,0,0.65);color:#fff;border:0;cursor:pointer;backdrop-filter:blur(2px)';
      btn.setAttribute('aria-label', 'Play');
      btn.textContent = '►';
      btn.onclick = (e) => { try { e.preventDefault(); e.stopPropagation(); onClick(); } catch {} ; try { btn.remove(); } catch {} };
      container.appendChild(btn);
      return btn;
    } catch (e) { return null; }
  }

  // YouTube
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (yt) {
    const id = yt[1];
    // enable JS API for lifecycle events
  const src = `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1&enablejsapi=1${opts.autoplay ? '&autoplay=1' : ''}`;
  const iframe = document.createElement('iframe');
    const iframeId = `yt-${post.id || id}`;
    iframe.id = iframeId;
    iframe.width = '100%'; iframe.height = '200';
    iframe.src = src; iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    iframe.className = 'yt';
  try { console.debug && console.debug('embed: appended youtube iframe', iframeId, 'src=', src); } catch {}
  container.appendChild(iframe);
  try { _debugHighlight(container, true); } catch {}

    // If autoplay was requested, also place a manual play overlay so users can start playback
    if (opts.autoplay) {
      insertPlayOverlay(() => {
        try {
          // If the YT API player exists, use it. Otherwise wait briefly for it to be created.
          if ((container as any)._ytPlayer && typeof (container as any)._ytPlayer.playVideo === 'function') {
            try { (container as any)._ytPlayer.playVideo && (container as any)._ytPlayer.playVideo(); } catch {}
          } else {
            // wait up to ~2s for player instance
            let attempts = 0;
            const i = setInterval(() => {
              attempts++;
              if ((container as any)._ytPlayer && typeof (container as any)._ytPlayer.playVideo === 'function') {
                try { (container as any)._ytPlayer.playVideo && (container as any)._ytPlayer.playVideo(); } catch {};
                clearInterval(i);
              }
              if (attempts > 40) clearInterval(i);
            }, 50);
          }
        } catch (e) { /* ignore */ }
      });
    }

    // load YouTube IFrame API and create a player to detect ended state
    const loadYouTubeAPI = () => new Promise<void>((resolve) => {
      if ((window as any).YT && (window as any).YT.Player) return resolve();
      const existing = document.querySelector('script[data-name="yt-iframe-api"]');
      if (existing) {
        // wait for global ready
        const i = setInterval(() => { if ((window as any).YT && (window as any).YT.Player) { clearInterval(i); resolve(); } }, 50);
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.setAttribute('data-name', 'yt-iframe-api');
      s.onload = () => {
        const i = setInterval(() => { if ((window as any).YT && (window as any).YT.Player) { clearInterval(i); resolve(); } }, 50);
      };
      document.head.appendChild(s);
    });

    let player: any = null;
    const onStateChange = (ev: any) => {
      if (!opts.onEnded) return;
      if (ev && ev.data === (window as any).YT?.PlayerState?.ENDED) opts.onEnded();
    };

    loadYouTubeAPI().then(() => {
      try {
        player = new (window as any).YT.Player(iframeId, { events: {
          onReady: (ev: any) => {
            try { (container as any)._ytPlayer = ev.target; } catch {}
            try { if (opts.autoplay) { ev.target.playVideo && ev.target.playVideo(); try { console.debug && console.debug('embed: YouTube playVideo() called', iframeId); } catch {} } } catch {}
          },
          onStateChange
        } });
        (container as any)._ytPlayer = player;
        try { console.debug && console.debug('YouTube player created for', post?.id || id, 'autoplay=', opts.autoplay); } catch {}
      } catch (err) { /* ignore */ }
    }).catch(() => {});

    (container as any)._cleanup = () => {
      try { if ((container as any)._ytPlayer && (container as any)._ytPlayer.destroy) (container as any)._ytPlayer.destroy(); } catch {};
      try { iframe.src = 'about:blank'; } catch {};
      try { console.debug && console.debug('YouTube cleanup for', post?.id || id); } catch {}
    };
    return;
  }

  // Spotify
  if (/open\.spotify\.com\//.test(url)) {
    // Normalize embed path
    const path = url.replace(/^https?:\/\/open\.spotify\.com\//, '').replace(/^intl-[^/]+\//, '');
    const embedUrl = `https://open.spotify.com/embed/${path}`;
    const iframe = document.createElement('iframe');
    iframe.width = '100%'; iframe.height = '200';
    iframe.src = embedUrl; iframe.frameBorder = '0';
    iframe.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
  try { console.debug && console.debug('embed: appended spotify iframe', post?.id || post?.url); } catch {}
  container.appendChild(iframe);
  try { _debugHighlight(container, true); } catch {}
    // If autoplay requested, add overlay that opens the track in a new tab as a fallback
    if (opts.autoplay) {
      insertPlayOverlay(() => {
        try { window.open(url, '_blank'); } catch (e) { /* ignore */ }
      });
    }
    // Spotify provides no public ended callback for the embed. Use a polling heuristic:
    // - When autoplay starts, the iframe is in a playing state. We'll optimistically poll via postMessage
    // - Many embeds ignore our messages; as a fallback we detect when the iframe becomes unloaded/removed.
  let lastPlaying = false;
    let attempts = 0;
    const poll = setInterval(() => {
      attempts++;
      try {
        // Try to ping the iframe (best-effort; cross-origin may ignore)
        iframe.contentWindow?.postMessage({ type: 'ping' }, '*');
      } catch {}
      // If we have been polling for long without detecting play, bail early
      if (attempts > 60) { clearInterval(poll); }
    }, 1000);

    // There is no robust way to detect 'ended' for Spotify iframe — so we do a minimal heuristic:
    // If onEnded is provided and the iframe is removed or src becomes 'about:blank', call onEnded on cleanup.
    (container as any)._cleanup = () => {
      try { clearInterval(poll); } catch {}
      try { iframe.src = 'about:blank'; } catch {}
      if (opts.onEnded && lastPlaying) {
        try { opts.onEnded(); } catch {}
      }
      try { console.debug && console.debug('Spotify cleanup for', post?.id || post?.url, 'attempts=', attempts); } catch {}
    };
    return;
  }

  // SoundCloud
  if (/soundcloud\.com\//.test(url)) {
    const src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=${opts.autoplay ? 'true' : 'false'}&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=true`;
    const iframe = document.createElement('iframe');
    iframe.width = '100%'; iframe.height = '200';
    iframe.scrolling = 'no'; iframe.frameBorder = 'no';
    iframe.src = src; iframe.allow = 'autoplay';
  try { console.debug && console.debug('embed: appended soundcloud iframe', post?.id || post?.url, 'autoplay=', opts.autoplay); } catch {}
  container.appendChild(iframe);
  try { _debugHighlight(container, true); } catch {}

    // Load SoundCloud Widget API if needed and bind finish event
    const loadSC = () => new Promise<void>((resolve) => {
      if ((window as any).SC && (window as any).SC.Widget) return resolve();
      const existing = document.querySelector('script[data-name="sc-widget-api"]');
      if (existing) {
        const i = setInterval(() => { if ((window as any).SC && (window as any).SC.Widget) { clearInterval(i); resolve(); } }, 50);
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://w.soundcloud.com/player/api.js';
      s.setAttribute('data-name', 'sc-widget-api');
      s.onload = () => { const i = setInterval(() => { if ((window as any).SC && (window as any).SC.Widget) { clearInterval(i); resolve(); } }, 50); };
      document.head.appendChild(s);
    });

    let widget: any = null;
    loadSC().then(() => {
      try {
        widget = (window as any).SC.Widget(iframe);
        // Events constant available on SC.Widget.Events
        const evs = (window as any).SC?.Widget?.Events || {};
        if (widget && evs && evs.FINISH) {
          widget.bind(evs.FINISH, () => { if (opts.onEnded) opts.onEnded(); });
          (container as any)._scWidget = widget;
        }
        // If autoplay requested and widget supports play(), try to start playback
        try { if (opts.autoplay && widget && typeof widget.play === 'function') { widget.play(); try { console.debug && console.debug('embed: SoundCloud widget.play() called for', post?.id || post?.url); } catch {} } } catch {}
      } catch (err) { /* ignore */ }
    }).catch(() => {});

    (container as any)._cleanup = () => {
      try { if ((container as any)._scWidget && (container as any)._scWidget.unbind) (container as any)._scWidget.unbind(); } catch {};
      try { iframe.src = 'about:blank'; } catch {};
      try { console.debug && console.debug('SoundCloud cleanup for', post?.id || post?.url); } catch {}
    };
    // Add a manual play overlay so user can click if autoplay is blocked
    if (opts.autoplay) {
      insertPlayOverlay(() => {
        try {
          if ((container as any)._scWidget && typeof (container as any)._scWidget.play === 'function') {
            try { (container as any)._scWidget.play(); } catch {}
            return;
          }
          // Fallback: open the original URL where native controls exist
          try { window.open(url, '_blank'); } catch {}
        } catch (e) { /* ignore */ }
      });
    }
    return;
  }

  // Generic audio (uploaded or direct file link)
  if (/\.(mp3|m4a|aac|ogg|wav)(\?|#|$)/i.test(url) || /\/storage\/v1\/object\/public\/audio\//.test(url)) {
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.src = url; audio.style.width = '100%';
    if (opts.onEnded) audio.addEventListener('ended', () => opts.onEnded && opts.onEnded());
  try { console.debug && console.debug('embed: appended audio element for', post?.id || post?.url, 'autoplay=', opts.autoplay); } catch {}
  container.appendChild(audio);
  try { _debugHighlight(container, true); } catch {}
    // Try to start playback immediately when autoplay requested. This call
    // will succeed if buildEmbed is invoked directly from a user gesture.
    if (opts.autoplay) {
      try {
        const p = audio.play && audio.play();
        if (p && typeof p.then === 'function') p.then(() => { try { console.debug && console.debug('embed: audio.play() succeeded for', post?.id || post?.url); } catch {} }).catch((err: any) => { try { console.debug && console.debug('embed: audio.play() failed', err); } catch {} finally { insertPlayOverlay(() => { try { audio.play().catch(()=>{}); } catch {} }); } });
      } catch (e) { try { console.debug && console.debug('embed: audio.play() threw', e); } catch {} finally { insertPlayOverlay(() => { try { audio.play().catch(()=>{}); } catch {} }); } }
    }
    try { console.debug && console.debug('audio element appended for', post?.id || post?.url, 'autoplay=', opts.autoplay); } catch {}
  (container as any)._cleanup = () => { try { audio.pause(); } catch {}; try { audio.src = ''; } catch {}; try { container.style.outline = ''; } catch {} };
    return;
  }

  // Fallback: show link
  const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'open link';
  container.appendChild(a);
}
