// La racleta global: una banda cromada cruza la pantalla de arriba a abajo en
// 7 poses cuando se cambia de estación (frontera de sección). Es el corte
// entre escenas de la imprenta — el ojo ve pasada, no scroll.
import { bus } from '../core/bus.js';
import { ScrollTrigger } from '../core/scroll.js';

let el = null;
let step = -1;
const STEPS = 7;

export function initRacleta(ctx) {
  if (ctx.tier === 'static') return;
  el = document.createElement('div');
  el.className = 'racleta-global';
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
  bus.on('frame', () => {
    if (step < 0) return;
    step++;
    if (step > STEPS) {
      el.style.visibility = 'hidden';
      step = -1;
      return;
    }
    const p = step / STEPS;
    el.style.transform = `translateY(${(-120 + p * 240).toFixed(0)}vh) rotate(-1.2deg)`;
  });
  ['#proceso', '#trabajos', '#specs', '#contacto'].forEach((sel) => {
    const t = document.querySelector(sel);
    if (!t) return;
    ScrollTrigger.create({
      trigger: t,
      start: 'top 62%',
      end: 'bottom 38%',
      onEnter: pass,
      onEnterBack: pass,
    });
  });
}

export function pass() {
  if (!el || step >= 0) return;
  el.style.visibility = 'visible';
  el.style.transform = 'translateY(-120vh) rotate(-1.2deg)';
  step = 0;
}
