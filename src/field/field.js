// El campo de tinta: N partículas-glifo (las letras g, r, i, p — todo está hecho
// de "grip") sobre papel, que se transforman entre formas con retardo por punto
// y trayectorias curvas (nada llega en línea recta). La velocidad del scroll
// las agita y desregistra en tres tintas; al frenar, registran. La cámara la
// maneja el viaje (journey.js) vía field.cam.
import * as THREE from 'three';

const VERT = /* glsl */ `
  attribute vec3 aPosA; attribute vec3 aPosB;
  attribute vec3 aColA; attribute vec3 aColB;
  attribute float aAlphaA; attribute float aAlphaB;
  attribute float aSizeA; attribute float aSizeB;
  attribute float aSeed; attribute float aGlyph;
  uniform float uT; uniform float uTime; uniform float uTurb; uniform float uSize;
  uniform vec2 uOffset; uniform vec3 uMouse; uniform float uPR; uniform float uArc;
  varying float vAlpha; varying vec3 vCol; varying float vGlyph;
  float hash(float n) { return fract(sin(n) * 43758.5453123); }
  void main() {
    // retardo por punto: cada partícula arranca su viaje en un momento distinto
    float d0 = aSeed * 0.55;
    float t = smoothstep(d0, d0 + 0.45, uT);
    // ease suave y arco perpendicular: viaja curvo, no en línea
    float e = t * t * (3.0 - 2.0 * t);
    vec3 p = mix(aPosA, aPosB, e);
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
    p.xy += uOffset;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float sz = mix(aSizeA, aSizeB, e);
    gl_PointSize = uSize * sz * uPR * (110.0 / max(1.0, -mv.z));
    vAlpha = mix(aAlphaA, aAlphaB, e);
    vCol = mix(aColA, aColB, e);
    vGlyph = aGlyph;
  }
`;
const FRAG = /* glsl */ `
  precision mediump float;
  uniform sampler2D uAtlas; uniform vec3 uInk; uniform float uUseInk; uniform float uOpacity;
  varying float vAlpha; varying vec3 vCol; varying float vGlyph;
  void main() {
    vec2 uv = gl_PointCoord;
    uv.x = (uv.x + vGlyph) / 4.0;
    float a = texture2D(uAtlas, uv).a;
    if (a < 0.06) discard;
    vec3 c = mix(vCol, uInk, uUseInk);
    gl_FragColor = vec4(c, min(1.0, a * 1.35) * vAlpha * uOpacity);
  }
`;

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
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dpr));
  renderer.setClearColor(0x000000, 0);
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
  geo.setAttribute('aAlphaA', mk(1));
  geo.setAttribute('aAlphaB', mk(1));
  geo.setAttribute('aSizeA', mk(1));
  geo.setAttribute('aSizeB', mk(1));
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
    uArc: { value: 1 },
    uAtlas: { value: atlas },
    uInk: { value: new THREE.Color(ink) },
    uUseInk: { value: useInk },
    uOpacity: { value: 1 },
  });
  const matK = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: uniformsFor('#111111', 0), transparent: true, depthWrite: false, depthTest: false });
  const matR = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: uniformsFor('#f0403c', 1), transparent: true, depthWrite: false, depthTest: false });
  const matC = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: uniformsFor('#5fa8e0', 1), transparent: true, depthWrite: false, depthTest: false });
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
    mats.forEach((m) => (m.uniforms.uPR.value = renderer.getPixelRatio()));
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
    set('aAlpha' + s, shape.alpha);
    set('aSize' + s, shape.size);
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

  const state = { t: 0, turb: 0, mis: 0, opacity: 1, size: 6.5, arc: 1, mouse: [0, 0, 0] };
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
