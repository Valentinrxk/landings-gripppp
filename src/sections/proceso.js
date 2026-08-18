// Proceso: 4 placas. Entran de forma continua (ease-out sobre el progreso
// real, cada una desde un lado distinto), la grilla entera se inclina con el
// envión del scroll y el sello aparece cuando la placa se asienta.
import gsap from 'gsap';
import { ScrollTrigger, scrollLean } from '../core/scroll.js';

const DIR = [
  [-38, 0],
  [0, 34],
  [38, 0],
  [0, -34],
]; // vw / vh de partida
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export function initProceso(ctx) {
  const grid = document.querySelector('.estaciones');
  const lis = [...document.querySelectorAll('.est')];
  if (ctx.tier === 'static' || !grid) return;
  const units = lis.map((li, i) => {
    const plate = li.querySelector('.est-in');
    const sello = li.querySelector('.sello');
    sello.style.opacity = '0';
    const st = ScrollTrigger.create({ trigger: li, start: 'top 95%', end: 'top 45%' });
    return { li, plate, sello, st, dir: DIR[i % DIR.length], last: -1 };
  });
  let skew = 0;
  gsap.ticker.add(() => {
    const lean = scrollLean();
    skew += (-lean * 3 - skew) * 0.14;
    grid.style.transform = Math.abs(skew) > 0.02 ? `skewY(${skew.toFixed(2)}deg)` : '';
    for (const u of units) {
      const p = u.st.progress;
      if (p === u.last) continue;
      u.last = p;
      const e = easeOut(p);
      const [dx, dy] = u.dir;
      u.plate.style.transform = `translate3d(${(dx * (1 - e)).toFixed(2)}vw, ${(dy * (1 - e)).toFixed(2)}vh, 0)`;
      u.plate.style.opacity = String(Math.min(1, e * 1.6));
      u.sello.style.opacity = p > 0.85 ? '1' : '0';
    }
  });
}
