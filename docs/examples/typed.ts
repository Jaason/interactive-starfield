import { Starfield, type PresetName, type StarfieldOptions } from '../../src/index.js';

export function mountTypedBackground(canvas: HTMLCanvasElement): () => void {
  const preset: PresetName = 'deep-space';
  const options: StarfieldOptions = {
    preset,
    stars: { count: 140, colors: ['180, 210, 255'] },
    rendering: { maxDpr: 2 },
  };
  const field = new Starfield(canvas, options);
  field.updateConfig({ twinkle: { strength: 0.2 } });
  return () => field.destroy();
}
