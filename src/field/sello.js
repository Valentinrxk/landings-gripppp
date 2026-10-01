// El sello: la marca de grip en 3D, inflada como un globo y en cromo, que flota
// sobre su propia impresión de tinta y cada tanto se estampa contra el papel.
// La plantilla es plana; la marca tiene volumen.
//
// La malla sale de los mismos glifos del wordmark (logo-paths): una máscara
// rasterizada con antialias (la cobertura del píxel da el borde subpíxel), una
// membrana inflada (Poisson: Δh = −1 adentro, h = 0 afuera → globo sin crestas)
// y marching squares para que el canto siga el contorno. Frente y dorso
// comparten los vértices del borde: el canto queda redondo, sin costura.
// Las coordenadas son las del viewBox centrado (y hacia arriba): a escala
// w/700 calza exacto sobre shapeGrip, la impresión de partículas.
import * as THREE from 'three';
import { gsap } from '../core/scroll.js';
import { GLYPHS, GLYPH_ORDER, VIEWBOX, blobPath } from '../ui/logo-paths.js';

function inflate(step, depth) {
  const M = 2; // margen en celdas: el borde nunca toca el límite de la grilla
  const gw = Math.ceil(VIEWBOX.w / step) + M * 2;
  const gh = Math.ceil(VIEWBOX.h / step) + M * 2;
  const cv = document.createElement('canvas');
  cv.width = gw;
  cv.height = gh;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.setTransform(1 / step, 0, 0, 1 / step, M, M);
  g.fillStyle = '#000';
  for (const k of GLYPH_ORDER) g.fill(new Path2D(blobPath(GLYPHS[k])));
  const px = g.getImageData(0, 0, gw, gh).data;
  const N = gw * gh;
  const s = new Float32Array(N); // > 0 adentro, 0 justo en el borde
  const inside = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    s[i] = px[i * 4 + 3] / 255 - 0.5;
    inside[i] = s[i] >= 0 ? 1 : 0;
  }

  // membrana: Gauss-Seidel con sobre-relajación (converge en pocas pasadas)
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
  // z ∝ √h: canto con tangente vertical (redondo) y la misma proporción
  // alto/ancho en la panza de la p que en el brazo de la r
  const zmax = depth * Math.sqrt(2 * hmax) * step;
  const zg = new Float32Array(N);
  for (let i = 0; i < N; i++) zg[i] = inside[i] ? Math.sqrt(Math.max(0, h[i]) / hmax) * zmax : 0;
  // dos pasadas de promedio: el borde de la grilla no se nota en los brillos
  const tmp = new Float32Array(N);
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 1; y < gh - 1; y++) {
      for (let x = 1; x < gw - 1; x++) {
        const i = y * gw + x;
        tmp[i] = inside[i] ? (zg[i] * 2 + zg[i - 1] + zg[i + 1] + zg[i - gw] + zg[i + gw]) / 6 : 0;
      }
    }
    zg.set(tmp);
  }
  const zAt = (i) => zg[i];
  const vx = (x) => (x + 0.5 - M) * step - VIEWBOX.w / 2;
  const vy = (y) => -((y + 0.5 - M) * step - VIEWBOX.h / 2);

  const pos = [];
  const idx = [];
  const F = new Int32Array(N).fill(-1);
  const B = new Int32Array(N).fill(-1);
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const i = y * gw + x;
      if (!inside[i]) continue;
      const z = zAt(i);
      F[i] = pos.length / 3;
      pos.push(vx(x), vy(y), z);
      B[i] = pos.length / 3;
      pos.push(vx(x), vy(y), -z);
    }
  }
  // un vértice por arista cruzada, en orientación canónica (izq→der, arriba→abajo)
  // para que las dos celdas vecinas lo compartan
  const EH = new Int32Array(N).fill(-1);
  const EV = new Int32Array(N).fill(-1);
  const cross = (store, i0, i1, x0, y0, x1, y1) => {
    if (store[i0] >= 0) return store[i0];
    const t = s[i0] / (s[i0] - s[i1]);
    store[i0] = pos.length / 3;
    pos.push(vx(x0 + (x1 - x0) * t), vy(y0 + (y1 - y0) * t), 0);
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
      for (let k = 0; k < 4; k++) ins[k] = inside[c[k]];
      if (!ins[0] && !ins[1] && !ins[2] && !ins[3]) continue;
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
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// el estudio que se refleja en la tinta: penumbra, un softbox grande arriba a la
// izquierda (la luz principal), una tira de contraluz a la derecha, el papel
// crema abajo (la gota está apoyada sobre él) y tres tiras de color —rojo,
// lima, celeste— delante, que barren la superficie cuando el estudio se mece.
// Sin horizonte: nada de costuras. Los paneles van muy por encima de 1 con
// envMapIntensity: la tinta negra refleja poco de frente y mucho al sesgo
function studio(renderer) {
  const W = 1024;
  const H = 512;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#0b0b0b');
  sky.addColorStop(0.55, '#050506');
  sky.addColorStop(0.7, '#0e0d0c');
  sky.addColorStop(1, '#3d3a34'); // el papel, abajo
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  // panel de bordes suaves (gradiente radial estirado)
  const soft = (u, v, w, h, [r, gg, b], a = 1) => {
    g.save();
    g.translate(u * W, v * H);
    g.scale((w * W) / 2, (h * H) / 2);
    const rg = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    rg.addColorStop(0, `rgba(${r},${gg},${b},${a})`);
    rg.addColorStop(0.55, `rgba(${r},${gg},${b},${a})`);
    rg.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    g.fillStyle = rg;
    g.fillRect(-1, -1, 2, 2);
    g.restore();
  };
  soft(0.875, 0.3, 0.2, 0.3, [255, 252, 245]); // softbox principal: arriba a la izquierda, de frente
  soft(0.76, 0.1, 0.34, 0.12, [255, 250, 240], 0.55); // cenital: la cresta de cada letra
  soft(0.45, 0.5, 0.035, 0.62, [255, 255, 255], 0.9); // contraluz: el canto derecho
  soft(1.0, 0.5, 0.03, 0.5, [255, 255, 255], 0.5); // contraluz izquierdo (cruza la costura u=0/1)
  soft(0.0, 0.5, 0.03, 0.5, [255, 255, 255], 0.5);
  soft(0.665, 0.46, 0.022, 0.34, [240, 64, 60]); // las tres tintas
  soft(0.705, 0.6, 0.022, 0.3, [217, 227, 85]);
  soft(0.795, 0.52, 0.024, 0.36, [95, 168, 224]);
  const tex = new THREE.CanvasTexture(cv);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromEquirectangular(tex).texture;
  tex.dispose();
  pm.dispose();
  return env;
}

// la sombra de contacto: la silueta del logo, desenfocada (shadowBlur anda en todos lados)
function shadowTexture() {
  const S = 0.5;
  const P = 80;
  const cv = document.createElement('canvas');
  cv.width = VIEWBOX.w * S + P * 2;
  cv.height = VIEWBOX.h * S + P * 2;
  const g = cv.getContext('2d');
  g.shadowColor = '#000';
  g.shadowBlur = 24;
  g.shadowOffsetX = 4000;
  g.setTransform(S, 0, 0, S, P - 4000, P);
  for (const k of GLYPH_ORDER) g.fill(new Path2D(blobPath(GLYPHS[k])));
  const t = new THREE.CanvasTexture(cv);
  return { t, w: cv.width / S, h: cv.height / S };
}

export function createSello(field, { step = 2.5 } = {}) {
  const geo = inflate(step, 0.85);
  // tinta negra húmeda: casi sin color propio, todo es reflejo y laca
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0x0c0c0e,
    metalness: 0,
    roughness: 0.3,
    clearcoat: 1,
    clearcoatRoughness: 0.035,
    envMap: studio(field.renderer),
    envMapIntensity: 7,
  });
  // líquida: la superficie ondula apenas, como tinta que todavía no secó
  const uLiquid = { value: 0 };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uLiquid = uLiquid;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uLiquid;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float lq = sin(position.x * 0.03 + uLiquid * 1.7) * sin(position.y * 0.045 - uLiquid * 1.3)
                 + 0.5 * sin(position.x * 0.071 - uLiquid * 2.3 + position.y * 0.02);
        transformed += objectNormal * lq * 2.2 * smoothstep(0.0, 12.0, abs(position.z));`
      );
  };
  const mesh = new THREE.Mesh(geo, mat);
  const group = new THREE.Group();
  group.add(mesh);
  field.scene.add(group);
  // la luz principal (arriba a la izquierda) y un relleno cálido: forma y brillo puntual
  const key = new THREE.DirectionalLight(0xfff6ea, 2.2);
  key.position.set(-60, 80, 120);
  const fill = new THREE.HemisphereLight(0xfffaf0, 0xcfc9bd, 0.5);
  field.scene.add(key, fill);
  // sombra de contacto sobre el papel: más chica, oscura y nítida cuanto más baja
  const sh = shadowTexture();
  const shMat = new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: sh.t, transparent: true, opacity: 0, depthWrite: false });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(sh.w, sh.h), shMat);
  shadow.renderOrder = 3;
  field.scene.add(shadow);
  // el shader físico es pesado: se compila ya (sin bloquear), no en el cuadro en
  // que el sello cae en el splash
  field.renderer.compileAsync(field.scene, field.camera).catch(() => {}).finally(() => (group.visible = pose.vis > 0.001));

  // pose: la escribe el viaje (dónde está, qué tan grande, si se fue volando);
  // fx: las capas de tiempo (golpe, aplastado); tilt: hacia dónde mira el puntero
  const pose = { x: 0, y: 0, w: 60, vis: 0, away: 0, lift: 0, spin: 0 };
  const fx = { down: 0, squash: 0 };
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  const HOVER = 9; // altura de vuelo sobre el papel (mundo)
  const cam = field.camera.position;
  // de noche la gota sigue negra: sobre el grafito la dibujan el contraluz y los
  // brillos (más estudio); la sombra casi no se ve, se refuerza
  let shade = 1;
  const setDark = (d) => {
    mat.envMapIntensity = d ? 9 : 7;
    shade = d ? 1.6 : 1;
  };

  const update = (t) => {
    const on = pose.vis > 0.001;
    group.visible = on;
    shadow.visible = on;
    if (!on) return;
    tilt.x += (tilt.tx - tilt.x) * 0.08;
    tilt.y += (tilt.ty - tilt.y) * 0.08;
    const k = (pose.w / VIEWBOX.w) * pose.vis;
    // altura física sobre el papel: flota, y el golpe la lleva abajo
    const hover = HOVER + Math.sin(t * 1.3) * 0.8;
    const zb = hover + (0.6 - hover) * fx.down;
    // la perspectiva lo agranda y lo corre al acercarse a la cámara: se compensa
    // para que calce sobre su lugar. La caída del splash y la salida no: ahí la
    // perspectiva es el efecto
    const persp = (cam.z - zb) / cam.z;
    const a = pose.away;
    group.position.set(cam.x + (pose.x - cam.x) * persp + a * pose.w * 0.4, cam.y + (pose.y - cam.y) * persp + a * 70, zb + pose.lift + a * 50);
    // se mece despacio (un ocho): el volumen se lee aunque nadie mueva el mouse
    group.rotation.set(
      tilt.x + Math.sin(t * 0.9) * 0.07 + a * 0.9,
      tilt.y + Math.sin(t * 0.55 + 1) * 0.17 + a * Math.PI * 1.4 + pose.spin,
      Math.sin(t * 0.45) * 0.025 - a * 0.5
    );
    const sq = fx.squash;
    const kp = k * persp;
    group.scale.set(kp * (1 + 0.06 * sq), kp * (1 + 0.06 * sq), kp * (1 - 0.55 * sq));
    // la sombra cae abajo a la derecha (la luz viene de arriba a la izquierda) y
    // se abre y aclara con la altura; apoyado, es una mancha chica y oscura
    const h = Math.max(0, zb + pose.lift);
    const hn = Math.min(1, h / 40);
    shadow.position.set(pose.x + h * 0.3, pose.y - h * 0.42, 0.05);
    shadow.scale.setScalar(k * (0.97 + hn * 0.2));
    shMat.opacity = (1 - a) * (0.34 - 0.22 * hn) * Math.min(1, pose.vis * 1.5) * shade;
    uLiquid.value = t;
    mat.envMapRotation.y = Math.sin(t * 0.35) * 0.55; // el estudio se mece: los brillos de color barren la tinta
  };

  // el golpe: anticipación (sube), cae seco, aplasta, rebota. onImpact = la tinta salta
  let tl = null;
  const stamp = (onImpact) => {
    if (tl?.isActive()) return false;
    tl = gsap
      .timeline()
      .to(fx, { down: -0.28, duration: 0.3, ease: 'power2.out' })
      .to(fx, { down: 1, duration: 0.13, ease: 'power4.in' })
      .add(() => onImpact?.())
      .to(fx, { squash: 1, duration: 0.05, ease: 'power2.out' }, '<')
      .to(fx, { squash: 0, duration: 0.6, ease: 'elastic.out(1, 0.3)' }, '>')
      .to(fx, { down: 0, duration: 1.1, ease: 'elastic.out(1, 0.55)' }, '<0.06');
    return true;
  };

  return {
    group,
    pose,
    fx,
    tilt,
    update,
    stamp,
    setDark,
    get busy() {
      return !!tl?.isActive();
    },
  };
}
