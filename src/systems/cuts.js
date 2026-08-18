// El corte entre pliegos se SIENTE: 1 cuadro blanco (flash con guard WCAG) +
// 2 poses de sacudón del mundo. Lo dispara quien cambia de escena.
import { spliceFlash } from './flash.js';

const world = () => document.querySelector('main#world');
export function shake() {
  const w = world();
  if (!w) return;
  w.classList.remove('cutshake');
  void w.offsetWidth;
  w.classList.add('cutshake');
}
export function cut() {
  spliceFlash();
  shake();
}
