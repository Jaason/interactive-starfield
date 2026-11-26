// Minimal browser doubles shared by the focused API and lifecycle checks.
export function fixture(width = 400, height = 240, dpr = 2, { observer = true, hidden = false, reducedMotion = null } = {}) {
  const listeners = new Map();
  const documentListeners = new Map();
  const frames = new Map();
  const observers = new Set();
  const calls = [];
  const mediaListeners = new Map();
  let nextFrameId = 0;
  const events = (entries) => ({
    addEventListener(type, callback, options) {
      const handlers = entries.get(type) ?? [];
      if (!handlers.some(handler => handler.callback === callback)) handlers.push({ callback, options });
      entries.set(type, handlers);
    },
    removeEventListener(type, callback) {
      const remaining = (entries.get(type) ?? []).filter(handler => handler.callback !== callback);
      if (remaining.length) entries.set(type, remaining);
      else entries.delete(type);
    },
  });
  const view = {
    ...events(listeners),
    devicePixelRatio: dpr,
    requestAnimationFrame(callback) {
      const id = nextFrameId++;
      frames.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) { frames.delete(id); },
  };
  const mediaQuery = { ...events(mediaListeners), matches: Boolean(reducedMotion) };
  if (reducedMotion !== null) view.matchMedia = () => mediaQuery;
  const document = { ...events(documentListeners), defaultView: view, hidden };
  if (observer) {
    view.ResizeObserver = class {
      constructor(callback) { this.callback = callback; this.target = null; }
      observe(target) { this.target = target; observers.add(this); }
      disconnect() { this.target = null; observers.delete(this); }
    };
  }
  class Canvas {
    constructor() {
      this.ownerDocument = document;
      this.clientWidth = width;
      this.clientHeight = height;
      this.width = 300;
      this.height = 150;
      this.style = {};
      this.rect = { left: 100, top: 200, width, height };
      this.context = new Proxy({}, {
        get: (_, key) => (...args) => {
          calls.push([key, ...args]);
          if (key === 'createLinearGradient') return { addColorStop() {} };
        },
      });
    }
    getContext() { return this.context; }
    getBoundingClientRect() { return this.rect; }
  }
  view.HTMLCanvasElement = Canvas;
  const canvas = new Canvas();
  const emit = (entries, type, event) => {
    for (const { callback } of entries.get(type) ?? []) callback(event);
  };
  return {
    canvas, Canvas, view, document, listeners, documentListeners, frames, observers, calls,
    mediaListeners,
    motion(matches) { mediaQuery.matches = matches; emit(mediaListeners, 'change', { matches }); },
    emit(type, event = {}) { emit(listeners, type, event); },
    visibility(hidden) { document.hidden = hidden; emit(documentListeners, 'visibilitychange', {}); },
    resize() { for (const observer of observers) observer.callback([{ target: observer.target }]); },
    step(time) {
      for (const [id, callback] of [...frames]) {
        if (!frames.has(id)) continue;
        frames.delete(id);
        callback(time);
      }
      calls.length = 0;
    },
  };
}
