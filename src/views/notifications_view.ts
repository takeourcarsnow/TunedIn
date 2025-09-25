import notifications from '../core/notifications';
import { runIdle } from '../core/idle';

const containerId = 'notifications-popup-container';

const notificationsView = {
  container: null as HTMLDivElement | null,
  currentTimeout: null as number | null,
  init() {
    if (document.getElementById(containerId)) return;
    this.container = document.createElement('div');
    this.container.id = containerId;
    Object.assign(this.container.style, {
      position: 'fixed',
      top: '0',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '9999',
      width: '100%',
      maxWidth: '400px',
      pointerEvents: 'none',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      background: 'none',
      border: 'none',
      boxShadow: 'none',
      transition: 'none'
    } as Partial<CSSStyleDeclaration>);
    document.body.appendChild(this.container);
    notifications.subscribe(this.render.bind(this));
    this.render(notifications.list);
  },
  render(list: any[]) {
    if (!this.container) return;
    this.container.innerHTML = '';
    if (!list.length) return;
    const NOTIF_SEEN_KEY = 'tunedin.notifications.lastSeen';
    let lastSeen = +(localStorage.getItem(NOTIF_SEEN_KEY) || 0);
    const unseen = list.filter(n => n.id > lastSeen);
    if (!unseen.length) return;
    const maxId = Math.max(...unseen.map(n => n.id));
    if (maxId > lastSeen) {
      localStorage.setItem(NOTIF_SEEN_KEY, String(maxId));
      lastSeen = maxId;
    }
    unseen.forEach(n => {
      const el = document.createElement('div');
      el.textContent = n.message;
      el.className = `notification-popup ${n.type}`;
      Object.assign(el.style, {
        pointerEvents: 'auto',
        minWidth: '180px',
        maxWidth: '360px',
        margin: '0 auto',
        marginTop: '16px',
        padding: '12px 24px',
        borderRadius: '8px',
        background: n.type === 'success' ? '#4caf50' : n.type === 'error' ? '#f44336' : '#222e3a',
        color: '#fff',
        fontWeight: '500',
        fontSize: '1.08em',
        boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
        opacity: '0',
        transform: 'translateY(-32px)',
        transition: 'opacity 0.3s cubic-bezier(.4,0,.2,1), transform 0.3s cubic-bezier(.4,0,.2,1)',
        textAlign: 'center'
      } as Partial<CSSStyleDeclaration>);
      runIdle(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, { timeout: 500, fallbackDelay: 20 });
      el.onclick = () => notifications.remove(n.id);
      this.container!.appendChild(el);
    });
    if (this.currentTimeout) window.clearTimeout(this.currentTimeout);
    this.currentTimeout = null;
  }
};

export default notificationsView;
