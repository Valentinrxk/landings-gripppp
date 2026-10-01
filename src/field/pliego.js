// El pliego: la obra real, impresa en una hoja que flota en el mismo espacio que
// la tinta. Cuando la tinta aterriza, la racleta pasa de izquierda a derecha y
// deja la hoja impresa (con un filo rojo); el recorrido grabado corre encima
// mientras dure la obra. La hoja está girada en el espacio, se mece con el
// scroll, mira al puntero, se flexiona con el envión y, al irse, se levanta
// hacia la cámara.
// Los videos se piden recién al acercarse a cada obra (y el siguiente, de paso).
import * as THREE from 'three';

const VERT = /* glsl */ `
  uniform float uBend; uniform float uFlex; uniform float uTime;
  varying vec2 vUv; varying float vShade;
  void main() {
    vUv = uv;
    vec3 p = position;
    // curva de papel: el centro se acerca y los bordes se van; el envión la ondula
    float bx = p.x * 2.0;
    float wave = sin(bx * 2.6 + uTime * 3.0) * (0.4 + 0.6 * abs(p.y * 2.0));
    p.z += uBend * (1.0 - bx * bx) + uFlex * wave;
    // luz rasante de arriba a la izquierda: la pendiente de la curva sombrea los bordes
    float dzdx = -4.0 * uBend * bx + uFlex * 5.2 * cos(bx * 2.6 + uTime * 3.0);
    vShade = 1.0 - clamp(dzdx * 0.9, -0.08, 0.16);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const FRAG = /* glsl */ `
  uniform sampler2D uMap; uniform float uOpacity; uniform float uSheen; uniform float uReveal;
  varying vec2 vUv; varying float vShade;
  void main() {
    // la racleta: lo que ya pasó está impreso; el filo es una línea roja
    float edge = uReveal * 1.06 - 0.03;
    float m = smoothstep(edge + 0.008, edge - 0.008, vUv.x);
    float line = exp(-pow((vUv.x - edge) * 160.0, 2.0)) * step(0.001, uReveal) * step(uReveal, 0.999);
    if (m + line < 0.003) discard;
    vec3 c = texture2D(uMap, vUv).rgb * vShade;
    // el brillo de la hoja: una banda que cruza cuando se mueve el puntero
    float band = vUv.x * 0.8 + (1.0 - vUv.y) * 0.35 - uSheen;
    c += exp(-band * band * 70.0) * 0.1;
    c = mix(c, vec3(0.941, 0.251, 0.235), line);
    gl_FragColor = vec4(c, uOpacity * max(m, line));
  }
`;
const SHADOW_FRAG = /* glsl */ `
  uniform sampler2D uMap; uniform float uOpacity;
  varying vec2 vUv;
  void main() { gl_FragColor = vec4(0.07, 0.07, 0.08, texture2D(uMap, vUv).a * uOpacity); }
`;
const SHADOW_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

// sombra blanda: un rectángulo desenfocado con shadowBlur (anda en todos lados)
function softRect() {
  const W = 256;
  const H = 160;
  const P = 28;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d');
  g.shadowColor = '#000';
  g.shadowBlur = 18;
  g.shadowOffsetX = 2000;
  g.fillRect(P - 2000, P, W - P * 2, H - P * 2);
  return new THREE.CanvasTexture(cv);
}

export function createPliego(field, works) {
  const geo = new THREE.PlaneGeometry(1, 1, 40, 24);
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uMap: { value: null },
      uOpacity: { value: 0 },
      uReveal: { value: 0 },
      uBend: { value: 0.035 },
      uFlex: { value: 0 },
      uTime: { value: 0 },
      uSheen: { value: 0.6 },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sheet = new THREE.Mesh(geo, mat);
  sheet.renderOrder = 10; // sobre la tinta
  const shMat = new THREE.ShaderMaterial({
    vertexShader: SHADOW_VERT,
    fragmentShader: SHADOW_FRAG,
    uniforms: { uMap: { value: softRect() }, uOpacity: { value: 0 } },
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shMat);
  shadow.renderOrder = 9;
  const group = new THREE.Group();
  group.add(shadow, sheet);
  group.visible = false;
  field.scene.add(group);

  // los <video> viven en el DOM (invisibles): Safari no decodifica cuadros de un
  // video suelto. Si el navegador frena el autoplay, se reintenta con el primer gesto
  const shelf = document.createElement('div');
  shelf.setAttribute('aria-hidden', 'true');
  shelf.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;overflow:hidden;opacity:0;pointer-events:none;z-index:-1';
  document.body.appendChild(shelf);
  let blocked = null;
  const retry = () => {
    if (blocked && blocked === items[cur]?.el) blocked.play().then(() => (blocked = null)).catch(() => {});
  };
  ['pointerdown', 'touchstart', 'keydown', 'wheel'].forEach((e) => addEventListener(e, retry, { passive: true }));

  // texturas: la captura siempre; el video cuando hay recorrido y ya tiene cuadros.
  // Colores crudos (NoColorSpace), igual que la tinta: se ven tal cual el sitio
  const maxAniso = field.renderer.capabilities.getMaxAnisotropy();
  const items = works.map((w) => {
    const img = new THREE.Texture(w.img);
    img.colorSpace = THREE.NoColorSpace;
    img.anisotropy = maxAniso;
    img.needsUpdate = true;
    return { img, src: w.video || null, el: null, vid: null, last: -1 };
  });
  const load = (i) => {
    const it = items[i];
    if (!it?.src || it.el) return;
    const v = document.createElement('video');
    v.muted = true;
    v.defaultMuted = true;
    v.loop = true;
    v.playsInline = true;
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    v.preload = 'auto';
    v.src = it.src;
    shelf.appendChild(v);
    v.load();
    it.el = v;
    it.vid = new THREE.VideoTexture(v);
    it.vid.colorSpace = THREE.NoColorSpace;
  };
  const play = (it) => {
    if (!it.el || !it.el.paused) return;
    it.el.play().catch(() => (blocked = it.el));
  };

  let cur = -1;
  let playing = false;
  const tilt = { x: 0, y: 0 };
  // i: obra · r: su rect de mundo, con su giro (rx, ry) · s: estado del tramo
  // { a: opacidad, reveal: racleta 0..1, out: 0..1 se levanta, drift: 0..1 a lo
  // largo de la obra } · p: puntero −1..1 · lean: envión · t: segundos
  const show = (i, r, s, p, lean, t) => {
    if (i !== cur) {
      if (cur >= 0) items[cur].el?.pause();
      cur = i;
      load(i);
      load(i + 1);
      const v = items[i].el;
      if (v) v.currentTime = 0; // la obra arranca donde la dejó la tinta
      playing = false;
    }
    const it = items[i];
    if (!playing) {
      play(it);
      playing = true;
    }
    const ready = it.el && it.el.readyState >= 2;
    // por si el navegador no avisa cuadros nuevos (requestVideoFrameCallback)
    if (ready && it.el.currentTime !== it.last) {
      it.last = it.el.currentTime;
      it.vid.needsUpdate = true;
    }
    mat.uniforms.uMap.value = ready ? it.vid : it.img;
    tilt.x += (p.y * 0.08 - tilt.x) * 0.08;
    tilt.y += (p.x * 0.14 - tilt.y) * 0.08;
    group.visible = s.a > 0.005 && s.reveal > 0.001;
    const d = s.drift - 0.5;
    group.position.set(r.cx, r.cy + Math.sin(t * 0.9) * 0.35 - d * 2.2 + s.out * 3, s.out * 9);
    group.rotation.set(r.rx + tilt.x + d * 0.05 - s.out * 0.12, r.ry + tilt.y + d * 0.2 + s.out * 0.3, Math.sin(t * 0.6) * 0.006);
    sheet.scale.set(r.w, r.h, r.w);
    // la sombra crece detrás de la racleta y cae abajo a la derecha: nunca asoma
    // por arriba de la hoja (el rect desenfocado ocupa ~80% de su textura)
    shadow.position.set(r.w * 0.035 - r.w * 0.45 * (1 - s.reveal), -r.h * 0.075, -0.5);
    shadow.scale.set(r.w * 1.16 * (0.1 + 0.9 * s.reveal), r.h * 1.16, 1);
    mat.uniforms.uOpacity.value = s.a;
    mat.uniforms.uReveal.value = s.reveal;
    mat.uniforms.uBend.value = 0.035 + Math.min(0.12, lean * 0.4) + s.out * 0.08;
    mat.uniforms.uFlex.value = Math.min(0.03, lean * 0.1);
    mat.uniforms.uTime.value = t;
    mat.uniforms.uSheen.value = 0.55 + p.x * 0.45 - d * 0.4;
    shMat.uniforms.uOpacity.value = s.a * s.reveal * (field.state.dark ? 0.5 : 0.28);
  };
  const hide = () => {
    group.visible = false;
    if (cur >= 0) items[cur].el?.pause();
    playing = false;
  };
  // se acerca la sección de obras: ir pidiendo el primer recorrido
  const prefetch = (i) => load(i);
  return { show, hide, prefetch };
}
