import { Starfield, type StarfieldOptions, type PresetName } from '../../src/index.js';
const preset: PresetName = 'deep-space';
const options: StarfieldOptions = { preset, stars: { colors: ['255, 255, 255'] as const }, rendering: { maxDpr: null } };
const field = new Starfield(document.createElement('canvas'), options);
field.stop().start().updateConfig({ preset: 'constellation', stars: { count: undefined }, accessibility: { respectReducedMotion: false } });
new Starfield('#canvas');
field.updateConfig();
field.config?.stars.colors.forEach(color => color.toUpperCase());
// @ts-expect-error Unknown preset.
field.updateConfig({ preset: 'unknown' });
// @ts-expect-error Incorrect numeric value.
field.updateConfig({ stars: { count: '100' } });
// @ts-expect-error Wrong element type.
new Starfield(document.createElement('div'));
// @ts-expect-error Resolved configuration is immutable.
if (field.config) field.config.stars.count = 100;
// @ts-expect-error Color array is immutable.
field.config?.stars.colors.push('0, 0, 0');
// @ts-expect-error No retained preset metadata.
field.config?.preset;
// @ts-expect-error Unknown nested option.
field.updateConfig({ rendering: { devicePixelRatio: 2 } });
field.destroy();
