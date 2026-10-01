// Los globos: la marca de grip como globos de letras metalizados, los de
// cumpleaños. Dos láminas de foil selladas por el contorno (el canto plano y
// prensado), infladas (con las arrugas que se juntan contra la costura) y
// atadas con un hilo. Flotan sobre su impresión de tinta; cuando la página
// sigue, se van volando. Un click revienta la letra: la tinta salpica y el
// globo se vuelve a inflar.
//
// La malla sale de los mismos glifos del wordmark (logo-paths): una máscara
// rasterizada con antialias (la cobertura del píxel da el borde subpíxel), una
// membrana inflada (Poisson: Δh = −1 adentro, h = 0 afuera) y marching squares
// para que el canto siga el contorno. La distancia exacta al contorno real (las
// curvas del logo, muestreadas) define el canto plano y la costura; el largo de
// arco a lo largo del borde reparte las arrugas y el prensado.
// Coordenadas: el viewBox centrado (y hacia arriba): a escala w/700 calza sobre
// shapeGrip, la impresión de partículas.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { gsap } from '../core/scroll.js';
import { GLYPHS, VIEWBOX } from '../ui/logo-paths.js';

// cada letra es un globo: rango en x del viewBox (los glifos no se pisan) y el
// punto donde se ata el hilo (abajo de cada letra)
const LETTERS = [
  { glyphs: ['g'], x1: 190, tie: [80, 340], color: 0xf0403c },
  { glyphs: ['r'], x1: 375, tie: [255, 260], color: 0x5fa8e0 },
  { glyphs: ['idot', 'ibody'], x1: 470, tie: [418, 252], color: 0xd9e355 },
  { glyphs: ['p'], x1: Infinity, tie: [532, 338], color: 0xf0403c },
];
const FLANGE = 5; // ancho del canto sellado (unidades del viewBox)
const CREASE = 3.5; // qué tan seco sube el globo desde el canto
const BAND = 26; // dónde viven las arrugas, desde la costura hacia adentro
const WAVE = 13; // separación de las arrugas a lo largo del borde

// el contorno real de un glifo (Catmull-Rom → bezier, igual que blobPath),
// muestreado: [x, y, s] con s = largo de arco acumulado
function contour(pts, per = 16) {
  const n = pts.length;
  const out = [];
  let s = 0;
  let px = null;
  let py = null;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const u = 1 - t;
      const x = u * u * u * p1[0] + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * p2[0];
      const y = u * u * u * p1[1] + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * p2[1];
      if (px !== null) s += Math.hypot(x - px, y - py);
      out.push(x, y, s);
      px = x;
      py = y;
    }
  }
  out.push(out[0], out[1], s + Math.hypot(out[0] - px, out[1] - py)); // cierra
  return out;
}

// distancia de (x, y) al contorno más cercano de la letra, y el largo de arco ahí
function nearest(polys, x, y) {
  let best = Infinity;
  let bs = 0;
  for (const c of polys) {
    for (let k = 0; k < c.length - 3; k += 3) {
      const ax = c[k];
      const ay = c[k + 1];
      const dx = c[k + 3] - ax;
      const dy = c[k + 4] - ay;
      const l2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
      const qx = ax + dx * t - x;
      const qy = ay + dy * t - y;
      const d2 = qx * qx + qy * qy;
      if (d2 < best) {
        best = d2;
        bs = c[k + 2] + (c[k + 5] - c[k + 2]) * t + c.offset;
      }
    }
  }
  return [Math.sqrt(best), bs];
}

function build(step, depth) {
  const M = 3;
  const gw = Math.ceil(VIEWBOX.w / step) + M * 2;
  const gh = Math.ceil(VIEWBOX.h / step) + M * 2;
  const cv = document.createElement('canvas');
  cv.width = gw;
  cv.height = gh;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.setTransform(1 / step, 0, 0, 1 / step, M, M);
  g.fillStyle = '#000';
  const polysOf = LETTERS.map((L, li) =>
    L.glyphs.map((k, gi) => {
      const pts = GLYPHS[k];
      // el mismo trazo que blobPath, para la máscara
      const c = contour(pts);
      const path = new Path2D();
      path.moveTo(c[0], c[1]);
      for (let j = 3; j < c.length; j += 3) path.lineTo(c[j], c[j + 1]);
      g.fill(path);
      c.offset = li * 4000 + gi * 1500; // cada contorno con su propia fase de arrugas
      return c;
    })
  );
  const px = g.getImageData(0, 0, gw, gh).data;
  const N = gw * gh;
  const s = new Float32Array(N);
  const inside = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    s[i] = px[i * 4 + 3] / 255 - 0.5;
    inside[i] = s[i] >= 0 ? 1 : 0;
  }
  const vx = (x) => (x + 0.5 - M) * step;
  const vy = (y) => (y + 0.5 - M) * step;
  const letterAt = (X) => LETTERS.findIndex((L) => X < L.x1);

  // distancia al contorno y largo de arco, para cada celda de adentro
  const D = new Float32Array(N);
  const SA = new Float32Array(N);
  const LI = new Int8Array(N).fill(-1);
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const i = y * gw + x;
      if (!inside[i]) continue;
      const li = letterAt(vx(x));
      const [d, sa] = nearest(polysOf[li], vx(x), vy(y));
      D[i] = d;
      SA[i] = sa;
      LI[i] = li;
    }
  }

  // membrana: Gauss-Seidel con sobre-relajación
  const h = new Float32Array(N);
  for (let it = 0; it < 360; it++) {
    for (let y = 1; y < gh - 1; y++) {
      for (let x = 1; x < gw - 1; x++) {
        const i = y * gw + x;
        if (!inside[i]) continue;
        const v = (h[i - 1] + h[i + 1] + h[i - gw] + h[i + gw] + 1) / 4;
        h[i] += 1.85 * (v - h[i]);
      }
    }
  }
  let hmax = 0;
  for (let i = 0; i < N; i++) if (h[i] > hmax) hmax = h[i];
  const zmax = depth * Math.sqrt(2 * hmax) * step;
  // cuerpo: perfil de almohada (el foil no llega a redondo) y dos pasadas de promedio
  const zb = new Float32Array(N);
  for (let i = 0; i < N; i++) zb[i] = inside[i] ? Math.pow(Math.max(0, h[i]) / hmax, 0.72) * zmax : 0;
  const tmp = new Float32Array(N);
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 1; y < gh - 1; y++) {
      for (let x = 1; x < gw - 1; x++) {
        const i = y * gw + x;
        tmp[i] = inside[i] ? (zb[i] * 2 + zb[i - 1] + zb[i + 1] + zb[i - gw] + zb[i + gw]) / 6 : 0;
      }
    }
    zb.set(tmp);
  }
  // el canto plano (sellado), la costura y las arrugas que se juntan contra ella
  const Z = new Float32Array(N);
  const FL = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    if (!inside[i]) continue;
    const d = D[i];
    const k = Math.max(0, Math.min(1, (d - FLANGE) / CREASE));
    const ramp = k * k * (3 - 2 * k);
    let z = zb[i] * ramp;
    if (d > FLANGE && d < FLANGE + BAND) {
      const u = (d - FLANGE) / BAND;
      const env = (1 - u) * (1 - u) * Math.min(1, u * 7);
      const sa = SA[i];
      const ph = (sa / WAVE) * Math.PI * 2 + 2.2 * Math.sin(sa / 41) + 1.1 * Math.sin(sa / 17.3);
      const patch = Math.max(0, Math.sin(sa / 23 + 1.3) * 0.6 + Math.sin(sa / 61 + 0.4) * 0.6);
      const amp = 2.3 * Math.min(1, patch) * Math.min(1, zb[i] / 9);
      z += amp * Math.sin(ph) * env;
    }
    Z[i] = Math.max(0, z);
    FL[i] = 1 - ramp;
  }

  // malla: marching squares (frente y dorso comparten el borde) + letra por triángulo
  const pos = [];
  const aS = [];
  const aF = [];
  const idx = [];
  const triL = [];
  const F = new Int32Array(N).fill(-1);
  const B = new Int32Array(N).fill(-1);
  const cx0 = VIEWBOX.w / 2;
  const cy0 = VIEWBOX.h / 2;
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const i = y * gw + x;
      if (!inside[i]) continue;
      F[i] = pos.length / 3;
      pos.push(vx(x) - cx0, -(vy(y) - cy0), Z[i]);
      aS.push(SA[i]);
      aF.push(FL[i]);
      B[i] = pos.length / 3;
      pos.push(vx(x) - cx0, -(vy(y) - cy0), -Z[i]);
      aS.push(SA[i]);
      aF.push(FL[i]);
    }
  }
  const EH = new Int32Array(N).fill(-1);
  const EV = new Int32Array(N).fill(-1);
  const cross = (store, i0, i1, x0, y0, x1, y1) => {
    if (store[i0] >= 0) return store[i0];
    const t = s[i0] / (s[i0] - s[i1]);
    store[i0] = pos.length / 3;
    pos.push(vx(x0 + (x1 - x0) * t) - cx0, -(vy(y0 + (y1 - y0) * t) - cy0), 0);
    aS.push(inside[i0] ? SA[i0] : SA[i1]);
    aF.push(1);
    return store[i0];
  };
  const c = [0, 0, 0, 0];
  const ins = [0, 0, 0, 0];
  const front = [];
  const back = [];
  for (let y = 0; y < gh - 1; y++) {
    for (let x = 0; x < gw - 1; x++) {
      c[0] = y * gw + x;
      c[1] = c[0] + 1;
      c[2] = c[0] + gw + 1;
      c[3] = c[0] + gw;
      let li = -1;
      for (let k = 0; k < 4; k++) {
        ins[k] = inside[c[k]];
        if (ins[k] && li < 0) li = LI[c[k]];
      }
      if (li < 0) continue;
      front.length = 0;
      back.length = 0;
      for (let k = 0; k < 4; k++) {
        if (ins[k]) {
          front.push(F[c[k]]);
          back.push(B[c[k]]);
        }
        if (ins[k] !== ins[(k + 1) % 4]) {
          let e;
          if (k === 0) e = cross(EH, c[0], c[1], x, y, x + 1, y);
          else if (k === 1) e = cross(EV, c[1], c[2], x + 1, y, x + 1, y + 1);
          else if (k === 2) e = cross(EH, c[3], c[2], x, y + 1, x + 1, y + 1);
          else e = cross(EV, c[0], c[3], x, y, x, y + 1);
          front.push(e);
          back.push(e);
        }
      }
      // la celda se recorre en sentido horario en pantalla: el frente va al revés
      for (let m = 1; m < front.length - 1; m++) {
        idx.push(front[0], front[m + 1], front[m]);
        idx.push(back[0], back[m], back[m + 1]);
        triL.push(li, li);
      }
    }
  }

  // una geometría por letra, centrada en su propio pivote (para flotar y girar sola)
  return LETTERS.map((L, li) => {
    const map = new Map();
    const P = [];
    const S = [];
    const Fl = [];
    const I = [];
    for (let t = 0; t < triL.length; t++) {
      if (triL[t] !== li) continue;
      for (let v = 0; v < 3; v++) {
        const gi = idx[t * 3 + v];
        let ni = map.get(gi);
        if (ni === undefined) {
          ni = P.length / 3;
          map.set(gi, ni);
          P.push(pos[gi * 3], pos[gi * 3 + 1], pos[gi * 3 + 2]);
          S.push(aS[gi]);
          Fl.push(aF[gi]);
        }
        I.push(ni);
      }
    }
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (let k = 0; k < P.length; k += 3) {
      x0 = Math.min(x0, P[k]);
      x1 = Math.max(x1, P[k]);
      y0 = Math.min(y0, P[k + 1]);
      y1 = Math.max(y1, P[k + 1]);
    }
    const pivot = [(x0 + x1) / 2, (y0 + y1) / 2];
    for (let k = 0; k < P.length; k += 3) {
      P[k] -= pivot[0];
      P[k + 1] -= pivot[1];
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    geo.setAttribute('aS', new THREE.Float32BufferAttribute(S, 1));
    geo.setAttribute('aFl', new THREE.Float32BufferAttribute(Fl, 1));
    geo.setIndex(I);
    geo.computeVertexNormals();
    const tie = [L.tie[0] - cx0 - pivot[0], -(L.tie[1] - cy0) - pivot[1]];
    return { geo, pivot, size: [x1 - x0, y1 - y0], tie };
  });
}

// el foil: metal pulido con el color de la lámina; en el canto, el prensado
// (estrías finas a lo largo de la costura) hace brillar el borde
function foil(color, env) {
  const m = new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness: 0.24, envMap: env, envMapIntensity: 1.15 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aS; attribute float aFl; varying float vS; varying float vFl;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvS = aS; vFl = aFl;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vS; varying float vFl;')
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        vec2 gs = vec2(dFdx(vS), dFdy(vS));
        float gl = length(gs);
        if (vFl > 0.02 && gl > 0.0001) {
          vec3 tdir = vec3(gs / gl, 0.0);
          normal = normalize(normal + tdir * sin(vS * 2.6) * 0.42 * vFl);
        }`
      );
  };
  m.customProgramCacheKey = () => 'foil';
  return m;
}

export function createGlobos(field, { step = 2 } = {}) {
  const parts = build(step, 0.5);
  const pm = new THREE.PMREMGenerator(field.renderer);
  const env = pm.fromScene(new RoomEnvironment(), 0.03).texture;
  pm.dispose();
  const group = new THREE.Group();
  const letters = parts.map((p, li) => {
    const mesh = new THREE.Mesh(p.geo, foil(LETTERS[li].color, env));
    group.add(mesh);
    // el hilo que cuelga del nudo
    const SEG = 20;
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SEG * 3), 3));
    const line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0x8a8578, transparent: true, opacity: 0.85 }));
    line.frustumCulled = false;
    field.scene.add(line);
    return {
      ...p,
      mesh,
      line,
      SEG,
      chain: new Float32Array(SEG * 3),
      end: { x: 0, y: 0, vx: 0, vy: 0 }, // la punta del hilo
      fresh: true,
      st: { s: 1, z: 1, push: 0, px: 0, py: 0 }, // s: escala del foil, z: inflado
      ph: li * 1.7 + 0.4,
    };
  });
  field.scene.add(group);
  field.renderer.compileAsync(field.scene, field.camera).catch(() => {});

  // pose: la escribe el viaje (dónde está, qué tan grande, si se fue volando)
  // dir: hacia dónde se van (1, arriba: soltados) o de dónde vienen (−1, de abajo: suben)
  const pose = { x: 0, y: 0, w: 60, vis: 0, away: 0, dir: 1 };
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  const HOVER = 8;
  const cam = field.camera.position;
  const tieW = new THREE.Vector3();
  let k = 0.1;

  const update = (t, mouse) => {
    const on = pose.vis > 0.001;
    group.visible = on;
    tilt.x += (tilt.tx - tilt.x) * 0.06;
    tilt.y += (tilt.ty - tilt.y) * 0.06;
    k = (pose.w / VIEWBOX.w) * pose.vis;
    const zb = HOVER + Math.sin(t * 0.9) * 0.6;
    const persp = (cam.z - zb) / cam.z;
    const a = pose.away;
    // soltados: suben, se abren un poco y giran
    group.position.set(cam.x + (pose.x - cam.x) * persp + a * pose.w * 0.15, cam.y + (pose.y - cam.y) * persp + pose.dir * a * a * 95, zb + a * 12);
    group.rotation.set(tilt.x * 0.5, tilt.y * 0.5, -a * 0.25);
    k *= persp; // escala real en el mundo (la perspectiva ya compensada)
    group.scale.setScalar(k);
    group.updateMatrixWorld();
    letters.forEach((L, li) => {
      // cada globo flota a su ritmo; el puntero los empuja como aire
      const st = L.st;
      let pxw = 0;
      let pyw = 0;
      if (on && mouse && mouse[2]) {
        const lx = group.position.x + L.pivot[0] * k;
        const ly = group.position.y + L.pivot[1] * k;
        const dx = lx - mouse[0];
        const dy = ly - mouse[1];
        const r = Math.hypot(dx, dy);
        const reach = L.size[0] * k * 0.9 + 6;
        const f = Math.max(0, 1 - r / reach) * mouse[2];
        pxw = (dx / (r || 1)) * f * 2.2;
        pyw = (dy / (r || 1)) * f * 2.2;
      }
      st.px += (pxw - st.px) * 0.08;
      st.py += (pyw - st.py) * 0.08;
      const bob = Math.sin(t * 1.1 + L.ph) * 5 + Math.sin(t * 0.47 + L.ph * 2) * 3;
      L.mesh.position.set(L.pivot[0] + st.px / k, L.pivot[1] + bob + st.py / k + pose.dir * a * li * 22, 0);
      L.mesh.rotation.set(
        Math.sin(t * 0.8 + L.ph) * 0.06 + tilt.x * 0.6 - (st.py / k) * 0.004,
        Math.sin(t * 0.55 + L.ph * 1.3) * 0.22 + tilt.y * 0.7 + (st.px / k) * 0.006,
        Math.sin(t * 0.7 + L.ph) * 0.05 - (st.px / k) * 0.004 + a * (li - 1.5) * 0.25
      );
      L.mesh.scale.set(st.s, st.s, Math.max(0.02, st.z));
      L.mesh.updateMatrixWorld();
      // el hilo cuelga del nudo; si el globo reventó, se cae
      const alive = st.s > 0.05;
      L.line.visible = on && alive;
      if (!L.line.visible) {
        L.fresh = true;
        return;
      }
      tieW.set(L.tie[0], L.tie[1], 0).applyMatrix4(L.mesh.matrixWorld);
      // el hilo: una curva que sale derecha del nudo hacia abajo; la punta llega
      // tarde (resorte amortiguado) y se mece. Cuando el globo se mueve, el hilo
      // se curva solo; nunca se enreda
      const len = Math.min(pose.w * 0.62, 36);
      const restX = tieW.x + Math.sin(t * 0.6 + L.ph) * len * 0.05;
      const restY = tieW.y - len;
      const e = L.end;
      if (L.fresh) {
        e.x = restX;
        e.y = restY;
        e.vx = e.vy = 0;
        L.fresh = false;
      }
      e.vx = (e.vx + (restX - e.x) * 0.03) * 0.9;
      e.vy = (e.vy + (restY - e.y) * 0.03) * 0.9;
      e.x += e.vx;
      e.y += e.vy;
      const C = L.chain;
      const top = len * 0.38;
      for (let j = 0; j < L.SEG; j++) {
        const u = j / (L.SEG - 1);
        const v = 1 - u;
        // bezier cúbica: nudo → (abajo del nudo) → (arriba de la punta) → punta
        const b0 = v * v * v;
        const b1 = 3 * v * v * u;
        const b2 = 3 * v * u * u;
        const b3 = u * u * u;
        C[j * 3] = b0 * tieW.x + b1 * tieW.x + b2 * e.x + b3 * e.x;
        C[j * 3 + 1] = b0 * tieW.y + b1 * (tieW.y - top) + b2 * (e.y + top) + b3 * e.y;
        C[j * 3 + 2] = tieW.z;
      }
      const attr = L.line.geometry.getAttribute('position');
      attr.array.set(C);
      attr.needsUpdate = true;
    });
  };

  // reventar una letra: se estira, desaparece (onPop: la tinta salpica) y,
  // al rato, se vuelve a inflar desde la lámina chata
  const pop = (li, onPop) => {
    const st = letters[li].st;
    if (gsap.isTweening(st)) return false;
    gsap
      .timeline()
      .to(st, { s: 1.14, z: 1.2, duration: 0.07, ease: 'power2.out' })
      .to(st, { s: 0, z: 0, duration: 0.05, ease: 'power2.in' })
      .add(() => onPop?.())
      .fromTo(st, { s: 0.93, z: 0.03 }, { s: 1, z: 1, duration: 1.2, ease: 'elastic.out(1, 0.45)', immediateRender: false }, '+=2.4');
    return true;
  };
  // inflar todos (la entrada): de la lámina chata al globo, uno detrás de otro
  const inflate = () =>
    gsap.fromTo(
      letters.map((L) => L.st),
      { s: 0.94, z: 0.03 },
      { s: 1, z: 1, duration: 1.3, ease: 'elastic.out(1, 0.42)', stagger: 0.09 }
    );
  // ¿qué letra hay en (wx, wy) del mundo?
  const hit = (wx, wy) => {
    if (pose.vis < 0.99 || pose.away > 0.01) return -1;
    let best = -1;
    let bd = Infinity;
    letters.forEach((L, li) => {
      if (L.st.s < 0.5) return;
      const lx = group.position.x + L.pivot[0] * k;
      const ly = group.position.y + L.pivot[1] * k;
      const hx = (L.size[0] * k) / 2 + 2;
      const hy = (L.size[1] * k) / 2 + 2;
      const dx = Math.abs(wx - lx);
      const dy = Math.abs(wy - ly);
      if (dx < hx && dy < hy && dx + dy < bd) {
        bd = dx + dy;
        best = li;
      }
    });
    return best;
  };
  // ¿están los cuatro reventados a la vez? (reventado = todavía no se volvió a inflar)
  const allDown = () => letters.every((L) => L.st.s < 0.5);
  const center = (li) => {
    const L = letters[li];
    return { x: group.position.x + L.pivot[0] * k, y: group.position.y + L.pivot[1] * k, w: L.size[0] * k };
  };
  const setDark = (d) => {
    letters.forEach((L) => (L.line.material.color.set(d ? 0x9a978f : 0x8a8578)));
  };
  return { group, pose, tilt, update, pop, inflate, hit, center, allDown, setDark };
}
