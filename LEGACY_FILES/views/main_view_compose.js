// js/views/main_view_compose.js
import { PROMPTS, POST_LIMIT_MESSAGES, POST_NO_COOLDOWN_MESSAGES } from '../core/constants.js';
import { $, esc } from '../core/utils.js';
import { onCreatePost } from '../features/posts.js';
import { parseProvider } from '../features/providers.js';

function getComposePrompt() {
  return PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
}

export function renderComposeBox(right, state, DB, render) {
  const me = state.user;

  if (!me) {
    const guest = document.createElement('div');
    guest.className = 'box';
    guest.innerHTML = `
      <div class="muted small" id="composePromptGuest"></div>
      <div class="notice small">You are in guest read-only mode. Login to post, like, or comment.</div>
      <button class="btn btn-ghost" data-action="go-login">[ login / register ]</button>
    `;
    right.appendChild(guest);
    // Looping prompt for guest
    const promptDiv = guest.querySelector('#composePromptGuest');
    let lastPrompt = '';
    function setPrompt() {
      let prompt;
      do { prompt = getComposePrompt(); } while (prompt === lastPrompt && PROMPTS.length > 1);
      lastPrompt = prompt;
      // Typewriter effect
      let i = 0;
      promptDiv.textContent = '';
      promptDiv.classList.remove('fadein', 'fadeout');
      function typeWriter() {
        if (i < prompt.length) {
          promptDiv.textContent += prompt.charAt(i);
          i++;
          // Simulate human typing: random delay, longer on spaces/punctuation
          let delay = 28 + Math.random() * 40;
          if (/[.,!?]/.test(prompt.charAt(i-1))) delay += 80 + Math.random() * 60;
          if (prompt.charAt(i-1) === ' ') delay += 30;
          setTimeout(typeWriter, delay);
        }
      }
      typeWriter();
    }
    setPrompt();
    setInterval(setPrompt, 10000);
    return;
  }

  const box = document.createElement('div');
  box.className = 'box';
  box.innerHTML = `
    <div class="muted small typewriter" id="composePrompt" style="margin-bottom:18px;"></div>
    <form id="postForm" class="stack" autocomplete="off" enctype="multipart/form-data">
      <input class="field" id="f_url" placeholder="Link (YouTube / Spotify / Bandcamp, etc)" />
      <div class="muted small" id="autofillMsg" style="margin-bottom:2px; display:none;">&#8593; Should autofill artist information if we're lucky.</div>
      <div class="muted small" style="margin-bottom:4px;"></div>
      <div class="custom-file-input-wrapper">
        <input class="custom-file-input" type="file" id="f_audio" accept="audio/mp3,audio/mpeg,audio/ogg,audio/wav,audio/x-wav,audio/m4a" />
        <label for="f_audio" class="custom-file-label">or upload audio file</label>
        <span class="muted small" id="audioFileName"></span>
      </div>
      <input class="field" id="f_artist" placeholder="Artist" maxlength="120" style="margin-top:8px;" />
      <input class="field" id="f_title" placeholder="Title (song or album)" required maxlength="120" />
      <input class="field" id="f_tags" placeholder="#Tags go here"/>
      <div id="tagSuggestions" class="hstack" style="flex-wrap:wrap; gap:4px; margin:4px 0 0 0;"></div>
      <div style="position:relative;">
        <textarea class="field" id="f_body" rows="4" placeholder="Share something about this track, a memory, or the vibe it gives you." maxlength="500" oninput="document.getElementById('bodyCounter').textContent = this.value.length + '/500';"></textarea>
        <span class="muted small" id="bodyCounter" style="position:absolute; bottom:6px; right:10px; pointer-events:none;">0/500</span>
      </div>
      <div style="position:relative; margin-top:8px;">
        <textarea class="field" id="f_lyrics" name="lyrics" rows="4" maxlength="4000" placeholder="Paste lyrics here (optional)"></textarea>
        <span class="muted small" id="lyricsCounter" style="position:absolute; bottom:6px; right:10px; pointer-events:none;">0/4000</span>
      </div>
      <div class="hstack" style="justify-content:space-between; align-items:center; margin-bottom:4px;">
        <div class="muted small" id="captchaBox" style="margin:0;"></div>
      </div>
      <input class="field" id="f_captcha" placeholder="Enter captcha answer" autocomplete="off" style="margin-bottom:2px;" />
      <div id="postFormError" class="muted small" style="color:#c00;min-height:18px;"></div>
      <div class="hstack" style="justify-content:center; margin-top:1px; gap:10px;">
        <button class="btn" type="submit" id="postBtn">[ post ]</button>
        <button class="btn btn-ghost" type="button" id="previewBtn">[ preview ]</button>
      </div>
      <div id="preview" class="player" aria-live="polite"></div>
      <div id="postCooldown" class="muted small" style="text-align:center;margin-top:8px;"></div>
    </form>
  `;
  // Lyrics character counter
  const lyricsInput = box.querySelector('#f_lyrics');
  const lyricsCounter = box.querySelector('#lyricsCounter');
  if (lyricsInput && lyricsCounter) {
    lyricsInput.addEventListener('input', function() {
      lyricsCounter.textContent = this.value.length + '/4000';
    });
  }
  // Audio file input: show file name when selected
  const audioInput = box.querySelector('#f_audio');
  const audioFileName = box.querySelector('#audioFileName');
  if (audioInput && audioFileName) {
    const urlInput = box.querySelector('#f_url');
    audioInput.addEventListener('change', function() {
      const hasFile = this.files && this.files.length > 0;
      audioFileName.textContent = hasFile ? this.files[0].name : '';
      if (urlInput) {
        urlInput.style.display = hasFile ? 'none' : '';
      }
    });
  }
  // Cooldown logic: disable post button and show timer if user posted in last 24h
  function updateCooldown() {
    const db = DB.getAll();
    const me = state.user;
    const postBtn = box.querySelector('#postBtn');
    const cooldownDiv = box.querySelector('#postCooldown');
    if (!me) return;
    const now = Date.now();
    const lastPost = db.posts
      .filter(p => p.userId === me.id)
      .sort((a, b) => b.createdAt - a.createdAt)[0];
  let isCooldown = false;
    let countdown = '';
    if (lastPost && now - lastPost.createdAt < 24 * 60 * 60 * 1000) {
      const timeLeft = 24 * 60 * 60 * 1000 - (now - lastPost.createdAt);
      const hours = Math.floor(timeLeft / (60 * 60 * 1000));
      const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
      const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);
  isCooldown = true;
      countdown = `${hours}h ${minutes}m ${seconds}s`;
  if (postBtn) postBtn.disabled = true;
  // Blur all inputs/textareas in the compose box
  box.classList.add('rate-limit-blur');
      // Compose wait messages (imported from constants)
      const waitMessages = POST_LIMIT_MESSAGES;
      if (!window._composeWaitMsgIndex) window._composeWaitMsgIndex = 0;
      if (!window._composeWaitMsgTimer) {
        window._composeWaitMsgTimer = setInterval(() => {
          window._composeWaitMsgIndex = (window._composeWaitMsgIndex + 1) % waitMessages.length;
          // Only update the wait message, not the timer
          const waitTypeDiv = document.getElementById('waitTypeMsg');
          if (waitTypeDiv) {
            const waitMsg = waitMessages[window._composeWaitMsgIndex];
            if (waitTypeDiv._lastMsg !== waitMsg) {
              waitTypeDiv.style.opacity = '0';
              setTimeout(() => {
                waitTypeDiv.textContent = waitMsg;
                waitTypeDiv.style.opacity = '1';
                waitTypeDiv._lastMsg = waitMsg;
              }, 250);
            }
          }
        }, 4000);
      }
      // Separate timer and wait message elements
      let timerDiv = document.getElementById('cooldownTimerMsg');
      let waitTypeDiv = document.getElementById('waitTypeMsg');
      if (!timerDiv) {
        timerDiv = document.createElement('div');
        timerDiv.id = 'cooldownTimerMsg';
        cooldownDiv.innerHTML = '';
        cooldownDiv.appendChild(timerDiv);
      }
      if (!waitTypeDiv) {
        waitTypeDiv = document.createElement('div');
        waitTypeDiv.id = 'waitTypeMsg';
        waitTypeDiv.style.marginTop = '2px';
        waitTypeDiv.style.color = '#888';
        waitTypeDiv.style.fontSize = '0.98em';
        waitTypeDiv.style.transition = 'opacity 0.45s cubic-bezier(.4,0,.2,1)';
        cooldownDiv.appendChild(waitTypeDiv);
        waitTypeDiv.style.opacity = '1';
        waitTypeDiv.textContent = waitMessages[window._composeWaitMsgIndex];
        waitTypeDiv._lastMsg = waitMessages[window._composeWaitMsgIndex];
      }
      // Only update timer text if changed
      const timerMsg = `You can post again in ${hours}h ${minutes}m ${seconds}s.`;
      if (timerDiv.textContent !== timerMsg) {
        timerDiv.textContent = timerMsg;
      }
      if (window._waitTypewriterTimeouts) window._waitTypewriterTimeouts.forEach(clearTimeout);
      window._waitTypewriterTimeouts = [];
    } else {
  if (postBtn) postBtn.disabled = false;
  // Remove blur from inputs/textareas
  box.classList.remove('rate-limit-blur');
      // Cycle fun messages when not in cooldown, with subtle animation
      if (!window._composeNoCooldownMsgTimer) {
        window._composeNoCooldownMsgIndex = 0;
        if (cooldownDiv) {
          cooldownDiv.classList.add('cycle-fade', 'cycle-fade-in');
        }
        window._composeNoCooldownMsgTimer = setInterval(() => {
          window._composeNoCooldownMsgIndex = (window._composeNoCooldownMsgIndex + 1) % POST_NO_COOLDOWN_MESSAGES.length;
          const msg = POST_NO_COOLDOWN_MESSAGES[window._composeNoCooldownMsgIndex];
          if (cooldownDiv && cooldownDiv.textContent !== msg) {
            cooldownDiv.classList.remove('cycle-fade-in');
            cooldownDiv.classList.add('cycle-fade-out');
            setTimeout(() => {
              cooldownDiv.textContent = msg;
              cooldownDiv.classList.remove('cycle-fade-out');
              cooldownDiv.classList.add('cycle-fade-in');
            }, 250);
          }
        }, 7000);
      }
      // Set initial message if needed
      const msg = POST_NO_COOLDOWN_MESSAGES[window._composeNoCooldownMsgIndex || 0];
      if (cooldownDiv && cooldownDiv.textContent !== msg) {
        cooldownDiv.textContent = msg;
        cooldownDiv.classList.add('cycle-fade', 'cycle-fade-in');
      }
      // Clear cooldown wait message timer if switching from cooldown
      if (window._composeWaitMsgTimer) {
        clearInterval(window._composeWaitMsgTimer);
        window._composeWaitMsgTimer = null;
        window._composeWaitMsgIndex = 0;
      }
    }
    // Clear no-cooldown message timer if entering cooldown
    if (isCooldown && window._composeNoCooldownMsgTimer) {
      clearInterval(window._composeNoCooldownMsgTimer);
      window._composeNoCooldownMsgTimer = null;
      window._composeNoCooldownMsgIndex = 0;
    }
    // Expose cooldown state globally for header
      window.composeCooldown = { isCooldown, countdown };
      // Notify other parts of the app (header) that compose cooldown changed so mobile header updates immediately
      try {
        document.dispatchEvent(new CustomEvent('composeCooldownUpdated', { detail: window.composeCooldown }));
      } catch (e) {
        // fallback noop for older browsers
      }
  }
  setInterval(updateCooldown, 1000);
  updateCooldown();
  // Looping prompt for logged-in user, but only if not focused in any composer field
  const promptDiv = box.querySelector('#composePrompt');
  let lastPrompt = '';
  const composerFields = [
    box.querySelector('#f_url'),
    box.querySelector('#f_title'),
    box.querySelector('#f_artist'),
    box.querySelector('#f_tags'),
    box.querySelector('#f_body')
  ];
  let promptTimeouts = [];
  function clearPromptTimeouts() {
    promptTimeouts.forEach(t => clearTimeout(t));
    promptTimeouts = [];
  }
  function setPrompt() {
    clearPromptTimeouts();
    let prompt;
    do { prompt = getComposePrompt(); } while (prompt === lastPrompt && PROMPTS.length > 1);
    lastPrompt = prompt;
    // Typewriter + backspace effect
    let i = 0;
    promptDiv.textContent = '';
    promptDiv.classList.remove('fadein', 'fadeout');
    if (!promptDiv.classList.contains('typewriter')) promptDiv.classList.add('typewriter');
    function typeWriter() {
      if (i < prompt.length) {
        promptDiv.textContent += prompt.charAt(i);
        i++;
        // More human-like: variable speed, longer pauses, random short pauses
        let delay = 16 + Math.random() * 32;
        if (/[.,!?]/.test(prompt.charAt(i-1))) delay += 90 + Math.random() * 60;
        if (prompt.charAt(i-1) === ' ') delay += 18 + Math.random() * 10;
        // Occasionally pause for a bit longer (simulate thinking)
        if (Math.random() < 0.07) delay += 80 + Math.random() * 120;
        promptTimeouts.push(setTimeout(typeWriter, delay));
      } else {
        // After finished, wait longer, then backspace
        promptTimeouts.push(setTimeout(() => {
          let del = prompt.length;
          let stopAt = 0;
          if (prompt.startsWith('> ')) stopAt = 2;
          function backspace() {
            if (del > stopAt) {
              promptDiv.textContent = promptDiv.textContent.slice(0, -1);
              del--;
              let delay = 13 + Math.random() * 22;
              if (promptDiv.textContent.endsWith(' ')) delay += 12;
              // Occasionally pause while erasing
              if (Math.random() < 0.05) delay += 60 + Math.random() * 80;
              promptTimeouts.push(setTimeout(backspace, delay));
            } else {
              // Wait, then start new prompt
              promptTimeouts.push(setTimeout(setPrompt, 900));
            }
          }
          backspace();
        }, 2600 + Math.random() * 700));
      }
    }
    typeWriter();
  }
  setPrompt();
  // Show autofill message only when user is interacting with the composer
  const autofillMsg = box.querySelector('#autofillMsg');
  composerFields.forEach(field => {
    if (field) {
      field.addEventListener('focus', () => {
        const urlField = composerFields.find(f => f && f.id === 'f_url');
        if (urlField && !urlField.value) {
          autofillMsg.style.display = 'block';
        } else {
          autofillMsg.style.display = 'none';
        }
      });
      if (field.id === 'f_url') {
        field.addEventListener('input', () => {
          if (field.value) {
            autofillMsg.style.display = 'none';
          } else {
            autofillMsg.style.display = 'block';
          }
        });
      }
      field.addEventListener('blur', () => {
        setTimeout(() => {
          // Only hide if no composer field is focused
          if (!composerFields.some(f => f && document.activeElement === f)) {
            autofillMsg.style.display = 'none';
          }
        }, 50);
        // Also, if user leaves all fields, allow prompt to update again
        setTimeout(() => {
          if (!composerFields.some(f => f && document.activeElement === f)) setPrompt();
        }, 60);
      });
    }
  });
  right.appendChild(box);

  // Full post preview
  const previewBtn = box.querySelector('#previewBtn');
  if (previewBtn) {
    previewBtn.addEventListener('click', async () => {
      const preview = $('#preview');
      const title = $('#f_title').value.trim();
      const artist = $('#f_artist').value.trim();
      const url = $('#f_url').value.trim();
      const tags = ($('#f_tags').value || '').split(/[#\s,]+/g).map(t => t.trim().toLowerCase()).filter(Boolean);
      const body = $('#f_body').value.trim();
      const pv = parseProvider(url);
      const fakePost = {
        id: 'preview',
        userId: (state.user && state.user.id) || 'preview',
        title, artist, url, provider: pv, tags, body,
        likes: [], comments: [], createdAt: Date.now(),
      };

      const mod = await import('../features/feed.js');
      preview.classList.add('active');
      let html = mod.renderPostHTML(fakePost, state, DB);
      html = html.replace(/<div class="actions[\s\S]*?<\/div>/, ''); // strip actions
      html = `<div class="muted small" style="margin-bottom:4px;">Preview Post</div>` + html;
      preview.innerHTML = html;
    });
  }

  // oEmbed autofill for title/artist
  const f_url = box.querySelector('#f_url');
  if (f_url) {
    let lastMetaUrl = '';
    let lastAutofill = { title: '', artist: '' };
    const f_title = box.querySelector('#f_title');
    const f_artist = box.querySelector('#f_artist');
    let userEdited = { title: false, artist: false };

    // Helper: reset autofill state if all fields are empty
    function maybeResetAutofill() {
      if (!f_url.value.trim() && !f_title.value.trim() && !f_artist.value.trim()) {
        lastMetaUrl = '';
        lastAutofill = { title: '', artist: '' };
        userEdited = { title: false, artist: false };
      }
    }

    f_title.addEventListener('input', () => { userEdited.title = true; });
    f_artist.addEventListener('input', () => { userEdited.artist = true; });

    // Reset autofill state if any of the three fields are cleared
    [f_url, f_title, f_artist].forEach(field => {
      field.addEventListener('input', maybeResetAutofill);
    });

    f_url.addEventListener('input', async () => {
      const url = f_url.value.trim();
      if (!url) {
        lastMetaUrl = '';
        return;
      }
      if (url === lastMetaUrl) return;
      lastMetaUrl = url;

      const { fetchOEmbed } = await import('../features/oembed.js');
      const meta = await fetchOEmbed(url);
      if (meta) {
        let ytArtist = '', ytTitle = '';
        if (/youtube\.com|youtu\.be/.test(url)) {
          const { parseYouTubeTitle } = await import('../features/yt_title_parse.js');
          const parsed = parseYouTubeTitle(meta);
          ytArtist = parsed.artist;
          ytTitle = parsed.title;
          // Clean up artist if it ends with ' - Topic'
          if (ytArtist && ytArtist.endsWith(' - Topic')) {
            ytArtist = ytArtist.replace(/ - Topic$/, '').trim();
          }
        }
        // Prefer parsed title/artist, fallback to oEmbed
        let autofillTitle = ytTitle || meta.title;
        let autofillArtist = ytArtist || meta.author_name || '';
        // Clean up oEmbed author_name if it ends with ' - Topic'
        if (!ytArtist && autofillArtist.endsWith(' - Topic')) {
          autofillArtist = autofillArtist.replace(/ - Topic$/, '').trim();
        }
        if ((autofillTitle) && (!userEdited.title || f_title.value === lastAutofill.title)) {
          f_title.value = autofillTitle;
          lastAutofill.title = f_title.value;
          userEdited.title = false;
        }
        if ((autofillArtist) && (!userEdited.artist || f_artist.value === lastAutofill.artist)) {
          f_artist.value = autofillArtist;
          lastAutofill.artist = f_artist.value;
          userEdited.artist = false;
        }
      }
    });
  }

  // Captcha
  function setCaptcha() {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    box.querySelector('#captchaBox').textContent = `Captcha: What is ${a} + ${b}?`;
    box.querySelector('#captchaBox').dataset.answer = (a + b).toString();
    box.querySelector('#f_captcha').value = '';
  }
  setCaptcha();

  // Post submit + reset captcha
  const postForm = box.querySelector('#postForm');
  if (postForm) {
    postForm.addEventListener('submit', (e) => onCreatePost(e, state, DB, render));
    postForm.addEventListener('resetCaptcha', setCaptcha);
  }

  // Tag suggestions: use centralized tag helpers
  const f_tags = box.querySelector('#f_tags');
  const tagSuggestions = box.querySelector('#tagSuggestions');
  if (f_tags && tagSuggestions) {
    import('../features/tags.js').then(mod => {
      try { mod.initTagInput(f_tags, tagSuggestions, DB); } catch (e) {}
    }).catch(() => {});
  }
}