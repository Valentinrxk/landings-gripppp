// ES/EN desde copy.json (el deck final). Claves con puntos: 'como.steps.0.t'.
import { bus } from '../core/bus.js';
import deck from './copy.json';

const EXTRA = {
  es: { 'ui.view': 'ver la landing', 'ui.lang': 'en', 'ui.up': 'arriba', 'pila.p': 'todo eso, junto, es ruido. y el ruido no se recuerda.' },
  en: { 'ui.view': 'view the landing', 'ui.lang': 'es', 'ui.up': 'top', 'pila.p': 'all of that, together, is noise. and noise is not remembered.' },
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

const WA = {
  es: 'https://wa.me/5491121865983?text=' + encodeURIComponent('hola grip, quiero cotizar la landing de mi marca.'),
  en: 'https://wa.me/5491121865983?text=' + encodeURIComponent("hi grip, i'd like a quote for my brand's landing page."),
};

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
  // el whatsapp abre con el mensaje de cotización en el idioma vigente
  document.querySelectorAll('a[href^="https://wa.me/"]').forEach((a) => (a.href = WA[next]));
  bus.emit('i18n:changed', next);
}
