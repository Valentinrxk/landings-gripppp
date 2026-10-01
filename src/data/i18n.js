// ES/EN desde copy.json (el deck final). Claves con puntos: 'como.steps.0.t'.
import { bus } from '../core/bus.js';
import deck from './copy.json';

const EXTRA = {
  es: {
    'tpl.brand': 'Marca', 'tpl.start': 'Empezá gratis', 'tpl.badge': 'Nuevo · ahora con IA', 'tpl.head': 'Llevá tu negocio al siguiente nivel',
    'tpl.sub': 'La plataforma todo en uno que te ayuda a crecer más rápido. Sin complicaciones.', 'tpl.go': 'Empezá ahora →', 'tpl.demo': 'Ver demo',
    'tpl.trust': 'Más de 10.000 empresas confían en nosotros', 'tpl.cookie': 'Usamos cookies para mejorar tu experiencia.', 'tpl.ok': 'Aceptar',
    'ui.view': 'ver la landing', 'ui.lang': 'en', 'ui.up': 'arriba', 'pila.a': 'todo eso, junto, es ruido.', 'pila.b': 'y el ruido no se recuerda.',
    'egg.k': '20% off.', 'egg.t': 'reventaste los cuatro. esto no lo encuentra cualquiera.', 'egg.code': 'código', 'egg.note': 'vale para tu landing.',
    'egg.cta': 'pedilo por whatsapp', 'egg.close': 'cerrar' },
  en: {
    'tpl.brand': 'Brand', 'tpl.start': 'Start for free', 'tpl.badge': 'New · now with AI', 'tpl.head': 'Take your business to the next level',
    'tpl.sub': 'The all-in-one platform that helps you grow faster. No hassle.', 'tpl.go': 'Get started →', 'tpl.demo': 'Watch demo',
    'tpl.trust': 'Trusted by 10,000+ companies', 'tpl.cookie': 'We use cookies to improve your experience.', 'tpl.ok': 'Accept',
    'ui.view': 'view the landing', 'ui.lang': 'es', 'ui.up': 'top', 'pila.a': 'all of that, together, is noise.', 'pila.b': 'and noise is never remembered.',
    'egg.k': '20% off.', 'egg.t': 'you popped all four. not everyone finds this.', 'egg.code': 'code', 'egg.note': 'valid on your landing.',
    'egg.cta': 'claim it on whatsapp', 'egg.close': 'close' },
};

export const DICT = { es: deck.es, en: deck.en };
export const COPY = deck;

export let lang = 'es';
try {
  const saved = localStorage.getItem('landings:lang');
  if (saved === 'es' || saved === 'en') lang = saved;
  else if (!navigator.language?.toLowerCase().startsWith('es')) lang = 'en';
} catch {
  /* modo privado */
}

export function t(key, L = lang) {
  if (EXTRA[L][key] != null) return EXTRA[L][key];
  const parts = key.split('.');
  let v = DICT[L];
  for (const p of parts) {
    if (v == null) break;
    v = v[p];
  }
  if (v == null && L !== 'es') return t(key, 'es');
  return typeof v === 'string' ? v : key;
}

// el easter egg de los globos: el código viaja en todos los whatsapp desde que lo encontrás
export const EGG_CODE = 'GLOBOS20';
let egg = false;
try {
  egg = localStorage.getItem('landings:egg') === '1';
} catch {
  /* modo privado */
}
export const hasEgg = () => egg;
const WA_TEXT = {
  es: ['hola grip, quiero cotizar la landing de mi marca.', `hola grip, reventé los cuatro globos. quiero cotizar mi landing con el 20% off (código ${EGG_CODE}).`],
  en: ["hi grip, i'd like a quote for my brand's landing page.", `hi grip, i popped all four balloons. i'd like a quote for my landing with the 20% off (code ${EGG_CODE}).`],
};
export const waLink = (L = lang) => 'https://wa.me/5491121865983?text=' + encodeURIComponent(WA_TEXT[L][egg ? 1 : 0]);
const syncWA = () => document.querySelectorAll('a[href^="https://wa.me/"]').forEach((a) => (a.href = waLink()));
export function setEgg() {
  egg = true;
  try {
    localStorage.setItem('landings:egg', '1');
  } catch {
    /* modo privado */
  }
  document.documentElement.classList.add('has-egg');
  syncWA();
}
if (egg) document.documentElement.classList.add('has-egg');

export function applyLang(next) {
  lang = next;
  document.documentElement.lang = next;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const v = t(el.dataset.i18n, next);
    if (v == null || v === el.dataset.i18n) return;
    // el deck puede traer <b> inline (créditos de cliente); es contenido propio, no input
    if (/<[a-z]/i.test(v)) el.innerHTML = v;
    else el.textContent = v;
  });
  document.title = DICT[next].meta.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', DICT[next].meta.description);
  const lb = document.getElementById('lang');
  if (lb) lb.textContent = EXTRA[next]['ui.lang'];
  try {
    localStorage.setItem('landings:lang', next);
  } catch {
    /* modo privado */
  }
  // el whatsapp abre con el mensaje de cotización en el idioma vigente (y el código, si lo ganaste)
  syncWA();
  bus.emit('i18n:changed', next);
}
