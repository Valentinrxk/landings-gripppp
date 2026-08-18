// La gota: el objeto persistente de la casa. Una esfera de puntos proyectada
// y dibujada con glifos mono (la matriz de la máquina) en tres tintas. Rota
// despacio; con el envión del scroll las tres pasadas se desregistran y los
// puntos se agitan (la tinta se pierde en movimiento, registra al frenar).
// Vive en una capa fija y cambia de lugar/opacidad por escena.
import gsap from 'gsap';
import { scrollLean } from '../core/scroll.js';
import { glyphAtlas } from '../print/ascii.js';

export function initOrb(ctx) {
  const canvas = document.getElementById('orb');
  if (!canvas || ctx.tier === 'static') {
    canvas?.remove();
    return;
  }
  const g = canvas.getContext('2d');
  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  const N = ctx.tier === 'lite' ? 520 : 900;
  // esfera de fibonacci
  const pts = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = golden * i;
    pts.push([Math.cos(th) * r, y, Math.sin(th) * r, Math.random()]);
  }
  let W = 0;
  let H = 0;
  const size = () => {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
  };
  size();
  window.addEventListener('resize', size);

  // escenas: dónde vive la gota y cuánto se ve (interpolado por scroll)
  const scenes = {
    hero: document.querySelector('.s-hero'),
    contacto: document.querySelector('.s-contacto'),
  };
  const mobile = () => window.innerWidth <= 720;
  const place = () => {
    // devuelve {x, y, R, alpha} según dónde estamos
    const y = window.scrollY;
    const vh = H;
    const heroEnd = scenes.hero.offsetTop + scenes.hero.offsetHeight - vh;
    const cTop = scenes.contacto.offsetTop;
    if (y <= heroEnd) {
      const p = Math.min(1, y / Math.max(1, heroEnd));
      const alpha = 1 - Math.min(1, p / 0.55);
      if (mobile()) return { x: W * 0.5, y: vh * 0.24, R: Math.min(W, vh) * 0.17, alpha, spin: p };
      return { x: W * 0.78, y: vh * 0.56, R: Math.min(W * 0.155, vh * 0.25), alpha, spin: p };
    }
    if (y >= cTop - vh) {
      const p = Math.max(0, Math.min(1, (y - (cTop - vh)) / vh));
      if (mobile()) return { x: W * 0.5, y: vh * 0.28, R: Math.min(W, vh) * 0.18, alpha: p, spin: 1 + p };
      return { x: W * 0.72, y: vh * 0.5, R: Math.min(W * 0.16, vh * 0.24), alpha: p, spin: 1 + p };
    }
    return null;
  };

  const inks = ['#f0403c', '#5fa8e0', '#111111'];
  let t = 0;
  let last = 0;
  gsap.ticker.add((time) => {
    const dt = Math.min(0.05, time - last);
    last = time;
    const P = place();
    g.clearRect(0, 0, W, H);
    if (!P || P.alpha <= 0.01) return;
    t += dt;
    const lean = scrollLean();
    const rot = t * 0.35 + P.spin * 1.2;
    const cell = Math.max(7, Math.round(P.R / 22));
    const turb = Math.abs(lean); // 0..1
    const off = turb * cell * 2.2;
    const cr = Math.cos(rot);
    const sr = Math.sin(rot);
    const tilt = 0.35;
    const ct = Math.cos(tilt);
    const stt = Math.sin(tilt);
    // proyectar
    const proj = new Array(N);
    for (let i = 0; i < N; i++) {
      const [x0, y0, z0, s] = pts[i];
      // giro en Y y leve inclinación en X
      let x = x0 * cr + z0 * sr;
      let z = -x0 * sr + z0 * cr;
      let y = y0 * ct - z * stt;
      z = y0 * stt + z * ct;
      // agitación radial con el envión (semilla propia por punto)
      const k = 1 + turb * (s - 0.5) * 0.7 * Math.sin(t * 6 + s * 40);
      proj[i] = [x * k, y * k, z];
    }
    proj.sort((a, b) => a[2] - b[2]); // atrás → adelante
    g.globalAlpha = P.alpha;
    for (let pass = 0; pass < 3; pass++) {
      const ink = inks[pass];
      const a = glyphAtlas(ink, cell);
      const dx = pass === 0 ? -off : pass === 1 ? off : 0;
      const dy = pass === 0 ? off * 0.5 : pass === 1 ? -off * 0.4 : 0;
      if (pass < 2 && off < 0.5) continue; // registrada: solo la pasada negra
      g.globalAlpha = P.alpha * (pass < 2 ? 0.8 : 1);
      for (let i = 0; i < N; i++) {
        const [x, y, z] = proj[i];
        const depth = (z + 1) / 2; // 0 atrás, 1 adelante
        const gi = Math.min(a.n - 1, Math.round((1 - depth) * (a.n - 2)));
        const px = P.x + x * P.R + dx;
        const py = P.y + y * P.R + dy;
        const sc = 0.55 + depth * 0.65;
        g.drawImage(a.c, gi * a.s, 0, a.s, a.s, px - (cell * sc) / 2, py - (cell * sc) / 2, cell * sc, cell * sc);
      }
    }
    g.globalAlpha = 1;
  });
}
