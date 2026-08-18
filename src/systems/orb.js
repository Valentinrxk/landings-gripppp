// La gota: el objeto persistente de la casa. Una esfera de puntos proyectada
// y dibujada con glifos mono (la matriz de la máquina) en tres tintas.
//
// Vive en una capa fija por ENCIMA de las escenas (multiply sobre papel/plata,
// screen sobre grafito) y cambia de lugar/tamaño/opacidad con una tabla de
// poses scrubeada sobre #world: hero (derecha) → proceso (chica, la plancha,
// arriba a la derecha del diagrama) → trabajos (marca de agua enorme, plata)
// → plantilla (se apaga) → contacto (derecha). La rotación avanza SOLO en el
// obturador ('frame', 12fps): la gota es stop-motion como todo lo demás.
// Con el envión del scroll las tres pasadas se desregistran y los puntos se
// agitan; un click la patea (turbulencia que decae); quieta, respira.
import { gsap, ScrollTrigger, scrollLean } from '../core/scroll.js';
import { bus } from '../core/bus.js';
import { glyphAtlas } from '../print/ascii.js';
import { idleFor } from './idle.js';

const INK_LIGHT = ['#f0403c', '#5fa8e0', '#111111']; // rojo, celeste, negro (última manda)
const INK_DARK = ['#f0403c', '#5fa8e0', '#e6e7eb']; // sobre grafito: plata-2 manda

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
  const proj = new Array(N);
  let W = 0;
  let H = 0;
  let dirty = { x: 0, y: 0, w: 0, h: 0 }; // caja dibujada en el último cuadro
  const size = () => {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    dirty = { x: 0, y: 0, w: W, h: H };
  };

  // ── la pose actual (la scrubea la timeline) ──
  const pose = { x: 0, y: 0, R: 0, alpha: 0, spin: 0, dark: 0 };
  const state = { turb: 0 }; // patada (click / corte), decae
  const mobile = () => window.innerWidth <= 720;

  // dónde vive la gota en cada escena. La plancha (proceso) se mide contra el
  // DOM — arriba a la derecha de la columna del diagrama — para sobrevivir a
  // cambios de layout.
  const scenes = ['#inicio', '#proceso', '#trabajos', '#plantilla', '#contacto'].map((s) => document.querySelector(s));
  const posesFor = () => {
    const m = mobile();
    const minWH = Math.min(W, H);
    const hero = m
      ? { x: W * 0.5, y: H * 0.24, R: minWH * 0.17, alpha: 1, spin: 0, dark: 0 }
      : { x: W * 0.78, y: H * 0.56, R: Math.min(W * 0.155, H * 0.25), alpha: 1, spin: 0, dark: 0 };
    let proc = m
      ? { x: W - 16 - minWH * 0.09, y: H * 0.16, R: minWH * 0.08, alpha: 0.85, spin: 1.2, dark: 0 }
      : { x: W * 0.9, y: H * 0.34, R: minWH * 0.075, alpha: 0.9, spin: 1.2, dark: 0 };
    const diag = document.querySelector('.proc-diagram');
    const stage = diag?.closest('.stage');
    if (diag && stage) {
      const dr = diag.getBoundingClientRect();
      const sr = stage.getBoundingClientRect();
      if (dr.width > 40 && dr.height > 40) {
        const R = Math.max(24, Math.min(minWH * 0.075, dr.width * 0.18, dr.height * 0.3));
        proc = { x: dr.right - sr.left - R - 14, y: dr.top - sr.top + R + 14, R, alpha: 0.9, spin: 1.2, dark: 0 };
      }
    }
    const trab = m
      ? { x: W * 0.5, y: H * 0.5, R: minWH * 0.62, alpha: 0.1, spin: 2.4, dark: 1 }
      : { x: W * 0.62, y: H * 0.5, R: minWH * 0.58, alpha: 0.1, spin: 2.4, dark: 1 };
    const plant = { x: trab.x, y: trab.y, R: minWH * 0.3, alpha: 0, spin: 3.2, dark: 0 };
    const cont = m
      ? { x: W * 0.5, y: H * 0.28, R: minWH * 0.18, alpha: 1, spin: 4.2, dark: 0 }
      : { x: W * 0.72, y: H * 0.5, R: Math.min(W * 0.16, H * 0.24), alpha: 1, spin: 4.2, dark: 0 };
    return [hero, proc, trab, plant, cont];
  };

  // ── la tabla de poses, scrubeada sobre #world ──
  // duración de la timeline = px de scroll; cada transición ocupa exactamente
  // la ventana en que la escena siguiente sube por la pantalla (top bottom →
  // top top). Entre medio la pose se sostiene. Se reconstruye cuando cambian
  // las alturas (resize, refresh de ScrollTrigger).
  let tl = null;
  let sig = '';
  const build = () => {
    const tops = scenes.map((s) => (s ? s.offsetTop : 0));
    const total = Math.max(1, document.documentElement.scrollHeight - H);
    const key = tops.join('|') + '|' + total + '|' + W + 'x' + H;
    if (key === sig) return;
    sig = key;
    tl?.scrollTrigger?.kill();
    tl?.kill();
    const P = posesFor();
    Object.assign(pose, P[0]); // estado base = hero (el set en 0 revierte a esto)
    tl = gsap.timeline({
      scrollTrigger: { trigger: '#world', start: 'top top', end: 'bottom bottom', scrub: 0.4 },
    });
    tl.set(pose, { ...P[0] }, 0);
    for (let i = 1; i < P.length; i++) {
      const at = Math.max(0, Math.min(total - 1, tops[i] - H));
      const dur = Math.max(1, Math.min(H, total - at));
      if (P[i].dark !== P[i - 1].dark && P[i].alpha > 0 && P[i - 1].alpha > 0) {
        // cambio de tinta (negro↔plata): la gota se apaga a mitad del cruce y
        // vuelve a encenderse con la otra tinta — nunca se ve blanca sobre plata
        const mid = { x: (P[i].x + P[i - 1].x) / 2, y: (P[i].y + P[i - 1].y) / 2, R: (P[i].R + P[i - 1].R) / 2, spin: (P[i].spin + P[i - 1].spin) / 2 };
        tl.to(pose, { ...mid, alpha: 0, dark: P[i - 1].dark, duration: dur * 0.5, ease: 'none' }, at)
          .set(pose, { dark: P[i].dark })
          .to(pose, { ...P[i], duration: dur * 0.5, ease: 'none' });
      } else {
        tl.to(pose, { ...P[i], duration: dur, ease: 'none' }, at);
      }
    }
    tl.set({}, {}, total); // relleno: duración = scroll total
    dirty = { x: 0, y: 0, w: W, h: H };
  };
  size();
  build();
  ScrollTrigger.addEventListener('refresh', build);
  bus.on('resize', () => {
    size();
    build();
  });

  // ── patada: click (no touch) y cortes de escena ──
  const kick = gsap
    .timeline({ paused: true })
    .to(state, { turb: 1, duration: 0.08 })
    .to(state, { turb: 0, duration: 0.9, ease: 'expo.out' });
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return;
    kick.restart();
  });
  bus.on('sheet:landed', () => kick.restart());
  bus.on('cut', () => kick.restart());

  // ── render: solo en el obturador, solo dentro de su caja ──
  let rot = 0;
  let lastDark = -1;
  bus.on('frame', (f) => {
    rot += 0.35 / 12; // la rotación avanza SOLO por cuadro
    if (document.hidden) return;
    if (dirty.w > 0) g.clearRect(dirty.x - 2, dirty.y - 2, dirty.w + 4, dirty.h + 4);
    dirty = { x: 0, y: 0, w: 0, h: 0 };
    if (pose.alpha <= 0.01 || pose.R < 2) return;

    // tintas según fondo: sobre grafito la pasada que manda es plata (screen)
    const dark = pose.dark > 0.5 ? 1 : 0;
    if (dark !== lastDark) {
      lastDark = dark;
      canvas.dataset.ink = dark ? 'plata' : 'negro';
    }
    const inks = dark ? INK_DARK : INK_LIGHT;

    const t = f / 12;
    const idle = idleFor();
    const breath = idle > 2 ? 1 + 0.03 * Math.sin((idle - 2) * 1.3) : 1;
    const R = pose.R * breath;
    const lean = scrollLean();
    const turb = Math.min(1, Math.abs(lean) + state.turb); // 0..1
    const cell = Math.max(7, Math.min(16, Math.round(R / 22)));
    const off = Math.abs(lean) * cell * 2.2 + state.turb * cell * 1.4;
    const a = rot + pose.spin * 1.2;
    const cr = Math.cos(a);
    const sr = Math.sin(a);
    const tilt = 0.35;
    const ct = Math.cos(tilt);
    const stt = Math.sin(tilt);
    for (let i = 0; i < N; i++) {
      const [x0, y0, z0, s] = pts[i];
      const x = x0 * cr + z0 * sr;
      let z = -x0 * sr + z0 * cr;
      const y = y0 * ct - z * stt;
      z = y0 * stt + z * ct;
      // agitación radial con el envión / la patada (semilla propia por punto)
      const k = 1 + turb * (s - 0.5) * 0.7 * Math.sin(t * 6 + s * 40);
      proj[i] = [x * k, y * k, z];
    }
    proj.sort((p, q) => p[2] - q[2]); // atrás → adelante
    const reach = R * (1 + turb * 0.4) + cell + off + 4;
    dirty = { x: pose.x - reach, y: pose.y - reach, w: reach * 2, h: reach * 2 };
    for (let pass = 0; pass < 3; pass++) {
      if (pass < 2 && off < 0.5) continue; // registrada: solo la pasada que manda
      const atl = glyphAtlas(inks[pass], cell);
      const ox = pass === 0 ? -off : pass === 1 ? off : 0;
      const oy = pass === 0 ? off * 0.5 : pass === 1 ? -off * 0.4 : 0;
      g.globalAlpha = pose.alpha * (pass < 2 ? 0.8 : 1);
      for (let i = 0; i < N; i++) {
        const [x, y, z] = proj[i];
        const depth = (z + 1) / 2; // 0 atrás, 1 adelante
        const gi = Math.min(atl.n - 1, Math.round((1 - depth) * (atl.n - 2)));
        const px = pose.x + x * R + ox;
        const py = pose.y + y * R + oy;
        const sc = 0.55 + depth * 0.65;
        g.drawImage(atl.c, gi * atl.s, 0, atl.s, atl.s, px - (cell * sc) / 2, py - (cell * sc) / 2, cell * sc, cell * sc);
      }
    }
    g.globalAlpha = 1;
  });
}
