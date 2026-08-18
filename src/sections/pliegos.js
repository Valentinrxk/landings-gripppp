// Pliegos: cinta horizontal arrastrada por el scroll vertical (viewport sticky).
// Cada pliego se IMPRIME cuando se acerca al centro de la pantalla — pero el
// registro solo se logra al frenar: mientras la cinta corre, la tinta vuelve
// a ruido plateado (la máquina no registra en movimiento). El envión inclina
// la cinta entera (skew con spring). Progreso leído del ScrollTrigger cada
// tick, nunca cacheado: un flick que atraviese la sección la deja impresa.
import gsap from 'gsap';
import { ScrollTrigger, scrollLean, lenis } from '../core/scroll.js';
import { bus } from '../core/bus.js';
import { createPrinter, loadImage } from '../print/ascii.js';

export function initPliegos(ctx) {
  const sec = document.querySelector('.s-pliegos');
  const track = sec.querySelector('.pl-track');
  const arts = [...sec.querySelectorAll('.pliego')];
  if (ctx.tier === 'static') return;
  sec.classList.add('is-live');

  let maxShift = 0;
  const measure = () => {
    maxShift = Math.max(0, track.scrollWidth - window.innerWidth);
  };
  measure();
  bus.on('resize', measure);
  document.fonts?.ready.then(measure);
  setTimeout(measure, 600);

  const st = ScrollTrigger.create({ trigger: sec, start: 'top top', end: 'bottom bottom' });
  // rótulo de la máquina: el transform real de la cinta
  const dbg = document.createElement('span');
  dbg.className = 'pl-dbg mono';
  dbg.setAttribute('aria-hidden', 'true');
  sec.querySelector('.pl-viewport').appendChild(dbg);
  const START = 0.04; // la cinta arranca a moverse un poco después de pegarse
  const END = 0.9; // y llega al cierre con una pantalla de sobra: tiempo de lectura

  // impresoras: una por pliego
  const units = arts.map((art) => {
    const canvas = art.querySelector('.pl-ascii');
    const img = art.querySelector('.pl-real');
    const racleta = art.querySelector('.pl-racleta');
    const stamp = art.querySelector('.pl-stamp');
    const w = canvas.clientWidth || 900;
    const printer = createPrinter(canvas, {
      cellMax: Math.max(10, Math.round(w / 40)),
      cellMin: Math.max(5, Math.round(w / (ctx.tier === 'lite' ? 110 : 140))),
      inks: ['#f0403c', '#5fa8e0', '#111111'],
      ramp: 0.9,
    });
    const u = { art, canvas, img, racleta, stamp, printer, ready: false, lastKey: '', wasFull: false };
    img.style.clipPath = 'inset(0 100% 0 0)';
    stamp.style.visibility = 'hidden';
    loadImage(img).then((ok) => {
      if (!ok) {
        img.style.clipPath = '';
        return;
      }
      printer.setSource(img);
      printer.resize();
      u.ready = true;
      u.lastKey = '';
    });
    return u;
  });

  const apply = (u, p, moving) => {
    if (!u.ready) return;
    const stt = u.printer.draw(p);
    if (!stt) return;
    const sweep = stt.sweep;
    if (sweep < 0) {
      u.img.style.clipPath = 'inset(0 100% 0 0)';
      u.racleta.style.visibility = 'hidden';
    } else {
      const pct = Math.round(sweep * 100);
      u.img.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
      u.racleta.style.left = `${pct}%`;
      u.racleta.style.visibility = pct >= 100 ? 'hidden' : 'visible';
    }
    const full = p >= 0.999 && !moving;
    u.stamp.style.visibility = full ? 'visible' : 'hidden';
    u.wasFull = full;
  };

  let skew = 0;
  let lastX = null;
  const tick = () => {
    const p = st.progress;
    const t = Math.max(0, Math.min(1, (p - START) / (END - START)));
    const x = -t * maxShift;
    const lean = scrollLean();
    // la cinta se inclina con el envión y se endereza sola
    skew += (-lean * 5 - skew) * 0.14;
    if (lastX !== x || Math.abs(skew) > 0.02) {
      track.style.transform = `translate3d(${x.toFixed(1)}px,0,0) skewX(${skew.toFixed(2)}deg)`;
      dbg.textContent = `transform: translateX(${x.toFixed(0)}px) skewX(${skew.toFixed(2)}deg)`;
      lastX = x;
    }
    // registro: cerca del centro y quieto. En movimiento, la tinta se pierde.
    const vw = window.innerWidth;
    const moving = Math.abs(lean) > 0.08;
    const noise = Math.min(0.85, Math.abs(lean) * 1.6);
    for (const u of units) {
      const r = u.canvas.getBoundingClientRect();
      if (r.right < -vw * 0.3 || r.left > vw * 1.3) continue; // fuera: no gastar
      const cx = r.left + r.width / 2;
      // 0 lejos a la derecha → 1 al llegar al centro (y se queda impreso a la izquierda)
      const dist = (cx - vw / 2) / (vw * 0.55) - 0.15; // registra un poco antes del centro
      const base = Math.max(0, Math.min(1, 1 - dist));
      const pe = base * (1 - noise);
      apply(u, pe, moving);
    }
  };
  gsap.ticker.add(tick);

  bus.on('resize', () => {
    for (const u of units) {
      if (!u.ready) continue;
      u.printer.resize();
    }
    lastX = null;
  });

  // teclado: el transform no es scrolleable → al enfocar una pieza llevamos
  // el scroll vertical al punto que la encuadra (misma idea del portfolio)
  arts.forEach((art) => {
    art.querySelectorAll('a').forEach((a) =>
      a.addEventListener('focus', () => {
        if (!maxShift) return;
        const shift =
          art.getBoundingClientRect().left - track.getBoundingClientRect().left + art.offsetWidth / 2 - window.innerWidth / 2;
        const t = Math.max(0, Math.min(1, shift / maxShift));
        const y = st.start + (START + t * (END - START)) * (st.end - st.start);
        if (lenis) lenis.scrollTo(y, { immediate: true });
        else window.scrollTo(0, y);
      })
    );
  });
}
