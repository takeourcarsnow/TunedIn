// Animated rotating prompts for auth screens
import { PROMPTS } from '../core/constants.js';
const loginPrompts = PROMPTS;

function rand(min, max) { return min + Math.random() * (max - min); }

function measureTextWidth(text, el) {
  const cs = getComputedStyle(el);
  const probe = document.createElement('span');
  probe.textContent = text;
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.whiteSpace = 'nowrap';
  probe.style.font = cs.font;             // font-style variant weight size/line-height family
  probe.style.letterSpacing = cs.letterSpacing;
  document.body.appendChild(probe);
  const w = probe.offsetWidth;
  document.body.removeChild(probe);
  return w || 0;
}

function computeScaleToFit(text, el) {
  // Use the prompt's parent width (the .title container) as the target width.
  const parent = el.parentElement || el;
  const containerWidth = parent.clientWidth || 0;
  if (!containerWidth) return 1;

  // Measure full text at the base (computed) font-size.
  const basePx = parseFloat(getComputedStyle(el).fontSize) || 14;
  // Temporarily ensure we measure at base size (clear any inline scaling)
  const prevInline = el.style.fontSize;
  el.style.fontSize = basePx + 'px';

  const textWidth = measureTextWidth(text, el);
  // Restore any previous inline font-size before we apply the final one below.
  el.style.fontSize = prevInline || '';

  if (!textWidth) return 1;

  // Scale down as needed so the full text fits on one line. No min cap = always fits.
  const scale = Math.min(1, containerWidth / textWidth);
  return { scale, basePx };
}

// Generic prompt animator. Pass an element or element id.
// Returns a stop() function.
export function startPromptAnimation(target, options = {}) {
  const el = typeof target === 'string' ? document.getElementById(target) : target;
  if (!el) return () => {};

  const prompts = options.prompts || loginPrompts;

  // Timing
  const typeMin = options.typeMin ?? 28;
  const typeMax = options.typeMax ?? 60;
  const eraseMin = options.eraseMin ?? 16;
  const eraseMax = options.eraseMax ?? 40;
  const holdMs = options.holdMs ?? 1200;
  const pauseBetween = options.pauseBetween ?? 300;

  // State
  let idx = Math.floor(Math.random() * prompts.length);
  let char = 0;
  let erase = false;
  let timer = null;
  let stopped = false;

  // Single-line guarantees
  el.style.whiteSpace = 'nowrap';
  el.style.overflow = 'hidden';
  el.style.textOverflow = 'clip';

  // Precompute and apply scale for a given prompt (once per cycle)
  let basePx = parseFloat(getComputedStyle(el).fontSize) || 14;
  let currentPrompt = prompts[idx];
  let currentScale = 1;

  function applyScaleForCurrentPrompt() {
    const res = computeScaleToFit(currentPrompt, el);
    if (typeof res === 'object' && res !== null) {
      currentScale = res.scale ?? 1;
      basePx = res.basePx ?? basePx;
    } else {
      currentScale = res || 1;
    }
    el.style.fontSize = (basePx * currentScale).toFixed(2) + 'px';
  }

  function nextPrompt() {
    idx = (idx + 1) % prompts.length;
    currentPrompt = prompts[idx];
    char = 0;
    erase = false;
    applyScaleForCurrentPrompt();
  }

  // Resize handler: keep it one-line if viewport changes
  const onResize = () => applyScaleForCurrentPrompt();
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  // Initial scale for first prompt
  applyScaleForCurrentPrompt();

  function tick() {
    if (stopped) return;

    const text = currentPrompt;

    if (!erase) {
      char++;
      el.textContent = text.slice(0, char);
      if (char < text.length) {
        timer = setTimeout(tick, rand(typeMin, typeMax));
      } else {
        erase = true;
        timer = setTimeout(tick, holdMs);
      }
    } else {
      char--;
      el.textContent = text.slice(0, char);
      if (char > 0) {
        timer = setTimeout(tick, rand(eraseMin, eraseMax));
      } else {
        nextPrompt();
        timer = setTimeout(tick, pauseBetween);
      }
    }
  }

  tick();

  return () => {
    stopped = true;
    clearTimeout(timer);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    el.style.fontSize = ''; // reset to stylesheet value for next time
  };
}

/* Backward-compat shims for existing calls */
let currentStopper = null;

export function startLoginPromptAnimation() {
  const el = document.getElementById('loginAnimatedPrompt');
  if (!el) return;
  stopLoginPromptAnimation();
  currentStopper = startPromptAnimation(el);
}

export function stopLoginPromptAnimation() {
  if (currentStopper) {
    currentStopper();
    currentStopper = null;
  }
}