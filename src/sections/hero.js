// Hero: la palabra "landings" arranca DESPLEGADA sobre la mesa (una letra por
// columna) y la racleta la imprime letra a letra. El scroll la JUNTA hasta
// formar la palabra mientras sube el claim; un rótulo mono expone el valor real
// del despliegue. El h1 real está debajo (SEO/a11y); el canvas dibuja la matriz.
import gsap from 'gsap';
import { bus } from '../core/bus.js';
import { ScrollTrigger, scrollLean } from '../core/scroll.js';
import { createPrinter } from '../print/ascii.js';
import { clock } from '../core/frameClock.js';

export function initHero(ctx) {
  const sec = document.querySelector('.s-hero');
  const wrap = sec.querySelector('.hero-title-wrap');
  const h1 = sec.querySelector('.hero-title');
  const spans = [...h1.querySelectorAll('span')];
  const canvas = sec.querySelector('.hero-print');
  const low = sec.querySelector('.hero-low');
  const ficha = sec.querySelector('.hero-ficha');
  const kicker = sec.querySelector('.kicker');
  const dbg = sec.querySelector('[data-dbg="hero"]');
  const racleta = document.createElement('span');
  racleta.className = 'hero-racleta';
  racleta.setAttribute('aria-hidden', 'true');
  wrap.appendChild(racleta);

  if (ctx.tier === 'static') {
    // quieto: la palabra junta y el claim visible (composición final)
    h1.style.justifyContent = 'flex-start';
    return;
  }

  // ── despliegue: el h1 es flex space-between → el layout YA es el
  // desplegado. La palabra junta se logra trasladando cada letra al centro.
  let offs = [];
  let spread = 1; // 1 = desplegado, 0 = palabra
  const measure = () => {
    const W = h1.getBoundingClientRect().width;
    const ws = spans.map((s) => s.getBoundingClientRect().width);
    const word = ws.reduce((a, b) => a + b, 0);
    let x = (W - word) / 2;
    offs = spans.map((s, i) => {
      const target = x;
      x += ws[i];
      return target - s.offsetLeft;
    });
  };
  const applySpread = () => {
    spans.forEach((s, i) => {
      s.style.transform = `translate3d(${(offs[i] * (1 - spread)).toFixed(1)}px,0,0)`;
    });
  };
  const layout = () => {
    spans.forEach((s) => (s.style.transform = ''));
    measure();
    applySpread();
  };
  layout();
  bus.on('resize', layout);
  document.fonts?.ready.then(layout);

  // ── impresora sobre el h1 ──
  const printer = createPrinter(canvas, {
    cellMax: 30,
    cellMin: 9,
    paper: getComputedStyle(document.documentElement).getPropertyValue('--papel').trim() || '#f4f1ea',
    inks: ['#f0403c', '#5fa8e0', '#111111'],
  });
  const c2d = canvas.getContext('2d');
  const src = document.createElement('canvas');
  const PAD = 28;
  function buildSource() {
    const r = wrap.getBoundingClientRect();
    const cs = getComputedStyle(h1);
    src.width = Math.max(2, Math.round(r.width));
    src.height = Math.max(2, Math.round(r.height + PAD * 2));
    const g = src.getContext('2d');
    g.clearRect(0, 0, src.width, src.height);
    g.fillStyle = '#111';
    g.textBaseline = 'alphabetic';
    g.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    g.letterSpacing = cs.letterSpacing;
    spans.forEach((s) => {
      const sr = s.getBoundingClientRect();
      const m = g.measureText(s.textContent);
      const asc = m.fontBoundingBoxAscent || parseFloat(cs.fontSize) * 0.9;
      const desc = m.fontBoundingBoxDescent || parseFloat(cs.fontSize) * 0.22;
      const lh = parseFloat(cs.lineHeight) || sr.height;
      const y = sr.top - r.top + (lh - (asc + desc)) / 2 + asc + PAD;
      g.fillText(s.textContent, sr.left - r.left, y);
    });
    printer.setSource(src);
    printer.resize();
  }

  const N = 18;
  let pose = -1;
  let started = false;
  let revealAt = -1;
  const commit = () => {
    buildSource(); // las letras pueden estar moviéndose: fuente viva
    const st = printer.draw(pose / N);
    if (!st) return;
    const W = printer.width;
    const H = canvas.getBoundingClientRect().height;
    if (st.sweep >= 0) {
      const x = Math.round(st.sweep * (W + 40)) - 20;
      c2d.clearRect(0, 0, Math.max(0, x), H);
      racleta.style.transform = `translateX(${Math.max(-40, Math.min(W, x))}px)`;
      racleta.style.visibility = 'visible';
    } else racleta.style.visibility = 'hidden';
  };
  const finish = () => {
    pose = -1;
    canvas.style.visibility = 'hidden';
    racleta.style.visibility = 'hidden';
  };
  const print = () => {
    if (pose >= 0) return;
    canvas.style.visibility = 'visible';
    pose = 0;
  };
  kicker.classList.add('is-off');
  ficha?.classList.add('is-off');
  bus.on('frame', (f) => {
    if (pose >= 0) {
      commit();
      pose++;
      if (pose > N) finish();
    }
    if (revealAt >= 0) {
      const k = f - revealAt;
      if (k >= 8) kicker.classList.remove('is-off');
      if (k >= 12) ficha?.classList.remove('is-off');
      if (k > 14) revealAt = -1;
    }
  });
  const start = () => {
    if (started) return;
    started = true;
    const cs = getComputedStyle(h1);
    const load = document.fonts?.load ? document.fonts.load(`${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`) : Promise.resolve();
    load.catch(() => {}).then(() => {
      layout();
      print();
      revealAt = clock.frame;
    });
  };
  bus.on('splash:done', start);
  if (window.__nosplash) start();
  h1.addEventListener('click', print);

  // ── scrub: el scroll junta la palabra y sube el claim ──
  const st = ScrollTrigger.create({ trigger: sec, start: 'top top', end: 'bottom bottom' });
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  let skew = 0;
  let lastP = -1;
  gsap.ticker.add(() => {
    const p = st.progress;
    const lean = scrollLean();
    skew += (-lean * 5 - skew) * 0.14;
    if (p === lastP && Math.abs(skew) < 0.02) return;
    lastP = p;
    spread = 1 - easeInOut(Math.min(1, p / 0.7));
    applySpread();
    wrap.style.transform = `skewX(${skew.toFixed(2)}deg)`;
    const c = Math.max(0, Math.min(1, (p - 0.2) / 0.35));
    low.style.opacity = String(c);
    low.style.transform = `translate3d(0, ${((1 - c) * 24).toFixed(1)}px, 0)`;
    low.style.clipPath = `inset(0 ${((1 - c) * 100).toFixed(1)}% 0 0)`;
    if (dbg && offs.length) {
      const gap = Math.abs(offs[0] * spread);
      dbg.textContent = `letter-spacing: ${((gap / window.innerWidth) * 100).toFixed(2)}vw · registro: ${(1 - spread).toFixed(2)}`;
    }
  });
  low.style.opacity = '0';
  ScrollTrigger.create({ trigger: sec, start: 'top -20%', onEnterBack: () => started && print() });
}
