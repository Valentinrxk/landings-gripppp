// Formas del campo de tinta: cada forma es exactamente N puntos en unidades de
// mundo (la cámara ve 100 unidades de alto en z=0). Cada punto trae posición,
// color (rgb 0..1), alpha y tamaño. Las formas se muestrean desde un canvas
// (texto, layout genérico, capturas, el wordmark líquido de grip) — nunca a mano.
import { GLYPHS, GLYPH_ORDER, VIEWBOX, blobPath } from '../ui/logo-paths.js';
import { mulberry32 } from '../core/rng.js';

const H = 100; // alto visible del mundo en z=0

// ── muestreo genérico de un canvas oscuro-sobre-transparente ──
function sampleCanvas(cv, N, { seed = 1, worldW, worldH, cx = 0, cy = 0, z = 0, colorFrom = null, alphaBase = 1, sizeBase = 1, threshold = 0.12, invert = false } = {}) {
  const w = cv.width;
  const h = cv.height;
  const data = cv.getContext('2d').getImageData(0, 0, w, h).data;
  const rnd = mulberry32(seed);
  // pesos: oscuridad (o claridad si invert) × alpha
  const cand = [];
  const wts = [];
  let total = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = data[i + 3] / 255;
      if (a < 0.02) continue;
      let l = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
      if (invert) l = 1 - l;
      let dark = (1 - l) * a;
      if (colorFrom === 'image') dark = Math.pow(dark, 0.6) * 0.85 + 0.15 * a; // las zonas claras también existen
      if (dark < threshold) continue;
      cand.push(x, y);
      wts.push(dark);
      total += dark;
    }
  }
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const alpha = new Float32Array(N);
  const size = new Float32Array(N);
  if (!cand.length) {
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (rnd() - 0.5) * worldW * 2;
      pos[i * 3 + 1] = (rnd() - 0.5) * worldH * 2;
      pos[i * 3 + 2] = z + (rnd() - 0.5) * 40;
      alpha[i] = 0;
      size[i] = 1;
    }
    return { pos, col, alpha, size };
  }
  // CDF para muestreo ponderado
  const cdf = new Float32Array(wts.length);
  let acc = 0;
  for (let i = 0; i < wts.length; i++) {
    acc += wts[i];
    cdf[i] = acc / total;
  }
  const pick = () => {
    const r = rnd();
    let lo = 0;
    let hi = cdf.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < r) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  const sx = worldW / w;
  const sy = worldH / h;
  for (let i = 0; i < N; i++) {
    const k = pick();
    const px = cand[k * 2] + rnd();
    const py = cand[k * 2 + 1] + rnd();
    pos[i * 3] = cx + (px - w / 2) * sx;
    pos[i * 3 + 1] = cy - (py - h / 2) * sy;
    pos[i * 3 + 2] = z + (rnd() - 0.5) * 1.5;
    const idx = (Math.floor(py) * w + Math.floor(px)) * 4;
    if (colorFrom === 'image') {
      col[i * 3] = data[idx] / 255;
      col[i * 3 + 1] = data[idx + 1] / 255;
      col[i * 3 + 2] = data[idx + 2] / 255;
    } else {
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0.067; // negro tinta
    }
    alpha[i] = colorFrom === 'image' ? alphaBase * 0.95 : alphaBase * Math.min(1, wts[k] * 1.4 + 0.35);
    size[i] = sizeBase * (0.8 + rnd() * 0.5);
  }
  return { pos, col, alpha, size };
}

const mk = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

// ── ruido: nube en 3D, sin forma. Alpha baja: es fondo. ──
export function shapeNoise(N, aspect, seed = 7) {
  const rnd = mulberry32(seed);
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const alpha = new Float32Array(N);
  const size = new Float32Array(N);
  const W = H * aspect;
  for (let i = 0; i < N; i++) {
    // mezcla de una esfera grande y polvo disperso
    const sph = rnd() < 0.55;
    if (sph) {
      const u = rnd() * 2 - 1;
      const th = rnd() * Math.PI * 2;
      const r = 26 + rnd() * 6;
      const s = Math.sqrt(1 - u * u);
      pos[i * 3] = Math.cos(th) * s * r + W * 0.18;
      pos[i * 3 + 1] = u * r - 2;
      pos[i * 3 + 2] = Math.sin(th) * s * r;
    } else {
      pos[i * 3] = (rnd() - 0.5) * W * 1.4;
      pos[i * 3 + 1] = (rnd() - 0.5) * H * 1.4;
      pos[i * 3 + 2] = (rnd() - 0.5) * 80;
    }
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0.067;
    alpha[i] = sph ? 0.75 : 0.35;
    size[i] = sph ? 1 : 0.7;
  }
  return { pos, col, alpha, size };
}

// ── texto grande (la palabra) ──
export function shapeText(N, aspect, text, { font = "900 200px 'Archivo Variable', Archivo, sans-serif", widthFrac = 0.86, y = 0, x = 0, seed = 11, letterSpacing = '-0.05em' } = {}) {
  const W = H * aspect;
  const cv = mk(1400, 420);
  const g = cv.getContext('2d');
  g.fillStyle = '#000';
  g.font = font;
  g.letterSpacing = letterSpacing;
  g.textBaseline = 'middle';
  g.textAlign = 'center';
  // ajustar tamaño para ocupar widthFrac del canvas
  let m = g.measureText(text);
  const scale = (cv.width * 0.94) / Math.max(1, m.width);
  const px = Math.min(400, 200 * scale);
  g.font = font.replace('200px', `${px.toFixed(0)}px`);
  g.fillText(text, cv.width / 2, cv.height / 2 + px * 0.06);
  m = g.measureText(text);
  const worldW = W * widthFrac;
  const worldH = worldW * (cv.height / cv.width);
  return sampleCanvas(cv, N, { seed, worldW, worldH, cx: x, cy: y, sizeBase: 1.05 });
}

// ── el wordmark líquido de grip (blobPath) ──
export function shapeGrip(N, aspect, { widthFrac = 0.6, y = 0, x = 0, seed = 5, ink = '#000' } = {}) {
  const W = H * aspect;
  const cv = mk(1400, Math.round((1400 * VIEWBOX.h) / VIEWBOX.w));
  const g = cv.getContext('2d');
  const s = cv.width / VIEWBOX.w;
  g.setTransform(s, 0, 0, s, 0, 0);
  g.fillStyle = ink;
  for (const k of GLYPH_ORDER) g.fill(new Path2D(blobPath(GLYPHS[k])));
  const worldW = W * widthFrac;
  const worldH = worldW * (cv.height / cv.width);
  return sampleCanvas(cv, N, { seed, worldW, worldH, cx: x, cy: y, sizeBase: 1.1 });
}

// ── la plantilla genérica: nav, hero, botón, imagen, 3 cards, cookie ──
export function shapeTemplate(N, aspect, { widthFrac = 0.62, seed = 13, x = 0, y = 0 } = {}) {
  const W = H * aspect;
  const cv = mk(1200, 760);
  const g = cv.getContext('2d');
  g.strokeStyle = '#000';
  g.fillStyle = '#000';
  g.lineWidth = 3;
  const R = (x, y, w, h, fill = false) => (fill ? g.fillRect(x, y, w, h) : g.strokeRect(x, y, w, h));
  R(20, 20, 1160, 720);
  // nav
  R(20, 20, 1160, 70);
  R(50, 40, 90, 30, true);
  for (let i = 0; i < 4; i++) R(700 + i * 90, 47, 60, 14, true);
  R(1080, 36, 80, 38, true);
  // hero: título 3 líneas + botón + imagen
  R(70, 150, 420, 34, true);
  R(70, 200, 360, 34, true);
  R(70, 250, 300, 34, true);
  R(70, 310, 300, 16, true);
  R(70, 335, 260, 16, true);
  R(70, 380, 150, 46, true);
  R(600, 130, 520, 320);
  g.beginPath();
  g.moveTo(600, 130);
  g.lineTo(1120, 450);
  g.moveTo(1120, 130);
  g.lineTo(600, 450);
  g.stroke();
  // cards
  for (let i = 0; i < 3; i++) {
    const x = 70 + i * 370;
    R(x, 500, 330, 200);
    R(x + 24, 528, 60, 60, true);
    R(x + 24, 610, 200, 14, true);
    R(x + 24, 636, 240, 10, true);
  }
  // cookie
  R(300, 660, 600, 50, true);
  const worldW = W * widthFrac;
  const worldH = worldW * (cv.height / cv.width);
  return sampleCanvas(cv, N, { seed, worldW, worldH, cx: x, cy: y, sizeBase: 0.9, threshold: 0.2 });
}

// ── la pila: la plantilla se cae al piso ──
export function shapePile(N, aspect, seed = 17) {
  const rnd = mulberry32(seed);
  const W = H * aspect;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const alpha = new Float32Array(N);
  const size = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const x = (rnd() + rnd() + rnd() - 1.5) * W * 0.5;
    const hgt = Math.max(0, 1 - Math.abs(x) / (W * 0.45));
    const y = -H * 0.5 + rnd() * rnd() * 22 * hgt + 2;
    pos[i * 3] = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = (rnd() - 0.5) * 30;
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0.067;
    alpha[i] = 0.9;
    size[i] = 0.9;
  }
  return { pos, col, alpha, size };
}

// ── una captura: puntos con el color de la imagen (los oscuros pesan más) ──
export function shapeImage(N, aspect, img, { widthFrac = 0.66, cx = 0, cy = 0, z = 0, seed = 23 } = {}) {
  const W = H * aspect;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const cw = 480;
  const ch = Math.round((cw * ih) / iw);
  const cv = mk(cw, ch);
  const g = cv.getContext('2d');
  g.drawImage(img, 0, 0, cw, ch);
  const worldW = W * widthFrac;
  const worldH = worldW * (ch / cw);
  const r = sampleCanvas(cv, N, { seed, worldW, worldH, cx, cy, z, colorFrom: 'image', sizeBase: 0.85, threshold: 0.06 });
  return { ...r, worldW, worldH, ink: new Float32Array(N) }; // 0 = color de captura (no se invierte)
}

// ── anillo de registro grande (contacto) ──
export function shapeRing(N, aspect, seed = 29) {
  const rnd = mulberry32(seed);
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const alpha = new Float32Array(N);
  const size = new Float32Array(N);
  const R0 = 34;
  for (let i = 0; i < N; i++) {
    const kind = rnd();
    let x;
    let y;
    if (kind < 0.7) {
      const th = rnd() * Math.PI * 2;
      const r = R0 + (rnd() - 0.5) * 3;
      x = Math.cos(th) * r;
      y = Math.sin(th) * r;
    } else if (kind < 0.85) {
      const th = rnd() * Math.PI * 2;
      const r = R0 * 0.28 + (rnd() - 0.5) * 2;
      x = Math.cos(th) * r;
      y = Math.sin(th) * r;
    } else {
      const v = rnd() < 0.5;
      const t = (rnd() - 0.5) * 2;
      const len = R0 * 1.35;
      const off = Math.sign(t) * (R0 * 0.42 + Math.abs(t) * (len - R0 * 0.42));
      x = v ? (rnd() - 0.5) * 1.5 : off;
      y = v ? off : (rnd() - 0.5) * 1.5;
    }
    pos[i * 3] = x + H * aspect * 0.22;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = (rnd() - 0.5) * 4;
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0.067;
    alpha[i] = 0.9;
    size[i] = 1;
  }
  return { pos, col, alpha, size };
}
