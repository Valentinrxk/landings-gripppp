// Contacto: la escena de conversión. "hablemos." se ESTAMPA (2 poses, corte),
// el punto final cae último como su propio sello; el sub lo tipea la máquina;
// los CTAs son palancas magnéticas con retenes (quickTo a saltos de 3px, no
// un botón de framer); los links del pie se subrayan en 4 poses; en idle la
// racleta vuelve a entintar el botón rojo (una banda cromada en 5 poses).
// El título es [data-misregister]: NUNCA SplitText/ScrambleText sobre él —
// el sello se hace con la propiedad `scale` (var --stamp), que no pelea con
// el `transform` del tic.
import '../styles/contacto.css';
import { bus } from '../core/bus.js';
import { gsap, ScrollTrigger } from '../core/scroll.js';
import { shutter, scramble } from '../core/beat.js';
import { cut } from '../systems/cuts.js';
import { spliceFlash } from '../systems/flash.js';
import { watch } from '../core/viewport.js';
import { t } from '../data/i18n.js';

const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

export function initContacto(ctx) {
  const sec = document.querySelector('.s-contacto');
  if (!sec) return;
  const title = sec.querySelector('.ct-title');
  const sub = sec.querySelector('.ct-sub');
  const big = sec.querySelector('.cta.big');
  const ctas = [...sec.querySelectorAll('.cta')];
  const hudCta = document.querySelector('.hud-cta');

  // el punto final es su propio sello (se re-envuelve al cambiar de idioma;
  // el data-text de los clones serigráficos sigue siendo el textContent)
  let dot = null;
  const wrapDot = () => {
    const txt = title.textContent;
    if (!/[.!]$/.test(txt)) return (dot = null);
    title.innerHTML = esc(txt.slice(0, -1)) + `<span class="ct-dot">${txt.slice(-1)}</span>`;
    dot = title.querySelector('.ct-dot');
    return dot;
  };
  wrapDot();

  if (ctx.tier === 'static') return; // impreso: todo visible, sin motion

  let entered = false;
  gsap.set([title, sub], { autoAlpha: 0 });
  bus.on('i18n:changed', () => {
    wrapDot();
    gsap.killTweensOf(sub);
    sub.textContent = t('ct.sub');
  });

  // ── entrada: el sello del título (2 poses + corte), el punto cae último con
  // un tirón de desregistro de 1 cuadro, el sub lo tipea la máquina ──
  const enter = () => {
    if (entered) return;
    entered = true;
    const root = document.documentElement.style;
    gsap
      .timeline()
      .set(title, { autoAlpha: 1 })
      .fromTo(title, { '--stamp': 1.25 }, { '--stamp': 1, duration: 2 / 12, ease: 'steps(2)', onStart: cut }, 0)
      .add(() => {
        if (!dot) return;
        gsap.fromTo(
          dot,
          { autoAlpha: 0, scale: 1.9 },
          {
            autoAlpha: 1,
            scale: 1,
            duration: 2 / 12,
            ease: 'steps(2)',
            onStart: () => {
              spliceFlash();
              root.setProperty('--mis-x', '6px'); // 1 tick: el motor lo pisa en el próximo cuadro
              root.setProperty('--mis-y', '-4px');
            },
          }
        );
      }, 4 / 12)
      .set(sub, { autoAlpha: 1 }, 7 / 12)
      .add(() => scramble(sub, sub.textContent, 0.9, { revealDelay: 0.3, speed: 0.7 }), 7 / 12);
  };
  if (dot) gsap.set(dot, { autoAlpha: 0 });
  ScrollTrigger.create({ trigger: title, start: 'top 88%', once: true, onEnter: enter });

  // ── palancas magnéticas con retenes: solo puntero fino ──
  if (matchMedia('(pointer: fine)').matches && !ctx.coarse) {
    const magnet = (btn) => {
      if (!btn) return;
      const qx = gsap.quickTo(btn, 'x', { duration: 0.25, ease: 'steps(3)' });
      const qy = gsap.quickTo(btn, 'y', { duration: 0.25, ease: 'steps(3)' });
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        // retenes de 3px, tope de 12px: una palanca, no un imán
        qx(Math.max(-12, Math.min(12, Math.round((dx * 0.24) / 3) * 3)));
        qy(Math.max(-9, Math.min(9, Math.round((dy * 0.24) / 3) * 3)));
      });
      btn.addEventListener('pointerleave', () => {
        qx(0);
        qy(0);
      });
    };
    ctas.forEach(magnet);
    magnet(hudCta);
  }

  // ── idle: la racleta re-entinta el botón rojo (banda cromada, 5 poses) ──
  let live = false;
  watch(sec, { enter: () => (live = true), leave: () => (live = false) });
  bus.on('idle:beat', () => {
    if (!live || !big || !entered) return;
    gsap.fromTo(big, { '--band': '-45%' }, { '--band': '125%', ...shutter(5 / 12) });
  });
}
