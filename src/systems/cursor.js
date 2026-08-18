// El cursor de la máquina: una marca de registro que sigue al puntero con
// lag, gira con el envión del scroll y se ABRE sobre lo tocable (nunca se
// achica): anillo rojo, escala 1.35 en expo. Click = squash de 1 pose. Dice
// qué hace cada cosa con la voz de la máquina (data-cursor: ver, arrastrá,
// reimprimir, abrir, ir) y, si te quedás quieto 1.5s, expone sus coordenadas.
// mix-blend-mode: difference → se invierte solo sobre grafito. Solo punteros finos.
import { gsap, scrollLean } from '../core/scroll.js';
import { bus } from '../core/bus.js';
import { idleFor } from './idle.js';

const EN = { ver: 'view', arrastrá: 'drag', reimprimir: 'reprint', abrir: 'open', ir: 'go', cambiar: 'switch' };

export function initCursor(ctx) {
  if (ctx.tier === 'static' || ctx.coarse || !matchMedia('(pointer: fine)').matches) return;
  const el = document.createElement('div');
  el.id = 'cursor';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML =
    '<div class="cur-rot"><svg class="cur-ring" viewBox="0 0 40 40"><circle cx="20" cy="20" r="13" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M20 2v9M20 29v9M2 20h9M29 20h9" stroke="currentColor" stroke-width="1.4"/><circle cx="20" cy="20" r="1.6" fill="currentColor"/></svg></div>' +
    '<span class="cur-txt mono"></span>';
  document.body.appendChild(el);
  document.documentElement.classList.add('has-cursor');
  const rotEl = el.querySelector('.cur-rot');
  const txt = el.querySelector('.cur-txt');
  const lang = () => (document.documentElement.lang === 'en' ? 'en' : 'es');

  let tx = -100;
  let ty = -100;
  let x = -100;
  let y = -100;
  let seen = false;
  let label = ''; // lo que dice la máquina sobre el objetivo actual
  let hot = false;

  const read = (target) => {
    const t = target?.closest?.('[data-cursor], a, button, [data-hot]');
    hot = !!t;
    el.classList.toggle('is-hot', hot);
    if (!t) return (label = '');
    let l = t.closest('[data-cursor]')?.dataset.cursor || '';
    if (!l && t.tagName === 'A') {
      const href = t.getAttribute('href') || '';
      l = /^https?:|^mailto:/.test(href) ? 'abrir' : href.startsWith('#') ? 'ir' : '';
    }
    if (l && lang() === 'en') l = EN[l] || l;
    label = l;
  };

  window.addEventListener('pointermove', (e) => {
    tx = e.clientX;
    ty = e.clientY;
    if (!seen) {
      seen = true;
      x = tx;
      y = ty;
      el.style.opacity = '1';
    }
    read(e.target);
  });
  window.addEventListener('pointerdown', () => el.classList.add('is-down'));
  window.addEventListener('pointerup', () => el.classList.remove('is-down'));
  document.addEventListener('mouseleave', () => (el.style.opacity = '0'));
  document.addEventListener('mouseenter', () => (el.style.opacity = '1'));
  bus.on('i18n:changed', () => read(document.elementFromPoint(tx, ty)));

  // posición: sigue al puntero (lo único que puede ser continuo); giro con el envión
  let rot = 0;
  gsap.ticker.add(() => {
    x += (tx - x) * 0.22;
    y += (ty - y) * 0.22;
    rot += scrollLean() * 4 + 0.15;
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    rotEl.style.transform = `rotate(${rot.toFixed(1)}deg)`;
  });

  // la voz: rótulo del objetivo, o coordenadas tras 1.5s de quietud (obturador)
  let lastTxt = null;
  bus.on('frame', () => {
    let t = '';
    if (label) t = label;
    else if (seen && idleFor() > 1.5) t = `x ${String(Math.round(tx)).padStart(4, '0')} · y ${String(Math.round(ty)).padStart(4, '0')}`;
    if (t === lastTxt) return;
    lastTxt = t;
    txt.textContent = t;
    el.classList.toggle('has-txt', !!t);
    el.classList.toggle('is-label', !!label);
  });
}
