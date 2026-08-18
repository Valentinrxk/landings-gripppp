// Hero: la palabra "landings" se IMPRIME. El h1 real está debajo (SEO/a11y,
// composición final sin JS); encima, un canvas dibuja la misma palabra como
// matriz de glifos plateados y una racleta cromada la cruza en 16 poses dejando
// tinta a su izquierda (se limpia el canvas → aparece el h1). Al volver arriba
// o al clickear el título, se re-imprime.
import { bus } from '../core/bus.js';
import { ScrollTrigger } from '../core/scroll.js';
import { createPrinter } from '../print/ascii.js';
import { clock } from '../core/frameClock.js';

export function initHero(ctx) {
  const sec = document.querySelector('.s-hero');
  const wrap = sec.querySelector('.hero-title-wrap');
  const h1 = sec.querySelector('.hero-title');
  const canvas = sec.querySelector('.hero-print');
  const reveals = [
    sec.querySelector('.kicker'),
    sec.querySelector('.hero-claim'),
    sec.querySelector('.hero-sub'),
    sec.querySelector('.hero-tags'),
  ];
  const racleta = document.createElement('span');
  racleta.className = 'hero-racleta';
  racleta.setAttribute('aria-hidden', 'true');
  wrap.appendChild(racleta);

  if (ctx.tier === 'static') {
    reveals.forEach((el) => el?.classList.add('is-on'));
    return;
  }
  reveals.forEach((el) => el?.classList.add('is-off'));

  const printer = createPrinter(canvas, {
    cellMax: 30,
    cellMin: 9,
    paper: getComputedStyle(document.documentElement).getPropertyValue('--papel').trim() || '#f4f1ea',
    inks: ['#f0403c', '#5fa8e0', '#111111'],
    ramp: 1,
  });
  const c2d = canvas.getContext('2d');
  const PAD = 28; // el canvas sobresale del h1 (descendente de la g)
  const src = document.createElement('canvas');

  // dibuja el h1 en un canvas fuera de pantalla con su misma tipografía
  function buildSource() {
    const r = h1.getBoundingClientRect();
    const cs = getComputedStyle(h1);
    src.width = Math.max(2, Math.round(r.width));
    src.height = Math.max(2, Math.round(r.height + PAD * 2));
    const g = src.getContext('2d');
    g.clearRect(0, 0, src.width, src.height);
    g.fillStyle = '#111';
    g.textBaseline = 'alphabetic';
    g.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    if (cs.fontStretch && cs.fontStretch !== '100%') g.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontStretch} ${cs.fontSize} ${cs.fontFamily}`;
    g.letterSpacing = cs.letterSpacing;
    // baseline ≈ alto de línea × 0.8 (Archivo); centramos por métrica real
    const m = g.measureText(h1.textContent);
    // misma regla que CSS: la línea (line-height) centra ascent+descent de la
    // fuente (half-leading) → baseline idéntica a la del h1 debajo
    const asc = m.fontBoundingBoxAscent || parseFloat(cs.fontSize) * 0.9;
    const desc = m.fontBoundingBoxDescent || parseFloat(cs.fontSize) * 0.22;
    const lh = parseFloat(cs.lineHeight) || src.height;
    const y = (lh - (asc + desc)) / 2 + asc + PAD;
    g.fillText(h1.textContent, 0, y);
    printer.setSource(src);
    printer.resize();
  }

  const N = 16;
  let pose = -1; // -1 = quieta (todo impreso)
  let started = false;
  let revealAt = -1;

  const commit = () => {
    const p = pose / N;
    const st = printer.draw(p);
    if (!st) return;
    const W = printer.width;
    const H = canvas.getBoundingClientRect().height;
    if (st.sweep >= 0) {
      const x = Math.round(st.sweep * (W + 40)) - 20;
      c2d.clearRect(0, 0, Math.max(0, x), H);
      racleta.style.transform = `translateX(${Math.max(-40, Math.min(W, x))}px)`;
      racleta.style.visibility = 'visible';
    } else {
      racleta.style.visibility = 'hidden';
    }
  };

  const finish = () => {
    pose = -1;
    canvas.style.visibility = 'hidden';
    racleta.style.visibility = 'hidden';
    h1.classList.remove('is-printing');
  };

  const print = () => {
    if (pose >= 0) return;
    buildSource();
    canvas.style.visibility = 'visible';
    h1.classList.add('is-printing');
    pose = 0;
  };

  bus.on('frame', (f) => {
    if (pose >= 0) {
      commit();
      pose++;
      if (pose > N) finish();
    }
    // los textos entran en escalones después de la primera pasada
    if (revealAt >= 0) {
      const k = f - revealAt;
      reveals.forEach((el, i) => {
        if (k >= 6 + i * 2 && el?.classList.contains('is-off')) {
          el.classList.remove('is-off');
          el.classList.add('is-on');
        }
      });
      if (k > 16) revealAt = -1;
    }
  });

  const start = () => {
    if (started) return;
    started = true;
    const cs = getComputedStyle(h1);
    const load = document.fonts?.load ? document.fonts.load(`${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`) : Promise.resolve();
    load.catch(() => {}).then(() => {
      print();
      revealAt = clock.frame;
      // el primer commit ya en este tick
    });
  };
  bus.on('splash:done', start);
  if (window.__nosplash) start();

  h1.addEventListener('click', print);
  h1.style.cursor = 'pointer';
  bus.on('resize', () => {
    if (pose >= 0) buildSource();
  });
  ScrollTrigger.create({
    trigger: sec,
    start: 'top -30%',
    onEnterBack: () => {
      if (started) print();
    },
  });
}
