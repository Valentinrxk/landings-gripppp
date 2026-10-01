// El viaje: UNA escena continua. Un escenario sticky de 100vh; el scroll (1625vh)
// recorre 13 beats. En cada beat el campo de tinta pasa de una forma a la
// siguiente (con retardo por punto y arcos: llegan de todos lados), la cámara
// viaja, y los textos entran cada uno a su manera. Del ruido a la marca.
import { gsap, ScrollTrigger, SplitText, scrollLean, lenis } from './core/scroll.js';
import { bus } from './core/bus.js';
import { shutter, GLYPHS } from './core/beat.js';
import { createField } from './field/field.js';
import { createGlobos } from './field/globos.js';
import { createPliego } from './field/pliego.js';
import { createPlantillas } from './field/plantillas.js';
import * as S from './field/shapes.js';
import { loadImage } from './print/ascii.js';
import { t, lang as startLang, setEgg } from './data/i18n.js';
import { spliceFlash } from './systems/flash.js';
import { popSound, chime } from './systems/sound.js';

// video: el recorrido grabado de la landing (empieza en el mismo cuadro que la captura)
const WORKS = [
  { key: 'riestra', src: '/works/riestra.jpg', video: '/works/riestra.mp4', name: 'deportivo riestra', url: 'https://deportivoriestra.com.ar/', domain: 'deportivoriestra.com.ar' },
  { key: 'grip', src: '/works/grip.jpg', video: '/works/grip.mp4', name: 'grip studio', url: 'https://gripppp.com/', domain: 'gripppp.com' },
  { key: 'oclucrm', src: '/works/oclucrm.jpg', video: '/works/oclucrm.mp4', name: 'oclucrm', url: 'https://www.oclucrm.com/', domain: 'oclucrm.com' },
  { key: 'taxes', src: '/works/taxes.jpg', video: '/works/taxes.mp4', name: 'taxes software', url: 'https://www.taxes.com.ar/', domain: 'taxes.com.ar' },
  { key: 'feedmakers', src: '/works/feedmakers.jpg', video: '/works/feedmakers.mp4', name: 'feedmakers', url: 'https://feedmakers.app/es', domain: 'feedmakers.app' },
  { key: 'ilove3d', src: '/works/ilove3d.jpg', video: '/works/ilove3d.mp4', name: 'ilove3d', url: 'https://ilove3d.app/', domain: 'ilove3d.app' },
];
const NW = WORKS.length;
const END = 4 + NW; // beat en que la última obra se vuelve el partido plantilla / marca
const NB = END + 3; // beats: hero, ruido, pila, señal, cómo, obras, partido, pila+marca, contacto

export async function initJourney(ctx) {
  const stage = document.querySelector('.stage');
  const canvas = document.getElementById('field');
  const journey = document.getElementById('journey');
  const beats = [...stage.querySelectorAll('.beat')];
  const byKey = Object.fromEntries(beats.map((b) => [b.dataset.beat, b]));
  const tplCard = stage.querySelector('.tpl-card');
  const plGlobos = stage.querySelector('.pl-globos');
  const mobile = window.innerWidth <= 720;
  const N = ctx.tier === 'lite' ? 5500 : 12000;
  const field = createField(canvas, { count: N, dpr: ctx.tier === 'lite' ? 1.25 : 1.5 });
  window.__field = field;
  // la marca en 3D: globos de letras metalizados que flotan sobre su impresión de tinta (ver globos.js)
  const globos = createGlobos(field, { step: ctx.tier === 'lite' ? 3 : 2 });
  window.__globos = globos;

  // ── cargar capturas ──
  const imgs = await Promise.all(
    WORKS.map((w) => {
      const im = new Image();
      im.src = w.src;
      im.decoding = 'async';
      return loadImage(im).then(() => im);
    })
  );
  // la obra real, en una hoja 3D sobre la tinta (con su recorrido en video si lo hay)
  const pliego = createPliego(field, WORKS, stage);
  bus.on('i18n:changed', () => pliego.relabel());
  // ruido / pila / señal: el muro de plantillas, su derrumbe y la que se levanta
  const plantillas = createPlantillas(field, { stage, mobile, lang: startLang, signal: { video: '/works/grip.mp4', poster: '/works/grip.jpg' } });
  bus.on('i18n:changed', (L) => plantillas.relang(L));

  // ── formas (recalculadas al cambiar el aspecto) ──
  let shapes = [];
  let workRects = []; // rect de mundo de cada captura, para posicionar la imagen real
  let slots = {}; // dónde está la marca: la impresión de tinta y los globos comparten el lugar
  const build = () => {
    const A = field.aspect;
    const W = 100 * A;
    const hero = { x: mobile ? 0 : W * 0.215, y: mobile ? 21 : 3, w: W * (mobile ? 0.84 : 0.46) };
    // 'otro resultado': los globos van donde el CSS dejó lugar (.pl-globos) y la
    // tinta de la plantilla, escondida detrás de la carta (.tpl-card). Se miden
    // en pantalla y se pasan al mundo con la cámara del partido
    const k = camKeys[END + 1];
    const upp = (2 * k.z * Math.tan((k.fov * Math.PI) / 360)) / window.innerHeight;
    const toWorld = (el) => ({
      x: k.x + (el.offsetLeft + el.offsetWidth / 2 - window.innerWidth / 2) * upp,
      y: k.y - (el.offsetTop + el.offsetHeight / 2 - window.innerHeight / 2) * upp,
      w: el.offsetWidth * upp,
    });
    const zone = toWorld(plGlobos);
    const card = toWorld(tplCard);
    const right = { x: zone.x, y: zone.y, w: zone.w * 0.8 };
    const big = { x: mobile ? 0 : W * 0.14, y: mobile ? 22 : 16, w: W * (mobile ? 0.9 : 0.5) };
    slots = { hero, right, big };
    // hero: la marca de grip, líquida, a la derecha del claim
    const gripHero = S.shapeGrip(N, A, { widthFrac: hero.w / W, x: hero.x, y: hero.y, seed: 41 }); // misma semilla que el splash: el logo VIAJA, no se rearma
    // ruido: la tinta se vuelve estática, polvo detrás del muro de plantillas
    plantillas.build(W);
    const noise = S.shapeStatic(N, A);
    const pile = S.shapePile(N, A);
    // señal: la tinta sale en rayos de color detrás de la que se levanta de la pila
    const sg = plantillas.signalAt;
    const rays = S.shapeRays(N, A, { x: sg.x, y: sg.y, z: sg.z - 4, r0: sg.w * 0.42, r1: sg.w * 1.2 });
    // cómo: la tesis del método, en grande, a la derecha
    const sphere = S.shapeText(N, A, 'una idea.', { widthFrac: mobile ? 0.92 : 0.5, x: mobile ? 0 : W * 0.2, y: mobile ? 16 : 2, seed: 19 });
    workRects = [];
    const works = imgs.map((im, i) => {
      // a la derecha del caption; alternan un poco de alto para que la cámara tenga a dónde ir.
      // Cada hoja está girada hacia el texto (y un poco arriba/abajo, alternando): la
      // tinta aterriza ya girada, así la hoja calza encima
      const cx = mobile ? 0 : W * 0.12 + (i % 2 ? -1 : 1) * W * 0.02;
      const cy = mobile ? 12 : 6 + (i % 2 ? -3 : 3);
      const rx = (i % 2 ? -1 : 1) * (mobile ? 0.05 : 0.07);
      const ry = mobile ? (i % 2 ? 0.12 : -0.12) : -0.26 + (i % 2 ? 0.08 : 0);
      const r = S.shapeImage(N, A, im, { widthFrac: mobile ? 0.9 : 0.54, cx, cy, seed: 23 + i });
      turn(r.pos, cx, cy, rx, ry);
      workRects.push({ cx, cy, rx, ry, w: r.worldW, h: r.worldH });
      return r;
    });
    // partido: la tinta de la plantilla queda invisible detrás de la carta (DOM) y,
    // cuando la carta se cae, aparece cayendo a la pila; grip a la derecha
    const tplL = S.shapeTemplate(N, A, { widthFrac: (card.w * 0.86) / W, seed: 31 });
    tplL.alpha.fill(0);
    const gripR = S.shapeGrip(N, A, { widthFrac: right.w / W, seed: 33 });
    const split = mixHalf(tplL, gripR, N, [card.x, card.y, right.x, right.y]);
    const pileL = S.shapePile(N, A, 35);
    const pileGrip = mixHalf(pileL, gripR, N, mobile ? [0, 0, right.x, right.y] : [-W * 0.24, 0, right.x, right.y]);
    const gripBig = S.shapeGrip(N, A, { widthFrac: big.w / W, x: big.x, y: big.y, seed: 37 });
    shapes = [gripHero, noise, pile, rays, sphere, ...works, split, pileGrip, gripBig];
  };
  // gira una nube de puntos alrededor de (cx, cy) como lo hace three con un Euler
  // XYZ: primero Y, después X (así la tinta calza con la hoja girada)
  function turn(pos, cx, cy, rx, ry) {
    const cY = Math.cos(ry);
    const sY = Math.sin(ry);
    const cX = Math.cos(rx);
    const sX = Math.sin(rx);
    for (let i = 0; i < pos.length; i += 3) {
      const x = pos[i] - cx;
      const y = pos[i + 1] - cy;
      const z = pos[i + 2];
      const x1 = x * cY + z * sY;
      const z1 = -x * sY + z * cY;
      pos[i] = x1 + cx;
      pos[i + 1] = y * cX - z1 * sX + cy;
      pos[i + 2] = y * sX + z1 * cX;
    }
  }
  // mezcla: primera mitad de puntos de a (desplazada dx1,dy1), segunda mitad de b (dx2,dy2)
  function mixHalf(a, b, n, [dx1, dy1, dx2, dy2]) {
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const alpha = new Float32Array(n);
    const size = new Float32Array(n);
    const chroma = new Float32Array(n);
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
      chroma[i] = src.chroma ? src.chroma[jj] : 0;
    }
    return { pos, col, alpha, size, chroma };
  }

  // ── cámara por beat (NB + 1 keyframes: un beat por tramo + el fin) ──
  const D = field.dist;
  const camKeys = mobile
    ? [
        { x: 0, y: 0, z: D, tx: 0, ty: 0, roll: 0, fov: 40 },
        { x: -6, y: 10, z: D * 1.05, tx: 4, ty: 12, roll: 0.01, fov: 42 },
        { x: 0, y: -14, z: D * 1.1, tx: 0, ty: -18, roll: -0.03, fov: 42 },
        { x: 0, y: 0, z: D * 0.95, tx: 0, ty: 0, roll: 0, fov: 40 },
        { x: 6, y: 0, z: D * 1.2, tx: 0, ty: 0, roll: 0, fov: 40 },
        { x: 0, y: 4, z: D, tx: 0, ty: 4, roll: 0, fov: 40 },
        { x: 0, y: 4, z: D * 0.98, tx: 0, ty: 4, roll: 0.01, fov: 40 },
        { x: 0, y: 4, z: D * 1.02, tx: 0, ty: 4, roll: -0.01, fov: 40 },
        { x: 0, y: 4, z: D * 0.98, tx: 0, ty: 4, roll: 0.01, fov: 40 },
        { x: 0, y: 4, z: D, tx: 0, ty: 4, roll: 0, fov: 40 },
        { x: 0, y: 4, z: D * 1.02, tx: 0, ty: 4, roll: -0.01, fov: 40 },
        { x: 0, y: 0, z: D * 1.1, tx: 0, ty: 0, roll: 0, fov: 40 },
        { x: 0, y: 0, z: D * 1.1, tx: 0, ty: 0, roll: 0, fov: 40 }, // quieta: en el celu 'otro resultado' entra recién acá
        { x: 0, y: 6, z: D * 0.9, tx: 0, ty: 6, roll: 0, fov: 40 },
      ]
    : [
        { x: 0, y: 0, z: D, tx: 0, ty: 0, roll: 0, fov: 36 }, // 0 palabra
        { x: -10, y: 6, z: D * 1.02, tx: 16, ty: 0, roll: 0.012, fov: 38 }, // 1 ruido: el muro de plantillas se va al fondo
        { x: -10, y: -22, z: D * 1.05, tx: 0, ty: -30, roll: -0.05, fov: 40 }, // 2 pila: cámara baja mirando al piso
        { x: 0, y: 0, z: D * 0.94, tx: -4, ty: 0, roll: 0, fov: 36 }, // 3 señal: frontal, la que se levantó
        { x: 30, y: 4, z: D * 1.15, tx: 12, ty: 0, roll: 0, fov: 36 }, // 4 esfera a la derecha, orbita
        { x: 6, y: 0, z: D * 0.95, tx: 6, ty: 0, roll: 0, fov: 36 }, // 5 w1
        { x: -8, y: 2, z: D * 1.02, tx: -6, ty: 0, roll: 0.015, fov: 36 }, // 6 w2
        { x: 6, y: -2, z: D * 0.96, tx: 6, ty: 0, roll: -0.015, fov: 36 }, // 7 w3
        { x: -8, y: 2, z: D * 1.04, tx: -6, ty: 0, roll: 0.012, fov: 36 }, // 8 w4
        { x: 6, y: 0, z: D * 0.97, tx: 6, ty: 0, roll: 0, fov: 36 }, // 9 w5
        { x: -8, y: 2, z: D * 1.03, tx: -6, ty: 0, roll: -0.012, fov: 36 }, // 10 w6
        { x: 0, y: 0, z: D * 1.12, tx: 0, ty: 0, roll: 0, fov: 36 }, // 11 partido
        { x: 12, y: -10, z: D * 1.05, tx: 8, ty: -12, roll: 0.02, fov: 38 }, // 12 la plantilla se cae
        { x: 0, y: 2, z: D * 0.85, tx: 0, ty: 2, roll: 0, fov: 36 }, // 13 grip grande: cerca
      ];

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
    // el partido se encuadra temprano y queda quieto mientras se lee: el texto y la
    // carta (DOM) calzan con los globos (mundo)
    const early = i === END + 1;
    master.to(field.cam, { ...k, duration: early ? 0.5 : 1, ease: 'sine.inOut' }, early ? END : i - 1);
  });
  build();

  // ── textos: cada beat entra a su manera (timeline scrubeado por tramo) ──
  const T = (key) => byKey[key];
  // la pila, tipografía cinética: las palabras caen como las cartas y rebotan; la
  // segunda línea aparece y se borra letra por letra (el ruido no se recuerda).
  // Todo sale de g (el progreso del viaje): igual de ida y de vuelta, y al
  // cambiar el idioma solo se vuelve a partir el texto
  const pila = { words: [], chars: [], splits: [] };
  const pilaSplit = () => {
    const a = T('pila').querySelector('.pila-a');
    const b = T('pila').querySelector('.pila-b');
    pila.splits.forEach((sp) => sp.revert());
    a.textContent = t('pila.a');
    b.textContent = t('pila.b');
    const sa = new SplitText(a, { type: 'words', wordsClass: 'w' });
    const sb = new SplitText(b, { type: 'words,chars', wordsClass: 'w' });
    pila.splits = [sa, sb];
    pila.words = sa.words;
    pila.chars = sb.chars;
  };
  bus.on('i18n:changed', pilaSplit);
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const bounceOut = (x) => {
    const n = 7.5625;
    const d = 2.75;
    if (x < 1 / d) return n * x * x;
    if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
    if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
    return n * (x -= 2.625 / d) * x + 0.984375;
  };
  const placePila = (g) => {
    if (g < 1.8 || g > 2.6) return; // fuera de su tramo la sección está oculta
    pila.words.forEach((w, i) => {
      const p = clamp01((g - (1.88 + i * 0.035)) / 0.24);
      const q = clamp01((g - (2.42 + i * 0.012)) / 0.1); // se van cayendo
      const r = (i % 2 ? 1 : -1) * (7 + ((i * 5) % 9)) * (1 - (1 - (1 - p) * (1 - p)));
      w.style.transform = `translateY(${(-260 * (1 - bounceOut(p)) + 140 * q * q).toFixed(1)}%) rotate(${r.toFixed(2)}deg)`;
      w.style.opacity = (Math.min(1, p * 6) * (1 - q)).toFixed(3);
    });
    pila.chars.forEach((c, j) => {
      const pi = clamp01((g - (2.1 + j * 0.004)) / 0.1);
      const po = clamp01((g - (2.28 + j * 0.007)) / 0.12);
      const e = 1 - (1 - pi) * (1 - pi) * (1 - pi);
      c.style.transform = `translateY(${(70 * (1 - e) - 55 * po).toFixed(1)}%)`;
      c.style.opacity = (pi * (1 - po)).toFixed(3);
      c.style.filter = po > 0.001 ? `blur(${(10 * po).toFixed(1)}px)` : '';
    });
  };
  const setup = () => {
    // hero: visible de entrada (intro temporal), se va en el primer beat
    master.to(T('hero'), { autoAlpha: 0, y: -60, duration: 0.45, ease: 'power2.in' }, 0.15);
    // ruido: título llega desde la izquierda con skew, texto tipeado
    const ru = T('ruido');
    master.fromTo(ru, { autoAlpha: 0, x: -140, skewX: 8 }, { autoAlpha: 1, x: 0, skewX: 0, duration: 0.35, ease: 'power3.out' }, 0.62)
      .to(ru, { autoAlpha: 0, y: 80, duration: 0.22, ease: 'power2.in' }, 1.64);
    // la pila: el ruido, nombrado y olvidado (las palabras las mueve placePila)
    const pi = T('pila');
    master.fromTo(pi, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.02 }, 1.86).to(pi, { autoAlpha: 0, duration: 0.03 }, 2.54);
    pilaSplit();
    // señal: llega desde la derecha por clip, mientras la palabra se levanta de la pila
    const se = T('senal');
    master.fromTo(se, { autoAlpha: 0, clipPath: 'inset(0 0 0 100%)', x: 40 }, { autoAlpha: 1, clipPath: 'inset(0 0 0 0%)', x: 0, duration: 0.36, ease: 'power3.out' }, 2.52)
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
    // mismo brief / otro resultado: la plantilla (una landing de verdad) se reparte
    // como una carta, apagada; la marca son los globos. Después la plantilla se cae
    // a la pila. En el celu van de a una: primero la plantilla, después la marca.
    // Cada tween declara todos sus valores de ida y de vuelta (el scrub va y viene)
    const pl = T('plantilla');
    const pa = pl.querySelector('.pl-a');
    const pb = pl.querySelector('.pl-b');
    const fall = mobile ? END + 0.96 : END + 1.2;
    const bIn = mobile ? END + 1.3 : END + 0.6;
    const fallDur = mobile ? 0.3 : 0.42; // en el celu se va antes de que suban los globos
    const cardIn = { autoAlpha: 1, yPercent: 0, rotationX: 6, rotationY: 14, rotation: -1 };
    gsap.set(tplCard, { transformPerspective: 1600, transformOrigin: '50% 100%' });
    master.fromTo(pl, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.02 }, END + 0.45).to(pl, { autoAlpha: 0, duration: 0.05 }, END + 1.95);
    master
      .fromTo(pa, { autoAlpha: 0, x: -50, y: 0, rotation: 0 }, { autoAlpha: 1, x: 0, y: 0, rotation: 0, duration: 0.25, ease: 'power3.out' }, END + 0.5)
      .fromTo(tplCard, { autoAlpha: 0, yPercent: 35, rotationX: -75, rotationY: 14, rotation: 0 }, { ...cardIn, duration: 0.32, ease: 'back.out(1.3)' }, END + 0.56)
      .fromTo(pa, { autoAlpha: 1, x: 0, y: 0, rotation: 0 }, { autoAlpha: 0, x: 0, y: 140, rotation: -7, duration: 0.32, ease: 'power2.in', immediateRender: false }, fall)
      .fromTo(tplCard, cardIn, { autoAlpha: 0, yPercent: 160, rotationX: 70, rotationY: 30, rotation: -24, duration: fallDur, ease: 'power2.in', immediateRender: false }, fall)
      .fromTo(pb, { autoAlpha: 0, x: 50 }, { autoAlpha: 1, x: 0, duration: 0.25, ease: 'power3.out' }, bIn)
      .fromTo(pb, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.18, immediateRender: false }, END + 1.76);
    // contacto: estampa
    const ct = T('contacto');
    master.fromTo(ct, { autoAlpha: 0, scale: 1.2 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: 'steps(3)' }, END + 2.3);
    // marcadores laterales
  };
  setup();

  // ── el campo sigue al master: par de formas + t local; envión → turbulencia/tintas ──
  let lastBeat = -1;
  let lean = 0;
  let introRunning = true; // mientras corre el splash, el ticker no toca el morph
  const marcaHit = document.getElementById('marca-hit');
  let hitCss = '';
  let mouse = [0, 0, 0];
  const pointer = { x: 0, y: 0 }; // −1..1, para lo que mira al puntero
  // los globos: se inflan al final del splash; después su lugar sale del scroll
  const entry = { on: 0 };
  const inkOut = { v: 0 }; // la tinta que asoma cuando un globo revienta (o se infla)
  const sm = (a, b, v) => {
    const k = Math.max(0, Math.min(1, (v - a) / (b - a)));
    return k * k * (3 - 2 * k);
  };
  const mixf = (a, b, k) => a + (b - a) * k;
  const placeGlobos = (g) => {
    const P = globos.pose;
    if (g < 5) {
      // hero: cuando la tinta se va a armar la plantilla, los globos se van volando
      Object.assign(P, slots.hero);
      P.dir = 1;
      P.away = sm(0.3, 0.75, g);
      P.vis = 1 - sm(0.72, 0.8, g);
    } else {
      // bajan del cielo para 'mismo brief' y se quedan hasta el contacto, donde crecen
      const m = sm(END + 2.32, END + 2.72, g);
      P.x = mixf(slots.right.x, slots.big.x, m);
      P.y = mixf(slots.right.y, slots.big.y, m);
      P.w = mixf(slots.right.w, slots.big.w, m);
      // suben desde abajo (son globos); en el celu, cuando ya se cayó la plantilla
      const land = mobile ? END + 1.32 : END + 0.5;
      P.dir = -1;
      P.away = 1 - sm(land, land + 0.36, g);
      P.vis = sm(land - 0.06, land + 0.04, g);
    }
    P.vis *= entry.on;
  };
  gsap.ticker.add(() => {
    const g = Math.min(NB - 0.0001, Math.max(0, cur.t));
    const b = Math.floor(g);
    const lt = g - b;
    if (b !== lastBeat) {
      lastBeat = b;
      bus.emit('beat', b);
    }
    // cada beat: sostiene la forma armada, viaja en el medio, vuelve a sostener.
    // el sostén manda: las escenas clave se quedan quietas aunque sigas scrolleando
    const isWork = b >= 4 && b < END;
    const HOLD_IN = isWork ? 0.42 : 0.32;
    const HOLD_OUT = isWork ? 0.64 : 0.72;
    const tt = Math.max(0, Math.min(1, (lt - HOLD_IN) / (HOLD_OUT - HOLD_IN)));
    if (!introRunning) {
      // durante la intro, el par y el t los maneja el timeline del splash
      field.setPair(shapes[b], shapes[b + 1]);
      field.state.t = tt;
    }
    // envión: agitación + desregistro que se relaja al frenar
    const L = Math.abs(scrollLean());
    lean += (L - lean) * 0.12;
    field.state.turb = Math.max(0.035 + 0.02 * Math.sin(performance.now() / 1400), Math.min(1, lean * 1.6));
    field.state.mis = Math.max(Math.min(1, lean * 1.4), field.state.pulse || 0); // envión o golpe (click/splash)
    field.state.mouse = mouse;
    placeGlobos(g);
    globos.update(performance.now() / 1000, mouse);
    plantillas.update(g, performance.now() / 1000);
    placePila(g);
    // la impresión de color queda tapada por los globos; asoma cuando uno revienta o cuando se van
    field.state.print = 1 - globos.pose.vis * (1 - globos.pose.away) * (1 - inkOut.v);
    const P = globos.pose;
    const rest = P.vis > 0.99 && P.away < 0.01 && !introRunning;
    // la zona de los globos: el cursor dice 'reventá' (el click lo maneja el escenario)
    if (rest) {
      const hw = P.w / 2;
      const hh = (P.w * 360) / 700 / 2;
      const [sx1, sy1] = field.project(P.x - hw, P.y + hh, 0);
      const [sx2, sy2] = field.project(P.x + hw, P.y - hh, 0);
      const css = `left:${sx1.toFixed(0)}px;top:${sy1.toFixed(0)}px;width:${(sx2 - sx1).toFixed(0)}px;height:${(sy2 - sy1).toFixed(0)}px;pointer-events:auto`;
      if (css !== hitCss) marcaHit.style.cssText = hitCss = css;
    } else if (hitCss) marcaHit.style.cssText = hitCss = '';
    field.render();
    // cada obra tiene su tramo: cuando la tinta aterriza pasa la racleta y queda la
    // hoja 3D con el recorrido corriendo (aunque sigas scrolleando: la hoja se mece
    // con el scroll); cuando arranca la obra siguiente, se levanta hacia la cámara
    const wIdx = Math.floor(g - 4.55);
    if (b >= 3) pliego.prefetch(Math.max(0, Math.min(NW - 1, b - 4)));
    if (wIdx >= 0 && wIdx < NW) {
      const q = g - (4.55 + wIdx); // 0..1 a lo largo del tramo de la obra
      const r = workRects[wIdx];
      const st = { reveal: sm(0.05, 0.19, q), out: sm(0.82, 0.93, q), drift: q, a: 0 };
      st.a = 1 - st.out;
      pliego.show(wIdx, r, st, pointer, performance.now() / 1000);
      field.state.opacity = 1 - 0.8 * st.a * st.reveal; // la tinta se aparta cuando la hoja queda impresa
    } else {
      pliego.hide();
      field.state.opacity = 1;
    }
  });

  // ── intro (tiempo, no scroll): la tinta llega de todos lados y forma la marca ──
  const heroEl = T('hero');
  const heroIn = gsap.timeline({ paused: true });
  {
    const claim = heroEl.querySelector('h1');
    const sub = heroEl.querySelector('.hero-sub');
    const cta = heroEl.querySelector('.cta');
    const hint = heroEl.querySelector('.hint');
    gsap.set([cta, hint], { autoAlpha: 0 });
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
      .to(cta, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'expo.out' }, 0.6)
      .to(hint, { autoAlpha: 1, duration: 0.4 }, 0.9);
  }
  const origSetPair = field.setPair;
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
      entry.on = 1;
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
    // cuando la tinta llega a su lugar, se infla: de la lámina chata a los globos,
    // letra por letra. El claim sube con el último
    const land = go + 1.1;
    tl.add(() => {
      entry.on = 1;
      globos.inflate();
      gsap.fromTo(inkOut, { v: 1 }, { v: 0, duration: 0.9, ease: 'power2.in' });
    }, land).add(() => heroIn.play(), land + 0.3);
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
      pointer.x = Math.sin(t * 0.55) * 0.6;
      pointer.y = Math.sin(t * 0.83 + 1.3) * 0.5;
      globos.tilt.ty = Math.sin(t * 0.55) * 0.35;
      globos.tilt.tx = -Math.sin(t * 0.83 + 1.3) * 0.2;
    });
  } else {
    window.addEventListener('pointermove', (e) => {
      const [wx, wy] = field.unproject(e.clientX, e.clientY);
      mouse = [wx, wy, 1];
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
      // los globos miran al puntero (y el aire que mueve los empuja: ver globos.js)
      globos.tilt.ty = (e.clientX / window.innerWidth - 0.5) * 0.9;
      globos.tilt.tx = (e.clientY / window.innerHeight - 0.5) * 0.6;
    });
    window.addEventListener('pointerleave', () => (mouse = [0, 0, 0]));
  }

  // ── tema: la tinta invierte con el modo noche ──
  const syncTheme = () => {
    field.state.dark = document.documentElement.dataset.theme === 'dark' ? 1 : 0;
    globos.setDark(!!field.state.dark);
  };
  syncTheme();
  bus.on('theme:changed', syncTheme);

  // ── click en la tinta: onda expansiva desde el punto (en touch también).
  // Si toca un globo, lo revienta ──
  const burst = field.state.burst;
  let burstTl = null;
  const wave = (x, y, r0, r1, s0) => {
    burst.x = x;
    burst.y = y;
    burstTl?.kill();
    burstTl = gsap.timeline();
    return burstTl
      .fromTo(burst, { r: r0, s: s0 }, { r: r1, duration: 0.9, ease: 'power2.out' }, 0)
      .to(burst, { s: 0, duration: 0.9, ease: 'power1.in' }, 0)
      .fromTo(field.state, { pulse: 0.8 }, { pulse: 0, duration: 0.6, ease: 'expo.out' }, 0);
  };
  // un globo revienta: la tinta de abajo salta en anillo y el rodillo avanza una tinta
  function inkHit({ x, y, w }) {
    wave(x, y, w * 0.15, w * 0.95, 1.15)
      .to(field.state, { inkShift: '+=0.3334', duration: 0.8, ease: 'expo.out' }, 0)
      .fromTo(inkOut, { v: 1 }, { v: 0, duration: 1.2, ease: 'power2.in' }, 0);
    jolt();
  }
  // el estallido se siente en la tipografía: el titular de la escena salta y se
  // asienta, línea por línea, desde la más cercana a los globos
  function jolt() {
    const g = cur.t;
    const el = g < 1 ? T('hero').querySelector('h1') : g < END + 2.2 ? T('plantilla').querySelector('.pl-b h2') : T('contacto').querySelector('h2');
    const lines = el.querySelectorAll('.ln');
    const targets = lines.length ? [...lines].reverse() : [el];
    gsap.timeline()
      .to(targets, { y: 9, duration: 0.07, ease: 'power3.out', stagger: 0.035 })
      .to(targets, { y: 0, duration: 0.9, ease: 'elastic.out(1.1, 0.32)', stagger: 0.035 }, 0.07);
  }
  // ── easter egg: si reventás los cuatro globos en menos de 5 segundos, la tinta
  // festeja y sale un cupón del 20%. Desde ahí el código viaja en cada whatsapp ──
  const cupon = document.getElementById('cupon');
  const ticket = cupon.firstElementChild;
  const popped = [0, 0, 0, 0];
  const openCupon = () => {
    setEgg();
    chime(0.42); // después del último estallido
    gsap.delayedCall(0.2, () => {
      wave(globos.pose.x, globos.pose.y, 0, 130, 1.5);
      spliceFlash();
    });
    cupon.hidden = false;
    gsap.fromTo(
      ticket,
      { autoAlpha: 0, scale: 1.8, rotation: -16 },
      { autoAlpha: 1, scale: 1, rotation: -3, duration: 0.42, ease: 'steps(4)', delay: 0.32, onComplete: () => cupon.querySelector('.cupon-cta').focus({ preventScroll: true }) }
    );
  };
  const closeCupon = () => {
    if (cupon.hidden) return;
    gsap.to(ticket, { autoAlpha: 0, scale: 0.92, duration: 0.2, ease: 'power2.in', onComplete: () => (cupon.hidden = true) });
  };
  cupon.querySelector('.cupon-x').addEventListener('click', closeCupon);
  cupon.querySelector('.cupon-cta').addEventListener('click', () => setTimeout(closeCupon, 400));
  addEventListener('keydown', (e) => e.key === 'Escape' && closeCupon());
  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button')) return;
    const [wx, wy] = field.unproject(e.clientX, e.clientY);
    const li = introRunning ? -1 : globos.hit(wx, wy);
    if (li >= 0) {
      // suena en el cuadro en que revienta (el audio se arranca acá, dentro del click)
      if (globos.pop(li, () => inkHit(globos.center(li)))) {
        popSound(0.12);
        const now = performance.now();
        popped[li] = now;
        if (popped.every((p) => now - p < 5000)) {
          popped.fill(0);
          openCupon();
        }
      }
      return;
    }
    wave(wx, wy, 0, 70, 1);
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
