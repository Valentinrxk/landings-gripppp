// Sonido: todo sintético (Web Audio), sin archivos. Un solo AudioContext que se
// crea con el primer gesto: los navegadores no dejan sonar antes de un click.
let ctx = null;
let noise = null;

const audio = () => {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    // un segundo de ruido blanco: la materia prima de los estallidos
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
};

// ruido filtrado con ataque instantáneo y caída exponencial
function burst(c, out, at, { freq, q = 0.7, dur, vol, type = 'bandpass' }) {
  const src = c.createBufferSource();
  src.buffer = noise;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(out);
  src.start(at, Math.random() * 0.6);
  src.stop(at + dur + 0.02);
}

// un globo de foil que revienta: chasquido, cuerpo, golpe grave y los pedacitos
// de lámina que crujen al caer. delay: para que suene en el cuadro del estallido
// (hay que llamarla dentro del click, aunque suene un poco después)
export function popSound(delay = 0) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + delay;
  const out = c.createGain();
  out.gain.value = 0.5;
  out.connect(c.destination);
  burst(c, out, t, { freq: 2400, q: 0.8, dur: 0.07, vol: 1 }); // el chasquido
  burst(c, out, t, { freq: 850, q: 0.6, dur: 0.15, vol: 0.75 }); // el cuerpo
  burst(c, out, t, { freq: 5000, dur: 0.045, vol: 0.45, type: 'highpass' }); // el brillo
  // el golpe: una sinusoide que cae de tono
  const o = c.createOscillator();
  const og = c.createGain();
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  og.gain.setValueAtTime(0.55, t);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
  o.connect(og).connect(out);
  o.start(t);
  o.stop(t + 0.17);
  // el foil que cruje: tics cortos, cada vez más lejos y más bajos
  for (let i = 0; i < 8; i++) {
    const at = t + 0.05 + Math.random() * 0.3 * (0.4 + i / 8);
    burst(c, out, at, { freq: 3000 + Math.random() * 3500, q: 2.5, dur: 0.008 + Math.random() * 0.012, vol: 0.22 * (1 - i / 10) });
  }
}
