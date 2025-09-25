import { queueNext, queuePrev } from '../features/queue';
// Simple harness to simulate provider ended events in the browser console
// Usage from devtools console (after app loaded):
// window.__QA.harness.endCurrent();
// window.__QA.harness.next();

declare global {
  interface Window { __QA?: any; }
}

export function installHarness(state: any, DB: any) {
  window.__QA = window.__QA || {};
  window.__QA.harness = {
    endCurrent: () => {
      try { queueNext(true, state, DB); console.log('Simulated end -> queueNext'); } catch (e) { console.warn(e); }
    },
    next: () => { try { queueNext(false, state, DB); console.log('Simulated manual next -> queueNext'); } catch (e) { console.warn(e); } },
    prev: () => { try { queuePrev(state, DB); console.log('Simulated prev -> queuePrev'); } catch (e) { console.warn(e); } }
  };
}

export default installHarness;
