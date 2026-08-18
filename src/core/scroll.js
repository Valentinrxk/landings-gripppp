import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { Observer } from 'gsap/Observer';
import { Flip } from 'gsap/Flip';
import Lenis from 'lenis';

// un solo registro para todo el sitio (todos los plugins son libres en 3.13+)
gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, DrawSVGPlugin, Observer, Flip);

export let lenis = null;

// velocidad REAL medida de scrollY (px por tick de 60fps): funciona igual con
// rueda, trackpad y dedo. lenis.velocity queda en 0 con touch nativo — por eso
// en el celu no goteaba ni se sacudían los stickers.
let vel = 0;
let lean = 0;
let lastY = 0;
let lastT = 0;

export function initScroll(ctx) {
  if (ctx.tier === 'static') return null;
  // touch queda nativo (default de lenis); solo suaviza rueda/trackpad
  // inercia larga con salida exponencial: el scroll se siente físico (mismo
  // carril que el portfolio de la máquina); touch queda nativo
  lenis = new Lenis({
    autoRaf: false,
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  });
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
    // envión suavizado (spring barato): inclina piezas y degrada el registro
    const target = Math.max(-1, Math.min(1, vel / 45));
    lean += (target - lean) * 0.2;
  });
  return lenis;
}

// px/frame aprox — la señal oculta que alimenta gotas, fuerzas y desregistro
export function scrollVelocity() {
  return vel;
}

// −1..1 suavizado: el "peso" del scroll. Cero al frenar.
export function scrollLean() {
  return lean;
}

export { gsap, ScrollTrigger, SplitText, Observer, Flip };
