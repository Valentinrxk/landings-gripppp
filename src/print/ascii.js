// La máquina: convierte una fuente (imagen o canvas) en una matriz de glifos
// mono — el "ruido de máquina" (mundo plata) — y la va afinando hasta que la
// racleta pasa la tinta y aparece la impresión real (mundo papel).
//
// Progreso p ∈ [0,1]:
//   0.00–0.62  boceto: la celda baja de cellMax a cellMin (la matriz se afina)
//              y las tres pasadas de tinta (rojo/celeste/negro) van registrando
//              hasta coincidir — desregistro serigráfico que se corrige.
//   0.62–1.00  tirada: la racleta cruza de izquierda a derecha y a su izquierda
//              queda la impresión real (clip de la imagen). El ASCII queda debajo.
//
// Todo el dibujo sale de un atlas de glifos pre-rasterizado (drawImage por
// celda): miles de celdas por cuadro sin fillText. Solo se re-dibuja cuando
// cambia el estado cuantizado (celda entera / offset entero) — 12fps reales.
const RAMP = '@#%*+=-:. '; // denso → vacío (tinta oscura sobre papel claro)
const DPR = Math.min(window.devicePixelRatio || 1, 1.5);

let atlasCache = new Map();
function atlas(ink, cell) {
  const key = ink + '|' + cell;
  if (atlasCache.has(key)) return atlasCache.get(key);
  const c = document.createElement('canvas');
  const s = Math.ceil(cell * DPR);
  c.width = s * RAMP.length;
  c.height = s;
  const g = c.getContext('2d');
  g.fillStyle = ink;
  g.textBaseline = 'middle';
  g.textAlign = 'center';
  g.font = `${Math.round(cell * 1.06 * DPR)}px 'Space Mono', ui-monospace, monospace`;
  for (let i = 0; i < RAMP.length; i++) g.fillText(RAMP[i], i * s + s / 2, s / 2 + 1);
  const a = { c, s };
  atlasCache.set(key, a);
  return a;
}
export function glyphAtlas(ink, cell) {
  return { ...atlas(ink, cell), n: RAMP.length };
}
export function resetAtlas() {
  atlasCache = new Map();
}

export function createPrinter(canvas, opts = {}) {
  const {
    cellMax = 26,
    cellMin = 8,
    inks = ['#f0403c', '#5fa8e0', '#111111'], // pasadas: rojo, celeste, negro (última manda)
    paper = null, // si se define, se pinta fondo (hero); null = transparente
    invert = false, // fuente clara sobre oscuro → invertir rampa
    ramp = 1, // gamma de contraste
  } = opts;
  const ctx = canvas.getContext('2d'); // siempre alpha: clearRect = transparente (nunca negro)
  const sampler = document.createElement('canvas');
  const sctx = sampler.getContext('2d', { willReadFrequently: true });
  let source = null;
  let W = 0;
  let H = 0;
  let last = '';
  let lum = null; // luminancias muestreadas para la celda actual
  let lumKey = '';

  function size() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    last = '';
    lumKey = '';
  }

  function sample(cell) {
    const cols = Math.ceil(W / cell);
    const rows = Math.ceil(H / cell);
    const key = cols + 'x' + rows;
    if (key === lumKey && lum) return { cols, rows };
    sampler.width = cols;
    sampler.height = rows;
    sctx.clearRect(0, 0, cols, rows);
    // fuente cubriendo la celda completa (cover)
    const sw = source.naturalWidth || source.width;
    const sh = source.naturalHeight || source.height;
    const scale = Math.max(cols / sw, rows / sh);
    const dw = sw * scale;
    const dh = sh * scale;
    sctx.drawImage(source, (cols - dw) / 2, (rows - dh) / 2, dw, dh);
    const data = sctx.getImageData(0, 0, cols, rows).data;
    lum = new Float32Array(cols * rows);
    for (let i = 0; i < cols * rows; i++) {
      const a = data[i * 4 + 3] / 255;
      let l = (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) / 255;
      l = l * a + (1 - a); // transparente = papel
      if (invert) l = 1 - l;
      lum[i] = Math.pow(l, ramp);
    }
    lumKey = key;
    return { cols, rows };
  }

  // Estado cuantizado: p → { cell, offset (px de desregistro), sweep (0..1 o -1) }
  function stateFor(p) {
    const q = Math.min(1, p / 0.62);
    // la celda baja en escalones enteros: cada escalón es un "cuadro" de afinado
    const cell = Math.round(cellMax - (cellMax - cellMin) * q);
    const off = Math.round((1 - q) * cellMax * 0.55);
    const sweep = p <= 0.62 ? -1 : Math.min(1, (p - 0.62) / 0.38);
    return { cell, off, sweep };
  }

  function draw(p) {
    if (!source || !W) return null;
    const st = stateFor(p);
    const key = st.cell + '|' + st.off + '|' + st.sweep.toFixed(2);
    if (key === last) return st;
    last = key;
    const { cols, rows } = sample(st.cell);
    if (paper) {
      ctx.fillStyle = paper;
      ctx.fillRect(0, 0, W, H);
    } else {
      ctx.clearRect(0, 0, W, H);
    }
    const passes = st.off > 0 ? inks : [inks[inks.length - 1]];
    const n = passes.length;
    for (let k = 0; k < n; k++) {
      const a = atlas(passes[k], st.cell);
      // desregistro: cada pasada corrida en una dirección distinta
      const dx = k === 0 ? -st.off : k === 1 ? st.off : 0;
      const dy = k === 0 ? st.off * 0.5 : k === 1 ? -st.off * 0.4 : 0;
      ctx.globalAlpha = n > 1 && k < n - 1 ? 0.75 : 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const l = lum[r * cols + c];
          const gi = Math.min(RAMP.length - 1, Math.round(l * (RAMP.length - 1)));
          if (gi === RAMP.length - 1) continue; // espacio: nada que dibujar
          ctx.drawImage(a.c, gi * a.s, 0, a.s, a.s, c * st.cell + dx, r * st.cell + dy, st.cell, st.cell);
        }
      }
    }
    ctx.globalAlpha = 1;
    return st;
  }

  return {
    setSource(src) {
      source = src;
      lumKey = '';
      last = '';
    },
    resize: size,
    draw,
    stateFor,
    get width() {
      return W;
    },
  };
}

// Carga una imagen y resuelve cuando puede muestrearse
export function loadImage(img) {
  return new Promise((res) => {
    if (img.complete && img.naturalWidth) return res(img);
    img.addEventListener('load', () => res(img), { once: true });
    img.addEventListener('error', () => res(null), { once: true });
  });
}
