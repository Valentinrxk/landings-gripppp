// Pliegos: cinta horizontal arrastrada por el scroll vertical (viewport sticky).
// La cinta está SCRUBEADA (scroll = cinta, con un poco de peso); los rótulos NO:
// entran en tiempo, en poses de 12fps, cuando su pliego cruza hacia el centro.
// Ese contraste es lo que se siente vivo. Cada pliego se IMPRIME cerca del
// centro — pero el registro solo se logra al frenar: mientras la cinta corre,
// la tinta vuelve a ruido plateado (la máquina no registra en movimiento). Al
// registrar, el sello "impreso" cae en 2 poses con un cuadro de luz. El mouse
// por fin recibe algo: la captura real, el borde rojo, la inclinación.
import { gsap, ScrollTrigger, SplitText, scrollLean, lenis } from '../core/scroll.js';
import { shutter, clamp01, GLYPHS } from '../core/beat.js';
import { bus } from '../core/bus.js';
import { spliceFlash } from '../systems/flash.js';
import { createPrinter, loadImage } from '../print/ascii.js';
import { DICT, lang } from '../data/i18n.js';
import '../styles/pliegos.css';

const START = 0.04; // la cinta arranca a moverse un poco después de pegarse (la línea se dibuja)
const END = 0.9; // y llega al cierre con tiempo de lectura de sobra
const LAG = 0.05; // los rótulos van 5% más lentos que la cinta: capa profunda (sin pisar al vecino)
const SLIDE = 3.7; // la hoja desliza dentro del marco (% del marco): otra capa
const pad = (n, w) => String(n).padStart(w, '0');
// texto i18n vigente de un nodo [data-i18n] (null si no está traducido)
const t = (el) => (el?.dataset?.i18n ? DICT[lang]?.[el.dataset.i18n] ?? null : null);

export function initPliegos(ctx) {
  const sec = document.querySelector('.s-pliegos');
  if (!sec) return;
  // reduced-motion: la composición final la pone el CSS (tier static)
  if (ctx.tier === 'static') return;
  sec.classList.add('is-live');

  const track = sec.querySelector('.pl-track');
  const opener = sec.querySelector('.pl-opener');
  const arrowLine = sec.querySelector('.pl-arrow-line');
  const arrowHead = sec.querySelector('.pl-arrow-head');
  const fEl = sec.querySelector('.pl-f');
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  // ── unidades: 4 pliegos impresos + el pliego cinco en blanco ──
  const units = [...sec.querySelectorAll('.pliego')].map((art, i) => {
    const screen = art.querySelector('.pl-screen');
    const u = {
      art,
      idx: i + 1,
      screen,
      frame: screen || art.querySelector('.pl-blank'),
      sheet: art.querySelector('.pl-sheet'),
      canvas: art.querySelector('.pl-ascii'),
      img: art.querySelector('.pl-real'),
      racleta: art.querySelector('.pl-racleta'),
      stamp: art.querySelector('.pl-stamp-hit'),
      num: art.querySelector('.pl-n'),
      domain: art.querySelector('.pl-domain'),
      info: art.querySelector('.pl-info'),
      h3: art.querySelector('.pl-info h3'),
      p: art.querySelector('.pl-info p'),
      link: art.querySelector('.pl-info a'),
      regs: [...art.querySelectorAll('.pl-reg circle, .pl-reg line')],
      word: art.querySelector('.pl-tuya'),
      cx: 0,
      hw: 0,
      rel: 2,
      vis: false,
      in: false, // rótulos adentro
      reg: false, // registrado (impreso y quieto)
      ready: false,
      lastP: 0,
      lastTx: '',
      tl: null,
      split: null,
      lines: null,
    };
    if (screen && u.canvas && u.img) {
      const w = u.canvas.clientWidth || 900;
      const opts = {
        cellMax: Math.max(10, Math.round(w / 40)),
        cellMin: Math.max(5, Math.round(w / (ctx.tier === 'lite' ? 110 : 140))),
        inks: ['#f0403c', '#5fa8e0', '#111111'],
        paper: '#cfd0d6', // la matriz tapa la captura: la hoja se revela solo donde pasó la racleta
        ramp: 0.9,
      };
      u.printer = createPrinter(u.canvas, opts);
      // hover: la máquina enfoca — una celda más fina (mismo canvas, otra matriz)
      u.printerFine = createPrinter(u.canvas, { ...opts, cellMin: Math.max(4, opts.cellMin - 2) });
      u.cur = u.printer;
      loadImage(u.img).then((ok) => {
        if (!ok) {
          u.canvas.style.display = 'none';
          return;
        }
        u.printer.setSource(u.img);
        u.printerFine.setSource(u.img);
        u.printer.resize();
        u.printerFine.resize();
        u.cur.setSource(u.img);
        u.ready = true;
        apply(u, 0, 0); // primer cuadro: ruido, nunca la captura desnuda
      });
    }
    // estado inicial de los rótulos: escondidos hasta que su pliego cruce al centro
    gsap.set([u.h3, u.p, u.link, u.word].filter(Boolean), { autoAlpha: 0 });
    if (u.regs.length) gsap.set(u.regs, { drawSVG: '0%' });
    if (u.num) u.num.textContent = '00';
    return u;
  });

  // ── medidas: recorrido de la cinta y altura de la escena (scroll = cinta) ──
  let maxShift = 0;
  let travel = 0;
  let vw = window.innerWidth;
  const measure = () => {
    vw = window.innerWidth;
    gsap.set(track, { skewX: 0 });
    maxShift = Math.max(0, track.scrollWidth - vw);
    travel = Math.round(maxShift / (END - START));
    sec.style.height = `${travel + window.innerHeight}px`;
    const tr = track.getBoundingClientRect();
    for (const u of units) {
      const r = u.frame.getBoundingClientRect();
      u.cx = r.left + r.width / 2 - tr.left;
      u.hw = r.width / 2;
      if (u.ready) {
        u.printer.resize();
        u.printerFine.resize();
        u.cur.setSource(u.img);
        apply(u, u.lastP, 0);
      }
    }
  };
  measure();
  ScrollTrigger.addEventListener('refreshInit', measure);

  // ── la cinta: una sola timeline scrubeada, con carriles a distinta velocidad ──
  const belt = gsap.timeline({
    scrollTrigger: {
      trigger: sec,
      start: 'top top',
      end: () => '+=' + travel,
      scrub: 0.6,
      invalidateOnRefresh: true,
    },
  });
  belt
    .fromTo(track, { x: 0 }, { x: () => -maxShift, ease: 'none', duration: END - START }, START)
    // el opener es primer plano: se va más rápido
    .fromTo(opener, { x: 0 }, { x: () => -maxShift * 0.15, ease: 'none', duration: 0.25 }, START)
    // indicador de cinta: la hairline se dibuja en 12 poses mientras la cinta arranca
    .fromTo(arrowLine, { drawSVG: '0%' }, { drawSVG: '100%', ease: 'steps(12)', duration: START + 0.02 }, 0)
    .fromTo(arrowHead, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.004, ease: 'steps(1)' }, START + 0.016);
  // rótulos: capa profunda (8% más lentos), alineados con su marco justo en el centro
  for (const u of units) {
    if (!u.info) continue;
    belt.fromTo(
      u.info,
      { x: () => -LAG * (u.cx - vw / 2) },
      { x: () => -LAG * (u.cx - maxShift - vw / 2), ease: 'none', duration: END - START },
      START
    );
  }
  belt.to({}, { duration: 1 - END }, END); // hold de lectura al final
  const st = belt.scrollTrigger;

  // ── perf gate: solo trabajamos con la escena en pantalla ──
  let live = false;
  ScrollTrigger.create({ trigger: sec, start: 'top bottom', end: 'bottom top', onToggle: (s) => (live = s.isActive) });

  // ── impresión de una unidad: p ∈ [0,1] → matriz + racleta + clip ──
  function apply(u, p, tx) {
    if (!u.ready) return;
    u.lastP = p;
    const stt = u.cur.draw(p);
    if (!stt) return;
    const sweep = stt.sweep;
    if (sweep < 0) {
      if (u.canvas.style.clipPath !== 'none') u.canvas.style.clipPath = 'none';
      u.racleta.style.visibility = 'hidden';
      return;
    }
    // borde de tinta en % del marco; la hoja mide 108% y está corrida (SLIDE)
    const edge = sweep * 100;
    const sheetL = -4 + tx * 1.08;
    const P = Math.max(0, Math.min(100, (edge - sheetL) / 1.08));
    u.canvas.style.clipPath = `inset(0 0 0 ${P.toFixed(2)}%)`;
    u.racleta.style.left = `${edge.toFixed(2)}%`;
    u.racleta.style.visibility = edge >= 100 ? 'hidden' : 'visible';
  }

  // registro: el sello cae en 2 poses (grande y torcido → apoyado) con un cuadro de luz
  function register(u) {
    u.reg = true;
    u.screen.classList.add('is-reg');
    gsap.killTweensOf(u.stamp);
    gsap.fromTo(u.stamp, { scale: 1.8, rotation: -12 }, { scale: 1, rotation: -4, duration: 2 / 12, ease: 'steps(2)' });
    if (Math.abs(u.rel) < 0.7) {
      spliceFlash();
      bus.emit('stamp:land', u.art);
    }
  }
  function unregister(u) {
    u.reg = false;
    u.screen.classList.remove('is-reg');
    gsap.killTweensOf(u.stamp);
    gsap.set(u.stamp, { scale: 1, rotation: -4 });
  }

  // ── tick del obturador (12fps): registro, hoja, entradas, envión ──
  let skew = 0;
  let lastSkew = 0;
  let centre = null;
  bus.on('frame', (f) => {
    if (!live) return;
    const lean = scrollLean();
    // la cinta se inclina con el envión y se endereza sola — en poses
    skew += (-lean * 3.5 - skew) * 0.35;
    const sk = Math.abs(skew) < 0.02 ? 0 : +skew.toFixed(2);
    if (sk !== lastSkew) {
      gsap.set(track, { skewX: sk });
      lastSkew = sk;
    }
    const trackX = gsap.getProperty(track, 'x');
    const moving = Math.abs(lean) > 0.08;
    const noise = Math.min(0.85, Math.abs(lean) * 1.6);
    let best = Infinity;
    centre = null;
    for (const u of units) {
      const cx = u.cx + trackX;
      if (cx + u.hw < -vw * 0.3 || cx - u.hw > vw * 1.3) {
        u.vis = false;
        continue; // fuera: no gastar
      }
      u.vis = true;
      const off = cx - vw / 2;
      // +1 lejos a la derecha → 0 en el centro → −1 a la izquierda
      const rel = off / (vw * 0.55);
      u.rel = rel;
      if (Math.abs(off) < best) {
        best = Math.abs(off);
        centre = u;
      }
      // la hoja desliza sobre la cinta (capa más profunda que el marco)
      const tx = -Math.max(-1, Math.min(1, rel)) * SLIDE;
      if (u.sheet) {
        const v = tx.toFixed(2);
        if (v !== u.lastTx) {
          u.sheet.style.translate = `${v}% 0`;
          u.lastTx = v;
        }
      }
      // rótulos: entran al cruzar ~el 55% hacia el centro (el primer pliego ya
      // llega rotulado a la escena), se van por debajo del 30%
      const base = clamp01(1 - (rel - 0.15)); // registra un poco antes del centro
      const want = base >= 0.55 ? true : base < 0.3 ? false : u.in;
      if (want !== u.in) {
        u.in = want;
        if (u.tl) want ? u.tl.play() : u.tl.reverse();
      }
      if (!u.printer) continue;
      // impresión: cerca del centro y quieto. en movimiento, la tinta se pierde.
      let pe = base * (1 - noise);
      if (u.reg && pe >= 0.9 && !moving) pe = 1; // registrado: sostiene la tinta hasta que haya movimiento real
      apply(u, pe, tx);
      if (!u.reg && pe >= 0.999) register(u);
      else if (u.reg && pe < 0.9) unregister(u);
    }
    // el pliego de la casa expone el cuadro vivo
    if (fEl) fEl.textContent = `f ${pad(f % 100000, 5)}`;
  });

  // idle: el sello del pliego centrado se vuelve a prensar; el pliego en blanco parpadea su línea de corte
  bus.on('idle:beat', () => {
    if (!live || !centre) return;
    if (centre.printer && centre.reg) {
      gsap.fromTo(centre.stamp, { scale: 1.12 }, { scale: 1, duration: 2 / 12, ease: 'steps(2)' });
    } else if (centre.word && centre.in) {
      gsap.fromTo(centre.word, { opacity: 0.25 }, { opacity: 1, duration: 2 / 12, ease: 'steps(2)' });
    }
  });

  // ── entrada de rótulos por unidad: time-based, en poses ──
  const buildEntrance = (u) => {
    const tl = gsap.timeline({ paused: true });
    // h3: sello (2 poses)
    if (u.h3) tl.fromTo(u.h3, { autoAlpha: 0, scale: 1.2, rotation: -2 }, { autoAlpha: 1, scale: 1, rotation: 0, ...shutter(2 / 12) }, 0);
    // párrafo: líneas que salen de la máscara
    if (u.p) tl.set(u.p, { autoAlpha: 1 }, 0.1);
    if (u.lines?.length) tl.fromTo(u.lines, { yPercent: 110 }, { yPercent: 0, stagger: 1 / 12, ...shutter(4 / 12) }, 0.1);
    // link / cta: aparece corrido
    if (u.link) tl.fromTo(u.link, { autoAlpha: 0, x: -8 }, { autoAlpha: 1, x: 0, ...shutter(2 / 12) }, 0.4);
    // el rótulo "01 / 04" cuenta desde 00 en 3 ticks
    if (u.num) {
      const o = { n: u.idx - 3 };
      tl.to(o, { n: u.idx, duration: 3 / 12, ease: 'steps(3)', onUpdate: () => (u.num.textContent = pad(Math.max(0, Math.round(o.n)), 2)) }, 0);
    }
    // el dominio lo tipea la máquina (texto de la fuente de verdad: el diccionario)
    if (u.domain) {
      const text = t(u.domain) ?? u.domain.textContent;
      u.domain.textContent = text;
      tl.to(u.domain, { scrambleText: { text, chars: GLYPHS, tweenLength: false, speed: 0.8 }, ...shutter(4 / 12) }, 0);
    }
    // pliego en blanco: marcas de registro dibujadas, la línea de corte aparece en 1 pose
    if (u.regs.length) tl.fromTo(u.regs, { drawSVG: '0%' }, { drawSVG: '100%', stagger: 0.03, ...shutter(5 / 12) }, 0.05);
    if (u.word) tl.fromTo(u.word, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1 / 12, ease: 'steps(1)' }, 0.5);
    return tl;
  };
  const splitAndBuild = (u) => {
    if (!u.p) {
      u.tl = buildEntrance(u);
      if (u.in) u.tl.progress(1);
      return;
    }
    u.split = SplitText.create(u.p, {
      type: 'lines',
      mask: 'lines',
      tag: 'span',
      autoSplit: true,
      linesClass: 'pl-line',
      onSplit: (self) => {
        u.lines = self.lines;
        const tl = buildEntrance(u);
        u.tl = tl;
        if (u.in) tl.progress(1);
        // al re-splitear (resize / fuente / idioma) SplitText restaura el tiempo; retomamos el sentido
        queueMicrotask(() => u.tl === tl && (u.in ? tl.play() : tl.reverse()));
        return tl;
      },
    });
  };
  // las fuentes deciden dónde caen las líneas: recién ahí se splitea
  document.fonts.ready.then(() => units.forEach(splitAndBuild));

  // idioma: revertir el split (eso también revierte la timeline y sus textos),
  // volver a poner los textos del idioma nuevo, re-splitear (la timeline se reconstruye)
  bus.on('i18n:changed', () => {
    for (const u of units) {
      if (!u.split) continue;
      u.split.revert();
      [u.p, u.h3, u.domain, u.word].forEach((el) => {
        const v = t(el);
        if (v != null) el.textContent = v;
      });
      u.split.split();
    }
  });

  // ── hover (puntero fino): inclinación 3D siguiendo al puntero + matriz más fina ──
  if (fine) {
    for (const u of units) {
      if (!u.printer) continue;
      const rx = gsap.quickTo(u.screen, 'rotationX', { duration: 0.5, ease: 'expo.out' });
      const ry = gsap.quickTo(u.screen, 'rotationY', { duration: 0.5, ease: 'expo.out' });
      const focus = (on) => {
        u.cur = on ? u.printerFine : u.printer;
        if (u.ready) u.cur.setSource(u.img);
      };
      u.screen.addEventListener('pointerenter', () => focus(true));
      u.screen.addEventListener('pointermove', (e) => {
        const r = u.screen.getBoundingClientRect();
        const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
        const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
        ry(nx * 2);
        rx(-ny * 2);
      });
      u.screen.addEventListener('pointerleave', () => {
        focus(false);
        rx(0);
        ry(0);
      });
    }
    // CTA magnético con detentes: una palanca de prensa, no un botón de framer
    const cta = sec.querySelector('.pl-cierre .cta');
    if (cta && !cta.dataset.magnet) {
      cta.dataset.magnet = '1';
      const qx = gsap.quickTo(cta, 'x', { duration: 0.25, ease: 'steps(3)' });
      const qy = gsap.quickTo(cta, 'y', { duration: 0.25, ease: 'steps(3)' });
      cta.addEventListener('pointermove', (e) => {
        const r = cta.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        qx(Math.round((dx * 0.28) / 3) * 3);
        qy(Math.round((dy * 0.28) / 3) * 3);
      });
      cta.addEventListener('pointerleave', () => {
        qx(0);
        qy(0);
      });
    }
  }

  // teclado: el transform no es scrolleable → al enfocar una pieza llevamos
  // el scroll vertical al punto que la encuadra
  for (const u of units) {
    u.art.querySelectorAll('a').forEach((a) =>
      a.addEventListener('focus', () => {
        if (!maxShift) return;
        const shift = u.cx - vw / 2;
        const t = Math.max(0, Math.min(1, shift / maxShift));
        const y = st.start + (START + t * (END - START)) * (st.end - st.start);
        if (lenis) lenis.scrollTo(y, { immediate: true });
        else window.scrollTo(0, y);
      })
    );
  }
}
