import { uid, toast, esc } from '../core/utils';
import { parseProvider } from './providers';
import { supabase } from '../core/supabase_client';

export async function onCreatePost(e: Event, state: any, DB: any, render: () => void) {
  e.preventDefault();
  const app = document.getElementById('app');
  const me = state.user;
  if (!me) { toast(app, 'login to post', true); return; }

  const fTitle = document.getElementById('f_title') as HTMLInputElement | null;
  const fArtist = document.getElementById('f_artist') as HTMLInputElement | null;
  const fUrl = document.getElementById('f_url') as HTMLInputElement | null;
  const fBody = document.getElementById('f_body') as HTMLTextAreaElement | null;
  const fTags = document.getElementById('f_tags') as HTMLInputElement | null;
  const fAudio = document.getElementById('f_audio') as HTMLInputElement | null;
  const fLyrics = document.getElementById('f_lyrics') as HTMLTextAreaElement | null;
  const fCaptcha = document.getElementById('f_captcha') as HTMLInputElement | null;
  const captchaBox = document.getElementById('captchaBox') as HTMLElement | null;
  const errorDiv = document.getElementById('postFormError') as HTMLElement | null;
  if (errorDiv) errorDiv.textContent = '';

  const title = (fTitle?.value || '').trim();
  const artist = (fArtist?.value || '').trim();
  let url = (fUrl?.value || '').trim();
  let body = (fBody?.value || '').trim();
  let lyrics = (fLyrics?.value || '').trim();
  body = body.slice(0, 500);
  const tagsRaw = (fTags?.value || '').trim();
  let tags = tagsRaw.split(/[#,\s]+/g).map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 12);
  // de-duplicate tags
  tags = Array.from(new Set(tags));

  // Basic validations
  const audioFile = (fAudio?.files && fAudio.files[0]) || null;
  if (!title || (!url && !audioFile)) { if (errorDiv) errorDiv.textContent = 'Please provide a link or upload an audio file.'; return; }
  if (!tags.length) { if (errorDiv) errorDiv.textContent = 'Please enter at least one tag.'; return; }
  if (!body) { if (errorDiv) errorDiv.textContent = "Don't be shy! Tell us what makes this track stand out."; return; }

  // Captcha
  if (captchaBox && fCaptcha) {
    const answer = (captchaBox.getAttribute('data-answer') || '').trim();
    if (fCaptcha.value.trim() !== answer) {
      if (errorDiv) errorDiv.textContent = 'Captcha incorrect. Please try again.';
      fCaptcha.value = '';
      const form = document.getElementById('postForm');
      if (form) form.dispatchEvent(new Event('resetCaptcha'));
      return;
    }
  }

  // Enforce per-user time limit (24 hours since last post)
  try {
    if (DB && typeof DB.refresh === 'function') {
      try { await DB.refresh(); } catch {}
    }
    let posts: any[] = [];
    if (DB && typeof DB.getAll === 'function') { const db = DB.getAll(); posts = db.posts || []; }
    const now = Date.now();
    const lastPost = posts.filter((p: any) => p.userId === me.id).sort((a: any, b: any) => b.createdAt - a.createdAt)[0];
    if (lastPost && now - lastPost.createdAt < 24 * 60 * 60 * 1000) {
      const timeLeft = 24 * 60 * 60 * 1000 - (now - lastPost.createdAt);
      const hours = Math.floor(timeLeft / (60 * 60 * 1000));
      const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
      const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);
      const countdown = `${hours}h ${minutes}m ${seconds}s`;
      if (errorDiv) errorDiv.textContent = `You can post again in ${countdown}.`;
      else toast(app, `You can post again in ${countdown}.`, true);
      (window as any).composeCooldown = { isCooldown: true, countdown };
      try { document.dispatchEvent(new CustomEvent('composeCooldownUpdated', { detail: (window as any).composeCooldown })); } catch {}
      return;
    }
  } catch (e) { /* non-fatal: allow posting if check fails */ }

  // If audio provided, upload to Supabase Storage 'audio' bucket
  if (audioFile) {
    try {
      const fileExt = (audioFile.name.split('.').pop() || 'mp3');
      const filePath = `audio/${me.id}_${Date.now()}.${fileExt}`;
      if (errorDiv) errorDiv.textContent = 'Uploading audio...';
      const uploadRes = await supabase.storage.from('audio').upload(filePath, audioFile, { upsert: true });
      if ((uploadRes as any).error) { if (errorDiv) errorDiv.textContent = 'Audio upload failed: ' + (uploadRes as any).error.message; return; }
      const publicUrlRes = supabase.storage.from('audio').getPublicUrl(filePath);
      if ((publicUrlRes as any).error) { if (errorDiv) errorDiv.textContent = 'Audio URL error: ' + (publicUrlRes as any).error.message; return; }
      url = (publicUrlRes as any).data?.publicUrl || '';
      if (!url) { if (errorDiv) errorDiv.textContent = 'Could not get public URL for audio.'; return; }
    } catch (err) {
      if (errorDiv) errorDiv.textContent = 'Audio upload failed (unexpected error)';
      return;
    }
  }

  const provider = parseProvider(url);

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
  if (DB.refresh) await DB.refresh();

  // After successful post, set compose cooldown immediately so header/UI updates instantly
  try {
    const timeLeft = 24 * 60 * 60 * 1000;
    const hours = Math.floor(timeLeft / (60 * 60 * 1000));
    const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);
    const countdown = `${hours}h ${minutes}m ${seconds}s`;
    (window as any).composeCooldown = { isCooldown: true, countdown };
    try { document.dispatchEvent(new CustomEvent('composeCooldownUpdated', { detail: (window as any).composeCooldown })); } catch {}
  } catch (e) { /* ignore */ }

  // Clear form
  if (fTitle) fTitle.value = '';
  if (fArtist) fArtist.value = '';
  if (fUrl) fUrl.value = '';
  if (fTags) fTags.value = '';
  if (fBody) fBody.value = '';
  if (fLyrics) fLyrics.value = '';
  if (fAudio) fAudio.value = '';
  const fileNameEl = document.getElementById('audioFileName'); if (fileNameEl) fileNameEl.textContent = '';
  if (errorDiv) errorDiv.textContent = '';
  const preview = document.getElementById('preview'); if (preview) { preview.classList.remove('active'); preview.innerHTML = ''; }
  const form = document.getElementById('postForm'); if (form) form.dispatchEvent(new Event('resetCaptcha'));

  if ((window as any).renderApp) (window as any).renderApp(); else render();
  setTimeout(() => {
    const el = document.getElementById('post-' + post.id);
    if (el) {
      el.classList.add('highlight');
      el.scrollIntoView({ block: 'start' });
      setTimeout(() => el.classList.remove('highlight'), 1500);
    }
  }, 10);
}

export function openEditInline(postId: string, state: any, DB: any, opts: { noAnimation?: boolean } = {}) {
  (window as any).editingPostId = postId;
  const db = DB.getAll();
  const p = (db.posts || []).find((x: any) => x.id === postId);
  if (!p) return;
  if (!state.user || p.userId !== state.user.id) { toast(document.getElementById('app'), 'you can only edit your posts', true); return; }
  const card = document.getElementById('post-' + postId);
  if (!card) return;
  const editBoxId = 'editbox-' + postId;
  const opened = card.querySelector('#' + editBoxId);
  if (opened) return;
  const edit = document.createElement('div');
  edit.className = 'box' + (opts.noAnimation ? '' : ' fade-in');
  edit.id = editBoxId;
  edit.style.marginTop = '8px';
  edit.innerHTML = `
    <div class="muted small">edit post</div>
    <form class="stack" data-action="edit-form" data-post="${esc(p.id)}">
      <input class="field" name="artist" value="${esc(p.artist || '')}" placeholder="Artist"/>
      <input class="field" name="title" value="${esc(p.title || '')}" required maxlength="120" placeholder="Title (song or album)"/>
      <input class="field" name="url" value="${esc(p.url || '')}" placeholder="Link (YouTube / Spotify / Bandcamp, etc)"/>
      <input class="field" name="tags" value="${esc((p.tags || []).join(' '))}" placeholder="#Tags go here"/>
      <textarea class="field" name="body" rows="4" maxlength="500" placeholder="Share something about this track, a memory, or the vibe it gives you.">${esc(p.body || '')}</textarea>
      <textarea class="field" name="lyrics" rows="4" maxlength="4000" placeholder="Paste lyrics here (optional)">${esc(p.lyrics || '')}</textarea>
      <div class="hstack">
        <button class="btn" type="submit">[ save ]</button>
      </div>
    </form>
  `;
  card.appendChild(edit);
}
