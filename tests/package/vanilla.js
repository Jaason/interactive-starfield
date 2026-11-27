import { Starfield } from 'interactive-starfield';

window.mount = () => { window.field = new Starfield('canvas', { accessibility: { respectReducedMotion: false } }); };
window.unmount = () => { window.field.destroy(); window.field = null; };
window.mount();
window.ready = true;
