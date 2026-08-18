// Motor de idle: cuando la persona no hace nada, la máquina respira. Emite
// 'idle:beat' cada 3s de quietud (a partir de 2s sin input). Cada sistema se
// suscribe y hace UNA cosa chica (una letra fantasma, un sello que se re-prensa,
// un giro de la marca de registro).
import { bus } from '../core/bus.js';

let last = performance.now();
const poke = () => (last = performance.now());
export const idleFor = () => (performance.now() - last) / 1000;

export function initIdle(ctx) {
  if (ctx.tier === 'static') return;
  ['pointermove', 'pointerdown', 'wheel', 'touchstart', 'keydown', 'scroll'].forEach((e) =>
    addEventListener(e, poke, { passive: true })
  );
  bus.on('frame', (f) => {
    const s = idleFor();
    if (s > 2 && f % 36 === 0) bus.emit('idle:beat', f, s);
  });
}
