// El viaje: UNA escena continua. Un escenario sticky de 100vh; el scroll (1200vh)
// recorre 12 beats. En cada beat el campo de tinta pasa de una forma a la
// siguiente (con retardo por punto y arcos: llegan de todos lados), la cámara
// viaja, y los textos entran cada uno a su manera. Del ruido a la marca.
import { gsap, ScrollTrigger, SplitText, scrollLean, lenis } from './core/scroll.js';
import { bus } from './core/bus.js';
import { shutter, GLYPHS } from './core/beat.js';
import { createField } from './field/field.js';
import * as S from './field/shapes.js';
import { loadImage } from './print/ascii.js';
import { t } from './data/i18n.js';
import { spliceFlash } from './systems/flash.js';

const WORKS = [
  { key: 'grip', src: '/works/gripppp.jpg', name: 'grip studio', url: 'https://gripppp.com/', domain: 'gripppp.com' },
  { key: 'oclucrm', src: '/works/oclucrm.jpg', name: 'oclucrm', url: 'https://www.oclucrm.com/', domain: 'oclucrm.com' },
  { key: 'taxes', src: '/works/taxes.jpg', name: 'taxes software', url: 'https://www.taxes.com.ar/', domain: 'taxes.com.ar' },
  { key: 'lightproject', src: '/works/lightproject.jpg', name: 'the light project', url: 'https://lightproject.app/es', domain: 'lightproject.app' },
  { key: 'parell', src: '/works/parell.jpg', name: 'parell', url: 'https://parell.app/', domain: 'parell.app' },
];

export async function initJourney(ctx) {
  const stage = document.querySelector('.stage');
  const canvas = document.getElementById('field');
  const journey = document.getElementById('journey');
  const beats = [...stage.querySelectorAll('.beat')];
  const byKey = Object.fromEntries(beats.map((b) => [b.dataset.beat, b]));
  const mobile = window.innerWidth <= 720;
  const N = ctx.tier === 'lite' ? 5500 : 12000;
  const field = createField(canvas, { count: N, dpr: ctx.tier === 'lite' ? 1.25 : 1.5 });
  window.__field = field;

  // ── cargar capturas ──
  const imgs = await Promise.all(
    WORKS.map((w) => {
      const im = new Image();
      im.src = w.src;
      im.decoding = 'async';
      return loadImage(im).then(() => im);
    })
  );

  // ── formas (recalculadas al cambiar el aspecto) ──
  let shapes = [];
  let workRects = []; // rect de mundo de cada captura, para posicionar la imagen real
  const build = () => {
    const A = field.aspect;
    const W = 100 * A;
    // hero: la marca de grip, líquida, a la derecha del claim
    const gripHero = S.shapeGrip(N, A, { widthFrac: mobile ? 0.8 : 0.42, x: mobile ? 0 : W * 0.2, y: mobile ? 22 : 8, seed: 41 }); // misma semilla que el splash: el logo VIAJA, no se rearma
    // la plantilla a la derecha: el texto de ruido vive a la izquierda, sin pisarse
    const template = S.shapeTemplate(N, A, { widthFrac: mobile ? 0.9 : 0.5, x: mobile ? 0 : W * 0.2, y: mobile ? 14 : 0 });
    const pile = S.shapePile(N, A);
    // señal: la palabra, hecha de grip
    const word = S.shapeText(N, A, 'landings', { widthFrac: mobile ? 0.94 : 0.62, x: mobile ? 0 : -W * 0.14, y: mobile ? 14 : 0 });
    // cómo: la tesis del método, en grande, a la derecha
    const sphere = S.shapeText(N, A, 'una idea.', { widthFrac: mobile ? 0.92 : 0.5, x: mobile ? 0 : W * 0.2, y: mobile ? 16 : 2, seed: 19 });
    workRects = [];
    const works = imgs.map((im, i) => {
      // a la derecha del caption; alternan un poco de alto para que la cámara tenga a dónde ir
      const cx = mobile ? 0 : W * 0.12 + (i % 2 ? -1 : 1) * W * 0.02;
      const cy = mobile ? 12 : 6 + (i % 2 ? -3 : 3);
      const r = S.shapeImage(N, A, im, { widthFrac: mobile ? 0.9 : 0.54, cx, cy, seed: 23 + i });
      workRects.push({ cx, cy, w: r.worldW, h: r.worldH });
      return r;
    });
    // partido: plantilla chica a la izquierda + grip a la derecha (mitad de puntos cada uno)
    const tplL = S.shapeTemplate(N, A, { widthFrac: mobile ? 0.7 : 0.34, seed: 31 });
    const gripR = S.shapeGrip(N, A, { widthFrac: mobile ? 0.7 : 0.3, seed: 33 });
    const split = mixHalf(tplL, gripR, N, mobile ? [0, 22, 0, -22] : [-W * 0.24, 0, W * 0.24, 0]);
    const pileL = S.shapePile(N, A, 35);
    const pileGrip = mixHalf(pileL, gripR, N, mobile ? [0, 0, 0, -22] : [-W * 0.24, 0, W * 0.24, 0]);
    const gripBig = S.shapeGrip(N, A, { widthFrac: mobile ? 0.9 : 0.5, x: mobile ? 0 : W * 0.14, y: mobile ? 22 : 16, seed: 37 });
    shapes = [gripHero, template, pile, word, sphere, ...works, split, pileGrip, gripBig];
  };
  // mezcla: primera mitad de puntos de a (desplazada dx1,dy1), segunda mitad de b (dx2,dy2)
  function mixHalf(a, b, n, [dx1, dy1, dx2, dy2]) {
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const alpha = new Float32Array(n);
    const size = new Float32Array(n);
    const half = n >> 1;
    for (let i = 0; i < n; i++) {
      const src = i < half ? a : b;
      const j = i < half ? i * 2 : (i - half) * 2; // muestrear alternado para no perder densidad
      const jj = Math.min(n - 1, j);
      pos[i * 3] = src.pos[jj * 3] + (i < half ? dx1 : dx2);
      pos[i * 3 + 1] = src.pos[jj * 3 + 1] + (i < half ? dy1 : dy2);
      pos[i * 3 + 2] = src.pos[jj * 3 + 2];
      col[i * 3] = src.col[jj * 3];
      col[i * 3 + 1] = src.col[jj * 3 + 1];
      col[i * 3 + 2] = src.col[jj * 3 + 2];
      alpha[i] = src.alpha[jj];
      size[i] = src.size[jj];
    }
    return { pos, col, alpha, size };
  }
  build();

  // ── cámara por beat (13 keyframes = 12 beats + fin) ──
  const D = field.dist;
  const camKeys = mobile
    ? [
        { x: 0, y: 0, z: D, tx: 0, ty: 0, roll: 0, fov: 40 },
        { x: 0, y: -4, z: D * 1.15, tx: 0, ty: -4, roll: 0.02, fov: 40 },
        { x: 0, y: -14, z: D * 1.1, tx: 0, ty: -18, roll: -0.03, fov: 42 },
        { x: 0, y: 0, z: D * 0.95, tx: 0, ty: 0, roll: 0, fov: 40 },
        { x: 6, y: 0, z: D * 1.2, tx: 0, ty: 0, roll: 0, fov: 40 },
        { x: 0, y: 4, z: D, tx: 0, ty: 4, roll: 0, fov: 40 },
        { x: 0, y: 4, z: D * 0.98, tx: 0, ty: 4, roll: 0.01, fov: 40 },
        { x: 0, y: 4, z: D * 1.02, tx: 0, ty: 4, roll: -0.01, fov: 40 },
        { x: 0, y: 4, z: D * 0.98, tx: 0, ty: 4, roll: 0.01, fov: 40 },
        { x: 0, y: 4, z: D, tx: 0, ty: 4, roll: 0, fov: 40 },
        { x: 0, y: 0, z: D * 1.1, tx: 0, ty: 0, roll: 0, fov: 40 },
        { x: 0, y: -8, z: D * 1.05, tx: 0, ty: -8, roll: 0, fov: 40 },
        { x: 0, y: 6, z: D * 0.9, tx: 0, ty: 6, roll: 0, fov: 40 },
      ]
    : [
        { x: 0, y: 0, z: D, tx: 0, ty: 0, roll: 0, fov: 36 }, // 0 palabra
        { x: 8, y: -6, z: D * 1.25, tx: 0, ty: -4, roll: 0.03, fov: 36 }, // 1 plantilla: retrocede, ladea
        { x: -10, y: -22, z: D * 1.05, tx: 0, ty: -30, roll: -0.05, fov: 40 }, // 2 pila: cámara baja mirando al piso
        { x: 0, y: 0, z: D * 0.9, tx: 0, ty: 0, roll: 0, fov: 36 }, // 3 grip: frontal, cerca
        { x: 30, y: 4, z: D * 1.15, tx: 12, ty: 0, roll: 0, fov: 36 }, // 4 esfera a la derecha, orbita
        { x: 6, y: 0, z: D * 0.95, tx: 6, ty: 0, roll: 0, fov: 36 }, // 5 w1
        { x: -8, y: 2, z: D * 1.02, tx: -6, ty: 0, roll: 0.015, fov: 36 }, // 6 w2
        { x: 6, y: -2, z: D * 0.96, tx: 6, ty: 0, roll: -0.015, fov: 36 }, // 7 w3
        { x: -8, y: 2, z: D * 1.04, tx: -6, ty: 0, roll: 0.012, fov: 36 }, // 8 w4
        { x: 6, y: 0, z: D * 0.97, tx: 6, ty: 0, roll: 0, fov: 36 }, // 9 w5
        { x: 0, y: 0, z: D * 1.12, tx: 0, ty: 0, roll: 0, fov: 36 }, // 10 partido
        { x: 12, y: -10, z: D * 1.05, tx: 8, ty: -12, roll: 0.02, fov: 38 }, // 11 la plantilla se cae
        { x: 0, y: 2, z: D * 0.85, tx: 0, ty: 2, roll: 0, fov: 36 }, // 12 grip grande: cerca
      ];
  const NB = 12; // beats

  // ── el master: un solo timeline scrubeado sobre #journey ──
  const cur = { t: 0, beat: 0 }; // progreso global 0..NB
  const master = gsap.timeline({
    scrollTrigger: { trigger: journey, start: 'top top', end: 'bottom bottom', scrub: 0.7, invalidateOnRefresh: true },
  });
  master.to(cur, { t: NB, duration: NB, ease: 'none' }, 0);
  camKeys.forEach((k, i) => {
    if (i === 0) {
      gsap.set(field.cam, k);
      return;
    }
    master.to(field.cam, { ...k, duration: 1, ease: 'sine.inOut' }, i - 1);
  });

  // ── textos: cada beat entra a su manera (timeline scrubeado por tramo) ──
  const T = (key) => byKey[key];
  const setup = () => {
    // hero: visible de entrada (intro temporal), se va en el primer beat
    master.to(T('hero'), { autoAlpha: 0, y: -60, duration: 0.45, ease: 'power2.in' }, 0.15);
    // ruido: título llega desde la izquierda con skew, texto tipeado
    const ru = T('ruido');
    master.fromTo(ru, { autoAlpha: 0, x: -140, skewX: 8 }, { autoAlpha: 1, x: 0, skewX: 0, duration: 0.35, ease: 'power3.out' }, 0.62)
      .to(ru, { autoAlpha: 0, y: 80, duration: 0.3, ease: 'power2.in' }, 1.7);
    // la pila: el ruido nombrado (sube desde abajo, mono, y se va con la palabra)
    const pi = T('pila');
    master.fromTo(pi, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.25, ease: 'power3.out' }, 1.95)
      .to(pi, { autoAlpha: 0, y: -20, duration: 0.25, ease: 'power2.in' }, 2.45);
    // señal: llega desde la derecha por clip, mientras la palabra se levanta de la pila
    const se = T('senal');
    master.fromTo(se, { autoAlpha: 0, clipPath: 'inset(0 0 0 100%)', x: 40 }, { autoAlpha: 1, clipPath: 'inset(0 0 0 0%)', x: 0, duration: 0.4, ease: 'power3.out' }, 2.4)
      .to(se, { autoAlpha: 0, x: -40, duration: 0.3, ease: 'power2.in' }, 3.15);
    // cómo: pasos suben uno por uno
    const co = T('como');
    const steps = [...co.querySelectorAll('.step')];
    master.fromTo(co, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.05 }, 3.35);
    master.fromTo(co.querySelector('h2'), { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.25, ease: 'power3.out' }, 3.4);
    steps.forEach((s, i) => master.fromTo(s, { autoAlpha: 0, y: 60, rotate: -1.5 }, { autoAlpha: 1, y: 0, rotate: 0, duration: 0.22, ease: 'power3.out' }, 3.55 + i * 0.16));
    master.to(co, { autoAlpha: 0, y: -50, duration: 0.3, ease: 'power2.in' }, 4.35);
    // trabajos: título breve al entrar; cada caption sube desde abajo cuando su obra está formada
    const tr = T('trabajos');
    master.fromTo(tr, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.25, ease: 'power3.out' }, 4.35).to(tr, { autoAlpha: 0, duration: 0.2 }, 4.8);
    WORKS.forEach((w, i) => {
      const cap = T('w' + i);
      const from = i % 2 ? { x: 80, y: 30 } : { x: -80, y: 30 };
      master.fromTo(cap, { autoAlpha: 0, ...from }, { autoAlpha: 1, x: 0, y: 0, duration: 0.22, ease: 'power3.out' }, 4.55 + i)
        .to(cap, { autoAlpha: 0, y: -30, duration: 0.18, ease: 'power2.in' }, 5.38 + i);
    });
    // cierre trabajos + plantilla vs marca: dos columnas se separan desde el centro
    const pl = T('plantilla');
    master.fromTo(pl, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.05 }, 9.45).to(pl, { autoAlpha: 0, duration: 0.2 }, 10.95);
    master.fromTo(pl.querySelector('.pl-l'), { autoAlpha: 0, x: 60 }, { autoAlpha: 1, x: 0, duration: 0.3, ease: 'power3.out' }, 9.55)
      .fromTo(pl.querySelector('.pl-r'), { autoAlpha: 0, x: -60 }, { autoAlpha: 1, x: 0, duration: 0.3, ease: 'power3.out' }, 9.55)
      .fromTo(pl.querySelector('h2'), { autoAlpha: 0, scale: 1.15 }, { autoAlpha: 1, scale: 1, duration: 0.25, ease: 'power3.out' }, 9.5)
      .to(pl.querySelector('.pl-l'), { autoAlpha: 0, y: 120, rotate: -6, duration: 0.35, ease: 'power2.in' }, 10.25)
      .to([pl.querySelector('.pl-r'), pl.querySelector('h2')], { autoAlpha: 0, duration: 0.25 }, 10.7);
    // contacto: estampa
    const ct = T('contacto');
    master.fromTo(ct, { autoAlpha: 0, scale: 1.2 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: 'steps(3)' }, 11.3);
    // marcadores laterales
  };
  setup();

  // ── el campo sigue al master: par de formas + t local; envión → turbulencia/tintas ──
  let lastBeat = -1;
  let lean = 0;
  const workImg = document.getElementById('work-real');
  const workLink = document.getElementById('work-link');
  let mouse = [0, 0, 0];
  gsap.ticker.add(() => {
    const g = Math.min(NB - 0.0001, Math.max(0, cur.t));
    const b = Math.floor(g);
    const lt = g - b;
    if (b !== lastBeat) {
      lastBeat = b;
      bus.emit('beat', b);
    }
    field.setPair(shapes[b], shapes[b + 1]);
    // cada beat: sostiene la forma (0–0.22), viaja (0.22–0.85), sostiene (0.85–1)
    // las obras viajan menos y se sostienen más (que no se salteen al scrollear rápido)
    const isWork = b >= 4 && b <= 8;
    const HOLD_IN = isWork ? 0.34 : 0.22;
    const HOLD_OUT = isWork ? 0.74 : 0.85;
    const tt = Math.max(0, Math.min(1, (lt - HOLD_IN) / (HOLD_OUT - HOLD_IN)));
    field.state.t = tt;
    // envión: agitación + desregistro que se relaja al frenar
    const L = Math.abs(scrollLean());
    lean += (L - lean) * 0.12;
    field.state.turb = Math.max(0.035 + 0.02 * Math.sin(performance.now() / 1400), Math.min(1, lean * 1.6));
    field.state.mis = Math.max(Math.min(1, lean * 1.4), field.state.pulse || 0); // envión o golpe (click/splash)
    field.state.mouse = mouse;
    field.render();
    // la obra real aparece cuando la forma está armada (sostén) y frenaste
    let wIdx = -1;
    if (b >= 4 && b <= 8 && lt >= HOLD_OUT) wIdx = b - 4;
    else if (b >= 5 && b <= 9 && lt <= (b <= 8 ? 0.34 : 0.22)) wIdx = b - 5;
    if (wIdx >= 0) {
      const r = workRects[wIdx];
      const [x1, y1] = field.project(r.cx - r.w / 2, r.cy + r.h / 2, 0);
      const [x2, y2] = field.project(r.cx + r.w / 2, r.cy - r.h / 2, 0);
      workImg.style.left = `${x1}px`;
      workImg.style.top = `${y1}px`;
      workImg.style.width = `${x2 - x1}px`;
      workImg.style.height = `${y2 - y1}px`;
      workLink.style.left = workImg.style.left;
      workLink.style.top = workImg.style.top;
      workLink.style.width = workImg.style.width;
      workLink.style.height = workImg.style.height;
      if (workImg.dataset.k !== WORKS[wIdx].key) {
        workImg.dataset.k = WORKS[wIdx].key;
        workImg.src = WORKS[wIdx].src;
        workImg.alt = WORKS[wIdx].name;
        workLink.href = WORKS[wIdx].url;
      }
      const a = 1 - Math.min(1, lean * 10);
      workImg.style.opacity = a.toFixed(2);
      field.state.opacity = 1 - 0.8 * a; // la tinta se aparta cuando la captura real aparece
      workLink.style.pointerEvents = a > 0.5 ? 'auto' : 'none';
    } else {
      workImg.style.opacity = '0';
      workLink.style.pointerEvents = 'none';
      field.state.opacity = 1;
    }
  });

  // ── intro (tiempo, no scroll): la tinta llega de todos lados y forma la marca ──
  const heroEl = T('hero');
  const heroIn = gsap.timeline({ paused: true });
  {
    const claim = heroEl.querySelector('h1');
    const sub = heroEl.querySelector('.hero-sub');
    const kick = heroEl.querySelector('.kicker');
    const cta = heroEl.querySelector('.cta');
    const hint = heroEl.querySelector('.hint');
    gsap.set([kick, cta, hint], { autoAlpha: 0 });
    let split = new SplitText(claim, { type: 'lines', mask: 'lines', linesClass: 'ln' });
    gsap.set(split.lines, { yPercent: 110 });
    let subSplit = new SplitText(sub, { type: 'lines', mask: 'lines', linesClass: 'ln' });
    gsap.set(subSplit.lines, { yPercent: 110 });
    bus.on('i18n:changed', () => {
      // SplitText restaura su HTML original al re-splitear: primero revertir, después
      // poner el texto nuevo, después splitear ya asentado
      split.revert();
      subSplit.revert();
      claim.textContent = t('hero.claim');
      sub.textContent = t('hero.sub');
      split = new SplitText(claim, { type: 'lines', mask: 'lines', linesClass: 'ln' });
      subSplit = new SplitText(sub, { type: 'lines', mask: 'lines', linesClass: 'ln' });
      gsap.set([...split.lines, ...subSplit.lines], { yPercent: 0 });
    });
    heroIn
      .to(split.lines, { yPercent: 0, stagger: 0.09, duration: 0.8, ease: 'expo.out' }, 0)
      .to(subSplit.lines, { yPercent: 0, stagger: 0.07, duration: 0.7, ease: 'expo.out' }, 0.25)
      .to(kick, { autoAlpha: 1, duration: 0.4 }, 0.5)
      .to(cta, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'expo.out' }, 0.6)
      .to(hint, { autoAlpha: 1, duration: 0.4 }, 0.9);
  }
  // el ticker arriba llama setPair(shapes[b], shapes[b+1]) cada frame — durante la
  // intro lo bloqueamos con un flag
  let introRunning = true;
  const origSetPair = field.setPair;
  field.setPair = (a, b) => {
    if (introRunning) return;
    origSetPair(a, b);
  };
  // ── splash: stop-motion de palabras gigantes hechas de tinta — no · sos · una ·
  // plantilla. — cortes duros, punch-in de cámara y desregistro en cada golpe;
  // después la marca grip con flash y latido, y de ahí viaja a su lugar en el hero.
  // Toque/tecla lo saltea. ?nosplash lo omite. La clase html.splashing viene
  // puesta desde el HTML (sin FOUC): acá solo se saca.
  const splash = document.getElementById('splash');
  const counter = splash?.querySelector('.splash-count');
  const bar = splash?.querySelector('.splash-bar');
  const skipSplash = new URLSearchParams(location.search).has('nosplash') || ctx.reduced;
  const runIntro = () => {
    const A = field.aspect;
    const words = ['no', 'sos', 'una', 'plantilla.'].map((w, i) =>
      S.shapeText(N, A, w, { widthFrac: mobile ? (w.length > 3 ? 0.94 : 0.62) : w.length > 3 ? 0.7 : 0.46, y: 0, seed: 50 + i })
    );
    const noise = S.shapeNoise(N, A, 3);
    const gripCenter = S.shapeGrip(N, A, { widthFrac: mobile ? 0.86 : 0.5, x: 0, y: mobile ? 8 : 0, seed: 41 });
    const finish = () => {
      introRunning = false;
      lastBeat = -1;
      field.state.arc = 1;
      field.state.pulse = 0;
      document.documentElement.classList.remove('splashing');
      splash?.remove();
      heroIn.play();
    };
    if (skipSplash) {
      origSetPair(gripCenter, shapes[0]);
      field.state.t = 1;
      finish();
      return;
    }
    const hold = { t: 0, n: 0 };
    const zoom = field.cam.z;
    field.state.arc = 0.35; // viajes más rectos: golpes, no vuelos
    const tl = gsap.timeline({ onComplete: finish });
    const seq = [noise, ...words, gripCenter];
    let at = 0.25;
    const DUR = [0.42, 0.34, 0.34, 0.5, 0.75]; // cada palabra forma rápido y se sostiene
    for (let i = 0; i < seq.length - 1; i++) {
      const A0 = seq[i];
      const B0 = seq[i + 1];
      const d = DUR[i];
      tl.add(() => {
        origSetPair(A0, B0);
        field.state.t = 0;
      }, at);
      // punch-in de cámara y desregistro en el golpe, que se relaja enseguida
      tl.fromTo(hold, { t: 0 }, { t: 1, duration: d * 0.62, ease: 'power3.out', onUpdate: () => (field.state.t = hold.t) }, at + 0.01)
        .fromTo(field.cam, { z: zoom * (0.94 - i * 0.015) }, { z: zoom * (0.9 - i * 0.015), duration: d, ease: 'power2.out' }, at + 0.01)
        .fromTo(field.state, { pulse: 0.8 }, { pulse: 0, duration: d * 0.8, ease: 'expo.out' }, at + 0.02);
      if (i === seq.length - 2) tl.add(() => spliceFlash(), at + 0.02); // la marca entra con flash
      at += d;
    }
    // contador y barra durante toda la secuencia
    tl.to(hold, { n: 100, duration: at - 0.25, ease: 'none', onUpdate: () => {
      if (counter) counter.textContent = String(Math.round(hold.n)).padStart(3, '0');
      if (bar) bar.style.transform = `scaleX(${(hold.n / 100).toFixed(3)})`;
    } }, 0.25);
    // latido de la marca: dos golpes de desregistro
    tl.to(field.state, { pulse: 0.7, duration: 0.07 }, at + 0.15).to(field.state, { pulse: 0, duration: 0.35, ease: 'expo.out' }, at + 0.22)
      .to(field.state, { pulse: 0.5, duration: 0.06 }, at + 0.55).to(field.state, { pulse: 0, duration: 0.4, ease: 'expo.out' }, at + 0.61);
    // la marca se desarma y viaja al hero; la cámara vuelve; el chrome entra
    const go = at + 0.9;
    tl.add(() => {
      origSetPair(gripCenter, shapes[0]);
      field.state.t = 0;
      field.state.arc = 0.2; // deslizamiento limpio hacia su lugar en el hero
    }, go)
      .fromTo(hold, { t: 0 }, { t: 1, duration: 1.15, ease: 'power3.inOut', onUpdate: () => (field.state.t = hold.t) }, go + 0.02)
      .to(field.cam, { z: zoom, duration: 1.2, ease: 'power2.inOut' }, go)
      .to(splash, { autoAlpha: 0, duration: 0.35 }, go + 0.1)
      .add(() => document.documentElement.classList.remove('splashing'), go + 0.35);
    const skip = () => {
      if (tl.progress() >= 1) return;
      tl.progress(1);
    };
    // cualquier intención de moverse corta la intro (nunca bloquear el scroll)
    splash?.addEventListener('pointerdown', skip);
    window.addEventListener('keydown', skip, { once: true });
    window.addEventListener('wheel', skip, { once: true, passive: true });
    window.addEventListener('touchmove', skip, { once: true, passive: true });
    window.addEventListener('scroll', () => window.scrollY > 8 && skip(), { once: true, passive: true });
  };
  document.fonts?.ready.then(runIntro);

  // ── puntero: aparta la tinta. En touch no hay hover: un dedo fantasma recorre
  // la forma despacio (lissajous) para que la tinta viva igual ──
  if (ctx.coarse) {
    const t0 = performance.now();
    gsap.ticker.add(() => {
      const t = (performance.now() - t0) / 1000;
      const A = field.aspect;
      const W = 100 * A;
      // recorre la zona donde viven las formas (centro/arriba en mobile)
      const wx = Math.sin(t * 0.55) * W * 0.32;
      const wy = 10 + Math.sin(t * 0.83 + 1.3) * 18;
      mouse = [wx, wy, 0.8];
    });
  } else {
    window.addEventListener('pointermove', (e) => {
      const [wx, wy] = field.unproject(e.clientX, e.clientY);
      mouse = [wx, wy, 1];
    });
    window.addEventListener('pointerleave', () => (mouse = [0, 0, 0]));
  }

  // ── tema: la tinta invierte con el modo noche ──
  const syncTheme = () => (field.state.dark = document.documentElement.dataset.theme === 'dark' ? 1 : 0);
  syncTheme();
  bus.on('theme:changed', syncTheme);

  // ── click en la tinta: onda expansiva desde el punto (en touch también) ──
  const burst = field.state.burst;
  let burstTl = null;
  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button')) return;
    const [wx, wy] = field.unproject(e.clientX, e.clientY);
    burst.x = wx;
    burst.y = wy;
    burstTl?.kill();
    burstTl = gsap.timeline();
    burstTl
      .fromTo(burst, { r: 0, s: 1 }, { r: 70, duration: 0.9, ease: 'power2.out' }, 0)
      .to(burst, { s: 0, duration: 0.9, ease: 'power1.in' }, 0)
      .fromTo(field.state, { pulse: 0.8 }, { pulse: 0, duration: 0.6, ease: 'expo.out' }, 0);
  });

  // ── resize: formas y cámara. En touch la barra de URL cambia el alto al
  // scrollear: eso NO es un resize (rearmar las formas ahí rompe el scroll) ──
  let rt = null;
  let lastW = window.innerWidth;
  window.addEventListener('resize', () => {
    if (ctx.coarse && window.innerWidth === lastW) {
      field.resize(); // solo el lienzo
      return;
    }
    clearTimeout(rt);
    rt = setTimeout(() => {
      lastW = window.innerWidth;
      field.resize();
      build();
      lastBeat = -1;
      ScrollTrigger.refresh();
    }, 150);
  });

  // ── marcadores laterales: beat actual ──
  const marks = [...document.querySelectorAll('.marks button')];
  const MARK_BEAT = [0, 1, 2, 3, 4, 9, 11]; // inicio, ruido, señal, cómo, trabajos, plantilla, contacto (7 → usar 5)
  bus.on('beat', (b) => {
    marks.forEach((m) => m.classList.toggle('is-cur', b >= +m.dataset.from && b < +m.dataset.to));
  });
  marks.forEach((m) =>
    m.addEventListener('click', () => {
      const y = journey.offsetTop + (journey.offsetHeight - window.innerHeight) * (+m.dataset.from / NB) + 2;
      if (lenis) lenis.scrollTo(y);
      else window.scrollTo(0, y);
    })
  );
  void MARK_BEAT;
  void shutter;
  void GLYPHS;
  return { field, master };
}
