export function runIdle(fn: () => void, { timeout = 1000, fallbackDelay = 50 }: { timeout?: number; fallbackDelay?: number } = {}) {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    try {
      (window as any).requestIdleCallback(() => { try { fn(); } catch {} }, { timeout });
      return;
    } catch {
      // fallthrough
    }
  }
  setTimeout(() => { try { fn(); } catch {} }, fallbackDelay);
}
