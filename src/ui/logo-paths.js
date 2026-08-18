// El wordmark "grip" como polígonos de anclas. Los paths NUNCA se dibujan a mano:
// blobPath() los suaviza con Catmull-Rom → tinta líquida. Mismo nº de anclas por
// variante ⇒ boil y melt son interpolaciones de anclas, no morphs de path.
import { mulberry32 } from '../core/rng.js';

export const VIEWBOX = { w: 700, h: 360 };

// glifos sólidos (la marca no tiene contraformas): g · r · punto de la i · cuerpo de la i · p
export const GLYPHS = {
  // g: panza redonda + descendente que baja y engancha a la IZQUIERDA
  // (espejo conceptual de la p, como en el wordmark original)
  g: [
    [100, 82], [148, 98], [164, 142], [154, 190],
    [146, 245], [140, 300], [118, 335], [80, 342],
    [58, 322], [74, 298], [102, 288], [92, 225],
    [60, 208], [42, 160], [55, 108],
  ],
  r: [
    [230, 140], [268, 110], [310, 105], [345, 120], [360, 148],
    [340, 165], [310, 150], [285, 160], [275, 200], [280, 245],
    [255, 262], [228, 248], [225, 200], [222, 165],
  ],
  idot: [
    [416, 69], [434, 77], [442, 95], [434, 113],
    [416, 121], [398, 113], [390, 95], [398, 77],
  ],
  ibody: [
    [418, 155], [440, 175], [442, 215], [430, 250],
    [405, 255], [392, 225], [393, 185],
  ],
  p: [
    [520, 115], [575, 105], [630, 120], [660, 160], [650, 205],
    [605, 232], [560, 228], [548, 260], [545, 300], [552, 335],
    [520, 345], [495, 320], [498, 270], [500, 210], [498, 160],
  ],
};

export const GLYPH_ORDER = ['g', 'r', 'idot', 'ibody', 'p'];

// puntos de goteo (borde inferior de cada glifo, coords locales)
export const DRIP_POINTS = [
  [80, 340], [255, 262], [418, 252], [532, 338], [300, 250], [430, 250],
];

// círculos que aproximan los glifos para el collider de matter.js (coords locales)
export const COLLIDER_CIRCLES = [
  { x: 103, y: 150, r: 62 },
  { x: 100, y: 305, r: 36 },
  { x: 290, y: 180, r: 78 },
  { x: 416, y: 95, r: 30 },
  { x: 416, y: 205, r: 44 },
  { x: 578, y: 175, r: 82 },
  { x: 522, y: 300, r: 42 },
];

// Catmull-Rom cerrado → cubic bezier path
export function blobPath(pts) {
  const n = pts.length;
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + ' Z';
}

// variante "boil": mismas anclas, jitter determinista por (frame, salt)
export function boilAnchors(anchors, seed, amp = 5) {
  const rnd = mulberry32(seed >>> 0);
  return anchors.map(([x, y]) => [x + (rnd() * 2 - 1) * amp, y + (rnd() * 2 - 1) * amp]);
}

// variante derretida: la mitad inferior chorrea hacia abajo, todo se afina hacia el centro
export function meltAnchors(anchors, drop = 340) {
  const cx = anchors.reduce((s, p) => s + p[0], 0) / anchors.length;
  return anchors.map(([x, y]) => {
    const below = Math.max(0, y - 115) / 200; // 0 arriba, 1 en el descendente
    return [x + (cx - x) * 0.42 * below, y + drop * below * below + below * 60];
  });
}

export function lerpAnchors(a, b, t) {
  if (t <= 0) return a;
  if (t >= 1) return b;
  return a.map(([x, y], i) => [x + (b[i][0] - x) * t, y + (b[i][1] - y) * t]);
}

// wordmark estático (para grillas warhol / splash) — sin filtros, un solo <path> por glifo
export function staticWordmarkSVG(ink = '#111', extraAttrs = '') {
  const paths = GLYPH_ORDER.map((k) => `<path d="${blobPath(GLYPHS[k])}"/>`).join('');
  return `<svg viewBox="0 0 ${VIEWBOX.w} ${VIEWBOX.h}" fill="${ink}" aria-hidden="true" ${extraAttrs}>${paths}</svg>`;
}
