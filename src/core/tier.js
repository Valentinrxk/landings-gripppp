// full  — desktop capaz: goo, física completa, trail
// lite  — touch o hardware justo: sin filtro goo, menos cuerpos, DPR 1
// static— prefers-reduced-motion: fps 0, sin física, sin lenis
export function detectTier() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  let tier = 'full';
  if (reduced) {
    tier = 'static';
  } else {
    const mem = navigator.deviceMemory ?? 8;
    const cores = navigator.hardwareConcurrency ?? 8;
    if (coarse || mem < 4 || cores < 4) tier = 'lite';
  }
  return { tier, coarse, reduced };
}
