// Central shared ticker to reduce duplicate timers across modules
// Exposes: subscribe(fn) -> unsubscribe
const subs = new Set();
let running = false;
let intervalId = null;
const tickMs = 1000; // update every second

function start() {
  if (running) return;
  running = true;
  intervalId = setInterval(() => {
    const now = Date.now();
    subs.forEach(fn => {
      try { fn(now); } catch (e) { /* swallow */ }
    });
  }, tickMs);
}

function stop() {
  if (!running) return;
  running = false;
  clearInterval(intervalId);
  intervalId = null;
}

export function subscribe(fn) {
  subs.add(fn);
  // start on first subscriber
  if (!running) start();
  return () => { subs.delete(fn); if (subs.size === 0) stop(); };
}

export function now() { return Date.now(); }

export default { subscribe, now };
