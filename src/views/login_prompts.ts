import { PROMPTS } from '../core/constants';

const loginPrompts = PROMPTS;
function rand(min: number, max: number) { return min + Math.random() * (max - min); }

function measureTextWidth(text: string, el: HTMLElement) {
  const cs = getComputedStyle(el);
  const probe = document.createElement('span');
  probe.textContent = text;
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.whiteSpace = 'nowrap';
  // font shorthand may be empty; set family+size for robustness
  probe.style.fontFamily = cs.fontFamily;
  probe.style.fontSize = cs.fontSize;
  probe.style.letterSpacing = cs.letterSpacing as any;
  document.body.appendChild(probe);
  const w = probe.offsetWidth;
  document.body.removeChild(probe);
  return w || 0;
}

function computeScaleToFit(text: string, el: HTMLElement) {
  const parent = el.parentElement || el;
  const containerWidth = parent.clientWidth || 0;
  if (!containerWidth) return 1 as number | { scale: number; basePx: number } as any;
  const basePx = parseFloat(getComputedStyle(el).fontSize) || 14;
  const prevInline = el.style.fontSize;
  el.style.fontSize = basePx + 'px';
  const textWidth = measureTextWidth(text, el);
  el.style.fontSize = prevInline || '';
  if (!textWidth) return 1 as any;
  const scale = Math.min(1, containerWidth / textWidth);
  return { scale, basePx };
}

export function startPromptAnimation(target: string | HTMLElement, options: {
  prompts?: string[];
  typeMin?: number; typeMax?: number;
  eraseMin?: number; eraseMax?: number;
  holdMs?: number; pauseBetween?: number;
} = {}) {
  const el = (typeof target === 'string' ? document.getElementById(target) : target) as HTMLElement | null;
  if (!el) return () => {};
  const prompts = options.prompts || loginPrompts;

  const typeMin = options.typeMin ?? 28;
  const typeMax = options.typeMax ?? 60;
  const eraseMin = options.eraseMin ?? 16;
  const eraseMax = options.eraseMax ?? 40;
  const holdMs = options.holdMs ?? 1200;
  const pauseBetween = options.pauseBetween ?? 300;

  let idx = Math.floor(Math.random() * prompts.length);
  let char = 0;
  let erase = false;
  let timer: any = null;
  let stopped = false;

  el.style.whiteSpace = 'nowrap';
  el.style.overflow = 'hidden';
  el.style.textOverflow = 'clip';

  let basePx = parseFloat(getComputedStyle(el as HTMLElement).fontSize) || 14;
  let currentPrompt = prompts[idx];
  let currentScale = 1;

  function applyScaleForCurrentPrompt() {
  const res = computeScaleToFit(currentPrompt, el as HTMLElement);
    if (typeof res === 'object' && res !== null && 'scale' in res) {
      currentScale = (res as any).scale ?? 1; basePx = (res as any).basePx ?? basePx;
    } else {
      currentScale = (res as any) || 1;
    }
  (el as HTMLElement).style.fontSize = (basePx * currentScale).toFixed(2) + 'px';
  }

  function nextPrompt() {
    idx = (idx + 1) % prompts.length;
    currentPrompt = prompts[idx]; char = 0; erase = false; applyScaleForCurrentPrompt();
  }

  const onResize = () => applyScaleForCurrentPrompt();
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize as any);

  applyScaleForCurrentPrompt();

  function tick() {
    if (stopped) return;
    const text = currentPrompt;
    if (!erase) {
  char++; (el as HTMLElement).textContent = text.slice(0, char);
      if (char < text.length) timer = setTimeout(tick, rand(typeMin, typeMax));
      else { erase = true; timer = setTimeout(tick, holdMs); }
    } else {
  char--; (el as HTMLElement).textContent = text.slice(0, char);
      if (char > 0) timer = setTimeout(tick, rand(eraseMin, eraseMax));
      else { nextPrompt(); timer = setTimeout(tick, pauseBetween); }
    }
  }

  tick();

  return () => {
    stopped = true; clearTimeout(timer);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize as any);
    (el as HTMLElement).style.fontSize = '';
  };
}

let currentStopper: null | (() => void) = null;
export function startLoginPromptAnimation() {
  const el = document.getElementById('loginAnimatedPrompt'); if (!el) return;
  stopLoginPromptAnimation(); currentStopper = startPromptAnimation(el);
}
export function stopLoginPromptAnimation() {
  if (currentStopper) { currentStopper(); currentStopper = null; }
}
