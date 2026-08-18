// La regla (abajo): playhead rojo que recorre la escena ACTUAL y un rótulo
// "escena 02/05 · 34%". Reemplaza a la barra de scroll (que se oculta).
import gsap from 'gsap';

export function initRail(ctx) {
  const rail = document.getElementById('rail');
  if (!rail || ctx.tier === 'static') return;
  document.documentElement.classList.add('no-scrollbar');
  const head = rail.querySelector('.rail-head');
  const txt = rail.querySelector('.rail-txt');
  const scenes = [...document.querySelectorAll('main > section')];
  let last = '';
  gsap.ticker.add(() => {
    const y = window.scrollY;
    const vh = window.innerHeight;
    let idx = 0;
    let p = 0;
    for (let i = 0; i < scenes.length; i++) {
      const s = scenes[i];
      const top = s.offsetTop;
      const h = s.offsetHeight;
      const range = Math.max(1, h - vh);
      if (y >= top - 1 || i === 0) {
        idx = i;
        p = Math.max(0, Math.min(1, (y - top) / range));
        if (i === scenes.length - 1) p = Math.max(0, Math.min(1, (y - top) / Math.max(1, document.documentElement.scrollHeight - vh - top)));
      }
    }
    const gutter = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gutter')) || 72;
    const w = window.innerWidth - gutter * 2;
    const key = `${idx}|${p.toFixed(3)}`;
    if (key === last) return;
    last = key;
    head.style.transform = `translate3d(${(p * w).toFixed(1)}px,0,0)`;
    txt.textContent = `escena ${String(idx + 1).padStart(2, '0')}/${String(scenes.length).padStart(2, '0')} · ${String(Math.round(p * 100)).padStart(3, '0')}`;
  });
}
