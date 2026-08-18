// Splash: prueba de registro. Sobre la mesa plateada, la marca de registro
// (dos tintas alineándose) se imprime en 12 poses; el contador cuenta la
// calibración. Corto (~1.3s), se saltea con click/tecla y con ?nosplash.
import { bus } from '../core/bus.js';
import { createPrinter } from '../print/ascii.js';
import { spliceFlash } from '../systems/flash.js';

export function shouldSplash(ctx) {
  if (ctx.tier === 'static') return false;
  if (new URLSearchParams(location.search).has('nosplash')) return false;
  return true;
}

export function initSplash(ctx) {
  const el = document.getElementById('splash');
  if (!el) return;
  if (!shouldSplash(ctx)) {
    el.remove();
    window.__nosplash = true;
    return;
  }
  el.classList.add('is-on');
  document.documentElement.classList.add('splashing');
  const canvas = el.querySelector('.splash-canvas');
  const count = el.querySelector('.splash-count');
  const printer = createPrinter(canvas, {
    cellMax: 26,
    cellMin: 9,
    paper: '#cfd0d6',
    inks: ['#f0403c', '#5fa8e0', '#111111'],
  });
  // fuente: marca de registro dibujada en código, centrada en un lienzo con
  // la proporción de la pantalla (así queda del tamaño de una marca, no de un
  // póster)
  const src = document.createElement('canvas');
  const vr = canvas.getBoundingClientRect();
  const SW = Math.max(2, Math.round(vr.width));
  const SH = Math.max(2, Math.round(vr.height));
  src.width = SW;
  src.height = SH;
  const g = src.getContext('2d');
  const R = Math.min(SW, SH) * 0.24;
  const cx = SW / 2;
  const cy = SH / 2;
  const lw = Math.max(10, R * 0.16);
  g.strokeStyle = '#111';
  g.lineWidth = lw;
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = lw * 0.85;
  g.beginPath();
  g.arc(cx, cy, R * 0.36, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = lw * 0.9;
  g.beginPath();
  g.moveTo(cx, cy - R * 1.45);
  g.lineTo(cx, cy - R * 0.55);
  g.moveTo(cx, cy + R * 0.55);
  g.lineTo(cx, cy + R * 1.45);
  g.moveTo(cx - R * 1.45, cy);
  g.lineTo(cx - R * 0.55, cy);
  g.moveTo(cx + R * 0.55, cy);
  g.lineTo(cx + R * 1.45, cy);
  g.stroke();
  printer.setSource(src);
  printer.resize();

  const N = 12;
  let f0 = -1;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    spliceFlash();
    el.remove();
    document.documentElement.classList.remove('splashing');
    bus.emit('splash:done');
  };
  const off = bus.on('frame', (f) => {
    if (done) return;
    if (f0 < 0) f0 = f;
    const k = f - f0;
    const p = Math.min(1, k / N);
    printer.draw(p);
    count.textContent = `registro ${String(Math.min(N, k)).padStart(2, '0')}/${N}`;
    if (k >= N + 3) {
      finish();
      off();
    }
  });
  el.addEventListener('pointerdown', finish);
  window.addEventListener('keydown', finish, { once: true });
}
