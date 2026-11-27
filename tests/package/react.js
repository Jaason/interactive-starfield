import { createElement, StrictMode, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Starfield } from 'interactive-starfield';

window.mounts = 0;
window.cleanups = 0;
function Background() {
  const canvas = useRef(null);
  useEffect(() => {
    const field = new Starfield(canvas.current, { accessibility: { respectReducedMotion: false } });
    window.mounts++;
    return () => { field.destroy(); window.cleanups++; };
  }, []);
  return createElement('canvas', { ref: canvas, style: { width: '600px', height: '300px' }, 'aria-hidden': true });
}
const root = createRoot(document.querySelector('#root'));
window.mount = () => flushSync(() => root.render(createElement(StrictMode, null, createElement(Background))));
window.unmount = () => flushSync(() => root.render(null));
window.dispose = () => root.unmount();
window.mount();
window.ready = true;
