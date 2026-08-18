// La regla de registro (reemplaza la barra de scroll): rail derecho con ticks
// mono y un marcador rojo que baja con el progreso, cuantizado a 12fps.
// Arrastrar el marcador (o clickear la regla) mueve el scroll.
import { bus } from '../core/bus.js';
import { lenis } from '../core/scroll.js';

export function initRuler(ctx) {
  const el = document.getElementById('ruler');
  if (!el || ctx.tier === 'static') return;
  document.documentElement.classList.add('no-scrollbar');
  const mark = el.querySelector('.ruler-mark');
  const num = mark.querySelector('span');
  let dragging = false;

  const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const commit = () => {
    const p = Math.min(1, window.scrollY / maxScroll());
    const h = window.innerHeight;
    mark.style.transform = `translateY(${Math.round(p * (h - 28))}px)`;
    num.textContent = String(Math.round(p * 100)).padStart(3, '0');
  };
  bus.on('frame', commit);
  commit();

  const toScroll = (clientY) => {
    const p = Math.max(0, Math.min(1, (clientY - 14) / (window.innerHeight - 28)));
    const y = p * maxScroll();
    if (lenis && !ctx.coarse) lenis.scrollTo(y, { immediate: true });
    else window.scrollTo(0, y);
  };
  el.addEventListener('pointerdown', (e) => {
    dragging = true;
    el.classList.add('dragging');
    el.setPointerCapture(e.pointerId);
    toScroll(e.clientY);
  });
  el.addEventListener('pointermove', (e) => dragging && toScroll(e.clientY));
  const up = () => {
    dragging = false;
    el.classList.remove('dragging');
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
}
