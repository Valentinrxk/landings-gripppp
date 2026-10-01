// El pliego: la obra real, impresa en una hoja que flota en el mismo espacio que
// la tinta. Cuando la tinta aterriza, la racleta pasa de izquierda a derecha y
// deja la hoja impresa (con un filo rojo); el recorrido grabado corre encima
// mientras dure la obra. La hoja está girada en el espacio, se mece con el
// scroll, mira al puntero y, al irse, se levanta hacia la cámara.
//
// La hoja es DOM: un <a> con su <video> (o su <img>) de verdad, proyectado sobre
// el plano 3D con matrix3d desde las cuatro esquinas. Los navegadores no
// reproducen ni decodifican un video que no está en pantalla (ahorro de
// energía), así que el video tiene que ser uno visible, no la fuente oculta de
// una textura. De paso, se ve nítido. Del 3D (WebGL) queda la sombra.
import * as THREE from 'three';
import { t as tr } from '../data/i18n.js';
import { proyectar } from './proyectar.js';

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

const EW = 1280; // tamaño propio de la hoja (el de los recorridos)
const EH = 760;

export function createPliego(field, works, stage) {
  // la sombra (WebGL): crece detrás de la racleta
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
  const sheet = new THREE.Object3D(); // el plano de la hoja: de acá salen las esquinas
  group.add(shadow, sheet);
  group.visible = false;
  field.scene.add(group);

  // una hoja DOM por obra; solo se ve la activa
  const items = works.map((w) => {
    const a = document.createElement('a');
    a.className = 'hoja';
    a.href = w.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.dataset.cursor = 'ver';
    a.setAttribute('aria-label', `${tr('ui.view')}: ${w.name}`);
    a.style.cssText = `width:${EW}px;height:${EH}px`;
    let media;
    if (w.video) {
      media = document.createElement('video');
      media.muted = true;
      media.defaultMuted = true;
      media.loop = true;
      media.playsInline = true;
      media.setAttribute('muted', '');
      media.setAttribute('playsinline', '');
      media.preload = 'none';
      media.poster = w.src;
    } else {
      media = document.createElement('img');
      media.alt = '';
      media.decoding = 'async';
      media.src = w.src;
    }
    media.className = 'hoja-media';
    const shine = document.createElement('i');
    shine.className = 'hoja-brillo';
    const blade = document.createElement('i');
    blade.className = 'hoja-racleta';
    a.append(media, shine, blade);
    stage.appendChild(a);
    return { a, media, shine, blade, video: w.video || null, loaded: false };
  });
  const load = (i) => {
    const it = items[i];
    if (!it || !it.video || it.loaded) return;
    it.loaded = true;
    it.media.preload = 'auto';
    it.media.src = it.video;
    it.media.load();
  };
  // si el navegador frena el autoplay, se reintenta con el primer gesto
  let blocked = null;
  const retry = () => blocked?.play().then(() => (blocked = null)).catch(() => {});
  ['pointerdown', 'touchstart', 'keydown', 'wheel'].forEach((e) => addEventListener(e, retry, { passive: true }));

  let cur = -1;
  let playing = false;
  const tilt = { x: 0, y: 0 };
  const off = (it) => {
    it.a.style.visibility = 'hidden';
    it.a.style.pointerEvents = 'none';
    if (it.video) it.media.pause();
  };
  // i: obra · r: su rect de mundo, con su giro (rx, ry) · s: estado del tramo
  // { a: opacidad, reveal: racleta 0..1, out: 0..1 se levanta, drift: 0..1 a lo
  // largo de la obra } · p: puntero −1..1 · t: segundos
  const show = (i, r, s, p, t) => {
    if (i !== cur) {
      if (cur >= 0) off(items[cur]);
      cur = i;
      load(i);
      load(i + 1);
      if (items[i].video) items[i].media.currentTime = 0; // la obra arranca donde la dejó la tinta
      playing = false;
    }
    const it = items[i];
    if (!playing && it.video) {
      it.media.play().catch(() => (blocked = it.media));
      playing = true;
    }
    tilt.x += (p.y * 0.08 - tilt.x) * 0.08;
    tilt.y += (p.x * 0.14 - tilt.y) * 0.08;
    const d = s.drift - 0.5;
    group.visible = s.a > 0.005 && s.reveal > 0.001;
    group.position.set(r.cx, r.cy + Math.sin(t * 0.9) * 0.35 - d * 2.2 + s.out * 3, s.out * 9);
    group.rotation.set(r.rx + tilt.x + d * 0.05 - s.out * 0.12, r.ry + tilt.y + d * 0.2 + s.out * 0.3, Math.sin(t * 0.6) * 0.006);
    sheet.scale.set(r.w, r.h, 1);
    shadow.position.set(r.w * 0.035 - r.w * 0.45 * (1 - s.reveal), -r.h * 0.075, -0.5);
    shadow.scale.set(r.w * 1.16 * (0.1 + 0.9 * s.reveal), r.h * 1.16, 1);
    shMat.uniforms.uOpacity.value = s.a * s.reveal * (field.state.dark ? 0.5 : 0.28);
    // la hoja DOM calza sobre el plano proyectado
    proyectar(it.a, field, sheet, EW, EH);
    const st = it.a.style;
    st.visibility = group.visible ? 'visible' : 'hidden';
    st.opacity = s.a.toFixed(3);
    st.pointerEvents = s.a * s.reveal > 0.5 ? 'auto' : 'none';
    // la racleta: recorte desde la derecha y su filo rojo
    const cut = `inset(0 ${((1 - s.reveal) * 100).toFixed(2)}% 0 0)`;
    it.media.style.clipPath = cut;
    it.shine.style.clipPath = cut;
    it.blade.style.left = `${(s.reveal * 100).toFixed(2)}%`;
    it.blade.style.opacity = s.reveal > 0.001 && s.reveal < 0.999 ? '1' : '0';
    // el brillo cruza con el puntero
    it.shine.style.backgroundPosition = `${(30 + p.x * 45 - d * 40).toFixed(1)}% 0`;
  };
  const hide = () => {
    if (!group.visible && !playing) return;
    group.visible = false;
    if (cur >= 0) off(items[cur]);
    playing = false;
  };
  // se acerca la sección de obras: ir pidiendo el primer recorrido
  const prefetch = (i) => load(i);
  // el idioma cambia el rótulo de cada link
  const relabel = () => items.forEach((it, i) => it.a.setAttribute('aria-label', `${tr('ui.view')}: ${works[i].name}`));
  return { show, hide, prefetch, relabel };
}
