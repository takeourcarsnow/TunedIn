import { $ } from '../core/utils.js';
import { startPromptAnimation, startLoginPromptAnimation, stopLoginPromptAnimation } from './login_prompts.js';
import { setGuestMode, setSession, clearSession } from '../auth/session.js';
import { renderHeader } from '../core/header.js';

export function renderLogin(root, DB, render) {
  // Add a class to body for reliable CSS targeting
  document.body.classList.add('login-page');
  // Remove mobile tab bar if present (prevents it from lingering on login screen)
  const oldTabBar = document.querySelector('.mobile-tab-bar');
  if (oldTabBar) oldTabBar.remove();
  const banner = document.getElementById('ascii-banner');
  if (banner) banner.style.display = 'none';
  document.body.classList.remove('show-header');
  // Prevent vertical scrollbar on login view (html & body)
  const prevBodyOverflow = document.body.style.overflow;
  const prevHtmlOverflow = document.documentElement.style.overflow;
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';

  const div = document.createElement('div');
  div.className = 'login login-fadein';
  div.innerHTML = `
    <div class="auth-shell">
      <img src="/assets/logo.png" alt="Logo" class="login-logo-anim" style="display:block; margin:0 auto; width:64px; height:64px; object-fit:contain; animation:none;" />
      <div class="small muted">┌─ login or register to</div>
      <div class="logo">TunedIn.space</div>
      <div class="small muted">└──────────────────────</div>

      <div class="title">
        <span id="loginAnimatedPrompt" aria-hidden="true"></span>
        <span id="registerAnimatedPrompt" aria-hidden="true" style="display:none;"></span>
      </div>

      <form id="loginForm" class="stack auth-form" autocomplete="off">
        <input required type="email" id="loginEmail" class="field" placeholder="Email" />
        <input required minlength="6" maxlength="64" id="loginPass" class="field" type="password" placeholder="Password" />
        <button class="btn" type="submit">[ sign in ]</button>
        <div class="auth-links">
          <a href="#" id="showRegister" class="muted small" style="text-decoration:underline;">Don't have an account? Create one</a>
        </div>
        <div class="muted small auth-msg" id="loginMsg">${DB.isRemote ? 'Sign in to be able to post content,<br>' : ''}or use guest mode below.</div>
      </form>

      <form id="registerForm" class="stack auth-form" autocomplete="off" style="display:none;">
        <input required minlength="2" maxlength="24" id="regName" class="field" placeholder="Username" />
        <input required type="email" id="regEmail" class="field" placeholder="Email" />
        <input required minlength="6" maxlength="64" id="regPass" class="field" type="password" placeholder="Password" />
        <button class="btn" type="submit">[ create account ]</button>
        <div class="auth-links">
          <a href="#" id="showLogin" class="muted small" style="text-decoration:underline;">Already have an account? Sign in</a>
        </div>
        <div class="muted small auth-msg" id="regMsg">${DB.isRemote ? 'Register to post.  ' : ''}Or view in guest mode.</div>
      </form>

      <div class="sep"></div>
      <div class="hstack" style="justify-content:center;">
        <button class="btn btn-ghost" id="guestBtn" type="button">[ continue as guest ]</button>
      </div>
    </div>
  `;

  root.appendChild(div);
  // After parent fade-in, trigger logo animation
  setTimeout(() => {
    const logo = div.querySelector('.login-logo-anim');
    if (logo) {
      logo.style.animation = '';
    }
  }, 700); // match .login-fadein duration
  // In mobile tabbed mode, remove header (and logo) from DOM if present
  if (window.matchMedia('(max-width: 600px)').matches) {
    const header = document.querySelector('header[role="banner"]');
    if (header && header.parentNode) {
      header.parentNode.removeChild(header);
    }
  }
  // Restore overflow and remove login-page class when leaving login view
  const restoreOverflow = () => {
    document.body.style.overflow = prevBodyOverflow || '';
    document.documentElement.style.overflow = prevHtmlOverflow || '';
    document.body.classList.remove('login-page');
  };
  // Patch render to restore overflow if main view is rendered
  const wrappedRender = (...args) => {
    restoreOverflow();
    // If in mobile mode, ensure header is present before rendering main view
    if (window.matchMedia('(max-width: 600px)').matches) {
      // Only add header if not present
      if (!document.querySelector('header[role="banner"]')) {
        renderHeader();
      }
    }
    render(...args);
  };

  // Animations
  let stopRegisterPrompt = null;

  function showLoginForm() {
    setGuestMode(false); // Always disable guest mode when showing login
    $('#loginForm').style.display = '';
    $('#registerForm').style.display = 'none';
    $('#loginAnimatedPrompt').style.display = '';
    $('#registerAnimatedPrompt').style.display = 'none';

    // stop register animator if running
    if (stopRegisterPrompt) {
      stopRegisterPrompt();
      stopRegisterPrompt = null;
    }
    // start login animator
    $('#loginAnimatedPrompt').textContent = '';
    startLoginPromptAnimation();

    // Prevent auto-focus on mobile devices (avoid keyboard pop-up)
    if (!/Mobi|Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) {
      $('#loginEmail').focus();
    }
  }

  function showRegisterForm() {
    $('#loginForm').style.display = 'none';
    $('#registerForm').style.display = '';
    $('#loginAnimatedPrompt').style.display = 'none';
    $('#registerAnimatedPrompt').style.display = '';

    // stop login animator
    stopLoginPromptAnimation();

    // start register animator
    const regEl = document.getElementById('registerAnimatedPrompt');
    regEl.textContent = '';
    stopRegisterPrompt = startPromptAnimation(regEl);

    // Prevent auto-focus on mobile devices (avoid keyboard pop-up)
    if (!/Mobi|Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) {
      $('#regName').focus();
    }
  }

  $('#showLogin').onclick = (e) => { e.preventDefault(); showLoginForm(); };
  $('#showRegister').onclick = (e) => { e.preventDefault(); showRegisterForm(); };

  $('#guestBtn').onclick = () => {
    setGuestMode(true);
    wrappedRender();
  };

  // Register
  $('#registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#regName').value.trim();
    const email = $('#regEmail').value.trim();
    const pass = $('#regPass').value;
    if (!name || !email || !pass) return;
    // Email format and disposable domain validation
    import('../core/utils.js').then(utils => {
      if (!utils.isValidEmailFormat(email)) {
        $('#regMsg').textContent = 'Please enter a valid email address.';
        return;
      }
      // isDisposableEmail is defined in db.js, so import it from there
      import('../core/db.js').then(dbmod => {
        if (dbmod.isDisposableEmail && dbmod.isDisposableEmail(email)) {
          $('#regMsg').textContent = 'Disposable (temporary) email addresses are not allowed.';
          return;
        }
        proceed();
      });
    });

    function proceed() {
      $('#regMsg').textContent = 'Registering...';
      (async () => {
        try {
          let u;
          if (DB.isRemote && DB.supabase) {
            const { data, error } = await DB.supabase.auth.signUp({ email, password: pass, options: { data: { name } } });
            if (error) throw error;
            // Supabase: always require email confirmation before login
            $('#regMsg').innerHTML = 'Registration successful!<br>Please check your email and confirm your account before logging in.';
            $('#registerForm').reset();
            // Optionally, hide the form or disable it
            $('#registerForm').style.display = 'none';
            // Show login form after a short delay
            setTimeout(() => {
              showLoginForm();
              $('#loginMsg').innerHTML = 'A confirmation email has been sent to your address.<br><b>Please confirm your email before logging in.</b>';
            }, 3500);
            return;
          } else {
            u = await DB.ensureUser(name, email, pass);
            setSession({ userId: u.id }); // Only for local users
            setGuestMode(false);
            await DB.refresh();
            wrappedRender();
          }
        } catch (err) {
          $('#regMsg').textContent = 'Registration failed: ' + (err.message || err);
        }
      })();
    }
  });

  // Login
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#loginEmail').value.trim();
    const pass = $('#loginPass').value;
    if (!email || !pass) return;
    $('#loginMsg').textContent = 'Logging in...';
    try {
      // Always clear session and cache before login to prevent leaks
      clearSession();
      if (DB.isRemote && DB.supabase && DB.supabase.auth && DB.supabase.auth.signOut) {
        try { await DB.supabase.auth.signOut(); } catch (e) { /* ignore */ }
      }
      let u;
      if (DB.isRemote && DB.supabase) {
        const { data, error } = await DB.supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        // Check if user is confirmed (Supabase v2: user.confirmed_at, v1: user.confirmed)
        const userObj = data.session?.user || data.user;
        const isConfirmed = userObj?.confirmed_at || userObj?.confirmed || userObj?.email_confirmed_at;
        if (!isConfirmed) {
          $('#loginMsg').innerHTML = 'You must confirm your email before logging in. Please check your inbox.';
          return;
        }
        // Do not setSession for Supabase users; rely on Supabase session
        setGuestMode(false);
        await DB.refresh();
        wrappedRender();
      } else {
        u = await DB.loginUser(email, pass);
        if (!u) throw new Error('Invalid credentials');
        setSession({ userId: u.id }); // Only for local users
        setGuestMode(false);
        await DB.refresh();
        wrappedRender();
      }
    } catch (err) {
      $('#loginMsg').textContent = 'Login failed: ' + (err.message || err);
    }
  });

  // Start on login by default
  showLoginForm();
}