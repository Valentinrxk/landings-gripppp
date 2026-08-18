// Plantilla → marca: la racleta es la manija. El cuadro es un
// img-comparison-slider: izquierda (arriba en el celu) la landing impresa,
// derecha la plantilla genérica dibujada en código. El scroll tira de la hoja
// en poses (timeline scrubeada, steps); la mano la agarra y manda 2.5s. Pegada
// atrás de la hoja viaja la tinta fresca: la misma landing todavía en matriz
// de glifos, desregistrada mientras se mueve, que se afina cuando frena.
// La plantilla carga mal a propósito, queda opaca y pierde cuando caen los
// sellos. Nunca borra del todo: 6%..88%, las dos mitades quedan para comparar.
import 'img-comparison-slider';
import 'img-comparison-slider/dist/styles.css';
import '../styles/plantilla.css';
import { gsap, ScrollTrigger, Observer, scrollLean } from '../core/scroll.js';
import { shutter, DIGITS, clamp01 } from '../core/beat.js';
import { bus } from '../core/bus.js';
import { createPrinter, loadImage } from '../print/ascii.js';
import { cut } from '../systems/cuts.js';
import { spliceFlash } from '../systems/flash.js';
import { t } from '../data/i18n.js';

const V_MIN = 6; // nunca borra del todo
const V_MAX = 88;
const HOLD_MS = 2500; // la mano manda este tiempo después del último arrastre
const CHASE = 6; // % por cuadro: la hoja tiene peso, no teletransporta
const PAPEL = '#f4f1ea';

export function initAntes(ctx) {
  const sec = document.querySelector('.s-antes');
  if (!sec) return;
  const cmp = sec.querySelector('.ad-cmp');
  if (!cmp) return;
  const tpl = cmp.querySelector('.ad-tpl');
  const print = cmp.querySelector('.ad-print');
  const racl = cmp.querySelector('.ad-racleta');
  const ink = racl.querySelector('.ad-ink');
  const tags = [...sec.querySelectorAll('.ad-tag')];
  const valEl = sec.querySelector('.cell-val');
  const valN = valEl?.querySelector('b');
  const cookie = tpl.querySelector('.tpl-cookie');
  const tplHero = tpl.querySelector('.tpl-hero');
  const tplNav = tpl.querySelector('.tpl-nav');
  const tplCta = tpl.querySelector('.tpl-nav b');
  const cards = tpl.querySelectorAll('.tpl-cards > *');

  let vertical = matchMedia('(max-width: 720px)').matches;
  const fine = !ctx.coarse && matchMedia('(pointer: fine)').matches;

  // ── configuración del slider ──
  // Poses duras: el componente arma una transición de 100ms en cada set de
  // .value; la anulamos. En vertical el componente rota la manija 90°: no —
  // la racleta horizontal la maquetamos nosotros (canvas sin rotar).
  const root = cmp.shadowRoot;
  if (root) {
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(
        '.first-overlay-container,.handle-container{transition:none!important}' +
          '.vertical .handle{transform:translate(calc(-50% - .5px),-50%)}'
      );
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
    } catch {
      /* sin constructable stylesheets: la manija rota; aceptable */
    }
  }
  cmp.direction = vertical ? 'vertical' : 'horizontal';
  // touch: solo la hoja arrastra (el swipe sobre el cuadro sigue siendo scroll
  // nativo). Puntero fino: se agarra desde cualquier punto del cuadro.
  cmp.handle = !fine;
  // foco visible solo desde teclado (el click programático del componente lo dispara)
  cmp.addEventListener('pointerdown', () => cmp.classList.add('is-pointer'));
  cmp.addEventListener('keydown', () => cmp.classList.remove('is-pointer'));
  const setCursor = () => cmp.setAttribute('data-cursor', t('ad.drag'));
  setCursor();
  bus.on('i18n:changed', setCursor);

  // ── medidas: largo de la hoja, ancho de la franja fresca ──
  let W = 0;
  let H = 0;
  let band = 0;
  let printer = null;
  let inkKey = '';
  const measure = () => {
    const r = cmp.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    const across = vertical ? H : W;
    band = Math.round(Math.max(64, Math.min(200, across * 0.13)));
    cmp.style.setProperty('--ad-len', `${vertical ? W : H}px`);
    cmp.style.setProperty('--ad-band', `${band}px`);
    // la impresora dibuja la franja: celda gruesa mojada → fina seca
    printer = createPrinter(ink, {
      cellMax: Math.round(Math.max(12, Math.min(24, across / 56))),
      cellMin: Math.round(Math.max(5, Math.min(9, across / 160))),
      inks: ['#f0403c', '#5fa8e0', '#111111'],
      ramp: 1.25, // un poco más densa que en la cinta: es tinta, no boceto
    });
    // la impresora mide el canvas por su rect: sin la rotación de la entrada
    const tf = racl.style.transform;
    racl.style.transform = 'none';
    printer.resize();
    racl.style.transform = tf;
    inkKey = '';
  };

  // ── static (reduced motion): la composición final, quieta ──
  if (ctx.tier === 'static') {
    cmp.value = 50;
    tpl.classList.add('is-flat');
    gsap.set(tags, { autoAlpha: 1 });
    if (valN) valN.textContent = '50%';
    measure();
    return;
  }

  // ── la tinta fresca viaja con la hoja ──
  // El canvas vive en el slot de la manija (se mueve gratis). Cada cuadro
  // recortamos del jpg la franja que quedó detrás de la hoja (misma
  // geometría object-fit:cover que la imagen de abajo) y la impresora la
  // dibuja en glifos: gruesa y desregistrada si la hoja se mueve, fina y
  // registrada cuando frena. Alfa: 1 en la hoja → 0 hacia lo seco.
  const crop = document.createElement('canvas');
  const cctx = crop.getContext('2d');
  let img = null;
  let wet = 1;
  let wetPointer = 0;
  let lastV = -1;
  loadImage(print).then((ok) => {
    if (!ok) return;
    img = ok;
    inkKey = '';
    ScrollTrigger.refresh();
  });

  function drawInk(v) {
    if (!img || !printer || !W) return;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(W / iw, H / ih);
    const ox = (W - iw * scale) / 2;
    const oy = (H - ih * scale) / 2;
    // recorte en px del cuadro: la franja pegada detrás de la hoja
    let sx = 0;
    let sy = 0;
    let sw = W;
    let sh = H;
    if (vertical) {
      sy = (v / 100) * H - band;
      sh = band;
    } else {
      sx = (v / 100) * W - band;
      sw = band;
    }
    const p = 0.62 - wet * 0.5; // mojado = grueso/desregistrado, seco = fino/registrado
    const st = printer.stateFor(p);
    const key = `${Math.round(vertical ? sy : sx)}|${st.cell}|${st.off}|${wet.toFixed(2)}`;
    if (key === inkKey) return;
    inkKey = key;
    if (crop.width !== sw || crop.height !== sh) {
      crop.width = sw;
      crop.height = sh;
    }
    cctx.fillStyle = PAPEL;
    cctx.fillRect(0, 0, sw, sh);
    cctx.drawImage(img, (sx - ox) / scale, (sy - oy) / scale, sw / scale, sh / scale, 0, 0, sw, sh);
    printer.setSource(crop);
    printer.draw(p);
    // post: rampa de alfa (tinta fresca junto a la hoja, seca lejos), lavado
    // de papel debajo y el borde de tinta desregistrado contra la goma
    const g = ink.getContext('2d');
    const a = 0.5 + 0.5 * wet;
    const grad = vertical ? g.createLinearGradient(0, 0, 0, band) : g.createLinearGradient(0, 0, band, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.35, `rgba(0,0,0,${(a * 0.3).toFixed(3)})`);
    grad.addColorStop(1, `rgba(0,0,0,${a.toFixed(3)})`);
    g.save();
    g.globalCompositeOperation = 'destination-in';
    g.fillStyle = grad;
    g.fillRect(0, 0, sw, sh);
    g.globalCompositeOperation = 'destination-over';
    const wash = vertical ? g.createLinearGradient(0, 0, 0, band) : g.createLinearGradient(0, 0, band, 0);
    wash.addColorStop(0, 'rgba(244,241,234,0)');
    wash.addColorStop(0.5, `rgba(244,241,234,${(0.55 * a).toFixed(3)})`);
    wash.addColorStop(1, `rgba(244,241,234,${(0.96 * a).toFixed(3)})`);
    g.fillStyle = wash;
    g.fillRect(0, 0, sw, sh);
    g.globalCompositeOperation = 'source-over';
    const off = Math.max(1, st.off);
    g.globalAlpha = 0.35 + 0.45 * wet;
    g.fillStyle = '#f0403c';
    if (vertical) g.fillRect(0, band - 2 - off, sw, 1);
    else g.fillRect(band - 2 - off, 0, 1, sh);
    g.fillStyle = '#5fa8e0';
    if (vertical) g.fillRect(0, band - 2 - off * 2, sw, 1);
    else g.fillRect(band - 2 - off * 2, 0, 1, sh);
    g.restore();
  }

  // ── el scroll tira de la hoja: timeline scrubeada, en poses ──
  // beats: hold (se lee la cabecera) → anticipo (la hoja carga tinta hacia
  // atrás) → la pasada (steps: ~2% por pose) → asienta con un pelo de
  // sobrepaso → hold para comparar.
  const state = { sv: V_MIN };
  gsap
    .timeline({ scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 0.5 } })
    .to(state, { sv: V_MIN - 3, duration: 0.04, ease: 'steps(2)' }, 0.08)
    .to(state, { sv: V_MAX + 2, duration: 0.66, ease: 'steps(45)' }, 0.12)
    .to(state, { sv: V_MAX, duration: 0.03, ease: 'steps(1)' }, 0.8)
    .set({}, {}, 1); // el resto es hold: se comparan las dos mitades

  let live = false;
  ScrollTrigger.create({ trigger: sec, start: 'top bottom', end: 'bottom top', onToggle: (s) => (live = s.isActive) });

  // la mano manda: 'slide' solo lo dispara input real (drag, touch, teclado)
  let userHold = 0;
  let shown = V_MIN;
  cmp.addEventListener('slide', () => {
    userHold = performance.now() + HOLD_MS;
    shown = cmp.value;
  });

  // ── coreografía de entrada: la plantilla carga mal, la racleta cae con corte ──
  gsap.set(print, { autoAlpha: 0 }); // la tinta llega con la hoja
  const inX = vertical ? { y: -40, rotate: 3 } : { x: -40, rotate: -4 };
  let entered = false; // la coreografía terminó (idle recién ahí)
  let landed = false; // la hoja ya cayó: recién ahí el scroll tira de ella
  const enter = gsap
    .timeline({ paused: true, onComplete: () => (entered = true) })
    .from(tplNav, { autoAlpha: 0, ...shutter(1 / 12) }, 0)
    .call(() => tplHero.classList.add('is-fouc'), null, 0.35)
    .from(tplHero, { autoAlpha: 0, ...shutter(1 / 12) }, 0.35)
    .call(() => tplHero.classList.remove('is-fouc'), null, 0.35 + 3 / 12) // 3 poses sin css
    .from(cards, { autoAlpha: 0, y: 24, stagger: 2 / 12, ...shutter(0.25) }, 0.75)
    .call(cut, null, 1.3)
    .from(racl, { ...inX, autoAlpha: 0, ...shutter(0.25) }, 1.3)
    .set(print, { autoAlpha: 1 }, 1.3 + 2 / 12)
    .call(() => (landed = true), null, 1.3 + 3 / 12)
    .from(cookie, { yPercent: 140, ...shutter(0.34) }, 1.5);
  ScrollTrigger.create({ trigger: sec, start: 'top 60%', once: true, onEnter: () => enter.play() });

  // ── sellos: caen a mano en 2 poses cuando la hoja pasa la mitad ──
  let tagsDone = false;
  const landTags = () => {
    tagsDone = true;
    tpl.classList.add('is-flat'); // la plantilla pierde
    spliceFlash();
    gsap.fromTo(
      tags,
      { autoAlpha: 0, '--pop': 1.9 },
      { autoAlpha: 1, '--pop': 1, stagger: 1 / 12, ...shutter(2 / 12), overwrite: true }
    );
  };
  const liftTags = () => {
    tagsDone = false;
    tpl.classList.remove('is-flat');
    gsap.to(tags, { autoAlpha: 0, ...shutter(1 / 12), overwrite: true });
  };

  // ── el obturador commitea: valor, franja, rótulo ──
  let shownVal = -1;
  let rect = null;
  bus.on('frame', (f) => {
    if (!live) return;
    if (!landed) {
      shown = V_MIN; // la hoja todavía no cayó: no tira
    } else if (performance.now() < userHold) {
      shown = cmp.value; // la mano tiene la hoja
    } else {
      const d = state.sv - shown;
      shown = Math.abs(d) <= CHASE ? state.sv : shown + Math.sign(d) * CHASE;
      const n = Math.round(shown);
      if (cmp.value !== n) cmp.value = n;
    }
    const v = Math.round(cmp.value); // arrastrando llega con decimales
    // mojado: cuánto se movió la hoja este cuadro (+ envión del scroll, + arrastre)
    const dv = lastV < 0 ? 0 : Math.abs(v - lastV);
    lastV = v;
    wet = Math.max(clamp01(dv / 5), wetPointer, Math.abs(scrollLean()) * 0.5, wet - 0.14);
    if (wet < 0.02) wet = 0;
    drawInk(v);
    if (!tagsDone && v > 50) landTags();
    else if (tagsDone && v < 30) liftTags();
    if (f % 3 === 0 && valN) {
      if (v !== shownVal) {
        shownVal = v;
        valEl.classList.add('is-live');
        gsap.to(valN, {
          scrambleText: { text: `${String(v).padStart(2, '0')}%`, chars: DIGITS, tweenLength: false, speed: 0.8 },
          overwrite: true,
          ...shutter(0.25),
        });
      } else if (f % 6 === 0) valEl.classList.remove('is-live');
    }
    if (f % 12 === 0 && fine) rect = cmp.getBoundingClientRect();
  });

  // ── puntero: cerca de la hoja, la hoja avisa; arrastrando rápido, re-moja ──
  if (fine) {
    Observer.create({
      target: cmp,
      type: 'pointer',
      preventDefault: false,
      onMove: (o) => {
        if (!rect) rect = cmp.getBoundingClientRect();
        const px = vertical ? o.y - rect.top : o.x - rect.left;
        const bx = (cmp.value / 100) * (vertical ? rect.height : rect.width);
        racl.classList.toggle('is-near', Math.abs(px - bx) < 48);
        if (o.isDragging) wetPointer = clamp01(Math.abs(vertical ? o.velocityY : o.velocityX) / 1600);
      },
      onDragEnd: () => (wetPointer = 0),
      onHoverEnd: () => racl.classList.remove('is-near'),
    });
  }

  // ── idle: la plantilla insiste, la hoja brilla ──
  bus.on('idle:beat', (f) => {
    if (!live || !entered) return;
    gsap.fromTo(racl, { '--spec': '-120%' }, { '--spec': '520%', ...shutter(5 / 12) });
    if (f % 108 === 0) gsap.fromTo(cookie, { yPercent: 140 }, { yPercent: 0, ...shutter(4 / 12) }); // el banner vuelve
    else if (f % 72 === 0 && tplCta) gsap.fromTo(tplCta, { scale: 1.14 }, { scale: 1, ...shutter(2 / 12) }); // el "cotizar" late
  });

  // ── medidas: al cargar, al cambiar de tamaño y de eje ──
  measure();
  const ro = new ResizeObserver(() => {
    measure();
    if (fine) rect = null;
  });
  ro.observe(cmp);
  bus.on('resize', () => {
    const vNow = matchMedia('(max-width: 720px)').matches;
    if (vNow !== vertical) {
      vertical = vNow;
      const hold = userHold;
      userHold = 0;
      cmp.direction = vertical ? 'vertical' : 'horizontal'; // dispara 'slide' interno
      userHold = hold;
      shown = state.sv;
    }
    measure();
  });
}
