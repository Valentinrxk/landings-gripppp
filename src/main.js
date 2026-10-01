// landings.gripppp v3 — del ruido a la marca.
// Una sola escena: el campo de tinta (three.js, hecho de g·r·i·p) se transforma
// con el scroll; los textos entran cada uno a su manera. Lenis lleva el scroll,
// GSAP los tiempos. Sin jerga: la máquina se ve, no se explica.
import './styles/tokens.css';
import './styles/base.css';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';

import { detectTier } from './core/tier.js';
import { clock } from './core/frameClock.js';
import { bus } from './core/bus.js';
import { initScroll, gsap, ScrollTrigger } from './core/scroll.js';
import { applyLang, lang, COPY } from './data/i18n.js';
import { initGrain } from './systems/grain.js';
import { initFlash } from './systems/flash.js';
import { initCursor } from './systems/cursor.js';
import { initIdle } from './systems/idle.js';
import { initRegla } from './systems/regla.js';
import { staticWordmarkSVG } from './ui/logo-paths.js';
import { initJourney } from './journey.js';

// la película arranca siempre desde el principio
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

const ctx = detectTier();
document.documentElement.dataset.tier = ctx.tier;
applyLang(lang);

// la marca es la de grip: el wordmark líquido, chico, arriba a la izquierda
const mark = document.querySelector('.brand-mark');
if (mark) mark.innerHTML = staticWordmarkSVG('currentColor');

// idioma: un toque, sin ceremonia
document.querySelectorAll('#lang, #lang2').forEach((b) => b.addEventListener('click', () => applyLang(lang === 'es' ? 'en' : 'es')));

// tema: día / noche (respeta el sistema; se guarda)
const THEME_KEY = 'landings:theme';
const setTheme = (t, save = true) => {
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#141416' : '#f4f1ea');
  const tb = document.getElementById('theme');
  if (tb) tb.textContent = t === 'dark' ? (lang === 'en' ? 'day' : 'día') : lang === 'en' ? 'night' : 'noche';
  if (save) {
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      /* modo privado */
    }
  }
  bus.emit('theme:changed', t);
};
let theme = 'light';
try {
  theme = localStorage.getItem(THEME_KEY) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
} catch {
  /* modo privado */
}
setTheme(theme, false);
document.getElementById('theme')?.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
bus.on('i18n:changed', () => setTheme(document.documentElement.dataset.theme || 'light', false));

// ¿WebGL disponible?
const hasGL = (() => {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
})();

// ── versión quieta: reduced-motion o sin WebGL — el mismo contenido, en una hoja ──
function buildStatic() {
  const L = document.documentElement.lang === 'en' ? 'en' : 'es';
  const c = COPY[L];
  const works = [
    ['deportivo riestra', 'https://deportivoriestra.com.ar/', '/works/riestra.jpg', c.trabajos.items.riestra],
    ['grip studio', 'https://gripppp.com/', '/works/grip.jpg', c.trabajos.items.grip],
    ['oclucrm', 'https://www.oclucrm.com/', '/works/oclucrm.jpg', c.trabajos.items.oclucrm],
    ['taxes software', 'https://www.taxes.com.ar/', '/works/taxes.jpg', c.trabajos.items.taxes],
    ['feedmakers', 'https://feedmakers.app/es', '/works/feedmakers.jpg', c.trabajos.items.feedmakers],
    ['ilove3d', 'https://ilove3d.app/', '/works/ilove3d.jpg', c.trabajos.items.ilove3d],
  ];
  const el = document.getElementById('static');
  el.hidden = false;
  document.documentElement.dataset.mode = 'static';
  el.innerHTML = `
    <section><h1>${c.hero.claim}</h1><p>${c.hero.sub}</p></section>
    <section><h2>${c.ruido.h}</h2><p>${c.ruido.p}</p></section>
    <section><h2>${c.senal.h}</h2><p>${c.senal.p}</p></section>
    <section><h2>${c.como.h}</h2>${c.como.steps.map((s) => `<p><b>${s.t}</b> — ${s.p}</p>`).join('')}<p class="mono">${c.como.after}</p></section>
    <section><h2>${c.trabajos.h}</h2>${works.map(([n, u, i, d]) => `<p><a href="${u}" target="_blank" rel="noopener"><b>${n}</b></a> — ${d}</p><img src="${i}" alt="${n}" loading="lazy" />`).join('')}<p class="mono">${c.trabajos.closing}</p></section>
    <section><h2>${c.plantilla.h}</h2><p><b>${L === 'en' ? 'template' : 'plantilla'}</b> — ${c.plantilla.tpl}</p><p><b>${L === 'en' ? 'brand' : 'marca'}</b> — ${c.plantilla.marca}</p></section>
    <section><h2>${c.contacto.h}</h2><p>${c.contacto.p}</p><p><a class="cta big" href="https://wa.me/5491121865983?text=hola%20grip%2C%20quiero%20cotizar%20la%20landing%20de%20mi%20marca.">${c.contacto.wa}</a> <a class="cta ghost" href="mailto:hola@gripppp.com">hola@gripppp.com</a></p><p class="mono">${c.contacto.credit1} · ${c.contacto.credit2}</p></section>`;
}

if (ctx.tier === 'static' || !hasGL) {
  document.documentElement.classList.remove('splashing');
  document.getElementById('splash')?.remove();
  buildStatic();
  bus.on('i18n:changed', buildStatic);
} else {
  const lenis = initScroll(ctx);
  document.documentElement.classList.add('no-scrollbar');
  initFlash(ctx);
  initGrain(ctx);
  initCursor(ctx);
  initIdle(ctx);
  initRegla(ctx, lenis);

  // un solo ticker: lenis → obturador (12fps para lo que lo use) → bus 'frame'
  gsap.ticker.add((t) => {
    lenis?.raf(t * 1000);
    if (clock.tick(t)) bus.emit('frame', clock.frame);
  });
  gsap.ticker.lagSmoothing(0);
  // debug: ?slow=3 ralentiza toda animación temporal (para revisar la intro cuadro a cuadro)
  const slow = +new URLSearchParams(location.search).get('slow');
  if (slow > 1) gsap.globalTimeline.timeScale(1 / slow);

  initJourney(ctx).then(() => ScrollTrigger.refresh());

  // volver arriba: aparece cuando dejás el hero; sube por el mismo carril suave
  const up = document.getElementById('up');
  if (up) {
    up.addEventListener('click', () => (lenis ? lenis.scrollTo(0, { duration: 1.6 }) : window.scrollTo(0, 0)));
    bus.on('frame', () => up.classList.toggle('is-on', window.scrollY > window.innerHeight * 0.6));
  }

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target || target.hidden) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target);
      else target.scrollIntoView();
    });
  });
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh());
}

window.__landings = { ctx, clock, bus, ScrollTrigger };
console.log('%c landings.gripppp ', 'background:#111;color:#f4f1ea;padding:4px 8px;font-family:monospace', COPY[lang].console);
