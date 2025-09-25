// Core notification logic for in-app notifications
// Usage: notifications.add('Message', 'success'|'error'|'info');


const NOTIF_KEY = 'tunedin.notifications';
function loadPersisted() {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    // Remove expired (timeout=0 means persistent)
    const now = Date.now();
    return arr.filter(n => !n.expires || n.expires > now);
  } catch { return []; }
}

const notifications = {
  list: loadPersisted(),
  add(message, type = 'info', timeout = 4000) {
    const id = Date.now() + Math.random();
    let expires = undefined;
    if (timeout > 0) expires = Date.now() + timeout;
    this.list.push({ id, message, type, expires });
    this._persist();
    this._notifyChange();
    if (timeout > 0) {
      setTimeout(() => this.remove(id), timeout);
    }
    return id;
  },
  remove(id) {
    this.list = this.list.filter(n => n.id !== id);
    this._persist();
    this._notifyChange();
  },
  clear() {
    this.list = [];
    this._persist();
    this._notifyChange();
  },
  _listeners: [],
  subscribe(fn) {
    this._listeners.push(fn);
    return () => {
      this._listeners = this._listeners.filter(l => l !== fn);
    };
  },
  _notifyChange() {
    this._listeners.forEach(fn => fn(this.list));
  },
  _persist() {
    try {
      localStorage.setItem(NOTIF_KEY, JSON.stringify(this.list));
    } catch {}
  }
};

export default notifications;
