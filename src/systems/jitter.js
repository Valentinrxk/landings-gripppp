// Jitter global seeded: 4 canales de custom properties escritos 1 vez por tick.
// El frame N SIEMPRE tiembla igual (mulberry32 por índice de cuadro) → look de
// fotogramas impresos, reproducible. Cada ~7s, un "frame slip" de proyector.
import { bus } from '../core/bus.js';
import { frameJit } from '../core/rng.js';

export function initJitter(ctx) {
  if (ctx.tier === 'static') return;
  const root = document.documentElement.style;
  const amps = ctx.tier === 'full' ? [1.5, 1.5, 2.5, 3] : [1, 1, 1.5, 2];
  bus.on('frame', (f) => {
    for (let c = 1; c <= 4; c++) {
      const a = amps[c - 1];
      root.setProperty(`--j${c}x`, `${Math.round(frameJit(f, c * 11) * a)}px`);
      root.setProperty(`--j${c}y`, `${Math.round(frameJit(f, c * 11 + 1) * a)}px`);
      root.setProperty(`--j${c}r`, `${(frameJit(f, c * 11 + 2) * 1.1).toFixed(2)}deg`);
    }
    // gate weave: la película entera se corre 1 cuadro cada ~84 ticks
    root.setProperty('--slip', ctx.tier === 'full' && f % 84 === 0 ? '4px' : '0px');
  });
}
