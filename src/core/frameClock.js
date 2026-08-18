// El obturador: único autorizador de commits visuales.
// El mundo (scroll, física, cursor) corre continuo; lo VISIBLE salta a `fps`.
export const clock = {
  fps: 12,
  frame: 0,
  paused: false,
  _acc: 0,
  _last: null,

  // timeSec viene del gsap.ticker. Devuelve true si cruzamos >=1 cuadro.
  tick(timeSec) {
    if (this._last == null) this._last = timeSec;
    let dt = timeSec - this._last;
    this._last = timeSec;
    if (this.paused || !this.fps) return false;
    if (dt > 0.5) dt = 0.5; // vuelta de pestaña oculta: no reventar el acumulador
    this._acc += dt;
    const step = 1 / this.fps;
    let ticked = false;
    while (this._acc >= step) {
      this._acc -= step;
      this.frame++;
      ticked = true;
    }
    return ticked;
  },
};
