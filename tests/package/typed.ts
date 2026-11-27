import { Starfield, type StarfieldOptions } from 'interactive-starfield';

declare global {
  interface Window {
    field: Starfield | null;
    mount: () => void;
    unmount: () => void;
    ready: boolean;
  }
}
const options: StarfieldOptions = { accessibility: { respectReducedMotion: false } };
window.mount = () => { window.field = new Starfield('canvas', options); };
window.unmount = () => { window.field?.destroy(); window.field = null; };
window.mount();
window.ready = true;
