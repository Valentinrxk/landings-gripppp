// Pausado por visibilidad: cada sistema registra su elemento raíz y duerme fuera de viewport.
const handlers = new Map();

const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      const h = handlers.get(e.target);
      if (!h) continue;
      if (e.isIntersecting) h.enter?.();
      else h.leave?.();
    }
  },
  { rootMargin: '20% 0px' }
);

export function watch(el, { enter, leave }) {
  handlers.set(el, { enter, leave });
  io.observe(el);
  return () => {
    io.unobserve(el);
    handlers.delete(el);
  };
}
