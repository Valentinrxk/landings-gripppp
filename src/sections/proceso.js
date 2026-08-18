// Proceso: cuatro pliegos pasan por la prensa. UNA timeline scrubeada (scrub .5)
// con estaciones de largo desigual y holds de lectura. Por estación: el pliego
// entra desde abajo de la regla en 5 poses, la máquina tipea el h3 (SplitText
// chars), el párrafo sube por líneas enmascaradas, la plancha dibuja el diagrama
// en línea de pelo (DrawSVG) — o lo imprime en ASCII a tres pasadas (tinta) —,
// el sello cae en 2 poses con flash de empalme y sacudón, y el pliego sale por
// arriba. La línea de la prensa se dibuja con el scroll; el nodo activo parpadea
// como tally. Nada de esto toca el scroll nativo.
import { gsap, ScrollTrigger, SplitText } from '../core/scroll.js';
import { shutter, scramble, DIGITS } from '../core/beat.js';
import { bus } from '../core/bus.js';
import { cut } from '../systems/cuts.js';
import { createPrinter } from '../print/ascii.js';
import { t } from '../data/i18n.js';
import '../styles/proceso.css';

// beats desiguales: [entra, sale] en progreso de escena. Contiguos: el pliego
// que sale y el que entra forman una sola tira de papel. La última se queda.
const AT = [
  [0.06, 0.3],
  [0.3, 0.52],
  [0.52, 0.78],
  [0.78, 1.0],
];
const N = AT.length;

// fuente del diagrama de tinta: tres pasadas planas superpuestas (la impresora
// la muestrea y la imprime en glifos rojo/celeste/negro hasta registrar)
function drawTinta(g, W, H) {
  g.clearRect(0, 0, W, H);
  const m = Math.min(W, H);
  const cx = W / 2;
  const cy = H / 2;
  // tres densidades bien separadas → tres glifos distintos de la rampa
  g.fillStyle = '#111';
  g.fillRect(cx - m * 0.38, cy - m * 0.34, m * 0.46, m * 0.46);
  g.fillStyle = '#707070';
  g.fillRect(cx - m * 0.08, cy - m * 0.1, m * 0.44, m * 0.44);
  g.fillStyle = '#c4c4c4';
  g.beginPath();
  g.arc(cx + m * 0.04, cy + m * 0.06, m * 0.22, 0, Math.PI * 2);
  g.fill();
}

export function initProceso(ctx) {
  const sec = document.querySelector('.s-proceso');
  if (!sec) return;
  const ests = [...sec.querySelectorAll('.est')];
  const svgs = [...sec.querySelectorAll('.proc-svg')];
  const canvas = sec.querySelector('.proc-canvas');
  const cellVal = sec.querySelector('.cell-val b');
  const inkLine = sec.querySelector('.proc-line .pl-ink');
  const nodes = [...sec.querySelectorAll('.pnode')];
  const regs = [...sec.querySelectorAll('.proc-reg')];
  const sellos = ests.map((e) => e.querySelector('.sello'));
  // la copia de sangrado del sello lee data-text (::before); sigue al idioma
  const syncSellos = () => sellos.forEach((s) => (s.dataset.text = s.textContent));
  syncSellos();
  bus.on('i18n:changed', syncSellos);
  // nodos de la línea a la altura en que cada estación entra en prensa
  nodes.forEach((n, i) => (n.style.top = `${AT[i][0] * 100}%`));

  // diagrama por estación: 1,2,4 → svg; 3 → canvas ascii
  const diagOf = (i) => (i === 2 ? canvas : svgs[i < 2 ? i : 2]);
  const hairsOf = (i) => (i === 2 ? [] : [...diagOf(i).querySelectorAll('path,line,rect,circle')]);

  const printer = createPrinter(canvas, { cellMax: 24, cellMin: 9, inks: ['#f0403c', '#5fa8e0', '#111111'] });
  const src = document.createElement('canvas');
  const buildSource = () => {
    const r = canvas.getBoundingClientRect();
    src.width = Math.max(2, Math.round(r.width));
    src.height = Math.max(2, Math.round(r.height));
    drawTinta(src.getContext('2d'), src.width, src.height);
    printer.setSource(src);
    printer.resize();
  };

  // ── tier static: la composición final, quieta (todo apilado, todo impreso) ──
  if (ctx.tier === 'static') {
    nodes.forEach((n) => n.classList.add('is-done'));
    if (cellVal) cellVal.textContent = String(N).padStart(2, '0');
    document.fonts?.ready.then(() => {
      buildSource();
      printer.draw(1);
    });
    return;
  }

  const root = document.documentElement.style;
  const pr = { q: 0 }; // avance de la impresora (estación tinta)
  const t0 = performance.now();
  const armed = () => performance.now() - t0 > 1500; // los onStart no disparan en el refresh inicial
  let tl = null;
  let splits = [];
  let k = -1; // estación en prensa (-1 = todavía nada)

  // el golpe del sello: 1 cuadro blanco + sacudón + canal 4 de jitter y el
  // desregistro saltan un tick (los pisa el próximo frame: es un impulso)
  const hit = () => {
    if (!armed()) return;
    cut();
    root.setProperty('--j4x', '6px');
    root.setProperty('--j4y', '-3px');
    root.setProperty('--j4r', '-1.6deg');
    root.setProperty('--mis-x', '6px');
    root.setProperty('--mis-y', '-4px');
  };
  // re-prensar un sello: 2 poses
  const repress = (s) => gsap.fromTo(s, { scale: 1.12 }, { scale: 1, ...shutter(0.17), overwrite: 'auto' });
  sellos.forEach((s) => s.addEventListener('pointerenter', () => repress(s)));

  const setStation = (nk) => {
    if (nk === k) return;
    k = nk;
    nodes.forEach((n, i) => {
      n.classList.toggle('is-done', i < k);
      n.classList.toggle('is-on', i === k);
      if (i !== k) n.classList.remove('is-lit');
    });
    const val = String(Math.max(0, k + 1)).padStart(2, '0');
    if (cellVal) scramble(cellVal, val, 0.3, { chars: DIGITS });
    if (k >= 0) {
      const b = ests[k].querySelector('.est-idx b');
      if (b) scramble(b, val, 0.3, { chars: DIGITS });
    }
  };

  function build() {
    tl = gsap.timeline({
      scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 0.5 },
      onUpdate: () => {
        const p = tl.progress();
        let nk = -1;
        for (let i = 0; i < N; i++) if (p >= AT[i][0] - 0.0005) nk = i;
        setStation(nk);
      },
    });
    // estado inicial (posado, sin animar)
    gsap.set(svgs, { autoAlpha: 0 });
    gsap.set(canvas, { autoAlpha: 0 });
    for (let i = 0; i < N; i++) if (i !== 2) gsap.set(hairsOf(i), { drawSVG: '0%' });

    // la línea de la prensa se dibuja con el avance de la escena (poses)
    tl.fromTo(inkLine, { drawSVG: '0%' }, { drawSVG: '100%', duration: 1, ease: 'steps(64)' }, 0);

    ests.forEach((e, i) => {
      const [a, b] = AT[i];
      const last = i === N - 1;
      const h3 = e.querySelector('h3');
      const p = e.querySelector('p');
      const sello = sellos[i];
      const dg = diagOf(i);
      const hairs = hairsOf(i);
      const node = nodes[i];

      // pliego: entra desde abajo de la regla en 5 poses
      tl.fromTo(e, { yPercent: 100, visibility: 'visible' }, { yPercent: 0, duration: 0.04, ease: 'steps(5)' }, a);
      // nodo: 1 pose de sobrepaso al encenderse (1 → 1.6 → 1, poses duras)
      tl.to(node, { keyframes: { scale: [1, 1.6, 1], easeEach: 'steps(1)' }, duration: 0.03, ease: 'none' }, a);

      // la máquina tipea el título (chars, aparecen en poses)
      const sc = SplitText.create(h3, { type: 'chars', tag: 'span', aria: 'auto' });
      splits.push(sc);
      tl.fromTo(sc.chars, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.02, ease: 'steps(2)', stagger: 0.0035 }, a + 0.02);

      // el párrafo sale de la prensa por líneas (máscara por línea; autoSplit
      // re-parte al cambiar el ancho o cargar fuentes y re-engancha el tween)
      const sp = SplitText.create(p, {
        type: 'lines',
        mask: 'lines',
        tag: 'span',
        linesClass: 'ln',
        autoSplit: true,
        onSplit: (self) => {
          const tw = gsap.fromTo(self.lines, { yPercent: 110 }, { yPercent: 0, duration: 0.04, ease: 'steps(5)', stagger: 0.01 });
          tl.add(tw, a + 0.06);
          return tw;
        },
      });
      splits.push(sp);

      // la plancha
      tl.set(dg, { autoAlpha: 1 }, a);
      if (i === 2) {
        // tinta: la impresora afina la matriz y registra las tres pasadas
        tl.fromTo(pr, { q: 0 }, { q: 1, duration: b - a - 0.14, ease: 'none', onUpdate: () => printer.draw(pr.q) }, a + 0.03);
      } else {
        tl.fromTo(hairs, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.05, ease: 'steps(6)', stagger: { amount: 0.07 } }, a + 0.04);
      }

      // el sello cae: 2 poses (fantasma grande → prensado), con golpe
      tl.fromTo(
        sello,
        { autoAlpha: 0, scale: 1.35, rotate: -7 },
        { autoAlpha: 1, scale: 1, rotate: -3, duration: 0.015, ease: 'steps(2)', onStart: hit },
        b - 0.06
      );

      if (!last) {
        // el pliego sale por arriba; la plancha se limpia en 4 poses
        tl.to(e, { yPercent: -100, duration: 0.04, ease: 'steps(5)' }, b);
        tl.set(e, { visibility: 'hidden' }, b + 0.04);
        if (i === 2) tl.to(pr, { q: 0, duration: 0.03, ease: 'steps(3)', onUpdate: () => printer.draw(pr.q) }, b);
        else tl.to(hairs, { drawSVG: '100% 100%', duration: 0.03, ease: 'steps(3)' }, b);
        tl.set(dg, { autoAlpha: 0 }, b + 0.03);
      }
    });
    tl.eventCallback('onUpdate')();
  }

  function teardown() {
    if (!tl) return;
    tl.scrollTrigger?.kill();
    tl.kill();
    tl = null;
    splits.forEach((s) => s.revert());
    splits = [];
    k = -2;
  }

  // fuentes listas antes de partir texto (los anchos de línea dependen de ellas)
  document.fonts?.ready.then(() => {
    buildSource();
    build();
    ScrollTrigger.refresh();
  });

  // idioma: revertir splits (vuelve el html viejo) → texto nuevo → re-armar todo
  bus.on('i18n:changed', () => {
    if (!tl) return;
    teardown();
    ests.forEach((e) => e.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n))));
    syncSellos();
    build();
  });

  bus.on('resize', () => {
    buildSource();
    printer.draw(pr.q);
  });

  // tally: el nodo en prensa parpadea a 1 Hz (6 cuadros on / 6 off)
  bus.on('frame', (f) => {
    const n = nodes[k];
    if (n) n.classList.toggle('is-lit', f % 12 < 6);
  });

  // idle: las marcas de registro giran un cuarto (2 poses); cada tanto el
  // sello en prensa se vuelve a prensar
  bus.on('idle:beat', (f) => {
    gsap.to(regs, { rotation: '+=90', stagger: 0.04, ...shutter(0.17) });
    if (f % 72 === 0 && k >= 0 && k < N && gsap.getProperty(sellos[k], 'opacity') > 0.5) repress(sellos[k]);
  });
}
