export function runIdle(fn, {timeout=1000, fallbackDelay=50} = {}) {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    try {
      requestIdleCallback(() => { try { fn(); } catch (e) {} }, { timeout });
      return;
    } catch (e) {
      // fallthrough to fallback
    }
  }
  setTimeout(() => { try { fn(); } catch (e) {} }, fallbackDelay);
}
