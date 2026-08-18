// Control de calidad: una planilla mono. El scroll marca cada casilla con
// tinta ([x] rojo = rechazado, [+] lima = aprobado), tacha la línea y estampa
// el veredicto en 2 poses. Sin JS la planilla ya está resuelta (CSS default).
import { sequence } from '../core/film.js';
import { frameRand } from '../core/rng.js';

const GL = '#%*+=-/\\|_';

export function initQC(ctx) {
  const list = document.querySelector('.qc-list');
  const items = [...list.querySelectorAll('.qc-item')];
  if (ctx.tier === 'static') {
    items.forEach((it) => it.classList.add('is-done'));
    return;
  }
  const PER = 3;
  items.forEach((it) => {
    it.querySelector('.qc-box').textContent = '[ ]';
    it.querySelector('.qc-tag').style.visibility = 'hidden';
  });
  sequence({
    trigger: list,
    start: 'top 78%',
    end: 'bottom 55%',
    frames: items.length * PER + 3,
    onFrame(f) {
      items.forEach((it, i) => {
        const l = f - i * PER;
        const box = it.querySelector('.qc-box');
        const tag = it.querySelector('.qc-tag');
        const ok = it.dataset.verdict === 'ok';
        if (l < 0) {
          box.textContent = '[ ]';
          it.classList.remove('is-done');
          tag.style.visibility = 'hidden';
          return;
        }
        // 1 cuadro de tinta indecisa antes de fijar la marca
        box.textContent = l === 0 ? `[${GL[(frameRand(f, 40 + i) * GL.length) | 0]}]` : ok ? '[+]' : '[x]';
        it.classList.toggle('is-done', l >= 1);
        tag.style.visibility = l >= 1 ? 'visible' : 'hidden';
        tag.style.transform = l === 1 ? 'rotate(-4deg) scale(1.6)' : 'rotate(-4deg)';
      });
    },
  });
}
