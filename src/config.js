import defaultConfig from './defaultConfig.js';

function requireObject(value, path) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`Starfield: ${path} must be a plain object.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`Starfield: ${path} must be a plain object.`);
  }
}

function rejectUnknownKeys(value, defaults, path) {
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !Object.hasOwn(defaults, key)) {
      throw new TypeError(`Starfield: unknown option ${path}${String(key)}.`);
    }
  }
}

function requireRange(value, path, min, max = Infinity, exclusiveMin = false, exclusiveMax = false) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`Starfield: ${path} must be a finite number.`);
  }
  if ((exclusiveMin ? value <= min : value < min) ||
      (exclusiveMax ? value >= max : value > max)) {
    const upper = max === Infinity ? '' : ` and ${exclusiveMax ? '<' : '<='} ${max}`;
    throw new RangeError(`Starfield: ${path} must be ${exclusiveMin ? '>' : '>='} ${min}${upper}.`);
  }
}

function validate(config) {
  for (const name of ['twinkle', 'parallax', 'repulsion', 'connections', 'glow']) {
    if (typeof config[name].enabled !== 'boolean') {
      throw new TypeError(`Starfield: ${name}.enabled must be a boolean.`);
    }
  }

  requireRange(config.stars.count, 'stars.count', 0, Number.MAX_SAFE_INTEGER);
  if (!Number.isSafeInteger(config.stars.count)) {
    throw new RangeError('Starfield: stars.count must be a safe integer.');
  }

  for (const [section, key] of [
    ['stars', 'minRadius'], ['stars', 'minSpeed'], ['stars', 'maxSpeed'],
    ['twinkle', 'strength'], ['twinkle', 'speed'], ['parallax', 'strength'],
    ['repulsion', 'strength'], ['shootingStar', 'minSpeed'],
    ['shootingStar', 'maxSpeed'], ['glow', 'strength'],
  ]) {
    requireRange(config[section][key], `${section}.${key}`, 0);
  }

  for (const [section, key] of [
    ['stars', 'maxRadius'], ['repulsion', 'radius'], ['shootingStar', 'lineWidth'],
    ['galaxy', 'centerStrength'], ['galaxy', 'spread'], ['galaxy', 'flattening'],
    ['connections', 'radius'], ['connections', 'mouseRadius'], ['connections', 'lineWidth'],
  ]) {
    requireRange(config[section][key], `${section}.${key}`, 0, Infinity, true);
  }

  requireRange(config.repulsion.friction, 'repulsion.friction', 0, 1, false, true);
  requireRange(config.connections.lineOpacity, 'connections.lineOpacity', 0, 1);
  requireRange(config.galaxy.rotation, 'galaxy.rotation', -Infinity);

  for (const [section, min, max] of [
    ['stars', 'minRadius', 'maxRadius'],
    ['stars', 'minSpeed', 'maxSpeed'],
    ['shootingStar', 'minSpeed', 'maxSpeed'],
  ]) {
    if (config[section][min] > config[section][max]) {
      throw new RangeError(`Starfield: ${section}.${min} must not exceed ${section}.${max}.`);
    }
  }

  if (!['random', 'galaxy'].includes(config.generation.mode)) {
    throw new TypeError('Starfield: generation.mode must be "random" or "galaxy".');
  }

  const colors = config.stars.colors;
  if (!Array.isArray(colors) || colors.length === 0) {
    throw new TypeError('Starfield: stars.colors must be a non-empty array of RGB triplets.');
  }
  for (let i = 0; i < colors.length; i++) {
    const color = colors[i];
    if (typeof color !== 'string' ||
        !/^\s*\d+(?:\.\d+)?\s*,\s*\d+(?:\.\d+)?\s*,\s*\d+(?:\.\d+)?\s*$/.test(color) ||
        color.split(',').some(channel => Number(channel) > 255)) {
      throw new TypeError(`Starfield: stars.colors[${i}] must contain three RGB numbers from 0 to 255.`);
    }
  }
}

// Merge only the known two-level configuration shape; never retain caller data.
export function createConfig(options = {}) {
  requireObject(options, 'options');
  rejectUnknownKeys(options, defaultConfig, '');

  const config = {};
  for (const [name, defaults] of Object.entries(defaultConfig)) {
    const supplied = Object.hasOwn(options, name) ? options[name] : undefined;
    const overrides = supplied === undefined ? {} : supplied;
    requireObject(overrides, name);
    rejectUnknownKeys(overrides, defaults, `${name}.`);

    const section = {};
    for (const [key, fallback] of Object.entries(defaults)) {
      const suppliedValue = Object.hasOwn(overrides, key) ? overrides[key] : undefined;
      const value = suppliedValue === undefined ? fallback : suppliedValue;
      section[key] = Array.isArray(value) ? [...value] : value;
    }
    config[name] = section;
  }

  validate(config);
  Object.freeze(config.stars.colors);
  for (const section of Object.values(config)) Object.freeze(section);
  return Object.freeze(config);
}
