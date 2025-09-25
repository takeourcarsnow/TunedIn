// Help overlay module: injects the help overlay HTML into the page
export function renderHelpOverlay() {
  const helpHTML = `
  <div class="sheet box">
      <div class="hstack" style="justify-content:space-between; align-items:center">
        <div class="muted small">> help</div>
        <button class="btn btn-ghost small" data-close-help>[ close ]</button>
      </div>
      <div class="sep"></div>
      <div class="small stack" style="gap:1.5em">
        <div style="text-align:center;">
          <b>👋 Welcome to <span style="color:var(--accent,#6cf)">TunedIn.space</span></b><br>
          <span class="muted">Post less. Feel more.</span><br>
        </div>
        <div class="hstack" style="justify-content:center; gap:12px; margin: 1em 0 0.5em 0;">
          <button class="btn btn-ghost" data-action="show-changelog">[ dev changelog ]</button>
        </div>
        <div style="background:var(--bg2,#181a); border-radius:8px; padding:1em; margin-bottom:0.5em;">
          <b>✨ What’s New</b><br>
          <ul style="margin:0 0 0 1.2em; padding:0;">
            <li>🎤 <b>Lyrics display</b> for posts – sing along or just vibe.</li>
            <li>🖼️ <b>Clickable thumbnails</b> – hit the pic to play the track.</li>
            <li>🔊 <b>Longer posts</b> – up to 500 characters to say why it slaps.</li>
            <li>🚀 <b>Faster feed</b> – lazyloading for smooth scrolling.</li>
            <li>📢 <b>Announcements</b> now show up under the header.</li>
            <li>📱 <b>Sliding tabs</b> on mobile – swipe between sections.</li>
            <li>🎨 <b>Composer blur</b> when you’re on cooldown (so you know).</li>
          </ul>
        </div>
        <div>
          <b>Getting Started</b><br>
          <ul style="margin:0 0 0 1.2em; padding:0;">
            <li>Scroll the feed and eavesdrop on what everyone else is jamming to.</li>
            <li>Smash <b>[ login / register ]</b> to join the party and drop your own bangers.</li>
            <li>Share links from YouTube, Spotify, Bandcamp, SoundCloud, or even that obscure .mp3 you found at 3am.</li>
            <li>Tag your posts (#vibes, #throwback, #2020) so fellow music nerds can find them.</li>
            <li>Hit <b>[ play all ]</b> to turn the feed into your personal radio station.</li>
          </ul>
        </div>
        <div>
          <b>How to Post</b><br>
          <ul style="margin:0 0 0 1.2em; padding:0;">
            <li>Give us a title, an artist, and a legit music link. (No Rickrolls. Or... maybe just one.)</li>
            <li>Tags = discoverability. Don’t be shy.</li>
            <li>Optional: Tell us why this track slaps. Or just type "banger." We get it.</li>
            <li><b>Note:</b> You can post once every 24 hours. Plan your pick and come back tomorrow for more!</li>
          </ul>
        </div>
        <div>
          <b>Listening & Queue</b><br>
          <ul style="margin:0 0 0 1.2em; padding:0;">
            <li>Player controls up top: play, skip, shuffle, clear. DJ skills not required.</li>
            <li>The queue is just the current feed, so filter and sort to your heart’s content.</li>
          </ul>
        </div>
        <div>
          <b>Personalize</b><br>
          <button class="btn icon" title="accent color" data-action="accent-pick">🎨</button>
          <span class="muted small">Pick an accent color. Express yourself. (Sorry, no glitter... yet.)</span>
        </div>
        <div>
          <b>Tips & Tricks</b><br>
          <ul style="margin:0 0 0 1.2em; padding:0;">
            <li>Click tags to filter the feed. Use [ clear tag ] to see everything again.</li>
            <li>Everything is keyboard accessible, so you can flex your shortcut skills.</li>
            <li>Be kind, have fun, and remember: one person’s guilty pleasure is another’s anthem.</li>
          </ul>
        </div>
      </div>
      <div class="sep"></div>
      <div style="text-align:center; margin-top:2em;">
        <button class="btn btn-danger" data-action="delete-account">Delete My Account</button>
        <div class="muted small" style="margin-top:0.5em;">This will permanently remove your account and posts.</div>
      </div>
    </div>
  `;
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = 'help';
  overlay.innerHTML = helpHTML;
  document.body.appendChild(overlay);
  // (Leaderboard button removed)
  // Changelog button handler
  overlay.querySelector('[data-action="show-changelog"]').onclick = () => {
    import('./changelog_modal.js').then(mod => {
      mod.showChangelogModal();
      // Inject changelog modal CSS if not present
      if (!document.getElementById('changelog-modal-css')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'css/changelog_modal.css';
        link.id = 'changelog-modal-css';
        document.head.appendChild(link);
      }
      // Close help overlay so changelog is not hidden
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    });
  };
  // Attach delete account handler
  overlay.querySelector('[data-action="delete-account"]').onclick = async () => {
    // Create a modal overlay for confirmation
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.background = 'rgba(0,0,0,0.6)';
    modal.style.zIndex = '10001';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.innerHTML = `
      <div class="box stack" style="max-width:340px; background:var(--bg,#111); padding:2em 1.5em; border-radius:10px; box-shadow:0 4px 32px #000a; align-items:center;">
        <div class="muted" style="font-size:1.1em; margin-bottom:0.5em;">Type <b>delete</b> to confirm account deletion.</div>
        <input id="deleteConfirmInput" class="field" style="width:100%; margin-bottom:1em;" placeholder="Type 'delete' to confirm" autocomplete="off" />
        <div class="hstack" style="gap:1em; justify-content:center;">
          <button class="btn btn-danger" id="confirmDeleteBtn">Delete</button>
          <button class="btn btn-ghost" id="cancelDeleteBtn">Cancel</button>
        </div>
        <div class="muted small" id="deleteErrorMsg" style="color:#e66; margin-top:0.5em; display:none;"></div>
      </div>
    `;
    document.body.appendChild(modal);
    const input = modal.querySelector('#deleteConfirmInput');
    const confirmBtn = modal.querySelector('#confirmDeleteBtn');
    const cancelBtn = modal.querySelector('#cancelDeleteBtn');
    const errorMsg = modal.querySelector('#deleteErrorMsg');
    input.focus();
    cancelBtn.onclick = () => { modal.remove(); };
    confirmBtn.onclick = async () => {
      if (input.value.trim().toLowerCase() !== 'delete') {
        errorMsg.textContent = "You must type 'delete' to confirm.";
        errorMsg.style.display = '';
        input.focus();
        return;
      }
      confirmBtn.disabled = true;
      errorMsg.style.display = 'none';
      const DB = (await import('./db.js')).default;
      const { currentUser } = await import('../auth/auth.js');
      const { clearSession } = await import('../auth/session.js');
      let user = await currentUser(DB);
      if (!user) { alert('No user logged in.'); modal.remove(); return; }
      const ok = await DB.deleteUser(user.id);
      if (ok) {
        // If using Supabase, also sign out
        if (DB.isRemote && DB.supabase && DB.supabase.auth && DB.supabase.auth.signOut) {
          try { await DB.supabase.auth.signOut(); } catch (e) { /* ignore */ }
        }
        clearSession();
        alert('Your account and posts have been deleted.');
        location.reload();
      } else {
        errorMsg.textContent = 'Failed to delete account.';
        errorMsg.style.display = '';
        confirmBtn.disabled = false;
      }
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirmBtn.click();
    });
  };
}
