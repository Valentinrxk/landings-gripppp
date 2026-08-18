import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export let lenis = null;

// velocidad REAL medida de scrollY (px por tick de 60fps): funciona igual con
// rueda, trackpad y dedo. lenis.velocity queda en 0 con touch nativo — por eso
// en el celu no goteaba ni se sacudían los stickers.
let vel = 0;
let lastY = 0;
let lastT = 0;

export function initScroll(ctx) {
  if (ctx.tier === 'static') return null;
  // touch queda nativo (default de lenis); solo suaviza rueda/trackpad
  lenis = new Lenis({ autoRaf: false });
  lenis.on('scroll', ScrollTrigger.update);
  ScrollTrigger.config({ ignoreMobileResize: true });

  lastY = window.scrollY;
  gsap.ticker.add((t) => {
    const dt = Math.max(t - lastT, 1 / 240);
    lastT = t;
    const y = window.scrollY;
    // normalizada a px/frame de 60fps, con un poco de suavizado
    const raw = (y - lastY) / dt / 60;
    lastY = y;
    vel += (raw - vel) * 0.5;
  });
  return lenis;
}

// px/frame aprox — la señal oculta que alimenta gotas, fuerzas y desregistro
export function scrollVelocity() {
  return vel;
}

export { gsap, ScrollTrigger };
