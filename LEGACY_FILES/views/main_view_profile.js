// --- MOBILE NOTIFICATION DOT (just below header, above user menu) ---
  if (/Mobi|Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) {
    // Remove the dot for guests immediately to prevent any rendering
    try {
      let isGuest = true;
      if (window.state && window.state.user) isGuest = false;
      if (isGuest) {
        const dot = document.getElementById('mobile-notification-dot');
        if (dot && dot.parentNode) dot.parentNode.removeChild(dot);
      }
    } catch(e) {}
    // Only add logic if dot exists in DOM
    function setupMobileDotLogic() {
      const mobileDot = document.getElementById('mobile-notification-dot');
      if (!mobileDot) {
        setTimeout(setupMobileDotLogic, 100); // Wait for dot to exist
        return;
      }
      // Import state to check user
      import('../core/app_state.js').then(({ state }) => {
        if (!state.user) {
          // Hide the dot for guests
          mobileDot.style.display = 'none';
          return;
        }
        // Make dot accessible and focusable
        mobileDot.setAttribute('tabindex', '0');
        mobileDot.setAttribute('role', 'button');
        mobileDot.setAttribute('aria-label', 'Show notifications');
        // Notification logic (subscribe, update, popup)
        let allNotifications = [];
        import('../core/notifications.js').then(({ default: notifications }) => {
          function updateDot(list) {
            mobileDot.style.display = 'inline-block';
            if (list.length) {
              mobileDot.style.opacity = '1';
              mobileDot.title = 'Show notifications';
            } else {
              mobileDot.style.opacity = '0.35';
              mobileDot.title = 'No notifications';
            }
            for (const n of list) {
              if (!allNotifications.some(x => x.id === n.id)) allNotifications.push(n);
            }
          }
          notifications.subscribe(updateDot);
          updateDot(notifications.list);

          // Notification popup panel (copied from profile dot logic)
          let popup = null;
          function closePopup() {
            if (popup) {
              popup.remove();
              popup = null;
            }
          }
          function handleDotActivate(e) {
            if (e) {
              if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
              e.stopPropagation();
              e.preventDefault();
            }
            
            if (popup) {
              closePopup();
              return;
            }
            // Always show the popup, even if no notifications
            popup = document.createElement('div');
            popup.className = 'notification-popup-panel';
            // Copy styles from profile dot popup
            popup.style.position = 'fixed';
            const rect = mobileDot.getBoundingClientRect();
            popup.style.top = (rect.bottom + 6) + 'px';
            popup.style.left = (rect.left - 12) + 'px';
            popup.style.zIndex = '10000';
            popup.style.background = '#232b36';
            popup.style.color = '#fff';
            popup.style.border = '1.5px solid #333a';
            popup.style.borderRadius = '10px';
            popup.style.boxShadow = '0 8px 32px #0008, 0 1.5px 0 #fff1 inset';
            popup.style.padding = '14px 18px 10px 18px';
            popup.style.minWidth = '220px';
            popup.style.maxWidth = '320px';
            popup.style.fontSize = '1em';
            popup.style.display = 'flex';
            popup.style.flexDirection = 'column';
            popup.style.gap = '10px';
            // ...existing code...
            // Render notifications list
            popup.innerHTML = `
              <div style="font-weight:600;font-size:1.08em;margin-bottom:2px;letter-spacing:0.01em;">Notifications</div>
              <div class="notification-list" style="max-height:180px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;">
                ${allNotifications.length ? allNotifications.map(n => {
                  let time = typeof n.id === 'number' ? (typeof fmtTime === 'function' ? fmtTime(n.id) : '') : '';
                  if (time === 'just') time = 'just now';
                  return `<div style=\"background:${n.type==='error'?'#f44336':'#263245'};padding:8px 12px;border-radius:6px;box-shadow:0 1px 4px #0002;font-size:0.98em;display:flex;justify-content:space-between;align-items:center;gap:12px;\">
                    <span>${n.message}</span>
                    <span style=\"font-size:0.92em;opacity:0.7;white-space:nowrap;\">${time}</span>
                  </div>`;
                }).join('') : '<span class=\"muted small\">No notifications yet.</span>'}
              </div>
              <button class="btn btn-ghost small" style="align-self:flex-end;margin-top:4px;" id="closeNotifPopupBtn">close</button>
            `;
            document.body.appendChild(popup);
            // Close on button
            popup.querySelector('#closeNotifPopupBtn').onclick = closePopup;
            // Close on outside click (delay to avoid immediate close on touch)
            setTimeout(() => {
              document.addEventListener('mousedown', outsideClick, { once: true });
              document.addEventListener('touchstart', outsideClick, { once: true });
            }, 200);
            function outsideClick(ev) {
              if (popup && !popup.contains(ev.target) && ev.target !== mobileDot) closePopup();
            }
          }
          mobileDot.addEventListener('click', handleDotActivate);
          mobileDot.addEventListener('touchstart', handleDotActivate);
          mobileDot.addEventListener('keydown', handleDotActivate);
        });
      });
    }
    setupMobileDotLogic();
  }
// js/views/main_view_profile.js
import { esc, fmtTime } from '../core/utils.js';

export function renderProfileBox(right, state, DB, render) {
  // Show login/register message for guests
  if (!state.user) {
    right.innerHTML = `<div class="box" style="text-align:center;padding:2.5em 1em;font-size:1.1em;line-height:1.6;">
      <div class="muted small">&gt; profile</div>
      <div style="margin:1.5em 0 0.5em 0;">You need to <b>log in</b> or <b>register</b> to view your profile.</div>
    <button class="btn" data-action="go-login" style="margin-top:1.2em;">[ login / register ]</button>
    </div>`;
    return;
  }
  // Extract username from URL or return as-is if already a username
  function getSocialUsername(val, type) {
    if (!val) return '';
    let v = val.trim();
    if (!v) return '';
    if (type === 'youtube') {
      // If it's a full YouTube video or shorts URL, return as-is
      if (/^https?:\/\/(www\.)?youtube\.com\/(watch\?v=|shorts\/)[^\s]+/i.test(v)) {
        return v;
      }
      // Remove protocol and www for username/handle extraction
      v = v.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
      v = v.replace(/^youtube\.com\//i, '');
      v = v.replace(/^@/, '').replace(/\/$/, '');
      return v ? '@' + v : '';
    }
    // Remove protocol
    v = v.replace(/^https?:\/\//i, '');
    switch (type) {
      case 'facebook':
        v = v.replace(/^(www\.)?facebook\.com\//i, '');
        break;
      case 'instagram':
        v = v.replace(/^(www\.)?instagram\.com\//i, '');
        break;
      case 'twitter':
        v = v.replace(/^(www\.)?twitter\.com\//i, '');
        break;
      case 'bandcamp':
        v = v.replace(/^(www\.)?([^\.]+)\.bandcamp\.com.*/i, '$2');
        break;
      case 'soundcloud':
        v = v.replace(/^(www\.)?soundcloud\.com\//i, '');
        break;
      case 'lastfm':
        // Extract username from last.fm/user/ or just use as-is
        let match = v.match(/last\.fm\/user\/([^\/]+)/i);
        if (match) {
          v = match[1];
        } else {
          // Remove www. and leading @ if present
          v = v.replace(/^www\./, '').replace(/^@/, '');
        }
        break;
      default:
        break;
    }
    // Remove trailing slashes and @, then add @ for display
    v = v.replace(/^@/, '').replace(/\/$/, '');
    return v ? '@' + v : '';
  }
  const db = DB.getAll();
  const me = state.user;
  if (!me) return;

  const meUser = db.users.find(u => u.id === me.id) || null;
  const myAbout = meUser?.about || '';
  const myAvatar = meUser?.avatarUrl || '/assets/android-chrome-512x512.png';
  const socials = {
    facebook: meUser?.facebook || '',
    instagram: meUser?.instagram || '',
    twitter: meUser?.twitter || '',
    bandcamp: meUser?.bandcamp || '',
    soundcloud: meUser?.soundcloud || '',
    youtube: meUser?.youtube || '',
    lastfm: meUser?.lastfm || ''
  };

  function renderSocialLinks(s) {
    const icons = { facebook: '🌐', instagram: '📸', twitter: '🐦', bandcamp: '🎵', soundcloud: '☁️', youtube: '▶️', lastfm: '🎶' };
    // Use formatSocial for all links to ensure proper URLs
    function formatSocial(val, type) {
      const input = (val || '').trim();
      if (!input) return '';
      if (/^https?:\/\//i.test(input)) return input;
      switch (type) {
        case 'facebook':
          return 'https://facebook.com/' + input.replace(/^@/, '');
        case 'instagram':
          return 'https://instagram.com/' + input.replace(/^@/, '');
        case 'twitter':
          return 'https://twitter.com/' + input.replace(/^@/, '');
        case 'bandcamp':
          return 'https://' + input.replace(/^https?:\/\//, '').replace(/\/$/, '') + '.bandcamp.com/';
        case 'soundcloud':
          return 'https://soundcloud.com/' + input.replace(/^@/, '');
        case 'youtube':
          if (/^[\w-]{11}$/.test(input)) {
            return 'https://www.youtube.com/watch?v=' + input;
          }
          if (/^@/.test(input)) {
            return 'https://www.youtube.com/' + input;
          }
          return 'https://www.youtube.com/c/' + input.replace(/^@/, '');
        case 'lastfm':
          let cleaned = input.replace(/^@/, '');
          const lastfmMatch = cleaned.match(/last\.fm\/user\/([^\/]+)/i);
          if (lastfmMatch) {
            return 'https://www.last.fm/user/' + lastfmMatch[1];
          }
          cleaned = cleaned.replace(/^www\./, '');
          return 'https://www.last.fm/user/' + cleaned;
        default:
          return input;
      }
    }
    return Object.entries(s)
      .filter(([_, v]) => v)
      .map(([k, v]) => {
        const url = formatSocial(v, k);
        return `<a href="${esc(url)}" target="_blank" rel="noopener" class="social-link" title="${k}">${icons[k]}</a>`;
      })
      .join(' ');
  }

  const box = document.createElement('div');
  box.className = 'box';
  box.id = 'aboutBox';
  box.innerHTML = `
    <div class="muted small">&gt; my profile</div>
    <div style="display:flex; flex-direction:column; align-items:center; margin-bottom:8px;">
      <img class="profile-avatar-small" src="${esc(myAvatar)}" alt="avatar" />
    </div>
    <div id="aboutCollapsed" style="display:flex; flex-direction:column; gap:8px; min-height:38px;">
      <div id="aboutText" class="about-preview">${
        myAbout ? esc(myAbout).replace(/\n/g, '<br>') : '<span class="muted small">no about yet.</span>'
      }</div>
      <div id="aboutSocials">${renderSocialLinks(socials) || '<span class="muted small">no social links</span>'}</div>
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
          <label for="socialFb"><span class="sr-only">Facebook</span></label>
          <input class="field" type="text" id="socialFb" name="fb_user" placeholder="Facebook username or URL" value="${esc(getSocialUsername(socials.facebook, 'facebook'))}" autocomplete="username" />
          <label for="socialInsta"><span class="sr-only">Instagram</span></label>
          <input class="field" type="text" id="socialInsta" name="insta_user" placeholder="Instagram username or URL" value="${esc(getSocialUsername(socials.instagram, 'instagram'))}" autocomplete="username" />
          <label for="socialTwtr"><span class="sr-only">Twitter</span></label>
          <input class="field" type="text" id="socialTwtr" name="twtr_user" placeholder="Twitter username or URL" value="${esc(getSocialUsername(socials.twitter, 'twitter'))}" autocomplete="username" />
          <label for="socialBandcamp"><span class="sr-only">Bandcamp</span></label>
          <input class="field" type="text" id="socialBandcamp" name="bc_user" placeholder="Bandcamp username or URL" value="${esc(getSocialUsername(socials.bandcamp, 'bandcamp'))}" autocomplete="username" />
          <label for="socialSoundcloud"><span class="sr-only">SoundCloud</span></label>
          <input class="field" type="text" id="socialSoundcloud" name="sc_user" placeholder="SoundCloud username or URL" value="${esc(getSocialUsername(socials.soundcloud, 'soundcloud'))}" autocomplete="username" />
          <label for="socialYoutube"><span class="sr-only">YouTube</span></label>
          <input class="field" type="text" id="socialYoutube" name="yt_user" placeholder="YouTube username or URL" value="${esc(getSocialUsername(socials.youtube, 'youtube'))}" autocomplete="username" />
          <label for="socialLastfm"><span class="sr-only">Last.fm</span></label>
          <input class="field" type="text" id="socialLastfm" name="lastfm_user" placeholder="Last.fm username or URL" value="${esc(getSocialUsername(socials.lastfm, 'lastfm'))}" autocomplete="username" />
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

  // Custom file input JS: show file name, hide default text
  const avatarFileInput = box.querySelector('#avatarFile');
  const avatarFileName = box.querySelector('#avatarFileName');
  if (avatarFileInput && avatarFileName) {
    avatarFileInput.addEventListener('change', function() {
      avatarFileName.textContent = this.files && this.files.length > 0 ? this.files[0].name : '';
    });
  }
  // Insert notification dot into profile panel
  const profileTitle = box.querySelector('.muted.small');
  if (profileTitle) {
    const dot = document.createElement('span');
    dot.className = 'notification-dot';
    dot.style.display = 'none';
    dot.style.position = 'static';
    dot.style.marginLeft = '8px';
    dot.style.verticalAlign = 'middle';
    dot.style.background = '#f44336';
    dot.style.border = '2px solid #222e3a';
    dot.style.boxShadow = '0 0 2px #0008';
    profileTitle.appendChild(dot);
    // Subscribe to notifications
    // Store all notifications ever received
    let allNotifications = [];
    import('../core/notifications.js').then(({ default: notifications }) => {
      function updateDot(list) {
        dot.style.display = 'inline-block';
        if (list.length) {
          dot.style.opacity = '1';
          dot.title = 'Show notifications';
        } else {
          dot.style.opacity = '0.35';
          dot.title = 'No notifications';
        }
        // Add new notifications to allNotifications
        for (const n of list) {
          if (!allNotifications.some(x => x.id === n.id)) allNotifications.push(n);
        }
      }
      notifications.subscribe(updateDot);
      updateDot(notifications.list);
      dot.style.cursor = 'pointer';

      // Notification popup panel
      let popup = null;
      function closePopup() {
        if (popup) {
          popup.remove();
          popup = null;
        }
      }
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        if (popup) {
          closePopup();
          return;
        }
        // Always show the popup, even if no notifications
        popup = document.createElement('div');
        popup.className = 'notification-popup-panel';
        popup.style.position = 'absolute';
        popup.style.top = '28px';
        popup.style.left = '0';
        popup.style.zIndex = '10000';
        popup.style.background = '#232b36';
        popup.style.color = '#fff';
        popup.style.border = '1.5px solid #333a';
        popup.style.borderRadius = '10px';
        popup.style.boxShadow = '0 8px 32px #0008, 0 1.5px 0 #fff1 inset';
        popup.style.padding = '14px 18px 10px 18px';
        popup.style.minWidth = '220px';
        popup.style.maxWidth = '320px';
        popup.style.fontSize = '1em';
        popup.style.display = 'flex';
        popup.style.flexDirection = 'column';
        popup.style.gap = '10px';
        popup.innerHTML = `
          <div style=\"font-weight:600;font-size:1.08em;margin-bottom:2px;letter-spacing:0.01em;\">Notifications</div>
          <div class=\"notification-list\" style=\"max-height:180px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;\">
            ${allNotifications.length ? allNotifications.map(n => {
              let time = typeof n.id === 'number' ? fmtTime(n.id) : '';
              if (time === 'just') time = 'just now';
              return `<div style=\"background:${n.type==='error'?'#f44336':'#263245'};padding:8px 12px;border-radius:6px;box-shadow:0 1px 4px #0002;font-size:0.98em;display:flex;justify-content:space-between;align-items:center;gap:12px;\">
                <span>${n.message}</span>
                <span style=\"font-size:0.92em;opacity:0.7;white-space:nowrap;\">${time}</span>
              </div>`;
            }).join('') : '<span class=\"muted small\">No notifications yet.</span>'}
          </div>
          <button class=\"btn btn-ghost small\" style=\"align-self:flex-end;margin-top:4px;\" id=\"closeNotifPopupBtn\">close</button>
        `;
        // Position popup relative to dot
        const rect = dot.getBoundingClientRect();
        popup.style.position = 'fixed';
        popup.style.top = (rect.bottom + 6) + 'px';
        popup.style.left = (rect.left - 12) + 'px';
        document.body.appendChild(popup);
        // Close on button
        popup.querySelector('#closeNotifPopupBtn').onclick = closePopup;
        // Close on outside click
        setTimeout(() => {
          document.addEventListener('mousedown', outsideClick, { once: true });
        }, 0);
        function outsideClick(ev) {
          if (popup && !popup.contains(ev.target) && ev.target !== dot) closePopup();
        }
      });
    });
  }
  right.appendChild(box);

  const aboutCollapsed = box.querySelector('#aboutCollapsed');
  const aboutEditForm = box.querySelector('#aboutEditForm');
  const editBtn = box.querySelector('#editAboutBtn');
  const cancelBtn = box.querySelector('#cancelAboutBtn');

  // Animate out the collapsed section, then show the edit form
  editBtn.addEventListener('click', () => {
    aboutCollapsed.classList.add('fade-out');
    aboutCollapsed.classList.remove('fade-in');
    setTimeout(() => {
      aboutCollapsed.style.display = 'none';
      aboutEditForm.style.display = '';
      // Prevent auto-focus on mobile devices (avoid keyboard pop-up)
      if (!/Mobi|Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) {
        aboutEditForm.querySelector('#aboutMe').focus();
      }
    }, 180); // match CSS duration
  });
  // Animate in the collapsed section when canceling
  cancelBtn.addEventListener('click', () => {
    aboutEditForm.style.display = 'none';
    aboutCollapsed.style.display = 'flex';
    aboutCollapsed.classList.remove('fade-out');
    aboutCollapsed.classList.add('fade-in');
  });

  function formatSocial(val, type) {
    const input = (val || '').trim();
    if (!input) return '';
    // If input is a full URL, return as-is
    if (/^https?:\/\//i.test(input)) return input;
    switch (type) {
      case 'facebook':
        return 'https://facebook.com/' + input.replace(/^@/, '');
      case 'instagram':
        return 'https://instagram.com/' + input.replace(/^@/, '');
      case 'twitter':
        return 'https://twitter.com/' + input.replace(/^@/, '');
      case 'bandcamp':
        return 'https://' + input.replace(/^https?:\/\//, '').replace(/\/$/, '') + '.bandcamp.com/';
      case 'soundcloud':
        return 'https://soundcloud.com/' + input.replace(/^@/, '');
      case 'youtube':
        // If input looks like a YouTube video ID, build a watch URL
        if (/^[\w-]{11}$/.test(input)) {
          return 'https://www.youtube.com/watch?v=' + input;
        }
        // If input looks like a handle (starts with @), build a channel URL
        if (/^@/.test(input)) {
          return 'https://www.youtube.com/' + input;
        }
        // Otherwise, assume it's a username or channel name
        return 'https://www.youtube.com/c/' + input.replace(/^@/, '');
      case 'lastfm':
        // Remove leading @ if present
        let cleaned = input.replace(/^@/, '');
        // If input contains last.fm/user/, extract the username
        const lastfmMatch = cleaned.match(/last\.fm\/user\/([^\/]+)/i);
        if (lastfmMatch) {
          return 'https://www.last.fm/user/' + lastfmMatch[1];
        }
        // If input starts with www., remove it
        cleaned = cleaned.replace(/^www\./, '');
        return 'https://www.last.fm/user/' + cleaned;
      default:
        return input;
    }
  }

  aboutEditForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = aboutEditForm;

  const about = form.querySelector('#aboutMe').value;
  const facebook = formatSocial(form.querySelector('#socialFb').value, 'facebook');
  const instagram = formatSocial(form.querySelector('#socialInsta').value, 'instagram');
  const twitter = formatSocial(form.querySelector('#socialTwtr').value, 'twitter');
  const bandcamp = formatSocial(form.querySelector('#socialBandcamp').value, 'bandcamp');
  const soundcloud = formatSocial(form.querySelector('#socialSoundcloud').value, 'soundcloud');
  const youtube = formatSocial(form.querySelector('#socialYoutube').value, 'youtube');
  const lastfm = formatSocial(form.querySelector('#socialLastfm').value, 'lastfm');

  await DB.updateUser(me.id, { about, facebook, instagram, twitter, bandcamp, soundcloud, youtube, lastfm });
    setTimeout(() => {
      aboutEditForm.style.display = 'none';
      aboutCollapsed.style.display = 'flex';
      aboutCollapsed.classList.remove('fade-out');
      aboutCollapsed.classList.add('fade-in');
      if (typeof render === 'function') render();
    }, 100);
  });
}