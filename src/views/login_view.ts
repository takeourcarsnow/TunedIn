import { $ } from '../core/utils';
import { startPromptAnimation, startLoginPromptAnimation, stopLoginPromptAnimation } from './login_prompts';
import { setGuestMode, setSession, clearSession } from '../auth/session';
import { renderHeader } from '../core/header';

declare global { interface Window { DB?: any; state?: any } }

export function renderLogin(root: HTMLElement, DB: any, render: (...args: any[]) => void) {
  document.body.classList.add('login-page');
  const oldTabBar = document.querySelector('.mobile-tab-bar'); if (oldTabBar) (oldTabBar as HTMLElement).remove();
  const banner = document.getElementById('ascii-banner'); if (banner) (banner as HTMLElement).style.display = 'none';
  document.body.classList.remove('show-header');
  const prevBodyOverflow = (document.body as HTMLElement).style.overflow;
  const prevHtmlOverflow = (document.documentElement as HTMLElement).style.overflow;
  (document.body as HTMLElement).style.overflow = 'hidden'; (document.documentElement as HTMLElement).style.overflow = 'hidden';

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
  setTimeout(() => { const logo = div.querySelector('.login-logo-anim') as HTMLElement | null; if (logo) { logo.style.animation = ''; } }, 700);
  if (window.matchMedia('(max-width: 600px)').matches) {
    const header = document.querySelector('header[role="banner"]'); if (header && header.parentNode) { header.parentNode.removeChild(header); }
  }
  const restoreOverflow = () => {
    (document.body as HTMLElement).style.overflow = prevBodyOverflow || '';
    (document.documentElement as HTMLElement).style.overflow = prevHtmlOverflow || '';
    document.body.classList.remove('login-page');
  };

  const wrappedRender = (...args: any[]) => {
    restoreOverflow();
    if (window.matchMedia('(max-width: 600px)').matches) {
      if (!document.querySelector('header[role="banner"]')) { renderHeader(); }
    }
    render(...args);
  };

  let stopRegisterPrompt: null | (() => void) = null;

  function showLoginForm() {
    setGuestMode(false);
    ($('#loginForm') as HTMLElement).style.display = '';
    ($('#registerForm') as HTMLElement).style.display = 'none';
    ($('#loginAnimatedPrompt') as HTMLElement).style.display = '';
    ($('#registerAnimatedPrompt') as HTMLElement).style.display = 'none';
    if (stopRegisterPrompt) { stopRegisterPrompt(); stopRegisterPrompt = null; }
    ($('#loginAnimatedPrompt') as HTMLElement).textContent = '';
    startLoginPromptAnimation();
    if (!/Mobi|Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) { (document.getElementById('loginEmail') as HTMLInputElement | null)?.focus(); }
  }

  function showRegisterForm() {
    ($('#loginForm') as HTMLElement).style.display = 'none';
    ($('#registerForm') as HTMLElement).style.display = '';
    ($('#loginAnimatedPrompt') as HTMLElement).style.display = 'none';
    ($('#registerAnimatedPrompt') as HTMLElement).style.display = '';
    stopLoginPromptAnimation();
    const regEl = document.getElementById('registerAnimatedPrompt') as HTMLElement; regEl.textContent = '';
    stopRegisterPrompt = startPromptAnimation(regEl);
    if (!/Mobi|Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) { (document.getElementById('regName') as HTMLInputElement | null)?.focus(); }
  }

  ($('#showLogin') as HTMLElement).onclick = (e) => { e.preventDefault(); showLoginForm(); };
  ($('#showRegister') as HTMLElement).onclick = (e) => { e.preventDefault(); showRegisterForm(); };

  ($('#guestBtn') as HTMLElement).onclick = () => { setGuestMode(true); wrappedRender(); };

  document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = (document.getElementById('regName') as HTMLInputElement).value.trim();
    const email = (document.getElementById('regEmail') as HTMLInputElement).value.trim();
    const pass = (document.getElementById('regPass') as HTMLInputElement).value;
    if (!name || !email || !pass) return;
    const utilsModPromise = import('../core/utils');
    const dbModPromise = import('../core/db');
    const utils = await utilsModPromise; if (!utils.isValidEmailFormat(email)) { (document.getElementById('regMsg') as HTMLElement).textContent = 'Please enter a valid email address.'; return; }
    const dbmod = await dbModPromise as any; if (dbmod.isDisposableEmail && dbmod.isDisposableEmail(email)) { (document.getElementById('regMsg') as HTMLElement).textContent = 'Disposable (temporary) email addresses are not allowed.'; return; }

    function proceed() {
      (document.getElementById('regMsg') as HTMLElement).textContent = 'Registering...';
      (async () => {
        try {
          let u: any;
          if (DB.isRemote && DB.supabase) {
            const { data, error } = await DB.supabase.auth.signUp({ email, password: pass, options: { data: { name } } });
            if (error) throw error;
            (document.getElementById('regMsg') as HTMLElement).innerHTML = 'Registration successful!<br>Please check your email and confirm your account before logging in.';
            (document.getElementById('registerForm') as HTMLFormElement).reset();
            (document.getElementById('registerForm') as HTMLElement).style.display = 'none';
            setTimeout(() => { showLoginForm(); (document.getElementById('loginMsg') as HTMLElement).innerHTML = 'A confirmation email has been sent to your address.<br><b>Please confirm your email before logging in.</b>'; }, 3500);
            return;
          } else {
            u = await DB.ensureUser(name, email, pass);
            setSession({ userId: u.id }); setGuestMode(false); await DB.refresh(); wrappedRender();
          }
        } catch (err: any) {
          (document.getElementById('regMsg') as HTMLElement).textContent = 'Registration failed: ' + (err.message || err);
        }
      })();
    }
    proceed();
  });

  document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (document.getElementById('loginEmail') as HTMLInputElement).value.trim();
    const pass = (document.getElementById('loginPass') as HTMLInputElement).value;
    if (!email || !pass) return;
    (document.getElementById('loginMsg') as HTMLElement).textContent = 'Logging in...';
    try {
      clearSession();
      if (DB.isRemote && DB.supabase && DB.supabase.auth && DB.supabase.auth.signOut) { try { await DB.supabase.auth.signOut(); } catch { } }
      let u: any;
      if (DB.isRemote && DB.supabase) {
        const { data, error } = await DB.supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        const userObj = data.session?.user || data.user; const isConfirmed = userObj?.confirmed_at || userObj?.confirmed || userObj?.email_confirmed_at;
        if (!isConfirmed) { (document.getElementById('loginMsg') as HTMLElement).innerHTML = 'You must confirm your email before logging in. Please check your inbox.'; return; }
        setGuestMode(false); await DB.refresh(); wrappedRender();
      } else {
        u = await DB.loginUser(email, pass); if (!u) throw new Error('Invalid credentials');
        setSession({ userId: u.id }); setGuestMode(false); await DB.refresh(); wrappedRender();
      }
    } catch (err: any) {
      (document.getElementById('loginMsg') as HTMLElement).textContent = 'Login failed: ' + (err.message || err);
    }
  });

  showLoginForm();
}
