// PRNG determinista: el frame N siempre tiembla igual (look de fotograma impreso)
export function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// un valor [0,1) determinista por (frame, salt)
export function frameRand(frame, salt = 0) {
  return mulberry32((Math.imul(frame, 2654435761) ^ Math.imul(salt, 40503)) >>> 0)();
}

// rango [-1, 1]
export function frameJit(frame, salt = 0) {
  return frameRand(frame, salt) * 2 - 1;
}
