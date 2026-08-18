// Hero: la palabra "landings" arranca DESPLEGADA sobre la mesa (una letra por
// columna). Al terminar el splash la máquina habla en UN solo timeline: la
// racleta imprime el ruido→tinta, las letras se juntan en 10 poses (con un
// sobrepaso de 2 cuadros), el claim sube desde su máscara, la máquina tipea el
// kicker, la ficha se apoya sobre la mesa y cae el sello "registrado". El
// scroll vuelve a separar la palabra (el pliego se va). La ficha expone
// valores REALES: registro (--mis-x), obturador (contador de cuadros), serie
// (cada reimpresión). El h1 real está debajo (SEO/a11y); el canvas dibuja la
// matriz. Sin JS la página está impresa (composición final).
import '../styles/hero.css';
import { bus } from '../core/bus.js';
import { gsap, ScrollTrigger, SplitText, scrollLean } from '../core/scroll.js';
import { shutter, GLYPHS, DIGITS, scramble } from '../core/beat.js';
import { createPrinter } from '../print/ascii.js';
import { clock } from '../core/frameClock.js';
import { frameRand } from '../core/rng.js';
import { watch } from '../core/viewport.js';
import { spliceFlash } from '../systems/flash.js';
import { t } from '../data/i18n.js';

export function initHero(ctx) {
  const sec = document.querySelector('.s-hero');
  if (!sec) return;
  const wrap = sec.querySelector('.hero-title-wrap');
  const h1 = sec.querySelector('.hero-title');
  const spans = [...h1.querySelectorAll('span')];
  const canvas = sec.querySelector('.hero-print');
  const low = sec.querySelector('.hero-low');
  const claim = sec.querySelector('.hero-claim');
  const sub = sec.querySelector('.hero-sub');
  const ficha = sec.querySelector('.hero-ficha');
  const kicker = sec.querySelector('.kicker');
  const selloWrap = sec.querySelector('.hero-sello');
  const sello = selloWrap?.querySelector('.sello');
  const dd = {
    ser: ficha?.querySelector('[data-hf="ser"]'),
    reg: ficha?.querySelector('[data-hf="reg"]'),
    obt: ficha?.querySelector('[data-hf="obt"]'),
  };
  const racleta = document.createElement('span');
  racleta.className = 'hero-racleta';
  racleta.setAttribute('aria-hidden', 'true');
  wrap.appendChild(racleta);
  const hidden = [kicker, low, sub, ficha, selloWrap].filter(Boolean);

  // ── despliegue: el h1 es flex space-between → el layout YA es el
  // desplegado. La palabra junta se logra trasladando cada letra al centro.
  // Dos canales que no se pelean: intro (1→0, tiempo) y scroll (0→.35, scrub).
  let offs = [];
  let wordEnd = 0; // borde derecho de la palabra junta (px dentro del h1)
  const state = { intro: 1, scroll: 0 };
  const measure = () => {
    const W = h1.getBoundingClientRect().width;
    const ws = spans.map((s) => s.getBoundingClientRect().width);
    const wordW = ws.reduce((a, b) => a + b, 0);
    let x = (W - wordW) / 2;
    offs = spans.map((s, i) => {
      const target = x;
      x += ws[i];
      return target - s.offsetLeft;
    });
    wordEnd = x;
  };
  const applySpread = () => {
    const spread = Math.min(1, state.intro + state.scroll);
    spans.forEach((s, i) => {
      s.style.transform = `translate3d(${(offs[i] * (1 - spread)).toFixed(1)}px,0,0)`;
    });
    // el sello va pegado a la última letra: viaja con ella (propiedad
    // `translate`, separada del transform del jitter)
    if (selloWrap) selloWrap.style.translate = `${(-offs[offs.length - 1] * spread).toFixed(1)}px 0`;
  };
  // el sello "registrado" se apoya en la línea de base, pegado a la última
  // letra; si no entra (celu) se estampa ENCIMA del borde inferior derecho de
  // la palabra (un sello se aplica sobre lo impreso)
  const placeSello = () => {
    if (!selloWrap) return;
    const W = h1.getBoundingClientRect().width;
    const sw = selloWrap.offsetWidth || 90;
    const fits = wordEnd + 12 + sw <= W;
    selloWrap.style.left = `${Math.round(fits ? wordEnd + 12 : Math.max(0, wordEnd - sw * 0.92))}px`;
    selloWrap.style.bottom = fits ? '0.1em' : '-0.45em';
  };
  const layout = () => {
    spans.forEach((s) => (s.style.transform = ''));
    measure();
    applySpread();
    placeSello();
  };
  layout();
  bus.on('resize', layout);
  document.fonts?.ready.then(layout);

  // ── quieto (reduced motion): la composición final, impresa ──
  if (ctx.tier === 'static') {
    state.intro = 0;
    applySpread();
    h1.classList.add('is-joined');
    gsap.set(hidden, { autoAlpha: 1 });
    if (sello) gsap.set(sello, { rotate: -4 });
    return;
  }

  // antes de la tirada la hoja está en blanco: nada aparece con un "pop"
  gsap.set(hidden, { autoAlpha: 0 });

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

  const N = 18; // ticks de la tirada: 11 de boceto + 7 de racleta
  let pose = -1;
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
  let reprinting = false;
  const finish = () => {
    pose = -1;
    canvas.style.visibility = 'hidden';
    racleta.style.visibility = 'hidden';
    if (reprinting) {
      reprinting = false;
      stampSello(); // toda reimpresión se vuelve a registrar
    }
  };
  // el sello cae: 2 poses (grande → apoyado), un cuadro de flash
  const stampSello = () => {
    if (!selloWrap || !sello) return;
    gsap.set(selloWrap, { autoAlpha: 1 });
    gsap.fromTo(sello, { autoAlpha: 0, scale: 1.6, rotate: -9 }, { autoAlpha: 1, scale: 1, rotate: -4, ...shutter(0.17), onStart: spliceFlash });
  };
  const print = () => {
    if (pose >= 0) return;
    canvas.style.visibility = 'visible';
    pose = 0;
  };

  // ── la máquina tipea la frase humana: SplitText chars + cada letra se
  // desordena hacia sí misma (nunca ScrambleText sobre el nodo partido) ──
  let kickerSplit = null;
  let claimSplit = null;
  const typeKicker = () => {
    kickerSplit?.revert();
    kickerSplit = SplitText.create(kicker, { type: 'chars', tag: 'span', aria: 'auto' });
    const chars = kickerSplit.chars;
    gsap.set(kicker, { autoAlpha: 1 });
    gsap.from(chars, { autoAlpha: 0, stagger: 1 / 36, ...shutter(0.17) });
    chars.forEach((c, i) => {
      const txt = c.textContent;
      if (!txt.trim()) return;
      gsap.to(c, {
        scrambleText: { text: txt, chars: GLYPHS, speed: 0.6, tweenLength: false },
        delay: i / 36,
        ...shutter(0.34),
      });
    });
    gsap.delayedCall(chars.length / 36 + 0.5, () => {
      kickerSplit?.revert();
      kickerSplit = null;
    });
  };
  // el claim sube desde su máscara, línea por línea (papel que sale de la prensa)
  const riseClaim = () => {
    claimSplit?.revert();
    claimSplit = SplitText.create(claim, { type: 'lines', mask: 'lines', tag: 'span', aria: 'auto' });
    gsap.set(low, { autoAlpha: 1 });
    gsap.from(claimSplit.lines, {
      yPercent: 112,
      stagger: 0.1,
      ...shutter(0.5),
      onComplete: () => {
        claimSplit?.revert();
        claimSplit = null;
      },
    });
  };
  // idioma: revertir los splits (restauran el html viejo) y volver a escribir
  bus.on('i18n:changed', () => {
    if (kickerSplit) {
      kickerSplit.revert();
      kickerSplit = null;
      kicker.textContent = t('hero.kicker');
    }
    if (claimSplit) {
      claimSplit.revert();
      claimSplit = null;
      claim.textContent = t('hero.claim');
    }
    layout();
  });

  // ── el primer segundo: UN timeline; todo commitea en poses de 12fps ──
  let started = false;
  let introDone = false;
  const start = () => {
    if (started) return;
    started = true;
    const cs = getComputedStyle(h1);
    const load = document.fonts?.load ? document.fonts.load(`${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`) : Promise.resolve();
    load.catch(() => {}).then(() => {
      layout();
      const tl = gsap.timeline();
      tl.call(print, null, 0) // 18 ticks: ruido → tinta, la racleta barre
        .to(state, { intro: -0.03, duration: 0.9, ease: 'steps(10)', onUpdate: applySpread }, 1.0) // 10 poses, la última pasa de largo
        .to(state, { intro: 0, duration: 2 / 12, ease: 'steps(1)', onUpdate: applySpread, onComplete: () => h1.classList.add('is-joined') }, '>') // sobrepaso 2 cuadros → asienta
        .add(riseClaim, 1.5)
        .add(typeKicker, 1.7)
        .fromTo(sub, { autoAlpha: 0 }, { autoAlpha: 1, ...shutter(0.17) }, 1.9);
      if (ficha) tl.fromTo(ficha, { autoAlpha: 0, translate: '0px 8px' }, { autoAlpha: 1, translate: '0px 0px', ...shutter(0.25) }, 2.0);
      tl.add(stampSello, 2.1);
      tl.eventCallback('onComplete', () => (introDone = true));
    });
  };
  bus.on('splash:done', start);
  if (window.__nosplash) start();

  // ── ficha viva: valores reales de la máquina ──
  let serie = 1;
  let lastMis = '';
  const misX = () =>
    (document.documentElement.style.getPropertyValue('--mis-x') || getComputedStyle(document.documentElement).getPropertyValue('--mis-x')).trim() || '1px';
  const reprint = () => {
    if (pose >= 0) return;
    serie++;
    reprinting = true;
    spliceFlash();
    if (dd.ser) scramble(dd.ser, `${String(serie).padStart(3, '0')} / ∞`, 0.4, { chars: DIGITS });
    if (selloWrap) gsap.set(selloWrap, { autoAlpha: 0 }); // el sello viejo se va con la tirada vieja
    print();
  };
  h1.addEventListener('click', reprint);

  // ── vivo solo en pantalla: gate de visibilidad para lo que corre por cuadro ──
  let live = true;
  watch(sec, { enter: () => (live = true), leave: () => (live = false) });

  // ── idle: una letra al azar recibe una pasada fantasma de 1 cuadro ──
  let ghost = null;
  let ghostOff = -1;
  bus.on('idle:beat', (f) => {
    if (!live || !introDone) return;
    ghost?.classList.remove('ghost');
    ghost = spans[(frameRand(f, 7) * spans.length) | 0];
    ghost.classList.add('ghost');
    ghostOff = f + 1;
  });

  // ── por cuadro: la tirada, el fantasma, la reacción tipográfica (la palabra
  // se comprime con el envión: eje wdth de Archivo, cuantizado a poses; se
  // re-mide porque el ancho de las letras cambia) y la ficha viva ──
  let wdth = 100;
  bus.on('frame', (f) => {
    if (pose >= 0) {
      commit();
      pose++;
      if (pose > N) finish();
    }
    if (ghostOff >= 0 && f >= ghostOff) {
      ghost?.classList.remove('ghost');
      ghostOff = -1;
    }
    if (!live) return;
    const target = Math.round((100 - Math.abs(scrollLean()) * 14) / 2) * 2;
    if (target !== wdth) {
      wdth = target;
      h1.style.fontVariationSettings = `'wdth' ${wdth}`;
      layout();
    }
    if (dd.obt) dd.obt.textContent = `${clock.fps} fps · f ${String(f % 100000).padStart(5, '0')}`;
    if (dd.reg && f % 6 === 0) {
      const mis = misX();
      if (mis !== lastMis) {
        lastMis = mis;
        scramble(dd.reg, `±${mis.replace('-', '')}`, 0.25, { chars: DIGITS + '±px' });
      }
    }
  });

  // ── scrub: el pliego se va — la palabra impresa se separa otra vez en poses
  // (inverso de la juntada); lo de abajo se apaga de un corte ──
  const leave = [kicker, low, selloWrap, ficha].filter(Boolean);
  gsap
    .timeline({ scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 0.5 } })
    .to(state, { scroll: 0.35, duration: 0.45, ease: 'steps(10)', onUpdate: applySpread }, 0)
    .fromTo(leave, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.05, ease: 'steps(1)', stagger: 0.02, immediateRender: false }, 0.5);
  ScrollTrigger.create({ trigger: sec, start: 'top -20%', onEnterBack: () => started && print() });
}
