// La plantilla, multiplicada.
// Ruido: un muro de landings genéricas casi idénticas —el hero que promete "el
// siguiente nivel", el botón violeta, el blob degradé, los tres iconitos— que se
// pierde en la distancia, todas scrolleando su página igual y al mismo tiempo.
// Pila: el muro se viene abajo carta por carta y queda un montón en el piso.
// Señal: de la pila se levanta una sola, se da vuelta y es una landing de verdad,
// con color y movimiento (un <video> proyectado: ver proyectar.js); la pila se
// apaga. Todo lo maneja el scroll (g = progreso del viaje en beats).
import * as THREE from 'three';
import { mulberry32 } from '../core/rng.js';
import { proyectar } from './proyectar.js';

const PW = 512; // la página genérica: se ve una ventana que scrollea
const PH = 1536;
const WIN = 790; // alto visible de la página (da la proporción de la carta)

const VARIANTS = [
  { acc: '#7c3aed', blob: ['#a78bfa', '#f0abfc'] },
  { acc: '#6d28d9', blob: ['#818cf8', '#c4b5fd'] },
  { acc: '#8b5cf6', blob: ['#c084fc', '#93c5fd'] },
  { acc: '#7c3aed', blob: ['#a5b4fc', '#f9a8d4'] },
];
// los clichés, en los dos idiomas (cada variante tiene su promesa)
const COPY = {
  es: {
    heads: [['Llevá tu negocio', 'al siguiente nivel'], ['Soluciones', 'innovadoras para vos'], ['Potenciá tu marca', 'con tecnología'], ['Todo lo que necesitás,', 'en un solo lugar']],
    brand: 'Marca', start: 'Empezá gratis', badge: 'Nuevo · ahora con IA',
    sub: ['La plataforma todo en uno que te ayuda', 'a crecer más rápido. Sin complicaciones.'],
    go: 'Empezá ahora  →', demo: 'Ver demo', trust: 'Más de 10.000 empresas confían en nosotros',
    all: 'Todo lo que necesitás', feats: ['Rápido', 'Seguro', 'Escalable'], quote: '"Cambió la forma en que trabajamos."', ready: '¿Listo para empezar?',
  },
  en: {
    heads: [['Take your business', 'to the next level'], ['Innovative', 'solutions for you'], ['Power up your', 'brand with tech'], ['Everything you need,', 'all in one place']],
    brand: 'Brand', start: 'Start for free', badge: 'New · now with AI',
    sub: ['The all-in-one platform that helps you', 'grow faster. No hassle.'],
    go: 'Get started  →', demo: 'Watch demo', trust: 'Trusted by 10,000+ companies',
    all: 'Everything you need', feats: ['Fast', 'Secure', 'Scalable'], quote: '"It changed the way we work."', ready: 'Ready to get started?',
  },
};

// la landing que ya viste: dibujada en un canvas, con todos sus clichés
function draw(cv, vi, c) {
  const v = VARIANTS[vi];
  const head = c.heads[vi];
  const g = cv.getContext('2d');
  const F = (w, s) => `${w} ${s}px system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
  const rr = (x, y, w, h, r) => {
    g.beginPath();
    g.roundRect(x, y, w, h, r);
    g.fill();
  };
  const star = (cx, cy, r) => {
    g.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const rad = k % 2 ? r * 0.45 : r;
      g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
    }
    g.fill();
  };
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, PW, PH);
  // nav: logo, tres links, el botón
  g.fillStyle = v.acc;
  g.beginPath();
  g.arc(36, 32, 11, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#0f172a';
  g.font = F(700, 17);
  g.fillText(c.brand, 54, 38);
  g.fillStyle = '#cbd5e1';
  [196, 246, 296].forEach((x) => rr(x, 28, 38, 8, 4));
  g.fillStyle = v.acc;
  rr(366, 16, 118, 32, 16);
  g.fillStyle = '#fff';
  g.font = F(600, 12);
  g.fillText(c.start, 382, 37);
  g.fillStyle = '#eef0f4';
  g.fillRect(0, 64, PW, 1);
  // hero: el badge, la promesa, el subtítulo, los dos botones
  g.fillStyle = '#f1ecff';
  rr(32, 96, 176, 26, 13);
  g.fillStyle = v.acc;
  g.font = F(600, 12);
  g.fillText(c.badge, 46, 114);
  g.fillStyle = '#0f172a';
  g.font = F(800, 41);
  g.fillText(head[0], 32, 178);
  g.fillText(head[1], 32, 226);
  g.fillStyle = '#64748b';
  g.font = F(400, 16);
  g.fillText(c.sub[0], 32, 266);
  g.fillText(c.sub[1], 32, 288);
  g.fillStyle = v.acc;
  rr(32, 316, 172, 48, 24);
  g.fillStyle = '#fff';
  g.font = F(600, 15);
  g.fillText(c.go, 54, 346);
  g.strokeStyle = '#cbd5e1';
  g.lineWidth = 2;
  g.beginPath();
  g.roundRect(218, 316, 128, 48, 24);
  g.stroke();
  g.fillStyle = '#0f172a';
  g.fillText(c.demo, 240, 346);
  // la ilustración: el blob degradé con una tarjetita de dashboard flotando
  const gr = g.createLinearGradient(80, 400, 460, 720);
  gr.addColorStop(0, v.blob[0]);
  gr.addColorStop(1, v.blob[1]);
  g.fillStyle = gr;
  g.beginPath();
  g.ellipse(272, 560, 210, 140, -0.3, 0, Math.PI * 2);
  g.fill();
  g.save();
  g.shadowColor = 'rgba(15, 23, 42, 0.18)';
  g.shadowBlur = 24;
  g.shadowOffsetY = 10;
  g.fillStyle = '#ffffff';
  rr(148, 478, 248, 156, 16);
  g.restore();
  g.fillStyle = '#e2e8f0';
  rr(168, 498, 90, 10, 5);
  rr(168, 516, 60, 8, 4);
  g.fillStyle = v.acc;
  [48, 70, 40, 88, 62, 96].forEach((h, k) => rr(172 + k * 34, 614 - h, 20, h, 4));
  // logos: la prueba social
  g.fillStyle = '#94a3b8';
  g.font = F(500, 13);
  g.fillText(c.trust, 32, 748);
  g.fillStyle = '#e2e8f0';
  for (let k = 0; k < 4; k++) rr(32 + k * 116, 764, 96, 26, 6);
  // las tres funciones con su iconito
  g.fillStyle = '#0f172a';
  g.font = F(800, 28);
  g.fillText(c.all, 32, 862);
  for (let k = 0; k < 3; k++) {
    const y = 900 + k * 128;
    g.fillStyle = '#f1ecff';
    rr(32, y, 56, 56, 14);
    g.fillStyle = v.acc;
    g.beginPath();
    g.arc(60, y + 28, 11, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#0f172a';
    g.font = F(700, 18);
    g.fillText(c.feats[k], 108, y + 22);
    g.fillStyle = '#94a3b8';
    rr(108, y + 36, 300, 8, 4);
    rr(108, y + 52, 230, 8, 4);
  }
  // el testimonio de cinco estrellas
  g.fillStyle = v.acc;
  for (let k = 0; k < 5; k++) star(44 + k * 26, 1302, 10);
  g.fillStyle = '#334155';
  g.font = F(500, 16);
  g.fillText(c.quote, 32, 1342);
  g.fillStyle = '#cbd5e1';
  g.beginPath();
  g.arc(48, 1380, 16, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#94a3b8';
  rr(74, 1372, 120, 8, 4);
  // la franja final: otra vez el botón
  g.fillStyle = v.acc;
  g.fillRect(0, 1420, PW, 116);
  g.fillStyle = '#ffffff';
  g.font = F(800, 24);
  g.fillText(c.ready, 32, 1470);
  rr(32, 1486, 150, 34, 17);
  g.fillStyle = v.acc;
  g.font = F(600, 13);
  g.fillText(c.start, 52, 1508);
}
function page(vi, lang) {
  const cv = document.createElement('canvas');
  cv.width = PW;
  cv.height = PH;
  draw(cv, vi, COPY[lang] || COPY.es);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, WIN / PH);
  tex.offset.set(0, 1 - WIN / PH);
  tex.anisotropy = 4;
  return tex;
}

export function createPlantillas(field, { stage, mobile, signal, lang = 'es' }) {
  const rnd = mulberry32(73);
  const COLS = mobile ? 7 : 11;
  const ROWS = mobile ? 3 : 4;
  const CW = mobile ? 9.5 : 12; // la carta, en mundo
  const CH = (CW * WIN) / PW;
  const n = COLS * ROWS;
  const geo = new THREE.PlaneGeometry(CW, CH);
  const texs = VARIANTS.map((v, vi) => page(vi, lang));
  const meshes = texs.map((map) => {
    const m = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide, toneMapped: false }), Math.ceil(n / VARIANTS.length));
    m.frustumCulled = false;
    m.visible = false;
    field.scene.add(m);
    return m;
  });
  // cada carta: su lugar en el muro, su lugar en la pila y sus demoras
  const cards = [];
  for (let i = 0; i < n; i++) {
    const c = Math.floor(i / ROWS);
    const r = i % ROWS;
    cards.push({
      c,
      r,
      v: i % VARIANTS.length,
      k: Math.floor(i / VARIANTS.length),
      wall: new THREE.Vector3(),
      qWall: new THREE.Quaternion(),
      pile: new THREE.Vector3(),
      qPile: new THREE.Quaternion(),
      fall: rnd(), // orden de caída (0 primero)
      arc: 6 + rnd() * 14,
    });
  }
  meshes.forEach((m, v) => (m.count = cards.filter((cd) => cd.v === v).length));
  // la señal: el dorso (WebGL, papel) y el frente (DOM, el video de verdad)
  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ color: 0xf6f3ec, side: THREE.DoubleSide, toneMapped: false })
  );
  back.visible = false;
  field.scene.add(back);
  const SW = 1280;
  const SH = 760;
  const front = document.createElement('div');
  front.className = 'hoja senal-hoja';
  front.setAttribute('aria-hidden', 'true');
  front.style.cssText = `width:${SW}px;height:${SH}px`;
  const vid = document.createElement('video');
  vid.className = 'hoja-media';
  vid.muted = true;
  vid.defaultMuted = true;
  vid.loop = true;
  vid.playsInline = true;
  vid.setAttribute('muted', '');
  vid.setAttribute('playsinline', '');
  vid.preload = 'none';
  vid.poster = signal.poster;
  front.append(vid);
  stage.appendChild(front);
  let vidOn = false;

  const S = { x: 0, y: 0, z: 0, w: 30, heap: new THREE.Vector3() }; // dónde se planta la señal
  const build = (W) => {
    // el muro: arranca a la derecha del texto y se va hacia el fondo
    const th = mobile ? 0.62 : 0.78;
    const dir = new THREE.Vector3(Math.cos(th), 0, -Math.sin(th));
    const x0 = mobile ? -W * 0.32 : 22;
    const y0 = mobile ? 20 : 1;
    const z0 = mobile ? 2 : 2;
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -th + 0.18);
    const floor = -44;
    cards.forEach((cd) => {
      const s = cd.c * (CW + (mobile ? 2 : 2.6));
      cd.wall.set(x0 + dir.x * s, y0 + (cd.r - (ROWS - 1) / 2) * (CH + (mobile ? 2 : 3)), z0 + dir.z * s);
      cd.qWall.copy(q);
      // la pila: un montón bajo y ancho, cartas casi acostadas, cada una girada
      const a = rnd() * Math.PI * 2;
      const rad = Math.pow(rnd(), 0.6) * (mobile ? W * 0.45 : 46);
      cd.pile.set(Math.cos(a) * rad, floor + rnd() * 3 + (1 - rad / 46) * 4, Math.sin(a) * rad * 0.55);
      cd.qPile.setFromEuler(new THREE.Euler(-Math.PI / 2 + (rnd() - 0.5) * 0.5, 0, rnd() * Math.PI * 2, 'XYZ'));
    });
    S.heap.set(0, floor + 6, 0);
    S.x = mobile ? 0 : -W * 0.19;
    S.y = mobile ? 18 : 3;
    S.z = 14;
    S.w = mobile ? W * 0.72 : W * 0.35;
  };

  const sm = (a, b, v) => {
    const k = Math.max(0, Math.min(1, (v - a) / (b - a)));
    return k * k * (3 - 2 * k);
  };
  const M = new THREE.Matrix4();
  const P = new THREE.Vector3();
  const Q = new THREE.Quaternion();
  const SC = new THREE.Vector3();
  const flipQ = new THREE.Quaternion();
  const Y = new THREE.Vector3(0, 1, 0);
  const X = new THREE.Vector3(1, 0, 0);
  const base = 1 - WIN / PH;

  // g: progreso del viaje (beats) · t: segundos
  const update = (g, t) => {
    const on = g > 0.44 && g < 3.55;
    meshes.forEach((m) => (m.visible = on));
    if (!on) {
      back.visible = false;
      front.style.visibility = 'hidden';
      if (vidOn) {
        vid.pause();
        vidOn = false;
      }
      return;
    }
    // todas scrollean su página igual y al mismo tiempo: eso es el ruido
    const off = base - ((t * 0.045) % 1);
    texs.forEach((tx) => (tx.offset.y = off));
    const rise = sm(2.15, 2.85, g); // la señal se levanta
    const dim = 1 - 0.62 * rise;
    meshes.forEach((m) => m.material.color.setScalar(dim));
    const sink = sm(3.02, 3.45, g); // la pila se va para abajo
    const bob = Math.sin(t * 1.6) * 0.5; // todas respiran igual
    cards.forEach((cd) => {
      const enter = sm(0.46 + cd.c * 0.035, 0.66 + cd.c * 0.035, g);
      const f = sm(1.3 + cd.fall * 0.45, 1.62 + cd.fall * 0.45, g);
      const e = f * f * (3 - 2 * f);
      P.lerpVectors(cd.wall, cd.pile, e);
      // en el celu el texto de señal vive abajo: la pila se hunde cuando la señal sube
      P.y += Math.sin(f * Math.PI) * cd.arc + bob * (1 - f) - sink * 40 - (mobile ? rise * 34 : 0);
      Q.slerpQuaternions(cd.qWall, cd.qPile, e);
      // entra dándose vuelta como una carta
      flipQ.setFromAxisAngle(Y, (1 - enter) * Math.PI * 0.5);
      Q.multiply(flipQ);
      const s = Math.max(0.0001, enter * (1 - sink));
      SC.set(s, s, s);
      M.compose(P, Q, SC);
      meshes[cd.v].setMatrixAt(cd.k, M);
    });
    meshes.forEach((m) => (m.instanceMatrix.needsUpdate = true));

    // la señal: sale de la pila boca abajo y gira hasta mirarte, más grande
    const leave = sm(3.0, 3.4, g);
    const show = rise > 0.001 && leave < 0.999;
    back.visible = show;
    if (!show) {
      front.style.visibility = 'hidden';
      if (vidOn) {
        vid.pause();
        vidOn = false;
      }
      return;
    }
    const er = rise * rise * (3 - 2 * rise);
    back.position.set(
      S.heap.x + (S.x - S.heap.x) * er,
      S.heap.y + (S.y - S.heap.y) * er + Math.sin(rise * Math.PI) * 10 + Math.sin(t * 0.9) * 0.4 * er,
      S.heap.z + (S.z - S.heap.z) * er - leave * 60
    );
    back.quaternion.setFromAxisAngle(X, Math.PI / 2 + Math.PI * 1.5 * er);
    flipQ.setFromAxisAngle(Y, Math.sin(t * 0.7) * 0.06 * er);
    back.quaternion.premultiply(flipQ);
    const sw = S.w * (0.45 + 0.55 * er) * (1 - leave * 0.5);
    back.scale.set(sw, (sw * SH) / SW, 1);
    const facing = proyectar(front, field, back, SW, SH);
    const vis = facing && er > 0.35;
    front.style.visibility = vis ? 'visible' : 'hidden';
    front.style.opacity = (1 - leave).toFixed(3);
    if (vis && !vidOn) {
      if (!vid.src) {
        vid.preload = 'auto';
        vid.src = signal.video;
      }
      vid.play().catch(() => {});
      vidOn = true;
    }
  };
  // el idioma cambia los clichés: se redibujan las cuatro páginas
  const relang = (L) =>
    texs.forEach((tx, vi) => {
      draw(tx.image, vi, COPY[L] || COPY.es);
      tx.needsUpdate = true;
    });
  return { build, update, relang, signalAt: S };
}
