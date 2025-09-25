import { esc, fmtTime } from '../core/utils';
import { supabase } from '../core/supabase_client';

function formatSocial(val: string, type: string) {
  const input = (val || '').trim(); if (!input) return '';
  if (/^https?:\/\//i.test(input)) return input;
  switch (type) {
    case 'facebook': return 'https://facebook.com/' + input.replace(/^@/, '');
    case 'instagram': return 'https://instagram.com/' + input.replace(/^@/, '');
    case 'twitter': return 'https://twitter.com/' + input.replace(/^@/, '');
    case 'bandcamp': return 'https://' + input.replace(/^https?:\/\//, '').replace(/\/$/, '') + '.bandcamp.com/';
    case 'soundcloud': return 'https://soundcloud.com/' + input.replace(/^@/, '');
    case 'youtube':
      if (/^[\w-]{11}$/.test(input)) return 'https://www.youtube.com/watch?v=' + input;
      if (/^@/.test(input)) return 'https://www.youtube.com/' + input;
      return 'https://www.youtube.com/c/' + input.replace(/^@/, '');
    case 'lastfm':
      let cleaned = input.replace(/^@/, '');
      const m = cleaned.match(/last\.fm\/user\/([^\/]+)/i); if (m) return 'https://www.last.fm/user/' + m[1];
      cleaned = cleaned.replace(/^www\./, ''); return 'https://www.last.fm/user/' + cleaned;
    default: return input;
  }
}

export function renderProfileBox(right: HTMLElement, state: any, DB: any, render: () => void) {
  if (!state.user) {
    right.innerHTML = `<div class="box" style="text-align:center;padding:2.5em 1em;font-size:1.1em;line-height:1.6;">
      <div class="muted small">&gt; profile</div>
      <div style="margin:1.5em 0 0.5em 0;">You need to <b>log in</b> or <b>register</b> to view your profile.</div>
      <button class="btn" data-action="go-login" style="margin-top:1.2em;">[ login / register ]</button>
    </div>`;
    return;
  }
  const db = DB.getAll(); const me = state.user; const meUser = (db.users || []).find((u: any) => u.id === me.id) || null;
  const myAbout = meUser?.about || ''; const myAvatar = meUser?.avatarUrl || '/assets/android-chrome-512x512.png';
  const socials = { facebook: meUser?.facebook || '', instagram: meUser?.instagram || '', twitter: meUser?.twitter || '', bandcamp: meUser?.bandcamp || '', soundcloud: meUser?.soundcloud || '', youtube: meUser?.youtube || '', lastfm: meUser?.lastfm || '' };

  const box = document.createElement('div'); box.className = 'box'; box.id = 'aboutBox';
  box.innerHTML = `
    <div class="muted small">&gt; my profile</div>
    <div style="display:flex; flex-direction:column; align-items:center; margin-bottom:8px;">
      <img class="profile-avatar-small" src="${esc(myAvatar)}" alt="avatar" />
    </div>
    <div id="aboutCollapsed" style="display:flex; flex-direction:column; gap:8px; min-height:38px;">
      <div id="aboutText" class="about-preview">${ myAbout ? esc(myAbout).replace(/\n/g, '<br>') : '<span class="muted small">no about yet.</span>' }</div>
      <div id="aboutSocials">${Object.entries(socials).filter(([,v]) => v).map(([k,v]) => `<a href="${esc(formatSocial(v as string, k))}" target="_blank" rel="noopener" class="social-link" title="${k}">${k}</a>`).join(' ') || '<span class="muted small">no social links</span>'}</div>
      <button class="btn btn-ghost small" id="editAboutBtn" type="button">[ edit ]</button>
    </div>
    <form class="stack" id="aboutEditForm" data-action="profile-form" autocomplete="off" style="display:none; margin-top:8px;" enctype="multipart/form-data">
      <label class="muted small" style="margin-bottom:4px;" for="avatarFile">Change avatar:</label>
      <div class="custom-file-input-wrapper" style="margin-bottom:8px;">
        <input class="custom-file-input" type="file" id="avatarFile" name="avatar" accept="image/*" />
        <label for="avatarFile" class="btn btn-ghost small" id="avatarFileLabel">[ upload new avatar ]</label>
        <span class="muted small" id="avatarFileName" style="margin-left:8px;"></span>
      </div>
      <textarea class="field" id="aboutMe" name="about" rows="3" maxlength="500" placeholder="Write a short bio...">${esc(myAbout)}</textarea>
      <fieldset class="social-links-group" style="border:1px dashed var(--line); border-radius:8px; padding:12px; margin:12px 0;">
        <legend class="muted small" style="padding:0 8px;">Social Links</legend>
        <div class="social-fields" style="display:grid; grid-template-columns:1fr; gap:8px;">
          <input class="field" type="text" id="socialFb" placeholder="Facebook username or URL" value="${esc(socials.facebook)}" />
          <input class="field" type="text" id="socialInsta" placeholder="Instagram username or URL" value="${esc(socials.instagram)}" />
          <input class="field" type="text" id="socialTwtr" placeholder="Twitter username or URL" value="${esc(socials.twitter)}" />
          <input class="field" type="text" id="socialBandcamp" placeholder="Bandcamp username or URL" value="${esc(socials.bandcamp)}" />
          <input class="field" type="text" id="socialSoundcloud" placeholder="SoundCloud username or URL" value="${esc(socials.soundcloud)}" />
          <input class="field" type="text" id="socialYoutube" placeholder="YouTube username or URL" value="${esc(socials.youtube)}" />
          <input class="field" type="text" id="socialLastfm" placeholder="Last.fm username or URL" value="${esc(socials.lastfm)}" />
        </div>
        <div class="muted small" style="margin-top:8px;">You can enter just your username or a full URL for each social field.</div>
      </fieldset>
      <div class="hstack">
        <button class="btn" type="submit">[ save about ]</button>
        <button class="btn btn-ghost small" id="cancelAboutBtn" type="button">[ cancel ]</button>
        <span class="muted small" id="profileMsg"></span>
      </div>
    </form>
  `;
  right.appendChild(box);

  const aboutCollapsed = box.querySelector('#aboutCollapsed') as HTMLElement;
  const aboutEditForm = box.querySelector('#aboutEditForm') as HTMLFormElement;
  const editBtn = box.querySelector('#editAboutBtn') as HTMLButtonElement;
  const cancelBtn = box.querySelector('#cancelAboutBtn') as HTMLButtonElement;

  editBtn.addEventListener('click', () => {
    aboutCollapsed.style.display = 'none';
    aboutEditForm.style.display = '';
    if (!/Mobi|Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) {
      (box.querySelector('#aboutMe') as HTMLTextAreaElement)?.focus();
    }
  });
  cancelBtn.addEventListener('click', () => {
    aboutEditForm.style.display = 'none';
    aboutCollapsed.style.display = 'flex';
  });

  // Show selected avatar filename
  const avatarInput = box.querySelector('#avatarFile') as HTMLInputElement | null;
  const avatarFileName = box.querySelector('#avatarFileName') as HTMLElement | null;
  if (avatarInput && avatarFileName) avatarInput.addEventListener('change', function () { avatarFileName.textContent = this.files && this.files[0] ? this.files[0].name : ''; });

  aboutEditForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const about = (box.querySelector('#aboutMe') as HTMLTextAreaElement).value.trim();
    const facebook = formatSocial((box.querySelector('#socialFb') as HTMLInputElement).value, 'facebook');
    const instagram = formatSocial((box.querySelector('#socialInsta') as HTMLInputElement).value, 'instagram');
    const twitter = formatSocial((box.querySelector('#socialTwtr') as HTMLInputElement).value, 'twitter');
    const bandcamp = formatSocial((box.querySelector('#socialBandcamp') as HTMLInputElement).value, 'bandcamp');
    const soundcloud = formatSocial((box.querySelector('#socialSoundcloud') as HTMLInputElement).value, 'soundcloud');
    const youtube = formatSocial((box.querySelector('#socialYoutube') as HTMLInputElement).value, 'youtube');
    const lastfm = formatSocial((box.querySelector('#socialLastfm') as HTMLInputElement).value, 'lastfm');

    let avatarUrl: string | undefined;
    const file = avatarInput?.files?.[0] || null;
    if (file) {
      try {
        const ext = file.name.split('.').pop();
        const filePath = `avatars/${state.user.id}_${Date.now()}.${ext}`;
        const uploadRes = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
        if ((uploadRes as any).error) throw (uploadRes as any).error;
        const publicUrlRes = supabase.storage.from('avatars').getPublicUrl(filePath);
        if ((publicUrlRes as any).error) throw (publicUrlRes as any).error;
        avatarUrl = (publicUrlRes as any).data?.publicUrl || '';
      } catch (err: any) {
        const msg = box.querySelector('#profileMsg') as HTMLElement | null;
        if (msg) msg.textContent = 'Avatar upload failed: ' + (err?.message || String(err));
        return;
      }
    }

    const patch: any = { about, facebook, instagram, twitter, bandcamp, soundcloud, youtube, lastfm };
    if (avatarUrl) patch.avatarUrl = avatarUrl;
    try {
      await DB.updateUser(state.user.id, patch);
      await DB.refresh?.();
      render();
    } catch (err) {
      const msg = box.querySelector('#profileMsg') as HTMLElement | null;
      if (msg) msg.textContent = 'Save failed';
    }
  });
}
