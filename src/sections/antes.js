// Plantilla → marca: la racleta cruza el cuadro con el scroll y borra la
// landing genérica (dibujada en código) dejando la impresa. El rótulo expone
// el clip-path real. Sin JS: la impresa completa (CSS default lo resuelve).
import gsap from 'gsap';
import { ScrollTrigger } from '../core/scroll.js';

export function initAntes(ctx) {
  const sec = document.querySelector('.s-antes');
  if (!sec) return;
  const print = sec.querySelector('.ad-print');
  const racleta = sec.querySelector('.ad-racleta');
  const dbg = sec.querySelector('[data-dbg="ad"]');
  const tagL = sec.querySelector('.ad-tag-r'); // la etiqueta 'plantilla' desaparece cuando la racleta la borra
  if (ctx.tier === 'static') {
    print.style.clipPath = 'none';
    racleta.style.display = 'none';
    tagL.style.display = 'none';
    return;
  }
  const st = ScrollTrigger.create({ trigger: sec, start: 'top top', end: 'bottom bottom' });
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  let last = -1;
  gsap.ticker.add(() => {
    const p = st.progress;
    if (p === last) return;
    last = p;
    // la pasada ocupa el tramo central del scrub; los extremos son lectura
    const t = easeInOut(Math.max(0, Math.min(1, (p - 0.12) / 0.7)));
    const pct = t * 100;
    print.style.clipPath = `inset(0 ${(100 - pct).toFixed(2)}% 0 0)`;
    racleta.style.left = `${pct.toFixed(2)}%`;
    racleta.style.visibility = pct <= 0.2 || pct >= 99.8 ? 'hidden' : 'visible';
    tagL.style.opacity = pct > 92 ? '0' : '1';
    if (dbg) dbg.textContent = `clip-path: inset(0 ${(100 - pct).toFixed(1)}% 0 0) · racleta: ${pct.toFixed(0)}%`;
  });
}
