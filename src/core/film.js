// Cuantizador scroll→frames. En desktop el commit ocurre solo en ticks del
// FrameClock (12fps: look de película). En touch (setFilmSmoothing) lo
// scroll-driven se evalúa en CADA frame del ticker: el scroll nativo va pegado
// al dedo y un mundo a 12fps ahí se lee como lag, no como estilo. onFrame
// recibe (fEntero, frames, progresoCrudo): las POSICIONES usan el progreso
// crudo; los BEATS (poses, umbrales) siguen usando el entero.
import gsap from 'gsap';
import { ScrollTrigger } from './scroll.js';
import { bus } from './bus.js';

let SMOOTH = false;
export function setFilmSmoothing(v) {
  SMOOTH = !!v;
}

export function sequence({
  trigger,
  start = 'top bottom',
  end = 'bottom top',
  frames,
  onFrame,
  onToggle,
}) {
  let last = -1;
  let lastP = -1;

  const st = ScrollTrigger.create({
    trigger,
    start,
    end,
    onToggle(self) {
      onToggle?.(self.isActive, self.direction);
    },
  });

  const evalNow = () => {
    const p = st.progress;
    const f = Math.round(p * frames);
    if (f !== last || (SMOOTH && Math.abs(p - lastP) > 0.0008)) {
      last = f;
      lastP = p;
      onFrame(f, frames, p);
    }
  };

  const off = bus.on('frame', evalNow);
  let tickerFn = null;
  if (SMOOTH) {
    tickerFn = evalNow;
    gsap.ticker.add(tickerFn);
  }

  return {
    st,
    kill() {
      off();
      if (tickerFn) gsap.ticker.remove(tickerFn);
      st.kill();
    },
  };
}
