import { savePrefs } from './prefs.js';
import { applyAccent } from '../core/utils.js';

export function pickAccent() {
  const colors = ['#8ab4ff','#ff79c6','#7ab6ff','#7bd389','#ffd166','#ff6b6b','#c792ea','#64d2ff','#f4a261','#00e5ff'];
  const palette = document.createElement('div');
  palette.className = 'box';
  palette.style.position='fixed';
  palette.style.right='24px';
  palette.style.top='24px';
  palette.style.zIndex='20001'; // Ensure above overlays
  palette.style.padding='10px 16px 10px 16px';
  palette.style.minWidth='unset';
  palette.style.maxWidth='fit-content';
  palette.style.boxShadow='0 2px 12px #0008';
  palette.innerHTML = `
    <div class="small muted" style="margin-bottom:4px;">choose accent</div>
    <div class="hstack" style="margin-top:0; flex-wrap:wrap; gap:6px;">
      ${colors.map(c=>`<button class="btn" data-color="${c}" style="background:${c}20;border-color:${c}80;color:${c};width:28px;height:28px;min-width:28px;min-height:28px;font-size:18px;padding:0;line-height:1;">●</button>`).join('')}
      <button class="btn btn-ghost" data-close="1" style="margin-left:8px;">[ close ]</button>
    </div>
  `;
  document.body.appendChild(palette);
  palette.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.close) { palette.remove(); return; }
    const c = b.dataset.color;
    savePrefs({ accent: c });
    applyAccent(c);
  });
}