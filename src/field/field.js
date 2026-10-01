// El campo de tinta: N partículas-glifo (las letras g, r, i, p — todo está hecho
// de "grip") sobre papel, que se transforman entre formas con retardo por punto
// y trayectorias curvas (nada llega en línea recta). La velocidad del scroll
// las agita y desregistra en tres tintas; al frenar, registran. La cámara la
// maneja el viaje (journey.js) vía field.cam. La marca (chroma = 1) no se
// imprime en negro: va en split fountain, rojo·lima·celeste en el mismo rodillo.
import * as THREE from 'three';

const VERT = /* glsl */ `
  attribute vec3 aPosA; attribute vec3 aPosB;
  attribute vec3 aColA; attribute vec3 aColB;
  // empaquetado (el límite de atributos es 16 y three declara los suyos):
  // alpha, tamaño, tinta (1 = negro que se invierte de noche), chroma (1 = la marca, en color)
  attribute vec4 aPropsA; attribute vec4 aPropsB;
  attribute float aSeed; attribute float aGlyph;
  uniform float uT; uniform float uTime; uniform float uTurb; uniform float uSize;
  uniform vec2 uOffset; uniform vec3 uMouse; uniform float uPR; uniform float uArc; uniform float uScale;
  uniform vec4 uBurst; // x, y, radio del anillo, fuerza
  uniform vec3 uFountA; uniform vec3 uFountB; uniform vec3 uFountC; // las tres tintas del rodillo
  uniform float uInkShift; // cada globo que revienta avanza el rodillo una tinta
  varying float vAlpha; varying vec3 vCol; varying float vGlyph; varying float vInk;
  varying vec3 vFount; varying float vChroma;
  float hash(float n) { return fract(sin(n) * 43758.5453123); }
  void main() {
    // retardo por punto: cada partícula arranca su viaje en un momento distinto
    float d0 = aSeed * 0.55;
    float t = smoothstep(d0, d0 + 0.45, uT);
    // ease suave y arco perpendicular: viaja curvo, no en línea
    float e = t * t * (3.0 - 2.0 * t);
    vec3 p = mix(aPosA, aPosB, e);
    // split fountain: un degradé de tres tintas que corre en diagonal sobre la
    // forma (ondula apenas, como el rodillo); un ciclo entero ≈ el ancho del logo.
    // Cada glifo toma UNA tinta: el degradé es tramado por semilla, no una
    // mezcla turbia de colores
    float fl = (p.x * 0.8 + p.y * 0.45 + sin(p.y * 0.07 + uTime * 0.5) * 6.0) / 56.0 - uTime * 0.11 + uInkShift;
    float f3 = fract(fl) * 3.0;
    float seg = floor(f3);
    vec3 inkA = seg < 0.5 ? uFountA : (seg < 1.5 ? uFountB : uFountC);
    vec3 inkB = seg < 0.5 ? uFountB : (seg < 1.5 ? uFountC : uFountA);
    vFount = mix(inkA, inkB, step(hash(aSeed * 13.7), smoothstep(0.1, 0.9, f3 - seg)));
    vChroma = mix(aPropsA.w, aPropsB.w, e);
    vec3 dir = aPosB - aPosA;
    float len = length(dir);
    vec3 side = normalize(vec3(-dir.y, dir.x, dir.z * 0.3) + 0.0001);
    float sgn = hash(aSeed * 7.1) > 0.5 ? 1.0 : -1.0;
    p += side * sin(e * 3.14159) * len * uArc * (0.15 + hash(aSeed * 3.3) * 0.35) * sgn;
    // agitación con el envión: sube y baja con semilla propia
    float ph = aSeed * 31.0 + uTime * 5.0;
    p += vec3(sin(ph), cos(ph * 1.3), sin(ph * 0.7)) * uTurb * (0.6 + hash(aSeed * 5.7)) * 3.0;
    // el puntero aparta la tinta (suave)
    vec2 dm = p.xy - uMouse.xy;
    float dist = length(dm);
    float push = smoothstep(14.0, 0.0, dist) * uMouse.z;
    p.xy += normalize(dm + 0.0001) * push * 6.0;
    // onda expansiva del click: un anillo que crece empuja la tinta y la suelta
    vec2 db = p.xy - uBurst.xy;
    float dd = length(db);
    float ring = exp(-pow((dd - uBurst.z) / 9.0, 2.0)) + smoothstep(uBurst.z, 0.0, dd) * 0.35;
    p.xy += normalize(db + 0.0001) * ring * uBurst.w * (8.0 + hash(aSeed * 9.1) * 8.0);
    p.xy += uOffset;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float sz = mix(aPropsA.y, aPropsB.y, e);
    gl_PointSize = uSize * sz * uPR * uScale * (110.0 / max(1.0, -mv.z));
    vAlpha = mix(aPropsA.x, aPropsB.x, e);
    vCol = mix(aColA, aColB, e);
    vGlyph = aGlyph;
    vInk = mix(aPropsA.z, aPropsB.z, e);
  }
`;
const FRAG = /* glsl */ `
  precision mediump float;
  uniform sampler2D uAtlas; uniform vec3 uInk; uniform float uUseInk; uniform float uOpacity; uniform float uDark;
  uniform float uPrint; // la impresión de la marca: 0 mientras los globos la tapan, 1 cuando salpica
  varying float vAlpha; varying vec3 vCol; varying float vGlyph; varying float vInk;
  varying vec3 vFount; varying float vChroma;
  void main() {
    vec2 uv = gl_PointCoord;
    uv.x = (uv.x + vGlyph) / 4.0;
    float a = texture2D(uAtlas, uv).a;
    if (a < 0.06) discard;
    vec3 c = vCol;
    // modo noche: la tinta negra se vuelve clara; los puntos de captura (color) quedan
    c = mix(c, 1.0 - c * 0.6, uDark * vInk);
    c = mix(c, vFount, vChroma);
    c = mix(c, uInk, uUseInk);
    float print = mix(1.0, uPrint, smoothstep(0.3, 0.7, vChroma));
    gl_FragColor = vec4(c, min(1.0, a * 1.35) * vAlpha * uOpacity * print);
  }
`;

// tinta tal cual el token: THREE.Color('#hex') la pasaría a lineal y este shader
// no la vuelve a convertir (saldría más oscura que en el CSS)
const srgb = (hex) => new THREE.Vector3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
// el lima del token se lava sobre el papel crema: de día va un punto más hondo
const LIMA = srgb(0xd9e355);
const LIMA_PAPEL = srgb(0xc2cf2b);

function glyphAtlas() {
  const S = 128;
  const cv = document.createElement('canvas');
  cv.width = S * 4;
  cv.height = S;
  const g = cv.getContext('2d');
  g.fillStyle = '#000';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `700 ${S * 0.92}px 'Space Mono', ui-monospace, monospace`;
  ['g', 'r', 'i', 'p'].forEach((ch, i) => g.fillText(ch, i * S + S / 2, S / 2 + S * 0.04));
  const tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

export function createField(canvas, { count = 12000, dpr = 1.5 } = {}) {
  // antialias: las partículas no lo necesitan, pero los globos y las hojas giradas sí (sin él, sus bordes serruchan)
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dpr));
  renderer.setClearColor(0x000000, 0);
  // solo lo físico (los globos) pasa por tone mapping: la tinta y las hojas son shaders crudos
  renderer.toneMapping = THREE.NeutralToneMapping;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 1, 2000);
  // distancia para que a z=0 se vean 100 unidades de alto
  const dist = 50 / Math.tan(THREE.MathUtils.degToRad(36) / 2);
  camera.position.set(0, 0, dist);
  camera.lookAt(0, 0, 0);
  const cam = { x: 0, y: 0, z: dist, tx: 0, ty: 0, tz: 0, roll: 0, fov: 36 };

  const N = count;
  const geo = new THREE.BufferGeometry();
  const mk = (n, arr) => new THREE.BufferAttribute(arr || new Float32Array(N * n), n);
  const seeds = new Float32Array(N);
  const glyphs = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    seeds[i] = Math.random();
    glyphs[i] = i % 4; // g r i p, siempre en orden: la marca está en cada 4 puntos
  }
  geo.setAttribute('position', mk(3)); // requerido por three; no se usa
  geo.setAttribute('aPosA', mk(3));
  geo.setAttribute('aPosB', mk(3));
  geo.setAttribute('aColA', mk(3));
  geo.setAttribute('aColB', mk(3));
  geo.setAttribute('aPropsA', mk(4));
  geo.setAttribute('aPropsB', mk(4));
  geo.setAttribute('aSeed', mk(1, seeds));
  geo.setAttribute('aGlyph', mk(1, glyphs));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);

  const atlas = glyphAtlas();
  const uniformsFor = (ink, useInk) => ({
    uT: { value: 0 },
    uTime: { value: 0 },
    uTurb: { value: 0 },
    uSize: { value: 6.5 },
    uOffset: { value: new THREE.Vector2(0, 0) },
    uMouse: { value: new THREE.Vector3(0, 0, 0) },
    uPR: { value: renderer.getPixelRatio() },
    uScale: { value: 1 },
    uBurst: { value: new THREE.Vector4(0, 0, 0, 0) },
    uDark: { value: 0 },
    uArc: { value: 1 },
    uAtlas: { value: atlas },
    uInk: { value: new THREE.Color(ink) },
    uUseInk: { value: useInk },
    uOpacity: { value: 1 },
    uFountA: { value: srgb(0xf0403c) }, // rojo
    uFountB: { value: LIMA_PAPEL }, // lima
    uFountC: { value: srgb(0x5fa8e0) }, // celeste
    uInkShift: { value: 0 },
    uPrint: { value: 1 },
  });
  const matK = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: uniformsFor('#111111', 0), transparent: true, depthWrite: false, depthTest: true });
  const matR = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: uniformsFor('#f0403c', 1), transparent: true, depthWrite: false, depthTest: true });
  const matC = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: uniformsFor('#5fa8e0', 1), transparent: true, depthWrite: false, depthTest: true });
  const pK = new THREE.Points(geo, matK);
  const pR = new THREE.Points(geo, matR);
  const pC = new THREE.Points(geo, matC);
  pR.renderOrder = 0;
  pC.renderOrder = 1;
  pK.renderOrder = 2;
  pR.visible = false;
  pC.visible = false;
  scene.add(pR, pC, pK);
  const mats = [matK, matR, matC];

  let W = 1;
  let Hh = 1;
  const resize = () => {
    W = canvas.clientWidth || window.innerWidth;
    Hh = canvas.clientHeight || window.innerHeight;
    renderer.setSize(W, Hh, false);
    camera.aspect = W / Hh;
    camera.updateProjectionMatrix();
    // el punto escala con el ancho de la pantalla (1440px = 1): en el celu las formas
    // son más chicas en mundo, así que el punto también, o se ven gruesas
    const sc = Math.max(0.55, Math.min(1.1, Math.sqrt(W / 1440)));
    mats.forEach((m) => {
      m.uniforms.uPR.value = renderer.getPixelRatio();
      m.uniforms.uScale.value = sc;
    });
  };
  resize();

  // ── formas: A y B; el viaje sube la que toca ──
  const upload = (name, shape) => {
    const s = name; // 'A' | 'B'
    const set = (attr, arr) => {
      const a = geo.getAttribute(attr);
      a.array.set(arr);
      a.needsUpdate = true;
    };
    set('aPos' + s, shape.pos);
    set('aCol' + s, shape.col);
    // sin ink: todo es tinta negra (1); sin chroma: nada va en color (0)
    const props = geo.getAttribute('aProps' + s);
    const P = props.array;
    for (let i = 0; i < N; i++) {
      P[i * 4] = shape.alpha[i];
      P[i * 4 + 1] = shape.size[i];
      P[i * 4 + 2] = shape.ink ? shape.ink[i] : 1;
      P[i * 4 + 3] = shape.chroma ? shape.chroma[i] : 0;
    }
    props.needsUpdate = true;
  };
  let curA = null;
  let curB = null;
  const setPair = (a, b) => {
    if (a !== curA) {
      upload('A', a);
      curA = a;
    }
    if (b !== curB) {
      upload('B', b);
      curB = b;
    }
  };

  const state = { t: 0, turb: 0, mis: 0, opacity: 1, size: 6.5, arc: 1, mouse: [0, 0, 0], burst: { x: 0, y: 0, r: 0, s: 0 }, dark: 0, inkShift: 0, print: 1 };
  const clock = new THREE.Clock();
  const render = () => {
    const time = clock.getElapsedTime();
    camera.position.set(cam.x, cam.y, cam.z);
    camera.up.set(Math.sin(cam.roll), Math.cos(cam.roll), 0);
    camera.lookAt(cam.tx, cam.ty, cam.tz);
    if (camera.fov !== cam.fov) {
      camera.fov = cam.fov;
      camera.updateProjectionMatrix();
    }
    const mis = state.mis;
    pR.visible = mis > 0.02;
    pC.visible = mis > 0.02;
    mats.forEach((m) => {
      m.uniforms.uT.value = state.t;
      m.uniforms.uTime.value = time;
      m.uniforms.uTurb.value = state.turb;
      m.uniforms.uSize.value = state.size;
      m.uniforms.uArc.value = state.arc;
      m.uniforms.uOpacity.value = state.opacity;
      m.uniforms.uMouse.value.set(state.mouse[0], state.mouse[1], state.mouse[2]);
      m.uniforms.uBurst.value.set(state.burst.x, state.burst.y, state.burst.r, state.burst.s);
      m.uniforms.uDark.value = state.dark;
      m.uniforms.uFountB.value = state.dark ? LIMA : LIMA_PAPEL;
      m.uniforms.uInkShift.value = state.inkShift;
      m.uniforms.uPrint.value = state.print;
    });
    matR.uniforms.uOffset.value.set(-mis * 2.2, mis * 1.1);
    matC.uniforms.uOffset.value.set(mis * 2.2, -mis * 0.9);
    matR.uniforms.uOpacity.value = state.opacity * Math.min(1, mis * 3);
    matC.uniforms.uOpacity.value = state.opacity * Math.min(1, mis * 3);
    renderer.render(scene, camera);
  };

  // proyecta un punto de mundo a píxeles de pantalla
  const v = new THREE.Vector3();
  const project = (x, y, z = 0) => {
    v.set(x, y, z).project(camera);
    return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * Hh];
  };
  // de píxeles a mundo (en el plano z=0)
  const unproject = (px, py) => {
    v.set((px / W) * 2 - 1, -(py / Hh) * 2 + 1, 0.5).unproject(camera);
    const dir = v.sub(camera.position).normalize();
    const t = -camera.position.z / dir.z;
    return [camera.position.x + dir.x * t, camera.position.y + dir.y * t];
  };

  return { renderer, scene, camera, cam, state, setPair, render, resize, project, unproject, N, get aspect() { return W / Hh; }, dist };
}
