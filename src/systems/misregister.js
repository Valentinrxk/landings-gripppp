// Desregistro serigráfico: clones rojo/celeste en pseudo-elementos, offset
// proporcional a la velocidad del scroll (cuantizado a px enteros por tick).
// En reposo queda ±1px: la imprenta nunca registra perfecto.
import { bus } from '../core/bus.js';
import { scrollVelocity } from '../core/scroll.js';

export function initMisregister(ctx) {
  const sync = () =>
    document.querySelectorAll('[data-misregister]').forEach((el) => {
      el.dataset.text = el.textContent;
    });
  sync();
  bus.on('i18n:changed', sync); // los clones serigráficos siguen al idioma
  if (ctx.tier === 'static') return;
  const root = document.documentElement.style;
  bus.on('frame', () => {
    const v = scrollVelocity();
    let x = Math.max(-8, Math.min(8, Math.round(v / 6)));
    if (x === 0) x = 1;
    root.setProperty('--mis-x', `${x}px`);
    root.setProperty('--mis-y', `${Math.round(-x * 0.6)}px`);
  });
}
