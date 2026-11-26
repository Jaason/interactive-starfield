import { test as check } from 'vitest';
// Focused preset checks; the full Vitest suite remains Milestone 5 work.
import assert from 'node:assert/strict';
import { Starfield } from '../src/index.js';
import { createConfig } from '../src/config.js';
import defaultConfig from '../src/defaultConfig.js';
import presets from '../src/presets.js';
import { fixture } from '../scripts/helpers/browser-fixture.mjs';


const names = ['default', 'deep-space', 'milky-way', 'constellation'];
function resources(env) {
  return {
    frames: env.frames.size,
    listeners: [...env.listeners.values()].map(list => list.length),
    visibility: env.documentListeners.get('visibilitychange')?.length ?? 0,
    observers: env.observers.size,
  };
}
function cleaned(env) {
  assert.deepEqual(resources(env), { frames: 0, listeners: [], visibility: 0, observers: 0 });
}

check('Default is exactly the existing configuration and preset metadata stays out of it', () => {
  assert.deepEqual(createConfig({ preset: 'default' }), defaultConfig);
  assert.deepEqual(createConfig({ preset: undefined }), createConfig());
  for (const preset of names) assert.equal(Object.hasOwn(createConfig({ preset }), 'preset'), false);
  assert.equal(typeof window, 'undefined');
  assert.equal(typeof document, 'undefined');
});

check('all preset definitions resolve to valid, distinct configurations', () => {
  assert.deepEqual(Object.keys(presets), names);
  const configurations = names.map(preset => createConfig({ preset }));
  assert.equal(new Set(configurations.map(config => JSON.stringify(config))).size, 4);
  assert.deepEqual(configurations.map(config => config.stars.count), [240, 90, 360, 180]);
  assert.deepEqual(configurations.map(config => config.generation.mode), ['galaxy', 'random', 'galaxy', 'random']);
  assert.deepEqual(configurations.map(config => config.connections.enabled), [true, false, false, true]);
  assert.equal(configurations[3].repulsion.enabled, false);
  assert.equal(configurations[2].galaxy.flattening, 0.22);
  for (const config of configurations) {
    assert.deepEqual(config.shootingStar, defaultConfig.shootingStar);
    assert.equal(config.twinkle.enabled, true);
    assert.equal(config.parallax.enabled, true);
    assert.equal(config.glow.enabled, true);
  }
});

check('user overrides win, undefined retains preset values, and arrays replace by copy', () => {
  const input = { preset: 'deep-space', stars: { count: 140, maxRadius: undefined, colors: ['1, 2, 3'] }, connections: { enabled: true } };
  const before = structuredClone(input);
  const config = createConfig(input);
  assert.equal(config.stars.count, 140);
  assert.equal(config.stars.maxRadius, 1.6);
  assert.equal(config.connections.enabled, true);
  assert.equal(config.connections.radius, defaultConfig.connections.radius);
  assert.deepEqual(config.stars.colors, ['1, 2, 3']);
  assert.notEqual(config.stars.colors, input.stars.colors);
  assert.deepEqual(input, before);
  input.stars.colors[0] = '4, 5, 6';
  assert.deepEqual(config.stars.colors, ['1, 2, 3']);
});

check('definitions, defaults, and resolved sections are immutable and never shared', () => {
  const before = JSON.stringify({ presets, defaultConfig });
  assert.ok(Object.isFrozen(presets));
  for (const preset of Object.values(presets)) {
    assert.ok(Object.isFrozen(preset));
    for (const section of Object.values(preset)) {
      assert.ok(Object.isFrozen(section));
      for (const value of Object.values(section)) if (Array.isArray(value)) assert.ok(Object.isFrozen(value));
    }
  }
  for (const name of names) {
    const a = createConfig({ preset: name });
    const b = createConfig({ preset: name });
    for (const key of Object.keys(a)) {
      assert.ok(Object.isFrozen(a[key]));
      assert.notEqual(a[key], b[key]);
      assert.notEqual(a[key], defaultConfig[key]);
      assert.notEqual(a[key], presets[name][key]);
    }
    assert.notEqual(a.stars.colors, b.stars.colors);
    assert.notEqual(a.stars.colors, defaultConfig.stars.colors);
    assert.notEqual(a.stars.colors, presets[name].stars?.colors);
    assert.throws(() => { a.stars.colors.push('1, 2, 3'); }, TypeError);
  }
  assert.throws(() => { presets['deep-space'].stars.count = 1; }, TypeError);
  assert.equal(JSON.stringify({ presets, defaultConfig }), before);
});

check('unknown names, inherited object keys, types, and misplaced preset options are rejected', () => {
  for (const preset of ['unknown', 'Default', '', '__proto__', 'constructor', 'toString', null, false, 1, [], {}, Symbol('default'), new String('default')]) {
    assert.throws(() => createConfig({ preset }), error => error instanceof TypeError && error.message.includes('preset'));
  }
  assert.throws(() => createConfig({ preset: 'default', stars: { preset: 'deep-space' } }), /stars.preset/);
  assert.throws(() => createConfig({ preset: 'default', bad: true }), /unknown option bad/);
  assert.throws(() => createConfig({ preset: 'deep-space', stars: { minSpeed: 7 } }), /minSpeed/);
  assert.doesNotThrow(() => createConfig({ preset: 'deep-space', stars: { minSpeed: 7, maxSpeed: 10 } }));
});

check('bad constructor presets leave the canvas and resource registrations unchanged', () => {
  const env = fixture();
  for (const options of [{ preset: 'unknown' }, { preset: null }, { preset: 'milky-way', stars: { count: -1 } }]) {
    assert.throws(() => new Starfield(env.canvas, options));
    cleaned(env);
    assert.equal(env.canvas.width, 300);
    assert.equal(env.canvas.height, 150);
  }
});

check('an explicit preset discards previous overrides and merges only the new patch', () => {
  const env = fixture();
  const field = new Starfield(env.canvas, {
    preset: 'deep-space', stars: { count: 140, colors: ['1, 2, 3'] }, shootingStar: { lineWidth: 4 },
  });
  field.updateConfig({ preset: 'constellation', glow: { enabled: false } });
  assert.deepEqual(field.config, createConfig({ preset: 'constellation', glow: { enabled: false } }));
  assert.equal(field.config.stars.count, 180);
  assert.equal(field.config.shootingStar.lineWidth, 1);
  field.updateConfig({ preset: 'default' });
  assert.deepEqual(field.config, defaultConfig);
  field.destroy();
  cleaned(env);
});

check('updates without a preset preserve the current base, including explicit undefined', () => {
  const env = fixture();
  const field = new Starfield(env.canvas, { preset: 'deep-space', stars: { count: 140 } });
  field.updateConfig({ glow: { enabled: false } });
  field.updateConfig({ preset: undefined, stars: { minSpeed: 0 } });
  assert.equal(field.config.stars.count, 140);
  assert.equal(field.config.stars.maxSpeed, 6);
  assert.equal(field.config.generation.mode, 'random');
  assert.equal(field.config.glow.enabled, false);
  field.destroy();
});

check('reselecting a preset resets overrides but an equal result does not regenerate stars', () => {
  const env = fixture();
  const field = new Starfield(env.canvas, { preset: 'deep-space', stars: { count: 140 } });
  const oldStars = field.stars;
  field.updateConfig({ preset: 'deep-space' });
  assert.equal(field.stars.length, 90);
  assert.notEqual(field.stars, oldStars);
  const config = field.config;
  const stars = field.stars;
  const callback = env.frames.values().next().value;
  field.updateConfig({ preset: 'deep-space', stars: { colors: [...config.stars.colors] } });
  assert.equal(field.config, config);
  assert.equal(field.stars, stars);
  assert.equal(env.frames.values().next().value, callback);
  field.destroy();
});

check('preset switching preserves clock, shooting-star state, and one running frame', () => {
  const env = fixture();
  const field = new Starfield(env.canvas);
  env.step(1000);
  env.step(1016);
  field.shootingStar.launch(field.width, field.height);
  const shooting = { ...field.shootingStar };
  const frame = env.frames.values().next().value;
  field.updateConfig({ preset: 'deep-space' });
  assert.equal(field.elapsedTime, 16);
  for (const key of Object.keys(shooting)) if (key !== 'config') assert.equal(field.shootingStar[key], shooting[key]);
  assert.equal(field.shootingStar.config, field.config);
  assert.equal(env.frames.size, 1);
  assert.equal(env.frames.values().next().value, frame);
  assert.ok(field.stars.every(star => star.config === field.config));
  field.destroy();
});

check('switches do not resume stopped or hidden instances and fail after destruction', () => {
  const env = fixture();
  const field = new Starfield(env.canvas).stop();
  env.calls.length = 0;
  field.updateConfig({ preset: 'milky-way' });
  assert.equal(env.frames.size, 0);
  assert.equal(env.calls.length, 0);
  env.visibility(true);
  field.start();
  field.updateConfig({ preset: 'constellation' });
  assert.equal(env.frames.size, 0);
  env.visibility(false);
  assert.equal(env.frames.size, 1);
  field.stop();
  env.visibility(true);
  field.updateConfig({ preset: 'default' });
  env.visibility(false);
  assert.equal(env.frames.size, 0);
  field.destroy();
  assert.throws(() => field.updateConfig({ preset: 'default' }), /destroyed instance/);
  cleaned(env);
});

check('invalid switches and failed particle generation are atomic', () => {
  const env = fixture();
  const field = new Starfield(env.canvas, { preset: 'deep-space' });
  const config = field.config;
  const stars = field.stars;
  const before = resources(env);
  for (const patch of [{ preset: null }, { preset: 'toString' }, { preset: 'milky-way', stars: { count: -1 } }]) {
    assert.throws(() => field.updateConfig(patch));
    assert.equal(field.config, config);
    assert.equal(field.stars, stars);
    assert.deepEqual(resources(env), before);
  }
  const random = Math.random;
  try {
    Math.random = () => { throw new Error('Particle creation failed'); };
    assert.throws(() => field.updateConfig({ preset: 'milky-way' }), /Particle creation failed/);
  } finally { Math.random = random; }
  assert.equal(field.config, config);
  assert.equal(field.stars, stars);
  assert.deepEqual(resources(env), before);
  field.destroy();
});

check('100 switches preserve independent instances and bounded resource registrations', () => {
  const env = fixture();
  const a = new Starfield(env.canvas, { preset: 'deep-space' });
  const b = new Starfield(new env.Canvas(), { preset: 'constellation', stars: { count: 25 } });
  const otherConfig = b.config;
  const otherStars = b.stars;
  const before = resources(env);
  const definitions = JSON.stringify({ presets, defaultConfig });
  for (let i = 0; i < 100; i++) {
    const preset = names[i % names.length];
    a.updateConfig({ preset });
    env.step(i * 16);
    assert.equal(a.stars.length, createConfig({ preset }).stars.count);
    assert.deepEqual(resources(env), before);
    assert.equal(b.config, otherConfig);
    assert.equal(b.stars, otherStars);
  }
  assert.equal(JSON.stringify({ presets, defaultConfig }), definitions);
  a.destroy();
  assert.equal(env.frames.size, 1);
  b.destroy();
  cleaned(env);
});

