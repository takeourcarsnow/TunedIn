import { parseProvider } from './providers.js';
import { uid, esc, toast } from '../core/utils.js';
import { checkPostModeration, containsBannedWords, looksLikeSpam } from './automod.js';

export async function onCreatePost(e, state, DB, render) {
  // After post, force header to re-render so it picks up new cooldown state
  if (typeof window.renderHeader === 'function') {
    window.renderHeader();
  }
  e.preventDefault();
  const db = DB.getAll();
  const me = state.user;
  if (!me) { toast(document.getElementById('app'), 'login to post', true); return; }

  // Restrict to 1 post per 24h
  const now = Date.now();
  const lastPost = db.posts
    .filter(p => p.userId === me.id)
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  if (lastPost && now - lastPost.createdAt < 24 * 60 * 60 * 1000) {
    const timeLeft = 24 * 60 * 60 * 1000 - (now - lastPost.createdAt);
    const hours = Math.floor(timeLeft / (60 * 60 * 1000));
    const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);
    const errorDiv = document.getElementById('postFormError');
    if (errorDiv) errorDiv.textContent = `You can post again in ${hours}h ${minutes}m ${seconds}s.`;
    return;
  }


  const title = document.getElementById('f_title').value.trim();
  const artist = document.getElementById('f_artist').value.trim();
  let url = document.getElementById('f_url').value.trim();
  let body = document.getElementById('f_body').value.trim();
  if (body.length > 500) body = body.slice(0, 500);
  let tags = (document.getElementById('f_tags').value || '').trim();
  let lyrics = '';
  const lyricsEl = document.getElementById('f_lyrics');
  if (lyricsEl) lyrics = lyricsEl.value.trim();
  const errorDiv = document.getElementById('postFormError');
  if (errorDiv) errorDiv.textContent = '';
  // Captcha check
  const captchaBox = document.getElementById('captchaBox');
  const captchaInput = document.getElementById('f_captcha');
  if (captchaBox && captchaInput) {
    const answer = captchaBox.dataset.answer;
    if (captchaInput.value.trim() !== answer) {
      if (errorDiv) errorDiv.textContent = 'Captcha incorrect. Please try again.';
      captchaInput.value = '';
      // Reset captcha
      const evt = new Event('resetCaptcha');
      document.getElementById('postForm').dispatchEvent(evt);
      return;
    }
  }

  // Audio file upload support
  const audioInput = document.getElementById('f_audio');
  const audioFile = audioInput && audioInput.files && audioInput.files[0];

  // Allow either URL or file, but at least one must be present
  if (!title || (!url && !audioFile)) {
    if (errorDiv) errorDiv.textContent = 'Please provide a link or upload an audio file.';
    return;
  }

  if (!tags) {
    if (errorDiv) errorDiv.textContent = 'Please enter at least one tag.';
    return;
  }
  if (!body) {
    if (errorDiv) errorDiv.textContent = "Don't be shy! Tell us what makes this track stand out.";
    return;
  }

  // If audio file is provided, upload to Supabase Storage (audio bucket)
  if (audioFile) {
    try {
      const { supabase } = await import('../core/supabase_client.js');
      const fileExt = audioFile.name.split('.').pop();
      const filePath = `audio/${me.id}_${Date.now()}.${fileExt}`;
      // Show uploading message
      if (errorDiv) errorDiv.textContent = 'Uploading audio...';
      const uploadRes = await supabase.storage.from('audio').upload(filePath, audioFile, { upsert: true });
      if (uploadRes.error) {
        if (errorDiv) errorDiv.textContent = 'Audio upload failed: ' + uploadRes.error.message;
        return;
      }
      const publicUrlRes = supabase.storage.from('audio').getPublicUrl(filePath);
      if (publicUrlRes.error) {
        if (errorDiv) errorDiv.textContent = 'Audio URL error: ' + publicUrlRes.error.message;
        return;
      }
      url = publicUrlRes.data?.publicUrl || '';
      if (!url) {
        if (errorDiv) errorDiv.textContent = 'Could not get public URL for audio.';
        return;
      }
    } catch (err) {
      if (errorDiv) errorDiv.textContent = 'Audio upload failed (unexpected error)';
      return;
    }
  }

  // Automoderation check (title, artist, body, tags)
  let tagsArr = tags.split(/[#,]+/g).map(t => t.trim().toLowerCase()).filter(Boolean).slice(0, 12);
  // Deduplicate tags, preserve order
  let seenTags = new Set();
  tagsArr = tagsArr.filter(t => {
    if (seenTags.has(t)) return false;
    seenTags.add(t);
    return true;
  });
  if (
    containsBannedWords(title) ||
    containsBannedWords(artist) ||
    containsBannedWords(body) ||
    tagsArr.some(containsBannedWords)
  ) {
    if (errorDiv) errorDiv.textContent = 'Your post contains banned words.';
    return;
  }
  if (
    looksLikeSpam(title) ||
    looksLikeSpam(artist) ||
    looksLikeSpam(body)
  ) {
    if (errorDiv) errorDiv.textContent = 'Your post looks like spam.';
    return;
  }

  // Do not strip YouTube query params; preserve full video URLs

  const provider = parseProvider(url);
  tags = tagsArr;

  const dup = db.posts.find(p =>
    p.url.trim() === url ||
    (p.provider && provider && p.provider.provider === provider.provider && p.provider.id === provider.id && p.provider.kind === provider.kind)
  );
  if (dup) {
    // Remove any existing confirm popup
    document.querySelectorAll('.comment-delete-confirm').forEach(el => el.remove());

    // Create confirm popup (identical to comment/post delete)
    const confirmDiv = document.createElement('div');
    confirmDiv.className = 'comment-delete-confirm fadein';
    confirmDiv.innerHTML = `
      <div class="confirm-inner">
        <span><b>This link looks like a duplicate. Add anyway?</b></span>
        <button class="btn small btn-danger confirm-yes" tabindex="0">OK</button>
        <button class="btn small confirm-no" tabindex="0">Cancel</button>
      </div>
    `;
    // Position near the submit button
    const submitBtn = document.querySelector('#postForm button[type="submit"]');
    const rect = submitBtn ? submitBtn.getBoundingClientRect() : {left: window.innerWidth/2, bottom: window.innerHeight/2};
    confirmDiv.style.position = 'absolute';
    confirmDiv.style.zIndex = 10010;
    let left = rect.left + window.scrollX;
    const minWidth = 260;
    if (left + minWidth > window.innerWidth - 8) {
      left = window.innerWidth - minWidth - 8;
    }
    confirmDiv.style.left = left + 'px';
    confirmDiv.style.top = (rect.bottom + window.scrollY + 4) + 'px';

    document.body.appendChild(confirmDiv);

    // Remove popup helper (with fadeout)
    function removeConfirm() {
      confirmDiv.classList.remove('fadein');
      confirmDiv.classList.add('fadeout');
      setTimeout(() => confirmDiv.remove(), 180);
    }

    // Confirm
    confirmDiv.querySelector('.confirm-yes').onclick = () => {
      removeConfirm();
      // Continue with post creation
      actuallyCreatePost();
    };
    // Cancel
    confirmDiv.querySelector('.confirm-no').onclick = () => {
      removeConfirm();
      setTimeout(() => {
        const el = document.getElementById('post-' + dup.id);
        if (el) {
          el.classList.add('highlight');
          el.scrollIntoView({ block: 'start' });
          setTimeout(() => el.classList.remove('highlight'), 1500);
        }
      }, 10);
    };
    // Keyboard accessibility
    confirmDiv.onkeydown = (ev) => {
      if (ev.key === 'Enter') {
        confirmDiv.querySelector('.confirm-yes').click();
      } else if (ev.key === 'Escape') {
        removeConfirm();
      }
    };
    setTimeout(() => {
      confirmDiv.querySelector('.confirm-yes').focus();
    }, 10);
    setTimeout(() => {
      function outside(ev) {
        if (!confirmDiv.contains(ev.target)) {
          removeConfirm();
          document.removeEventListener('mousedown', outside);
        }
      }
      document.addEventListener('mousedown', outside);
    }, 0);

    // Prevent default post creation
    return;

    // Helper to continue post creation if confirmed
    function actuallyCreatePost() {
      // ...existing code for post creation below...
      const post = {
        id: uid('p'),
        userId: me.id,
        title, artist, url,
        provider,
        tags,
        body,
        likes: [],
        comments: [],
        createdAt: Date.now()
      };
      DB.createPost(post).then(() => render());
    }
  }

  const post = {
    id: uid('p'),
    userId: me.id,
    title, artist, url,
    provider,
    tags,
    body,
    lyrics,
    likes: [],
    comments: [],
    createdAt: Date.now()
  };
  await DB.createPost(post);

  // Always refresh DB after posting to ensure cache is up to date (for SupabaseAdapter)
  if (DB.refresh) await DB.refresh();
  // Debug: log DB cache after refresh
  if (DB && DB.cache) {
    
  }
  // Re-render header to ensure cooldown state is correct (after post is saved and cache is refreshed)
  if (typeof window.renderHeader === 'function') {
    window.renderHeader();
  }

  document.getElementById('f_title').value = '';
  document.getElementById('f_artist').value = '';
  document.getElementById('f_url').value = '';
  document.getElementById('f_tags').value = '';
  document.getElementById('f_body').value = '';
  if (document.getElementById('f_audio')) document.getElementById('f_audio').value = '';
  if (document.getElementById('audioFileName')) document.getElementById('audioFileName').textContent = '';
  if (errorDiv) errorDiv.textContent = '';
  const preview = document.getElementById('preview');
  preview.classList.remove('active'); preview.innerHTML = '';
  // Reset captcha after successful post
  const evt = new Event('resetCaptcha');
  document.getElementById('postForm').dispatchEvent(evt);

  // Prefer global app re-render if available, else fallback to local render
  if (typeof window.renderApp === 'function') {
    window.renderApp();
  } else {
    render();
  }
  setTimeout(() => {
    const el = document.getElementById('post-' + post.id);
    if (el) {
      el.classList.add('highlight');
      el.scrollIntoView({ block: 'start' });
      setTimeout(() => el.classList.remove('highlight'), 1500);
    }
  }, 10);
}

export function openEditInline(postId, state, DB, opts = {}) {
  window.editingPostId = postId;
  // Close comment panel if open for this post
  const cbox = document.getElementById('cbox-' + postId);
  if (cbox && cbox.classList.contains('active')) {
    cbox.classList.remove('fade-in');
    cbox.classList.add('fade-out');
    setTimeout(() => {
      cbox.classList.remove('active');
      cbox.classList.remove('fade-out');
      if (window.openCommentId == postId) window.openCommentId = null;
    }, 180);
  }
  const db = DB.getAll();
  const p = db.posts.find(x => x.id === postId);
  if (!p) return;
  if (!state.user || p.userId !== state.user.id) { toast(document.getElementById('app'), 'you can only edit your posts', true); return; }
  const card = document.getElementById('post-' + postId);
  if (!card) return;
  const editBoxId = 'editbox-' + postId;
  const opened = card.querySelector('#' + editBoxId);
  if (opened) {
    // Already open, do nothing
    return;
  }
  const edit = document.createElement('div');
  edit.className = 'box' + (opts.noAnimation ? '' : ' fade-in');
  edit.id = editBoxId;
  edit.style.marginTop = '8px';
  // Hide direct URL for Supabase audio uploads
  const isSupabaseAudio = typeof p.url === 'string' && /\/storage\/v1\/object\/public\/audio\//.test(p.url);
    edit.innerHTML = `
      <div class="muted small">edit post</div>
      <form class="stack" data-action="edit-form" data-post="${p.id}">
      <input class="field" name="artist" value="${esc(p.artist || '')}" placeholder="Artist"/>
      <input class="field" name="title" value="${esc(p.title)}" required maxlength="120" placeholder="Title (song or album)"/>
      <input class="field" name="url" value="${esc(p.url)}" required readonly style="background:#222;opacity:0.7;cursor:not-allowed;" tabindex="-1" aria-readonly="true" placeholder="Link (YouTube / Spotify / Bandcamp, etc)"/>
      <input class="field" name="tags" value="${esc((p.tags || []).join(' '))}" placeholder="#Tags go here"/>
      <textarea class="field" name="body" rows="4" maxlength="500" oninput="this.nextElementSibling.textContent = this.value.length + '/500';" placeholder="Share something about this track, a memory, or the vibe it gives you.">${esc(p.body || '')}</textarea>
      <div class="muted small" style="text-align:right">${(p.body||'').length}/500</div>
      <textarea class="field" name="lyrics" rows="4" maxlength="4000" placeholder="Paste lyrics here (optional)">${esc(p.lyrics || '')}</textarea>
      <div class="muted small" style="text-align:right">${(p.lyrics||'').length}/4000</div>
        <div class="hstack">
          <button class="btn" type="submit">[ save ]</button>
          <button class="btn btn-ghost" type="button" data-action="toggle-player">[ preview ]</button>
        </div>
      </form>
    `;
  card.appendChild(edit);

  // Save draft on every input
  if (!window.editingPostDrafts) window.editingPostDrafts = {};
  const form = edit.querySelector('form[data-action="edit-form"]');
  if (form) {
    const saveDraft = () => {
      window.editingPostDrafts[postId] = {
        title: form.title?.value,
        artist: form.artist?.value,
        url: form.url?.value,
        tags: form.tags?.value,
  body: form.body?.value,
  lyrics: form.lyrics?.value
      };
    };
    form.addEventListener('input', saveDraft);
    // Restore draft if present
    const draft = window.editingPostDrafts[postId];
    if (draft) {
      if (draft.title !== undefined) form.title.value = draft.title;
      if (draft.artist !== undefined) form.artist.value = draft.artist;
      if (draft.url !== undefined) form.url.value = draft.url;
      if (draft.tags !== undefined) form.tags.value = draft.tags;
  if (draft.body !== undefined) form.body.value = draft.body;
  if (draft.lyrics !== undefined) form.lyrics.value = draft.lyrics;
    }
  }

  // Attach to window for feed.js to call
  if (!window.openEditInline) window.openEditInline = openEditInline;
// Ensure editingPostId is cleared on save (form submit)
document.addEventListener('submit', function(e) {
  const form = e.target;
  if (form && form.matches('form[data-action="edit-form"]')) {
    const postId = form.getAttribute('data-post');
    if (window.editingPostId == postId) window.editingPostId = null;
  }
});
}