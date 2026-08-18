// El cursor de la máquina: una marca de registro que sigue al puntero con
// lag (spring), gira con el envión del scroll y expone sus coordenadas en
// mono. Sobre links/botones se enrojece y se cierra. Solo en punteros finos.
import gsap from 'gsap';
import { scrollLean } from '../core/scroll.js';

export function initCursor(ctx) {
  if (ctx.tier === 'static' || ctx.coarse || !matchMedia('(pointer: fine)').matches) return;
  const el = document.createElement('div');
  el.id = 'cursor';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML =
    '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="13" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M20 2v9M20 29v9M2 20h9M29 20h9" stroke="currentColor" stroke-width="1.4"/><circle cx="20" cy="20" r="1.6" fill="currentColor"/></svg>' +
    '<span class="cur-txt mono"></span>';
  document.body.appendChild(el);
  document.documentElement.classList.add('has-cursor');
  const txt = el.querySelector('.cur-txt');
  let tx = -100;
  let ty = -100;
  let x = -100;
  let y = -100;
  let hot = false;
  let down = false;
  let seen = false;
  window.addEventListener('pointermove', (e) => {
    tx = e.clientX;
    ty = e.clientY;
    if (!seen) {
      seen = true;
      x = tx;
      y = ty;
      el.style.opacity = '1';
    }
    const t = e.target.closest?.('a, button, [data-hot]');
    hot = !!t;
    el.classList.toggle('is-hot', hot);
  });
  window.addEventListener('pointerdown', () => {
    down = true;
    el.classList.add('is-down');
  });
  window.addEventListener('pointerup', () => {
    down = false;
    el.classList.remove('is-down');
  });
  document.addEventListener('mouseleave', () => (el.style.opacity = '0'));
  document.addEventListener('mouseenter', () => (el.style.opacity = '1'));
  let rot = 0;
  let lastTxt = '';
  gsap.ticker.add(() => {
    x += (tx - x) * 0.22;
    y += (ty - y) * 0.22;
    rot += scrollLean() * 4 + 0.15;
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${rot.toFixed(1)}deg) scale(${hot ? 0.7 : down ? 0.85 : 1})`;
    const t = `x ${String(Math.round(tx)).padStart(4, '0')} · y ${String(Math.round(ty)).padStart(4, '0')}`;
    if (t !== lastTxt) {
      lastTxt = t;
      txt.textContent = t;
    }
    txt.style.transform = `rotate(${(-rot).toFixed(1)}deg)`;
  });
  void down;
}
