import { PROMPTS, POST_LIMIT_MESSAGES, POST_NO_COOLDOWN_MESSAGES } from '../core/constants';
import { $, esc } from '../core/utils';
import { onCreatePost } from '../features/posts';
import { parseProvider } from '../features/providers';

function getComposePrompt() {
  return PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
}

export function renderComposeBox(right: HTMLElement, state: any, DB: any, render: () => void) {
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
    const promptDiv = guest.querySelector('#composePromptGuest') as HTMLElement;
    let lastPrompt = '';
    function setPrompt() {
      let prompt: string;
      do { prompt = getComposePrompt(); } while (prompt === lastPrompt && PROMPTS.length > 1);
      lastPrompt = prompt;
      let i = 0; promptDiv.textContent = '';
      function typeWriter() {
        if (i < prompt.length) { promptDiv.textContent += prompt.charAt(i); i++; setTimeout(typeWriter, 28 + Math.random() * 40); }
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
    <div class="muted small" id="composePrompt" style="margin-bottom:18px;"></div>
    <form id="postForm" class="stack" autocomplete="off" enctype="multipart/form-data">
      <input class="field" id="f_url" placeholder="Link (YouTube / Spotify / Bandcamp, etc)" />
      <div class="muted small" id="autofillMsg" style="margin-bottom:2px; display:none;">↑ Should autofill artist information if we're lucky.</div>
      <div class="custom-file-input-wrapper">
        <input class="custom-file-input" type="file" id="f_audio" accept="audio/*" />
        <label for="f_audio" class="custom-file-label">or upload audio file</label>
        <span class="muted small" id="audioFileName"></span>
      </div>
      <input class="field" id="f_artist" placeholder="Artist" maxlength="120" style="margin-top:8px;" />
      <input class="field" id="f_title" placeholder="Title (song or album)" required maxlength="120" />
      <input class="field" id="f_tags" placeholder="#Tags go here"/>
      <div id="tagSuggestions" class="hstack" style="flex-wrap:wrap; gap:4px; margin:4px 0 0 0;"></div>
      <div style="position:relative;">
        <textarea class="field" id="f_body" rows="4" placeholder="Share something about this track, a memory, or the vibe it gives you." maxlength="500"></textarea>
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

  // Counters
  const lyricsInput = box.querySelector('#f_lyrics') as HTMLTextAreaElement | null;
  const lyricsCounter = box.querySelector('#lyricsCounter') as HTMLElement | null;
  if (lyricsInput && lyricsCounter) lyricsInput.addEventListener('input', function () { lyricsCounter.textContent = this.value.length + '/4000'; });
  const bodyInput = box.querySelector('#f_body') as HTMLTextAreaElement | null;
  const bodyCounter = box.querySelector('#bodyCounter') as HTMLElement | null;
  if (bodyInput && bodyCounter) bodyInput.addEventListener('input', function () { bodyCounter.textContent = this.value.length + '/500'; });

  // Audio filename and toggle URL field
  const audioInput = box.querySelector('#f_audio') as HTMLInputElement | null;
  const audioFileName = box.querySelector('#audioFileName') as HTMLElement | null;
  if (audioInput && audioFileName) {
    const urlInput = box.querySelector('#f_url') as HTMLInputElement | null;
    audioInput.addEventListener('change', function () {
      const hasFile = !!(this.files && this.files.length);
      audioFileName.textContent = hasFile ? (this.files?.[0]?.name || '') : '';
      if (urlInput) urlInput.style.display = hasFile ? 'none' : '';
    });
  }

  // Cooldown message cycling (simple): when not in cooldown
  const cooldownDiv = box.querySelector('#postCooldown') as HTMLElement | null;
  if (cooldownDiv) {
    let i = 0; cooldownDiv.textContent = POST_NO_COOLDOWN_MESSAGES[0];
    (window as any)._composeNoCooldownMsgTimer = setInterval(() => {
      i = (i + 1) % POST_NO_COOLDOWN_MESSAGES.length;
      cooldownDiv.textContent = POST_NO_COOLDOWN_MESSAGES[i];
    }, 7000);
  }

  // oEmbed autofill for title/artist
  const f_url = box.querySelector('#f_url') as HTMLInputElement | null;
  if (f_url) {
    let lastMetaUrl = '';
    let lastAutofill = { title: '', artist: '' };
    const f_title = box.querySelector('#f_title') as HTMLInputElement | null;
    const f_artist = box.querySelector('#f_artist') as HTMLInputElement | null;
    let userEdited = { title: false, artist: false };
    if (f_title) f_title.addEventListener('input', () => { userEdited.title = true; });
    if (f_artist) f_artist.addEventListener('input', () => { userEdited.artist = true; });
    f_url.addEventListener('input', async () => {
      const url = f_url.value.trim();
      if (!url || url === lastMetaUrl) return;
      lastMetaUrl = url;
      const { fetchOEmbed } = await import('../features/oembed');
      const meta = await fetchOEmbed(url);
      if (meta) {
        let autofillTitle = meta.title || '';
        let autofillArtist = meta.author_name || '';
        if (/youtube\.com|youtu\.be/.test(url)) {
          const { parseYouTubeTitle } = await import('../features/yt_title_parse');
          const parsed = parseYouTubeTitle(meta);
          autofillArtist = parsed.artist || autofillArtist;
          autofillTitle = parsed.title || autofillTitle;
          if (autofillArtist.endsWith(' - Topic')) autofillArtist = autofillArtist.replace(/ - Topic$/, '').trim();
        }
        if (f_title && (!userEdited.title || f_title.value === lastAutofill.title) && autofillTitle) {
          f_title.value = autofillTitle; lastAutofill.title = f_title.value; userEdited.title = false;
        }
        if (f_artist && (!userEdited.artist || f_artist.value === lastAutofill.artist) && autofillArtist) {
          f_artist.value = autofillArtist; lastAutofill.artist = f_artist.value; userEdited.artist = false;
        }
      }
    });
  }

  // Captcha
  function setCaptcha() {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    const cBox = box.querySelector('#captchaBox') as HTMLElement | null;
    const cInput = box.querySelector('#f_captcha') as HTMLInputElement | null;
    if (cBox) { cBox.textContent = `Captcha: What is ${a} + ${b}?`; cBox.setAttribute('data-answer', String(a + b)); }
    if (cInput) cInput.value = '';
  }
  setCaptcha();

  // Post submit + reset captcha
  const postForm = box.querySelector('#postForm');
  if (postForm) {
    postForm.addEventListener('submit', (e) => onCreatePost(e, state, DB, render));
    postForm.addEventListener('resetCaptcha', setCaptcha);
  }

  // Preview handler (render minimal post card without actions)
  const previewBtn = box.querySelector('#previewBtn') as HTMLButtonElement | null;
  if (previewBtn) {
    previewBtn.addEventListener('click', async () => {
      const preview = document.getElementById('preview') as HTMLElement | null;
      if (!preview) return;
      const title = (document.getElementById('f_title') as HTMLInputElement | null)?.value.trim() || '';
      const artist = (document.getElementById('f_artist') as HTMLInputElement | null)?.value.trim() || '';
      const url = (document.getElementById('f_url') as HTMLInputElement | null)?.value.trim() || '';
      const tags = ((document.getElementById('f_tags') as HTMLInputElement | null)?.value || '').split(/[#,\s]+/g).map((t) => t.trim().toLowerCase()).filter(Boolean);
      const body = (document.getElementById('f_body') as HTMLTextAreaElement | null)?.value.trim() || '';
      const pv = parseProvider(url);
      const fakePost = { id: 'preview', userId: state.user?.id || 'preview', title, artist, url, provider: pv, tags, body, likes: [], comments: [], createdAt: Date.now() } as any;
      const mod = await import('../features/feed');
      preview.classList.add('active');
      let html = mod.renderPostHTML(fakePost, state, DB);
      html = html.replace(/<div class="hstack actions"[\s\S]*?<\/div>/, '');
      html = `<div class="muted small" style="margin-bottom:4px;">Preview Post</div>` + html;
      preview.innerHTML = html;
    });
  }

  right.appendChild(box);
}
