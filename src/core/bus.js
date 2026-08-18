// emitter mínimo — eventos: 'frame', 'section:enter', 'resize'
const map = new Map();

export const bus = {
  on(ev, fn) {
    if (!map.has(ev)) map.set(ev, new Set());
    map.get(ev).add(fn);
    return () => bus.off(ev, fn);
  },
  off(ev, fn) {
    map.get(ev)?.delete(fn);
  },
  emit(ev, ...args) {
    map.get(ev)?.forEach((fn) => fn(...args));
  },
};
