// Pliegos: cada captura entra como matriz de glifos y el scroll la imprime.
// El progreso se lee del ScrollTrigger en cada tick (nunca cacheado): un flick
// que atraviese el pliego entero igual lo deja impreso.
import { sequence } from '../core/film.js';
import { bus } from '../core/bus.js';
import { createPrinter, loadImage } from '../print/ascii.js';

export function initPliegos(ctx) {
  const sec = document.querySelector('.s-pliegos');
  if (ctx.tier === 'static') return;
  sec.classList.add('is-live');
  const N = 22;

  sec.querySelectorAll('.pliego').forEach((art, idx) => {
    const canvas = art.querySelector('.pl-ascii');
    const img = art.querySelector('.pl-real');
    const racleta = art.querySelector('.pl-racleta');
    const stamp = art.querySelector('.pl-stamp');
    // la celda escala con el ancho real del pliego (en el celu, ~ mitad)
    const w = canvas.clientWidth || 1000;
    const printer = createPrinter(canvas, {
      cellMax: Math.max(10, Math.round(w / 40)),
      cellMin: Math.max(5, Math.round(w / (ctx.tier === 'lite' ? 110 : 140))),
      inks: ['#f0403c', '#5fa8e0', '#111111'],
      ramp: 0.9,
    });
    let ready = false;
    let curF = 0;

    const apply = (f) => {
      curF = f;
      const p = f / N;
      const st = printer.draw(p);
      const sweep = st ? st.sweep : p > 0.62 ? (p - 0.62) / 0.38 : -1;
      if (sweep < 0) {
        img.style.clipPath = 'inset(0 100% 0 0)';
        racleta.style.visibility = 'hidden';
      } else {
        const pct = Math.round(sweep * 100);
        img.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
        racleta.style.transform = `translateX(${pct}%)`;
        racleta.style.visibility = pct >= 100 ? 'hidden' : 'visible';
      }
      // sello: cae en el último cuadro con pose de impacto y se asienta
      const on = f >= N;
      stamp.style.visibility = on ? 'visible' : 'hidden';
      stamp.style.transform = f === N ? 'rotate(-9deg) scale(1.7)' : 'rotate(-9deg)';
    };

    // arranca vacío (ruido) hasta que la imagen se puede muestrear
    img.style.clipPath = 'inset(0 100% 0 0)';
    stamp.style.visibility = 'hidden';
    loadImage(img).then((ok) => {
      if (!ok) {
        // sin captura no hay ruido: mostrar lo que haya
        img.style.clipPath = '';
        return;
      }
      printer.setSource(img);
      printer.resize();
      ready = true;
      apply(curF);
    });

    sequence({
      trigger: art,
      start: 'top 82%',
      end: 'top 18%',
      frames: N,
      onFrame(f) {
        if (!ready) {
          curF = f;
          return;
        }
        apply(f);
      },
    });

    bus.on('resize', () => {
      if (!ready) return;
      printer.resize();
      apply(curF);
    });
    // los pliegos se imprimen a distinta velocidad de rueda: nada más que hacer acá
    void idx;
  });
}
