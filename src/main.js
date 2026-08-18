// landings.gripppp — la imprenta.
// grip® pone la tinta (papel, sellos, desregistro); valentín romero pone la
// máquina (plata, mono, matriz de glifos). Un solo ticker; el obturador a 12fps
// es el único que autoriza commits visuales. El scroll nativo no se toca.
import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';
import './styles/effects.css';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';

import { detectTier } from './core/tier.js';
import { clock } from './core/frameClock.js';
import { bus } from './core/bus.js';
import { initScroll, gsap, ScrollTrigger, scrollLean, scrollVelocity } from './core/scroll.js';
import { setFilmSmoothing } from './core/film.js';
import { frameRand } from './core/rng.js';
import { applyLang, lang } from './data/i18n.js';
import { initGrain } from './systems/grain.js';
import { initJitter } from './systems/jitter.js';
import { initMisregister } from './systems/misregister.js';
import { initFlash, spliceFlash } from './systems/flash.js';
import { initRail } from './systems/rail.js';
import { initRacleta } from './systems/racleta.js';
import { initOrb } from './systems/orb.js';
import { initCursor } from './systems/cursor.js';
import { initIdle } from './systems/idle.js';
import { initSplash } from './sections/splash.js';
import { initHero } from './sections/hero.js';
import { initContacto } from './sections/contacto.js';
import { initProceso } from './sections/proceso.js';
import { initPliegos } from './sections/pliegos.js';
import { initAntes } from './sections/antes.js';

const ctx = detectTier();
document.documentElement.dataset.tier = ctx.tier;
applyLang(lang);

// ── idioma: "(español)" ↔ "(english)" — 7 letras ambas; scramble a 12fps ──
const LANG_WORDS = { es: 'español', en: 'english' };
const LANG_GLYPHS = 'abcdefghijklmnopqrstuvwxyzñ#*/%&_';
const langBtn = document.getElementById('lang');
let langSlots = [];
let langMorph = -1;
let langHover = false;
let curLang = lang;
const buildLangSlots = () => {
  langBtn.innerHTML = '(' + LANG_WORDS[curLang].split('').map((c) => `<span>${c}</span>`).join('') + ')';
  langSlots = [...langBtn.querySelectorAll('span')];
};
buildLangSlots();
langBtn.addEventListener('pointerenter', () => (langHover = true));
langBtn.addEventListener('pointerleave', () => (langHover = false));
langBtn.addEventListener('click', () => {
  curLang = curLang === 'es' ? 'en' : 'es';
  spliceFlash();
  applyLang(curLang);
  if (ctx.tier === 'static') buildLangSlots();
  else langMorph = 0;
});
bus.on('frame', (f) => {
  const w = LANG_WORDS[curLang];
  if (langMorph >= 0) {
    langMorph++;
    let done = true;
    langSlots.forEach((s, i) => {
      if (langMorph >= 3 + i * 1.4) s.textContent = w[i];
      else {
        s.textContent = LANG_GLYPHS[(frameRand(f, 300 + i) * LANG_GLYPHS.length) | 0];
        done = false;
      }
    });
    if (done) langMorph = -1;
  } else {
    langSlots.forEach((s, i) => (s.textContent = w[i]));
    if (frameRand(f, 91) < (langHover ? 0.35 : 0.05)) {
      const i = (frameRand(f, 92) * langSlots.length) | 0;
      langSlots[i].textContent = LANG_GLYPHS[(frameRand(f, 93 + i) * LANG_GLYPHS.length) | 0];
    }
  }
});

// ── static (reduced-motion): la página impresa, quieta ──
if (ctx.tier === 'static') {
  document.getElementById('splash')?.remove();
  document.getElementById('orb')?.remove();
  initMisregister(ctx);
  initHero(ctx);
  initProceso(ctx);
  initAntes(ctx);
} else {
  const lenis = initScroll(ctx);
  setFilmSmoothing(ctx.coarse);
  initFlash(ctx);
  initGrain(ctx);
  initJitter(ctx);
  initMisregister(ctx);
  initRail(ctx);
  initRacleta(ctx);
  initOrb(ctx);
  initCursor(ctx);
  initIdle(ctx);
  initSplash(ctx);
  initHero(ctx);
  initContacto(ctx);
  initProceso(ctx);
  initPliegos(ctx);
  initAntes(ctx);

  // un solo ticker: scroll suave → obturador → commits
  gsap.ticker.add((t) => {
    lenis?.raf(t * 1000);
    if (clock.tick(t)) bus.emit('frame', clock.frame);
  });
  gsap.ticker.lagSmoothing(0);

  // la marca de registro del HUD gira a saltos y el reloj marca la hora del
  // taller (buenos aires): la máquina está encendida
  const reg = document.querySelector('.regmark');
  const clockEl = document.querySelector('.hud-clock');
  bus.on('frame', (f) => {
    if (reg) reg.style.transform = `rotate(${(f % 24) * 15}deg)`;
    if (clockEl && f % 12 === 0) {
      const d = new Date();
      const hm = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Argentina/Buenos_Aires' });
      clockEl.textContent = `bue ${hm}`;
    }
  });

  // CTA / anclas: scroll suave por lenis (o nativo)
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: 0 });
      else target.scrollIntoView();
    });
  });

  let rt = null;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      bus.emit('resize');
      ScrollTrigger.refresh();
    }, 120);
  });
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh());
}

window.__landings = { ctx, clock, bus, ScrollTrigger, lean: scrollLean, vel: scrollVelocity };
console.log('%c landings.gripppp ', 'background:#111;color:#f4f1ea;padding:4px 8px;font-family:monospace', '— grip® pone la tinta, valentín romero pone la máquina. si estás leyendo esto, escribinos: hola@gripppp.com');
