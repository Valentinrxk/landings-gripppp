// La regla (abajo) es la navegación: la película entera dibujada como regla
// de imprenta. Cinco nombres de escena en mono a su posición proporcional,
// los ticks ya recorridos se ponen rojos, el cabezal es una marca de registro
// (triángulo) que avanza a saltos de obturador, y el rótulo "02/05 · 034"
// lee la escena actual. Click en un nombre → lenis lleva a la escena; el
// cursor de la máquina dice "ir" sobre cada nombre.
import { ScrollTrigger, lenis } from '../core/scroll.js';
import { bus } from '../core/bus.js';

const NAMES = {
  es: { inicio: 'inicio', proceso: 'proceso', trabajos: 'trabajos', plantilla: 'plantilla', contacto: 'contacto' },
  en: { inicio: 'start', proceso: 'process', trabajos: 'work', plantilla: 'template', contacto: 'contact' },
};
const GO = { es: 'ir', en: 'go' };

export function initRail(ctx) {
  const rail = document.getElementById('rail');
  if (!rail) return;
  const isStatic = ctx.tier === 'static';
  if (!isStatic) document.documentElement.classList.add('no-scrollbar');
  const head = rail.querySelector('.rail-head');
  const done = rail.querySelector('.rail-done');
  const txt = rail.querySelector('.rail-txt');
  const namesEl = rail.querySelector('.rail-names');
  const scenes = [...document.querySelectorAll('main > section')];
  const lang = () => (document.documentElement.lang === 'en' ? 'en' : 'es');

  // ── nombres: un botón por escena, a su posición proporcional ──
  const btns = scenes.map((s) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'rail-name';
    b.dataset.scene = s.id;
    b.addEventListener('click', () => {
      if (lenis) lenis.scrollTo(s, { offset: 0 });
      else s.scrollIntoView();
    });
    namesEl.appendChild(b);
    return b;
  });
  const label = () => {
    const L = lang();
    btns.forEach((b, i) => {
      b.textContent = NAMES[L][scenes[i].id] ?? scenes[i].id;
      b.dataset.cursor = GO[L];
      b.setAttribute('aria-label', b.textContent);
    });
  };
  label();
  bus.on('i18n:changed', label);

  // ── medición: tops de escena y largo total del film (solo al cambiar layout) ──
  let tops = [];
  let docH = 1;
  let maxY = 1;
  let vh = 1;
  let w = 1;
  let last = '';
  const measure = () => {
    vh = window.innerHeight;
    docH = Math.max(1, document.documentElement.scrollHeight);
    maxY = Math.max(1, docH - vh);
    tops = scenes.map((s) => s.offsetTop);
    const gutter = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gutter')) || 72;
    w = window.innerWidth - gutter * 2;
    btns.forEach((b, i) => {
      const p = Math.min(1, tops[i] / maxY);
      b.style.left = `${(p * 100).toFixed(2)}%`;
      b.classList.toggle('is-end', p > 0.85);
    });
    last = '';
  };
  measure();
  ScrollTrigger.addEventListener('refresh', measure);
  bus.on('resize', measure);
  document.fonts?.ready.then(measure);

  // ── el cabezal avanza en el obturador (12 poses/seg), nunca entre cuadros;
  // en reduced-motion sigue al scroll nativo (es navegación, no adorno) ──
  let cur = -1;
  const update = () => {
    const y = window.scrollY;
    let idx = 0;
    for (let i = 0; i < scenes.length; i++) if (y >= tops[i] - 1) idx = i;
    const top = tops[idx];
    const range = idx === scenes.length - 1 ? maxY - top : (tops[idx + 1] ?? docH) - top - vh;
    const p = range < 2 ? 1 : Math.max(0, Math.min(1, (y - top) / range));
    // el cabezal marca el borde superior del viewport sobre el film completo
    const x = Math.max(0, Math.min(1, y / maxY)) * w;
    const key = `${idx}|${Math.round(x)}|${Math.round(p * 100)}`;
    if (key === last) return;
    last = key;
    head.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
    done.style.width = `${x.toFixed(1)}px`;
    txt.textContent = `${String(idx + 1).padStart(2, '0')}/${String(scenes.length).padStart(2, '0')} · ${String(Math.round(p * 100)).padStart(3, '0')}`;
    if (idx !== cur) {
      cur = idx;
      btns.forEach((b, i) => {
        b.classList.toggle('is-cur', i === idx);
        b.classList.toggle('is-past', i < idx);
      });
    }
  };
  if (isStatic) {
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', measure);
    update();
  } else {
    bus.on('frame', update);
  }
}
