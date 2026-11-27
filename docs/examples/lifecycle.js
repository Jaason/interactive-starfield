import { Starfield } from '../../src/index.js';

// Pass two mounted canvases with positive, independent CSS dimensions.
export function mountBackgrounds(firstCanvas, secondCanvas) {
  const first = new Starfield(firstCanvas, { preset: 'deep-space' });
  let second;
  try {
    second = new Starfield(secondCanvas, { preset: 'constellation' });
    first.stop();
    first.updateConfig({ stars: { count: 120 }, glow: { enabled: false } });
    first.start();

    // A preset resets previous overrides. Overrides in the same call win.
    second.updateConfig({ preset: 'milky-way', stars: { count: 200 } });

    // Default true: keep the system motion preference in control.
    first.updateConfig({
      accessibility: { respectReducedMotion: true },
      rendering: { maxDpr: 2 },
    });
  } catch (error) {
    first.destroy();
    second?.destroy();
    throw error;
  }

  // The host calls this before removing either canvas or reinitializing it.
  return () => { first.destroy(); second.destroy(); };
}
