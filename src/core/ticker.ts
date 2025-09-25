// Central shared ticker to reduce duplicate timers across modules
type Sub = (now: number) => void;
const subs = new Set<Sub>();
let running = false;
let intervalId: any = null;
const tickMs = 1000;

function start() {
  if (running) return;
  running = true;
  intervalId = setInterval(() => {
    const now = Date.now();
    subs.forEach(fn => { try { fn(now); } catch {} });
  }, tickMs);
}

function stop() {
  if (!running) return;
  running = false;
  clearInterval(intervalId);
  intervalId = null;
}

export function subscribe(fn: Sub) {
  subs.add(fn);
  if (!running) start();
  return () => { subs.delete(fn); if (subs.size === 0) stop(); };
}

export function now() { return Date.now(); }

export default { subscribe, now };
