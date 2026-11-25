// Focused API checks using Node built-ins; the Vitest suite is planned for Milestone 5.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { Starfield } from '../src/index.js';
import defaultConfig from '../src/defaultConfig.js';
import { createConfig } from '../src/config.js';

let checks = 0;
function check(name, run) {
  run();
  checks++;
  console.log(`PASS ${name}`);
}

function fixture(width = 400, height = 240, dpr = 2) {
  const listeners = new Map();
  const frames = [];
  const calls = [];
  const view = {
    devicePixelRatio: dpr,
    addEventListener(type, callback, options) {
      const entries = listeners.get(type) ?? [];
      entries.push({ callback, options });
      listeners.set(type, entries);
    },
    requestAnimationFrame(callback) { frames.push(callback); return frames.length; },
  };
  class Canvas {
    constructor() {
      this.ownerDocument = { defaultView: view };
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
  return {
    canvas, Canvas, view, listeners, frames, calls,
    emit(type, event = {}) {
      for (const { callback } of listeners.get(type) ?? []) callback(event);
    },
    step(time) {
      for (const callback of frames.splice(0)) callback(time);
      calls.length = 0;
    },
  };
}

const prototype = await readFile(new URL('../prototype/starfield.js', import.meta.url), 'utf8');
const originalDefaults = JSON.parse(runInNewContext(
  `${prototype.slice(0, prototype.indexOf('\nconst canvas'))}\nJSON.stringify(CONFIG)`,
));

check('public entry imports without DOM globals and retains every prototype default', () => {
  assert.equal(typeof window, 'undefined');
  assert.equal(typeof document, 'undefined');
  assert.deepEqual(createConfig(), originalDefaults);
  assert.throws(() => new Starfield('#canvas'), /document is required/);
});

check('partial nested configuration and undefined preserve unspecified defaults', () => {
  const actual = createConfig({ stars: { count: 12, minRadius: undefined }, glow: undefined });
  assert.deepEqual(actual, { ...originalDefaults, stars: { ...originalDefaults.stars, count: 12 } });
  assert.deepEqual(createConfig(Object.create(null)), originalDefaults);
});

check('configuration and color arrays are copied and recursively frozen', () => {
  const input = { stars: { count: 12, colors: ['1, 2, 3'] } };
  const snapshot = structuredClone(input);
  const a = createConfig(input);
  const b = createConfig(input);
  assert.deepEqual(input, snapshot);
  for (const config of [defaultConfig, a, b]) {
    assert.ok(Object.isFrozen(config));
    for (const section of Object.values(config)) assert.ok(Object.isFrozen(section));
    assert.ok(Object.isFrozen(config.stars.colors));
  }
  for (const key of Object.keys(defaultConfig)) {
    assert.notEqual(a[key], b[key]);
    assert.notEqual(a[key], defaultConfig[key]);
  }
  assert.notEqual(a.stars.colors, b.stars.colors);
  assert.notEqual(createConfig().stars.colors, defaultConfig.stars.colors);
  input.stars.colors[0] = '4, 5, 6';
  input.stars.count = 99;
  assert.equal(a.stars.count, 12);
  assert.deepEqual(a.stars.colors, ['1, 2, 3']);
  assert.throws(() => { a.stars.count = 3; }, TypeError);
  assert.throws(() => { defaultConfig.stars.colors.push('0, 0, 0'); }, TypeError);
});

check('invalid object shapes and unknown keys fail with an option path', () => {
  for (const value of [null, 1, false, 'x', [], new Date()]) {
    assert.throws(() => createConfig(value), /options must be a plain object/);
    assert.throws(() => createConfig({ stars: value }), /stars must be a plain object/);
  }
  assert.throws(() => createConfig({ stars: { cout: 2 } }), /stars.cout/);
  assert.throws(() => createConfig({ unknown: undefined }), /unknown option unknown/);
  assert.throws(() => createConfig({ [Symbol('extra')]: 1 }), /unknown option Symbol/);
  assert.throws(() => createConfig(JSON.parse('{"__proto__":{"polluted":true}}')), /__proto__/);
  assert.throws(() => createConfig({ stars: { constructor: {} } }), /stars.constructor/);
  assert.equal({}.polluted, undefined);
});

check('all numeric options reject non-numeric and non-finite values', () => {
  for (const [name, section] of Object.entries(defaultConfig)) {
    for (const [key, value] of Object.entries(section)) {
      if (typeof value !== 'number') continue;
      for (const invalid of [null, '1', true, NaN, Infinity, -Infinity]) {
        assert.throws(() => createConfig({ [name]: { [key]: invalid } }),
          error => error instanceof TypeError && error.message.includes(`${name}.${key}`));
      }
    }
  }
});

check('numeric boundaries and dependent ranges are validated', () => {
  const invalid = [
    { stars: { count: -1 } }, { stars: { count: 1.5 } },
    { stars: { count: Number.MAX_SAFE_INTEGER + 1 } },
    { stars: { minRadius: -1 } }, { stars: { maxRadius: 0 } },
    { stars: { minRadius: 3, maxRadius: 2 } },
    { stars: { minSpeed: 19, maxSpeed: 18 } },
    { shootingStar: { minSpeed: 901, maxSpeed: 900 } },
    { repulsion: { friction: 1 } }, { repulsion: { friction: -0.1 } },
    { connections: { lineOpacity: 1.1 } }, { connections: { lineOpacity: -0.1 } },
  ];
  for (const [section, key] of [
    ['repulsion', 'radius'], ['shootingStar', 'lineWidth'], ['galaxy', 'centerStrength'],
    ['galaxy', 'spread'], ['galaxy', 'flattening'], ['connections', 'radius'],
    ['connections', 'mouseRadius'], ['connections', 'lineWidth'],
  ]) invalid.push({ [section]: { [key]: 0 } });
  for (const config of invalid) assert.throws(() => createConfig(config), RangeError);
  assert.doesNotThrow(() => createConfig({
    stars: { count: 0, minRadius: 0, minSpeed: 0, maxSpeed: 0 },
    shootingStar: { minSpeed: 0, maxSpeed: 0 },
    repulsion: { friction: 0, strength: 0 },
    twinkle: { speed: 0, strength: 0 },
    parallax: { strength: 0 }, glow: { strength: 0 },
    galaxy: { rotation: -1 }, connections: { lineOpacity: 0 },
  }));
});

check('boolean, mode, and RGB validation includes sparse and empty arrays', () => {
  for (const name of ['twinkle', 'parallax', 'repulsion', 'connections', 'glow']) {
    for (const value of [0, 1, 'true', null]) {
      assert.throws(() => createConfig({ [name]: { enabled: value } }), /enabled must be a boolean/);
    }
  }
  assert.throws(() => createConfig({ generation: { mode: 'spiral' } }), /generation.mode/);
  assert.equal(createConfig({ generation: { mode: 'random' } }).generation.mode, 'random');
  for (const colors of [[], null, 'red', ['red'], ['#fff'], ['256, 0, 0'], ['-1, 0, 0'],
    ['1,2'], ['1,2,3,4'], ['NaN,0,0'], ['1e2,0,0'], [null], new Array(1)]) {
    assert.throws(() => createConfig({ stars: { colors } }), /stars.colors/);
  }
  assert.deepEqual(createConfig({ stars: { colors: [' 0, 127.5, 255 '] } }).stars.colors,
    [' 0, 127.5, 255 ']);
});

check('invalid initialization leaves listeners, frames, and canvas dimensions untouched', () => {
  for (const options of [null, { stars: { count: -1 } }, { wrong: true }]) {
    const env = fixture();
    assert.throws(() => new Starfield(env.canvas, options));
    assert.equal(env.listeners.size, 0);
    assert.equal(env.frames.length, 0);
    assert.equal(env.canvas.width, 300);
    assert.equal(env.canvas.height, 150);
  }
  for (const [width, height] of [[0, 100], [100, 0]]) {
    const env = fixture(width, height);
    assert.throws(() => new Starfield(env.canvas), /positive CSS width and height/);
    assert.equal(env.listeners.size, 0);
    assert.equal(env.frames.length, 0);
  }
  const env = fixture();
  env.canvas.context = null;
  assert.throws(() => new Starfield(env.canvas), /2D context is not available/);
  assert.equal(env.listeners.size, 0);
  assert.equal(env.frames.length, 0);
  for (const target of [null, undefined, {}, 123]) assert.throws(() => new Starfield(target), /target must be a canvas/);
});

check('selector resolution distinguishes malformed, missing, and wrong elements', () => {
  const env = fixture();
  globalThis.document = { querySelector(selector) {
    if (selector === '[') throw new SyntaxError();
    if (selector === '#missing') return null;
    if (selector === '#div') return {};
    return env.canvas;
  } };
  try {
    assert.throws(() => new Starfield('['), /invalid canvas selector/);
    assert.throws(() => new Starfield('#missing'), /no canvas matches/);
    assert.throws(() => new Starfield('#div'), /target must be a canvas/);
    assert.equal(env.listeners.size, 0);
    assert.equal(env.frames.length, 0);
    assert.equal(new Starfield('#canvas').canvas, env.canvas);
  } finally {
    delete globalThis.document;
  }
});

check('CSS dimensions, DPR, local mouse/touch coordinates, and passive touch input', () => {
  const env = fixture();
  const field = new Starfield(env.canvas, { stars: { count: 4 } });
  assert.equal(field.width, 400);
  assert.equal(field.height, 240);
  assert.equal(env.canvas.width, 800);
  assert.equal(env.canvas.height, 480);
  assert.deepEqual(env.canvas.style, {});
  assert.deepEqual(env.calls[0], ['setTransform', 2, 0, 0, 2, 0, 0]);
  assert.equal(env.listeners.get('touchmove')[0].options.passive, true);
  assert.equal(field.pointer.active, true);
  env.emit('mousemove', { clientX: 400, clientY: 320 });
  assert.equal(field.pointer.x, 300);
  assert.equal(field.pointer.y, 120);
  assert.equal(field.pointer.normalizedX, 0.25);
  assert.equal(field.pointer.normalizedY, 0);
  env.canvas.rect.top = 100; // A scroll changes position without changing dimensions.
  env.emit('touchmove', { touches: [{ clientX: 200, clientY: 160 }] });
  assert.equal(field.pointer.x, 100);
  assert.equal(field.pointer.y, 60);
  assert.equal(field.pointer.normalizedY, -0.25);
  env.emit('touchmove', { touches: [] });
  assert.equal(field.pointer.y, 60);
  env.emit('mousemove', { clientX: 99, clientY: 160 });
  assert.equal(field.pointer.active, false);
  assert.equal(field.pointer.normalizedX, 0);
  assert.equal(field.pointer.normalizedY, 0);
  env.calls.length = 0;
  field.drawConnections();
  assert.equal(env.calls.length, 0);
  const star = field.stars[0];
  star.x = field.pointer.x + 1;
  star.y = field.pointer.y;
  star.offsetX = 10;
  star.offsetY = 0;
  star.update(field.width, field.height, 0);
  assert.equal(star.offsetX, 9); // Only friction, no outside-pointer repulsion.
});

check('window resize refreshes instance size and hidden canvases keep the last valid size', () => {
  const env = fixture();
  const field = new Starfield(env.canvas);
  const oldStars = field.stars;
  env.canvas.clientWidth = 600;
  env.canvas.clientHeight = 300;
  env.view.devicePixelRatio = 3;
  env.emit('resize');
  assert.equal(field.width, 600);
  assert.equal(field.height, 300);
  assert.equal(env.canvas.width, 1800);
  assert.equal(env.canvas.height, 900);
  assert.notEqual(field.stars, oldStars);
  assert.equal(field.shootingStar.active, false);
  const resizedStars = field.stars;
  env.canvas.clientWidth = 0;
  env.emit('resize');
  assert.equal(field.width, 600);
  assert.equal(field.stars, resizedStars);
  assert.equal(env.frames.length, 1);
});

check('intrinsic sizing cannot grow the DPR backing store on repeated resize', () => {
  const env = fixture();
  Object.defineProperty(env.canvas, 'clientWidth', { get() { return this.width; } });
  Object.defineProperty(env.canvas, 'clientHeight', { get() { return this.height; } });
  assert.throws(() => new Starfield(env.canvas), /CSS width and height independently/);
  assert.equal(env.canvas.width, 300);
  assert.equal(env.canvas.height, 150);
  assert.equal(env.frames.length, 0);
  assert.equal(env.listeners.size, 0);

  const running = fixture();
  const field = new Starfield(running.canvas);
  const previousWidth = running.canvas.width;
  const previousHeight = running.canvas.height;
  Object.defineProperty(running.canvas, 'clientWidth', { get() { return this.width; } });
  Object.defineProperty(running.canvas, 'clientHeight', { get() { return this.height; } });
  for (let i = 0; i < 10; i++) running.emit('resize');
  assert.equal(running.canvas.width, previousWidth);
  assert.equal(running.canvas.height, previousHeight);
  assert.equal(field.width, 400);
  assert.equal(field.height, 240);
  assert.equal(running.frames.length, 1);
});

check('multiple instances own their configuration, particles, pointer, and frame chain', () => {
  const env = fixture();
  const canvasB = new env.Canvas();
  canvasB.rect.left = 600;
  canvasB.clientWidth = 200;
  canvasB.rect.width = 200;
  const a = new Starfield(env.canvas, { stars: { count: 3 } });
  const b = new Starfield(canvasB, { stars: { count: 5 }, glow: { enabled: false } });
  assert.notEqual(a.config, b.config);
  assert.notEqual(a.config.stars.colors, b.config.stars.colors);
  assert.notEqual(a.pointer, b.pointer);
  assert.notEqual(a.stars, b.stars);
  assert.notEqual(a.shootingStar, b.shootingStar);
  assert.equal(a.config.glow.enabled, true);
  assert.equal(b.config.glow.enabled, false);
  env.emit('mousemove', { clientX: 650, clientY: 260 });
  assert.equal(a.pointer.active, false);
  assert.equal(b.pointer.active, true);
  assert.equal(b.pointer.x, 50);
  assert.equal(b.pointer.normalizedX, -0.25);
  for (let i = 0; i < 100; i++) {
    env.step(i * 1000 / 60);
    assert.equal(env.frames.length, 2);
  }
  assert.equal(a.stars.length, 3);
  assert.equal(b.stars.length, 5);
  assert.deepEqual([...env.listeners.values()].map(entries => entries.length), [2, 2, 2]);
});

console.log(`\n${checks} API checks passed.`);
