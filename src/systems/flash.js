// Flash de empalme (1 cuadro blanco). Seguridad WCAG 2.3.1: el motor impone
// un mínimo de 4 ticks entre flashes — a 12fps eso garantiza ≤3 flashes/seg.
import { bus } from '../core/bus.js';
import { clock } from '../core/frameClock.js';

let el = null;
let lastFlash = -99;
let offAt = -1;

export function initFlash(ctx) {
  if (ctx.tier === 'static' || ctx.reduced) return;
  el = document.createElement('div');
  el.className = 'splice-flash-global';
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
  bus.on('frame', (f) => {
    if (offAt >= 0 && f >= offAt) {
      el.style.visibility = 'hidden';
      offAt = -1;
    }
  });
}

export function spliceFlash() {
  if (!el) return;
  const f = clock.frame;
  if (f - lastFlash < 4) return; // regla dura, no confiar en el azar
  lastFlash = f;
  el.style.visibility = 'visible';
  offAt = f + 1;
}
