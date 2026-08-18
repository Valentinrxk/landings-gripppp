// Proceso: escena sticky scrubeada. Una estación por vez: el título y el texto
// se revelan por clip-path (la máquina "tipea"), los cuadraditos marcan la
// estación, y a la derecha un diagrama dibujado en código se imprime en ASCII
// con el avance dentro de la estación. Rótulo mono con los valores reales.
import gsap from 'gsap';
import { ScrollTrigger } from '../core/scroll.js';
import { bus } from '../core/bus.js';
import { createPrinter } from '../print/ascii.js';

// diagramas: uno por estación, dibujados en un canvas fuente
function drawDiagram(g, W, H, k) {
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#111';
  g.strokeStyle = '#111';
  const m = Math.min(W, H);
  const cx = W / 2;
  const cy = H / 2;
  if (k === 0) {
    // la marca leída: una hoja con líneas de texto y una mancha (el logo)
    const w = m * 0.5;
    const h = m * 0.66;
    g.lineWidth = m * 0.02;
    g.strokeRect(cx - w / 2, cy - h / 2, w, h);
    for (let i = 0; i < 6; i++) {
      const y = cy - h / 2 + h * (0.22 + i * 0.11);
      const len = w * (i % 3 === 2 ? 0.45 : 0.72);
      g.fillRect(cx - w / 2 + w * 0.12, y, len, m * 0.022);
    }
    g.beginPath();
    g.ellipse(cx + w * 0.22, cy - h * 0.3, m * 0.07, m * 0.05, -0.4, 0, Math.PI * 2);
    g.fill();
  } else if (k === 1) {
    // boceto: wireframe — cajas y una sola idea (círculo) en el centro
    g.lineWidth = m * 0.016;
    const w = m * 0.7;
    const h = m * 0.62;
    g.strokeRect(cx - w / 2, cy - h / 2, w, h);
    g.strokeRect(cx - w / 2, cy - h / 2, w, h * 0.16);
    const cw = (w - m * 0.08) / 3;
    for (let i = 0; i < 3; i++) g.strokeRect(cx - w / 2 + m * 0.02 + i * (cw + m * 0.02), cy + h * 0.14, cw, h * 0.3);
    g.beginPath();
    g.arc(cx, cy - h * 0.1, m * 0.09, 0, Math.PI * 2);
    g.stroke();
  } else if (k === 2) {
    // tinta: tres pasadas planas superpuestas
    g.fillRect(cx - m * 0.34, cy - m * 0.3, m * 0.42, m * 0.42);
    g.fillStyle = '#555';
    g.fillRect(cx - m * 0.1, cy - m * 0.12, m * 0.42, m * 0.42);
    g.fillStyle = '#999';
    g.beginPath();
    g.arc(cx + m * 0.02, cy + m * 0.02, m * 0.2, 0, Math.PI * 2);
    g.fill();
  } else {
    // en línea: la marca de registro — está calibrado, salió
    g.lineWidth = m * 0.028;
    g.beginPath();
    g.arc(cx, cy, m * 0.26, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.arc(cx, cy, m * 0.09, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.moveTo(cx, cy - m * 0.4);
    g.lineTo(cx, cy - m * 0.14);
    g.moveTo(cx, cy + m * 0.14);
    g.lineTo(cx, cy + m * 0.4);
    g.moveTo(cx - m * 0.4, cy);
    g.lineTo(cx - m * 0.14, cy);
    g.moveTo(cx + m * 0.14, cy);
    g.lineTo(cx + m * 0.4, cy);
    g.stroke();
  }
}

export function initProceso(ctx) {
  const sec = document.querySelector('.s-proceso');
  const ests = [...sec.querySelectorAll('.est')];
  const steps = [...sec.querySelectorAll('.proc-steps i')];
  const canvas = sec.querySelector('.proc-canvas');
  const dbg = sec.querySelector('[data-dbg="proc"]');
  const N = ests.length;
  if (ctx.tier === 'static') {
    ests.forEach((e) => {
      e.classList.add('is-on');
      e.style.position = 'static';
      e.querySelectorAll('h3, p').forEach((el) => (el.style.clipPath = 'none'));
      e.querySelector('.sello').style.opacity = '1';
    });
    steps.forEach((s) => s.classList.add('on'));
    return;
  }

  const printer = createPrinter(canvas, { cellMax: 22, cellMin: 7, inks: ['#f0403c', '#5fa8e0', '#111111'] });
  const src = document.createElement('canvas');
  let curK = -1;
  const buildSource = (k) => {
    const r = canvas.getBoundingClientRect();
    src.width = Math.max(2, Math.round(r.width));
    src.height = Math.max(2, Math.round(r.height));
    drawDiagram(src.getContext('2d'), src.width, src.height, k);
    printer.setSource(src);
    printer.resize();
    curK = k;
  };
  bus.on('resize', () => {
    if (curK >= 0) buildSource(curK);
  });

  const st = ScrollTrigger.create({ trigger: sec, start: 'top top', end: 'bottom bottom' });
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  let lastP = -1;
  gsap.ticker.add(() => {
    const p = st.progress;
    if (p === lastP) return;
    lastP = p;
    // 0.06→0.94: las N estaciones; los bordes quedan quietos (lectura)
    const t = Math.max(0, Math.min(0.9999, (p - 0.06) / 0.88));
    const k = Math.floor(t * N);
    const q = t * N - k; // avance dentro de la estación
    ests.forEach((e, i) => {
      const on = i === k;
      e.classList.toggle('is-on', on);
      if (!on) return;
      const h = e.querySelector('h3');
      const para = e.querySelector('p');
      const sello = e.querySelector('.sello');
      // el título se tipea en el primer tercio, el texto en el segundo
      const th = easeOut(Math.min(1, q / 0.3));
      const tp = easeOut(Math.max(0, Math.min(1, (q - 0.18) / 0.4)));
      h.style.clipPath = `inset(0 ${((1 - th) * 100).toFixed(1)}% 0 0)`;
      para.style.clipPath = `inset(0 ${((1 - tp) * 100).toFixed(1)}% 0 0)`;
      sello.style.opacity = q > 0.72 ? '1' : '0';
    });
    steps.forEach((s, i) => s.classList.toggle('on', i <= k));
    if (curK !== k) buildSource(k);
    // el diagrama se imprime con el avance de la estación (registra al final)
    const stt = printer.draw(Math.min(1, q / 0.85));
    if (dbg && stt) {
      dbg.textContent = `est. ${String(k + 1).padStart(2, '0')} · celda: ${stt.cell}px · registro: ${Math.round(Math.min(1, q / 0.85) * 100)}%`;
    }
  });
}
