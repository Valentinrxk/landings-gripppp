// Grano de película: 4 tiles de feTurbulence PRE-HORNEADOS como data-URIs
// (regenerar noise por frame está prohibido). Ciclan por tick → grano que titila.
import { bus } from '../core/bus.js';

export function initGrain(ctx) {
  if (ctx.tier === 'static') return;
  const target = document.querySelector('#texture .grain');
  if (!target) return;
  const tiles = [1, 2, 3, 4].map((seed) => {
    const svg =
      `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>` +
      `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='${seed * 7}'/>` +
      `<feColorMatrix type='matrix' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.6 0.6 0.6 0 0'/></filter>` +
      `<rect width='100%' height='100%' filter='url(%23n)'/></svg>`;
    return `url("data:image/svg+xml,${svg.replace(/#/g, '%23').replace(/'/g, '%27')}")`;
  });
  bus.on('frame', (f) => {
    target.style.backgroundImage = tiles[f % 4];
  });
}
