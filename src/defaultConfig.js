const defaultConfig = {
  stars: {
    count: 240,
    minRadius: 0.5,
    maxRadius: 2,
    minSpeed: 8,
    maxSpeed: 18,
    colors: ['255, 255, 255', '180, 210, 255', '255, 230, 180'],
  },

  twinkle: {
    enabled: true,
    strength: 0.35,
    speed: 0.002,
  },

  parallax: {
    enabled: true,
    strength: 18,
  },

  repulsion: {
    enabled: true,
    radius: 50,
    strength: 22,
    friction: 0.9,
  },

  shootingStar: {
    minSpeed: 600,
    maxSpeed: 900,
    lineWidth: 1,
  },

  generation: {
    mode: 'galaxy', // 'random' | 'galaxy'
  },

  galaxy: {
    centerStrength: 2.2,
    spread: 0.48,
    flattening: 0.45,
    rotation: 0.8,
  },

  connections: {
    enabled: true,
    radius: 90,
    mouseRadius: 160,
    lineOpacity: 0.22,
    lineWidth: 0.5,
  },

  glow: {
    enabled: true,
    strength: 4,
  },
};

Object.freeze(defaultConfig.stars.colors);
for (const section of Object.values(defaultConfig)) {
  Object.freeze(section);
}
Object.freeze(defaultConfig);

export default defaultConfig;
