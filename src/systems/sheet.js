// Pliego sobre pliego. El apilado es CSS (sections.css: cada escena mide
// --scene-h + --sheet-tail y la siguiente entra una pantalla antes, encima).
// Acá vive lo que el CSS no puede:
//   · el título de la hoja que entra lo TIPEA la máquina (ScrambleText con la
//     voz de la matriz, en poses de 12fps) — nunca sobre [data-misregister];
//   · cuando la hoja aterriza (su borde toca el HUD) hay un clic de luz + golpe
//     (cut) y se emite bus 'sheet:landed' (sección); al levantarse, 'sheet:lifted';
//   · bajo la hoja grafito de trabajos la mesa se apaga (html.mesa-off);
//   · RETIMING: todo ScrollTrigger de escena que termina en 'bottom bottom' pasa
//     a terminar una pantalla antes ('bottom bottom+=100%'), o sea justo cuando
//     la hoja siguiente empieza a taparlo. Así ninguna escena guarda su beat
//     final para debajo de la hoja que llega. Los STs con end en función o con
//     pin no se tocan.
import { gsap, ScrollTrigger } from '../core/scroll.js';
import { bus } from '../core/bus.js';
import { shutter, GLYPHS } from '../core/beat.js';
import { cut } from './cuts.js';

const TAIL_END = 'bottom bottom+=100%';

export function initSheets(ctx) {
  const world = document.querySelector('main#world');
  if (!world || ctx.tier === 'static') return;
  const sections = [...world.querySelectorAll(':scope > section')];
  const last = sections[sections.length - 1];

  // ── retiming de los ScrollTrigger de escena (antes de cada refresh) ──
  const retime = () => {
    ScrollTrigger.getAll().forEach((st) => {
      const t = st.trigger;
      if (!t || t.parentElement !== world || t === last) return;
      const v = st.vars;
      if (v.sheetKeep || v.pin || v.end !== 'bottom bottom') return;
      v.end = TAIL_END;
    });
  };
  retime();
  ScrollTrigger.addEventListener('refreshInit', retime);

  // ── la mesa se apaga bajo la hoja grafito (de que aterriza a que la tapan) ──
  const pliegos = world.querySelector('.s-pliegos');
  if (pliegos) {
    ScrollTrigger.create({
      trigger: pliegos, start: 'top top', end: 'bottom bottom', sheetKeep: true,
      toggleClass: { targets: document.documentElement, className: 'mesa-off' },
    });
  }

  // ── cada hoja que entra: título tipeado, aterrizaje con corte ──
  sections.slice(1).forEach((sec) => {
    const h2 = sec.querySelector('.scene-head h2, .pl-opener h2');
    const typed = !!h2 && !h2.hasAttribute('data-misregister');
    let text = h2 ? h2.textContent : '';
    bus.on('i18n:changed', () => {
      if (!h2) return;
      gsap.killTweensOf(h2);
      text = h2.textContent;
    });
    // la máquina tipea el título: glifos de la matriz → letras, de izquierda a derecha
    const typeIn = (dur, delay) => {
      if (!typed) return;
      gsap.killTweensOf(h2);
      h2.textContent = text;
      gsap.to(h2, {
        scrambleText: { text, chars: GLYPHS, tweenLength: false, revealDelay: delay, speed: 0.6 },
        ...shutter(dur),
      });
    };
    // títulos desregistrados (clones ::before/::after): no se tipean, se PRENSAN
    // al aterrizar — dos poses (1.1 → 1), transform puro, sin tocar el texto
    const press = () => {
      if (!h2 || typed) return;
      gsap.fromTo(h2, { scale: 1.1 }, { scale: 1, ...shutter(1 / 12), clearProps: 'transform' });
    };
    ScrollTrigger.create({
      trigger: sec, start: 'top 90%', end: 'top top', sheetKeep: true,
      onEnter: () => typeIn(0.9, 0.25),
      onEnterBack: () => typeIn(0.5, 0),
      onLeave: () => {
        cut();
        press();
        bus.emit('sheet:landed', sec);
      },
      onLeaveBack: () => {
        cut();
        bus.emit('sheet:lifted', sec);
      },
    });
  });

  ScrollTrigger.refresh();
}
