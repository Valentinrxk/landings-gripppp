// La gramática del obturador: toda animación temporal del sitio commitea en
// poses de 12fps. shutter(dur) devuelve {duration, ease:'steps(n)'} — un tween
// GSAP normal que se ve como stop-motion. expo.out queda SOLO para lo que
// sigue al puntero (magnetic, quickTo). GLYPHS es la voz de la máquina.
import { gsap } from './scroll.js';

export const FPS = 12;
export const shutter = (dur = 0.5) => ({ duration: dur, ease: `steps(${Math.max(1, Math.round(dur * FPS))})` });
export const GLYPHS = '@#%*+=-:.';
export const DIGITS = '0123456789';

// texto que se "tipea" con la voz de la máquina (ScrambleText)
export const scramble = (el, text, dur = 0.4, extra = {}) =>
  gsap.to(el, { scrambleText: { text, chars: GLYPHS, tweenLength: false, speed: 0.8, ...extra }, ...shutter(dur) });

// clamp/ease utilitarios (evitan repetir helpers por sección)
export const clamp01 = (t) => Math.max(0, Math.min(1, t));
export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
