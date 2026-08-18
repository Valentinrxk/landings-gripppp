// Plantilla → marca: la racleta cruza el cuadro con el scroll. Tres zonas:
// a la izquierda la landing impresa; pegada a la racleta una franja de tinta
// fresca (la misma landing todavía en matriz de glifos, desregistrada); a la
// derecha la plantilla genérica dibujada en código. Nunca borra del todo:
// las dos mitades quedan para comparar. El rótulo expone el clip-path real.
import gsap from 'gsap';
import { ScrollTrigger, scrollLean } from '../core/scroll.js';
import { createPrinter, loadImage } from '../print/ascii.js';
import { bus } from '../core/bus.js';

export function initAntes(ctx) {
  const sec = document.querySelector('.s-antes');
  if (!sec) return;
  const frame = sec.querySelector('.ad-frame');
  const print = sec.querySelector('.ad-print');
  const racleta = sec.querySelector('.ad-racleta');
  const dbg = sec.querySelector('[data-dbg="ad"]');
  if (ctx.tier === 'static') {
    print.style.clipPath = 'inset(0 50% 0 0)';
    racleta.style.left = '50%';
    return;
  }
  // franja de tinta fresca: canvas con la impresora
  const canvas = document.createElement('canvas');
  canvas.className = 'ad-wet';
  canvas.setAttribute('aria-hidden', 'true');
  frame.insertBefore(canvas, racleta);
  const w = frame.clientWidth || 1000;
  const printer = createPrinter(canvas, {
    cellMax: Math.max(10, Math.round(w / 60)),
    cellMin: Math.max(6, Math.round(w / 120)),
    inks: ['#f0403c', '#5fa8e0', '#111111'],
    ramp: 0.9,
  });
  let ready = false;
  let last = -1;
  loadImage(print).then((ok) => {
    if (!ok) return;
    printer.setSource(print);
    printer.resize();
    ready = true;
    last = -1;
  });
  bus.on('resize', () => {
    if (!ready) return;
    printer.resize();
    last = -1;
  });

  const st = ScrollTrigger.create({ trigger: sec, start: 'top top', end: 'bottom bottom' });
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const BAND = 14; // % de ancho de la franja fresca
  gsap.ticker.add(() => {
    const p = st.progress;
    const lean = Math.abs(scrollLean());
    if (p === last && lean < 0.02) return;
    last = p;
    const t = easeInOut(Math.max(0, Math.min(1, (p - 0.1) / 0.72)));
    const pct = 6 + t * 82; // la racleta va del 6% al 88%
    const dry = Math.max(0, pct - BAND); // hasta acá está seca (impresa)
    print.style.clipPath = `inset(0 ${(100 - dry).toFixed(2)}% 0 0)`;
    canvas.style.clipPath = `inset(0 ${(100 - pct).toFixed(2)}% 0 ${dry.toFixed(2)}%)`;
    racleta.style.left = `${pct.toFixed(2)}%`;
    if (ready) printer.draw(0.42 - Math.min(0.3, lean * 0.6)); // en movimiento se desregistra
    if (dbg) dbg.textContent = `clip-path: inset(0 ${(100 - dry).toFixed(1)}% 0 0) · racleta: ${pct.toFixed(0)}%`;
  });
}
