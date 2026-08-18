// ES/EN. Todo minúscula (la señal humana no grita — regla heredada del taller).
import { bus } from '../core/bus.js';

export const DICT = {
  es: {
    'hud.sign': 'grip® × valentín romero — taller de landings, buenos aires',
    'ui.cta': 'pedí tu pliego →',
    'hero.kicker': 'grip® pone la tinta. valentín romero pone la máquina.',
    'hero.claim': 'landings que no parecen plantilla.',
    'hero.sub1': 'una landing por vez. tinta a mano, código a máquina.',
    'hero.hint': '( bajá — la tirada recién empieza )',
    'hero.tag1': '12fps',
    'hero.tag2': 'cero plantillas',
    'hero.tag3': 'dominio propio',
    'hero.tag4': 'es / en',
    'hf.head': 'ficha de tirada',
    'hf.1k': 'tirada',
    'hf.2k': 'tintas',
    'hf.2v': '3 — rojo, celeste, negro',
    'hf.3k': 'registro',
    'hf.4k': 'obturador',
    'hf.5k': 'papel',
    'hf.5v': '100% código a mano',
    'pr.title': 'cómo se imprime una landing',
    'pr.sub': 'cuatro estaciones. ninguna se saltea.',
    'pr.1t': 'leemos la marca, no el brief',
    'pr.1p': 'antes de abrir un editor miramos tus posts, tu tono, tus chistes internos. la landing amplifica lo que ya sos.',
    'pr.1s': 'leído',
    'pr.2t': 'boceto en ruido',
    'pr.2p': 'un wireframe con una sola idea rectora. si el botón, el loader y el 404 no salen solos de esa idea, no hay idea.',
    'pr.2s': 'bocetado',
    'pr.3t': 'tinta',
    'pr.3p': 'color plano, tipografía con carácter, motion que se siente hecho a mano. cero stock, cero gradiente violeta.',
    'pr.3s': 'entintado',
    'pr.4t': 'tirada',
    'pr.4p': 'código a mano, sin builders. carga rápida, dominio propio, funciona en tu celu y en el del cliente. después la cuidamos.',
    'pr.4s': 'impreso',
    'pl.title': 'pliegos',
    'pl.sub': 'cada landing sale de la máquina en ruido y se imprime en tinta. bajá despacio.',
    'pl.n1': 'pliego 01/04',
    'pl.n2': 'pliego 02/04',
    'pl.n3': 'pliego 03/04',
    'pl.n4': 'pliego 04/04',
    'pl.stamp': 'impreso',
    'pl.view': 'ver la landing',
    'pl.next': 'la próxima es la tuya',
    'pl.grip': 'la casa. película stop-motion a 12fps, logo líquido que gotea con el scroll, stickers con física real. marcas que se te pegan.',
    'pl.oclu': 'crm para clínicas con su landing: pacientes, turnos y administración en una pantalla que no te pelea.',
    'pl.taxes': 'impuestos y declaraciones sin laberinto. números claros para gente que odia los números.',
    'pl.fms': 'clínica odontológica: negro, macro y una sola idea. la ciencia se ve, el trato se siente.',
    'qc.title': 'control de calidad',
    'qc.sub': 'lo que no sale de esta imprenta. nunca.',
    'qc.1': 'plantilla de wordpress con el nombre cambiado',
    'qc.2': 'hero oscuro con gradiente violeta',
    'qc.3': 'fotos de stock de gente sonriendo en una oficina',
    'qc.4': 'botón que dice "saber más"',
    'qc.5': 'cuatro segundos de carga y un popup de cookies',
    'qc.6': 'el logo chiquito arriba a la izquierda',
    'qc.7': 'una landing que se te pega',
    'qc.no': 'rechazado',
    'qc.ok': 'aprobado',
    'ct.title': 'pedí tu pliego',
    'ct.sub': 'tirada: una landing por vez. contanos qué vendés y qué odiás de tu web actual.',
    'ct.wa': 'whatsapp',
    'ct.f1': 'impreso por grip® — buenos aires',
    'ct.f2': 'máquina:',
  },
  en: {
    'hud.sign': 'grip® × valentín romero — landing page workshop, buenos aires',
    'ui.cta': 'order your sheet →',
    'hero.kicker': 'grip® brings the ink. valentín romero brings the machine.',
    'hero.claim': "landing pages that don't look like a template.",
    'hero.sub1': 'one landing at a time. ink by hand, code by machine.',
    'hero.hint': '( scroll — the print run just started )',
    'hero.tag1': '12fps',
    'hero.tag2': 'zero templates',
    'hero.tag3': 'your own domain',
    'hero.tag4': 'es / en',
    'hf.head': 'print run sheet',
    'hf.1k': 'run',
    'hf.2k': 'inks',
    'hf.2v': '3 — red, blue, black',
    'hf.3k': 'register',
    'hf.4k': 'shutter',
    'hf.5k': 'paper',
    'hf.5v': '100% handwritten code',
    'pr.title': 'how a landing gets printed',
    'pr.sub': 'four stations. none gets skipped.',
    'pr.1t': 'we read the brand, not the brief',
    'pr.1p': 'before opening an editor we look at your posts, your tone, your inside jokes. the landing amplifies what you already are.',
    'pr.1s': 'read',
    'pr.2t': 'sketch in noise',
    'pr.2p': "a wireframe with one ruling idea. if the button, the loader and the 404 don't fall out of that idea by themselves, there's no idea.",
    'pr.2s': 'sketched',
    'pr.3t': 'ink',
    'pr.3p': 'flat color, type with character, motion that feels handmade. zero stock, zero purple gradient.',
    'pr.3s': 'inked',
    'pr.4t': 'print run',
    'pr.4p': "handwritten code, no builders. fast load, your own domain, works on your phone and on your client's. then we look after it.",
    'pr.4s': 'printed',
    'pl.title': 'sheets',
    'pl.sub': 'every landing leaves the machine as noise and gets printed in ink. scroll slowly.',
    'pl.n1': 'sheet 01/04',
    'pl.n2': 'sheet 02/04',
    'pl.n3': 'sheet 03/04',
    'pl.n4': 'sheet 04/04',
    'pl.stamp': 'printed',
    'pl.view': 'view the landing',
    'pl.next': 'the next one is yours',
    'pl.grip': 'home base. a 12fps stop-motion film, a liquid logo that drips with the scroll, stickers with real physics. brands that stick.',
    'pl.oclu': "clinic crm with its landing: patients, appointments and admin in one screen that doesn't fight back.",
    'pl.taxes': 'taxes and filings without the maze. clear numbers for people who hate numbers.',
    'pl.fms': 'dental clinic: black, macro and a single idea. the science shows, the care is felt.',
    'qc.title': 'quality control',
    'qc.sub': 'what never leaves this print shop.',
    'qc.1': 'a wordpress template with the name swapped',
    'qc.2': 'dark hero with a purple gradient',
    'qc.3': 'stock photos of people smiling in an office',
    'qc.4': 'a button that says "learn more"',
    'qc.5': 'four seconds of loading and a cookie popup',
    'qc.6': 'the tiny logo in the top-left corner',
    'qc.7': 'a landing that sticks',
    'qc.no': 'rejected',
    'qc.ok': 'approved',
    'ct.title': 'order your sheet',
    'ct.sub': "print run: one landing at a time. tell us what you sell and what you hate about your current site.",
    'ct.wa': 'whatsapp',
    'ct.f1': 'printed by grip® — buenos aires',
    'ct.f2': 'machine:',
  },
};

export let lang = 'es';
try {
  const saved = localStorage.getItem('landings:lang');
  if (saved === 'es' || saved === 'en') lang = saved;
  else if (!navigator.language?.toLowerCase().startsWith('es')) lang = 'en';
} catch {
  /* modo privado */
}

export function t(key) {
  return DICT[lang][key] ?? DICT.es[key] ?? key;
}

export function applyLang(next) {
  lang = next;
  document.documentElement.lang = next;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const v = DICT[next][el.dataset.i18n];
    if (v != null) el.textContent = v;
  });
  document.title = next === 'es' ? 'landings — grip® × valentín romero' : 'landing pages — grip® × valentín romero';
  try {
    localStorage.setItem('landings:lang', next);
  } catch {
    /* modo privado */
  }
  bus.emit('i18n:changed', next);
}
