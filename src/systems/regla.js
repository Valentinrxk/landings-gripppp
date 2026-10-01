// La regla: la barra de scroll de la casa. Un hilo en el borde derecho que se
// llena de tinta (fucsia · dorado · celeste, corriendo como en el rodillo), una
// gota en la punta que se estira con el envión y el avance en mono (000–100,
// como el contador del splash). Marcas donde empieza cada sección. Se toca o se
// arrastra: es una barra de scroll de verdad (la nativa está escondida).
import { gsap, scrollLean } from '../core/scroll.js';
import { bus } from '../core/bus.js';

export function initRegla(ctx, lenis) {
  if (ctx.tier === 'static') return;
  const el = document.createElement('div');
  el.id = 'regla';
  el.setAttribute('aria-hidden', 'true'); // el scroll de siempre (rueda, teclado, dedo) sigue andando
  el.dataset.cursor = 'arrastrá';
  el.innerHTML = '<i class="regla-track"></i><i class="regla-fill"></i><span class="regla-head"><i class="regla-gota"></i><b class="regla-n mono">000</b></span>';
  document.body.appendChild(el);
  const fill = el.querySelector('.regla-fill');
  const head = el.querySelector('.regla-head');
  const gota = el.querySelector('.regla-gota');
  const num = el.querySelector('.regla-n');

  const max = () => Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const toY = (clientY) => {
    const r = el.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientY - r.top) / r.height)) * max();
  };

  // las marcas de sección: donde arranca cada una (los beats de la nav sobre el total)
  let ticks = false;
  const buildTicks = () => {
    const nb = +document.getElementById('journey')?.dataset.nb;
    if (!nb) return;
    ticks = true;
    document.querySelectorAll('.marks button[data-from]').forEach((m) => {
      const f = +m.dataset.from / nb;
      if (f <= 0 || f >= 1) return;
      const t = document.createElement('i');
      t.className = 'regla-tick';
      t.style.top = `${(f * 100).toFixed(2)}%`;
      el.appendChild(t);
    });
  };

  let lastN = -1;
  let stretch = 1;
  gsap.ticker.add(() => {
    if (!ticks) buildTicks();
    const p = Math.max(0, Math.min(1, window.scrollY / max()));
    fill.style.clipPath = `inset(0 0 ${((1 - p) * 100).toFixed(2)}% 0)`;
    head.style.transform = `translate3d(0, ${(p * el.clientHeight).toFixed(1)}px, 0)`;
    // la gota se estira con el envión y vuelve a ser gota al frenar
    stretch += (1 + Math.min(1.4, Math.abs(scrollLean()) * 2.2) - stretch) * 0.2;
    gota.style.transform = `scale(${(1 / Math.sqrt(stretch)).toFixed(3)}, ${stretch.toFixed(3)})`;
    const n = Math.round(p * 100);
    if (n !== lastN) {
      lastN = n;
      num.textContent = String(n).padStart(3, '0');
    }
  });

  // tocar la regla lleva hasta ahí; arrastrar la gota scrollea en directo
  let drag = false;
  el.addEventListener('pointerdown', (e) => {
    drag = true;
    el.setPointerCapture(e.pointerId);
    el.classList.add('is-drag');
    const y = toY(e.clientY);
    if (lenis) lenis.scrollTo(y, { duration: 0.9 });
    else window.scrollTo(0, y);
  });
  el.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const y = toY(e.clientY);
    if (lenis) lenis.scrollTo(y, { immediate: true });
    else window.scrollTo(0, y);
  });
  const end = () => {
    drag = false;
    el.classList.remove('is-drag');
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  bus.on('i18n:changed', () => (lastN = -1));
}
