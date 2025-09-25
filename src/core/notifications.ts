// In-app notification facility (simple persistent list + subscribers)
const NOTIF_KEY = 'tunedin.notifications';

type NotifType = 'success' | 'error' | 'info';
type Notif = { id: number; message: string; type: NotifType; expires?: number };

function loadPersisted(): Notif[] {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Notif[];
    const now = Date.now();
    return arr.filter(n => !n.expires || n.expires > now);
  } catch {
    return [];
  }
}

const notifications = {
  list: loadPersisted() as Notif[],
  add(message: string, type: NotifType = 'info', timeout = 4000) {
    const id = Date.now() + Math.floor(Math.random() * 10000);
    let expires: number | undefined;
    if (timeout > 0) expires = Date.now() + timeout;
    this.list.push({ id, message, type, expires });
    this._persist();
    this._notifyChange();
    if (timeout > 0) {
      setTimeout(() => this.remove(id), timeout);
    }
    return id;
  },
  remove(id: number) {
    this.list = this.list.filter(n => n.id !== id);
    this._persist();
    this._notifyChange();
  },
  clear() {
    this.list = [];
    this._persist();
    this._notifyChange();
  },
  _listeners: [] as Array<(list: Notif[]) => void>,
  subscribe(fn: (list: Notif[]) => void) {
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

export type { Notif };
export default notifications;
