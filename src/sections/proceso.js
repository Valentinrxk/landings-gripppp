// Proceso: 4 estaciones. Cada placa entra desde un lado distinto en 3 poses
// (fuera → overshoot → asentada) y recibe su sello con pose de impacto.
import { sequence } from '../core/film.js';

const DIR = [
  ['translateX(-70vw) rotate(-5deg)', 'translateX(2vw) rotate(1deg)'],
  ['translateY(50vh) rotate(4deg)', 'translateY(-1.5vh) rotate(-1deg)'],
  ['translateX(70vw) rotate(5deg)', 'translateX(-2vw) rotate(-1deg)'],
  ['translateY(-50vh) rotate(-4deg)', 'translateY(1.5vh) rotate(1deg)'],
];

export function initProceso(ctx) {
  const ests = [...document.querySelectorAll('.est')];
  if (ctx.tier === 'static') return;
  ests.forEach((est, i) => {
    const sello = est.querySelector('.sello');
    est.style.visibility = 'hidden';
    sello.style.visibility = 'hidden';
    sequence({
      trigger: est,
      start: 'top 92%',
      end: 'top 45%',
      frames: 10,
      onFrame(f) {
        const [off, over] = DIR[i % DIR.length];
        est.style.visibility = f >= 1 ? 'visible' : 'hidden';
        est.style.transform = f <= 1 ? off : f === 2 ? over : '';
        const s = f - 7;
        sello.style.visibility = s >= 0 ? 'visible' : 'hidden';
        sello.style.transform = s === 0 ? 'rotate(-7deg) scale(1.8)' : 'rotate(-7deg)';
      },
    });
  });
}
