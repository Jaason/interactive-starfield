// Presets contain only overrides; omitted values come from defaultConfig.
const presets = {
  default: {},

  'deep-space': {
    stars: {
      count: 90,
      minRadius: 0.4,
      maxRadius: 1.6,
      minSpeed: 2,
      maxSpeed: 6,
      colors: ['255, 255, 255', '180, 210, 255'],
    },
    generation: { mode: 'random' },
    twinkle: { strength: 0.18, speed: 0.001 },
    parallax: { strength: 10 },
    connections: { enabled: false },
    glow: { strength: 2 },
  },

  'milky-way': {
    stars: {
      count: 360,
      minRadius: 0.4,
      maxRadius: 1.5,
      minSpeed: 3,
      maxSpeed: 8,
    },
    twinkle: { strength: 0.25, speed: 0.0015 },
    parallax: { strength: 14 },
    galaxy: { centerStrength: 1.4, spread: 0.65, flattening: 0.22 },
    connections: { enabled: false },
    glow: { strength: 3 },
  },

  constellation: {
    stars: {
      count: 180,
      minRadius: 0.8,
      minSpeed: 2,
      maxSpeed: 5,
      colors: ['220, 235, 255', '180, 210, 255'],
    },
    generation: { mode: 'random' },
    twinkle: { strength: 0.12, speed: 0.001 },
    parallax: { strength: 8 },
    repulsion: { enabled: false },
    connections: { radius: 140, mouseRadius: 220, lineOpacity: 0.35, lineWidth: 0.7 },
    glow: { strength: 2 },
  },
};

for (const preset of Object.values(presets)) {
  for (const section of Object.values(preset)) {
    for (const value of Object.values(section)) {
      if (Array.isArray(value)) Object.freeze(value);
    }
    Object.freeze(section);
  }
  Object.freeze(preset);
}
Object.freeze(presets);

export default presets;
