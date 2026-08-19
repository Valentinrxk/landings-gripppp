// ES/EN desde copy.json (el deck final). Claves con puntos: 'como.steps.0.t'.
import { bus } from '../core/bus.js';
import deck from './copy.json';

const EXTRA = {
  es: { 'ui.view': 'ver la landing', 'plantilla.l': 'plantilla', 'plantilla.r': 'marca', 'ui.lang': 'en', 'pila.p': 'todo eso, junto, es ruido. y el ruido no se recuerda.' },
  en: { 'ui.view': 'view the landing', 'plantilla.l': 'template', 'plantilla.r': 'brand', 'ui.lang': 'es', 'pila.p': 'all of that, together, is noise. and noise is not remembered.' },
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

export function applyLang(next) {
  lang = next;
  document.documentElement.lang = next;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const v = t(el.dataset.i18n, next);
    if (v != null && v !== el.dataset.i18n) el.textContent = v;
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
  bus.emit('i18n:changed', next);
}
