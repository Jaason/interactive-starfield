import { test as check } from 'vitest';
import assert from 'node:assert/strict';
import { Starfield } from '../src/index.js';
import { fixture } from '../scripts/helpers/browser-fixture.mjs';


const options = { stars: { count: 4 }, repulsion: { enabled: false } };
const firstFrame = env => env.frames.values().next().value;
function emptyResources(env) {
  assert.equal(env.frames.size, 0);
  assert.equal(env.listeners.size, 0);
  assert.equal(env.documentListeners.size, 0);
  assert.equal(env.observers.size, 0);
}

check('start/stop are idempotent, including frame ID zero and stale callbacks', () => {
  const env = fixture();
  const field = new Starfield(env.canvas, options);
  assert.ok(env.frames.has(0));
  const stale = firstFrame(env);
  const stars = field.stars;
  for (let i = 0; i < 100; i++) assert.equal(field.start(), field);
  assert.equal(env.frames.size, 1);
  env.step(1000);
  env.step(1016);
  assert.equal(field.elapsedTime, 16);
  assert.equal(field.stop(), field);
  assert.equal(field.stop(), field);
  assert.equal(env.frames.size, 0);
  assert.equal(env.calls.length, 0); // stop leaves the last image intact.
  stale(5000);
  assert.equal(field.elapsedTime, 16);
  field.start();
  const current = firstFrame(env);
  stale(9000);
  assert.equal(firstFrame(env), current);
  assert.equal(env.frames.size, 1);
  env.step(10000);
  assert.equal(field.elapsedTime, 16);
  assert.equal(field.stars, stars);
  env.step(10016);
  assert.equal(field.elapsedTime, 32);
  field.destroy();
  emptyResources(env);
});

check('100 start/stop cycles keep exactly one frame and fixed registrations', () => {
  const env = fixture();
  const field = new Starfield(env.canvas, options);
  for (let i = 0; i < 100; i++) {
    field.stop().stop();
    assert.equal(env.frames.size, 0);
    field.start().start();
    assert.equal(env.frames.size, 1);
    env.step(i * 1000);
    assert.equal(env.frames.size, 1);
    assert.deepEqual([...env.listeners.values()].map(handlers => handlers.length), [1, 1, 1]);
    assert.equal(env.documentListeners.get('visibilitychange').length, 1);
    assert.equal(env.observers.size, 1);
  }
  field.destroy();
  emptyResources(env);
});

check('visibility pauses the whole clock and never overrides manual stop', () => {
  const env = fixture();
  const field = new Starfield(env.canvas, options);
  env.step(90000);
  env.step(90016);
  const stale = firstFrame(env);
  const positions = field.stars.map(star => [star.x, star.y]);
  env.visibility(true);
  assert.equal(env.frames.size, 0);
  stale(999999);
  assert.equal(field.elapsedTime, 16);
  env.visibility(false);
  assert.equal(env.frames.size, 1);
  env.step(1000000);
  assert.equal(field.elapsedTime, 16);
  assert.deepEqual(field.stars.map(star => [star.x, star.y]), positions);
  field.stop();
  env.visibility(true);
  env.visibility(false);
  assert.equal(env.frames.size, 0);
  field.destroy();
  emptyResources(env);
});

check('initially hidden documents start only when visible and explicitly requested', () => {
  const env = fixture(400, 240, 2, { hidden: true });
  const field = new Starfield(env.canvas, options);
  assert.equal(env.frames.size, 0);
  field.start();
  assert.equal(env.frames.size, 0);
  env.visibility(false);
  assert.equal(env.frames.size, 1);
  env.step(100000);
  assert.equal(field.elapsedTime, 0);
  assert.equal(field.shootingStar.active, false);
  field.destroy();
  emptyResources(env);
});

check('delayed callbacks are capped at 50 ms and negative deltas do not reverse time', () => {
  const env = fixture();
  const field = new Starfield(env.canvas, options);
  env.step(1000);
  const x = field.stars[0].x;
  const vx = field.stars[0].vx;
  env.step(100000);
  assert.equal(field.elapsedTime, 50);
  assert.ok(Math.abs(field.stars[0].x - x - vx * 0.05) < 1e-10);
  env.step(99999);
  assert.equal(field.elapsedTime, 50);
  field.destroy();
});

check('shooting stars launch after active time and preserve an active trail across pause', () => {
  const env = fixture(1000, 600, 1);
  const field = new Starfield(env.canvas, { stars: { count: 0 } });
  env.step(90000);
  for (let i = 1; i <= 500; i++) env.step(90000 + i * 16);
  assert.equal(field.elapsedTime, 8000);
  assert.equal(field.shootingStar.active, false);
  env.step(98016);
  assert.equal(field.lastShootingStarTime, 8016);
  assert.equal(field.shootingStar.active, true);
  const shooting = { ...field.shootingStar };
  field.stop().start();
  env.step(200000);
  assert.deepEqual(field.shootingStar, Object.assign(Object.create(Object.getPrototypeOf(field.shootingStar)), shooting));
  field.destroy();
});

check('observer/window notifications coalesce unchanged sizes and react to DPR changes', () => {
  const env = fixture();
  const field = new Starfield(env.canvas, options);
  const stars = field.stars;
  env.resize();
  env.emit('resize');
  assert.equal(field.stars, stars);
  env.canvas.clientWidth = 500;
  env.resize();
  assert.equal(field.width, 500);
  assert.equal(env.canvas.width, 1000);
  assert.notEqual(field.stars, stars);
  const resized = field.stars;
  env.emit('resize');
  assert.equal(field.stars, resized);
  env.view.devicePixelRatio = 3;
  env.emit('resize');
  assert.equal(env.canvas.width, 1500);
  assert.equal(env.frames.size, 1);
  field.destroy();
});

check('stopped and hidden resize is deferred until playback can resume', () => {
  const env = fixture();
  const field = new Starfield(env.canvas, options);
  field.stop();
  env.calls.length = 0;
  const stars = field.stars;
  env.canvas.clientWidth = 550;
  env.resize();
  env.emit('resize');
  assert.equal(field.width, 400);
  assert.equal(env.canvas.width, 800);
  assert.equal(env.calls.length, 0);
  assert.equal(field.stars, stars);
  env.visibility(true);
  field.start();
  assert.equal(env.frames.size, 0);
  assert.equal(field.width, 400);
  env.visibility(false);
  assert.equal(field.width, 550);
  assert.equal(env.canvas.width, 1100);
  assert.equal(env.frames.size, 1);
  field.destroy();
});

check('zero size suspends and recovers without a time jump or overriding stop', () => {
  const env = fixture();
  const field = new Starfield(env.canvas, options);
  env.step(100);
  env.step(116);
  env.canvas.clientWidth = 0;
  env.resize();
  assert.equal(env.frames.size, 0);
  env.canvas.clientWidth = 400;
  env.resize();
  assert.equal(env.frames.size, 1);
  env.step(50000);
  assert.equal(field.elapsedTime, 16);
  field.stop();
  env.canvas.clientWidth = 0;
  env.resize();
  env.canvas.clientWidth = 400;
  env.resize();
  assert.equal(env.frames.size, 0);
  field.destroy();
});

check('window resize remains available without ResizeObserver', () => {
  const env = fixture(400, 240, 2, { observer: false });
  const field = new Starfield(env.canvas, options);
  env.canvas.clientHeight = 300;
  env.emit('resize');
  assert.equal(field.height, 300);
  assert.equal(env.observers.size, 0);
  field.destroy();
  emptyResources(env);
});

check('updates merge into current configuration, copy input, and keep visual-only particles', () => {
  const env = fixture();
  const field = new Starfield(env.canvas, { stars: { count: 7 } });
  const stars = field.stars;
  const shooting = field.shootingStar;
  const frame = firstFrame(env);
  const patch = { glow: { enabled: false }, twinkle: { strength: 0.2 } };
  assert.equal(field.updateConfig(patch), field);
  patch.twinkle.strength = 1;
  assert.equal(field.config.stars.count, 7);
  assert.equal(field.config.twinkle.strength, 0.2);
  assert.equal(field.stars, stars);
  assert.equal(field.shootingStar, shooting);
  assert.equal(firstFrame(env), frame);
  assert.ok(field.stars.every(star => star.config === field.config));
  assert.equal(shooting.config, field.config);
  assert.ok(Object.isFrozen(field.config.twinkle));
  field.destroy();
});

check('empty/equal patches are no-ops, including arrays and explicit undefined', () => {
  const env = fixture();
  const field = new Starfield(env.canvas, options);
  const config = field.config;
  const stars = field.stars;
  field.updateConfig().updateConfig({}).updateConfig({ stars: undefined });
  field.updateConfig({ stars: { count: undefined, colors: [...field.config.stars.colors] } });
  field.updateConfig({ stars: { count: 4 } });
  assert.equal(field.config, config);
  assert.equal(field.stars, stars);
  field.destroy();
});

check('structural updates regenerate stars while stopped without drawing or starting', () => {
  const env = fixture();
  const field = new Starfield(env.canvas, options).stop();
  env.calls.length = 0;
  let previous = field.stars;
  for (const patch of [{ stars: { count: 9 } }, { stars: { colors: ['1, 2, 3'] } },
    { stars: { minSpeed: 0 } }, { generation: { mode: 'random' } }, { galaxy: { spread: 0.2 } }]) {
    field.updateConfig(patch);
    assert.notEqual(field.stars, previous);
    previous = field.stars;
    assert.equal(env.frames.size, 0);
    assert.equal(env.calls.length, 0);
  }
  assert.equal(field.stars.length, 9);
  assert.ok(field.stars.every(star => star.color === '1, 2, 3'));
  field.destroy();
});

check('invalid patches and particle construction failure leave all state unchanged', () => {
  const env = fixture();
  const field = new Starfield(env.canvas, options);
  const config = field.config;
  const stars = field.stars;
  const frame = firstFrame(env);
  for (const patch of [null, { stars: { count: -1 } }, { bad: true }, { stars: { minSpeed: 100 } }]) {
    assert.throws(() => field.updateConfig(patch));
    assert.equal(field.config, config);
    assert.equal(field.stars, stars);
    assert.equal(firstFrame(env), frame);
  }
  const random = Math.random;
  try {
    Math.random = () => { throw new Error('Particle creation failed'); };
    assert.throws(() => field.updateConfig({ stars: { count: 5 } }), /Particle creation failed/);
  } finally { Math.random = random; }
  assert.equal(field.config, config);
  assert.equal(field.stars, stars);
  assert.equal(firstFrame(env), frame);
  field.destroy();
});

check('shooting speed updates affect the next launch, line width applies immediately', () => {
  const env = fixture();
  const field = new Starfield(env.canvas, options);
  field.shootingStar.launch(field.width, field.height);
  const speed = field.shootingStar.speed;
  field.updateConfig({ shootingStar: { minSpeed: 100, maxSpeed: 100, lineWidth: 2 } });
  assert.equal(field.shootingStar.speed, speed);
  assert.equal(field.shootingStar.active, true);
  assert.equal(field.shootingStar.config.shootingStar.lineWidth, 2);
  field.shootingStar.launch(field.width, field.height);
  assert.equal(field.shootingStar.speed, 100);
  field.destroy();
});

check('100 configuration changes and resizes keep bounded particles and registrations', () => {
  const env = fixture();
  const field = new Starfield(env.canvas, options);
  for (let i = 0; i < 100; i++) {
    const count = 3 + i % 5;
    field.updateConfig({ stars: { count }, glow: { enabled: i % 2 === 0 } });
    env.canvas.clientWidth = 400 + i;
    env.resize();
    env.emit('resize');
    assert.equal(field.stars.length, count);
    assert.equal(env.frames.size, 1);
    assert.equal(env.observers.size, 1);
    assert.deepEqual([...env.listeners.values()].map(handlers => handlers.length), [1, 1, 1]);
  }
  field.destroy();
  emptyResources(env);
});

check('destroy clears rendering, releases references, and guards queued handlers', () => {
  const env = fixture();
  const field = new Starfield(env.canvas, options);
  const staleFrame = firstFrame(env);
  const staleResize = field._onResize;
  const staleMouse = field._onMouseMove;
  const staleTouch = field._onTouchMove;
  const staleVisibility = field._onVisibility;
  const stars = field.stars;
  const size = [env.canvas.width, env.canvas.height];
  field.destroy();
  emptyResources(env);
  assert.equal(stars.length, 0);
  assert.ok(env.calls.some(call => call[0] === 'clearRect' && call[3] === size[0] && call[4] === size[1]));
  assert.deepEqual([env.canvas.width, env.canvas.height], size);
  for (const key of ['canvas', 'ctx', 'view', 'document', 'config', 'stars', 'pointer',
    'shootingStar', '_observer', '_frameCallback', '_onResize', '_onMouseMove', '_onTouchMove', '_onVisibility']) {
    assert.equal(field[key], null, key);
  }
  assert.doesNotThrow(() => { staleFrame(999); staleResize(); staleMouse({}); staleTouch({}); staleVisibility(); });
  assert.doesNotThrow(() => field.destroy());
  assert.equal(field.stop(), field);
  assert.throws(() => field.start(), /destroyed instance/);
  assert.throws(() => field.updateConfig({}), /destroyed instance/);
  emptyResources(env);
});

check('100 construct/destroy cycles reuse the same canvas without accumulating resources', () => {
  const env = fixture();
  for (let i = 0; i < 100; i++) {
    const field = new Starfield(env.canvas, options);
    env.step(i * 16);
    field.destroy();
    emptyResources(env);
    env.calls.length = 0;
  }
});

check('partial listener and observer initialization failures roll back resources', () => {
  for (const failure of ['listener', 'document listener', 'observer constructor', 'observe', 'frame']) {
    const env = fixture();
    if (failure === 'listener') {
      const add = env.view.addEventListener;
      env.view.addEventListener = (...args) => { add(...args); if (args[0] === 'touchmove') throw new Error(failure); };
    } else if (failure === 'document listener') {
      const add = env.document.addEventListener;
      env.document.addEventListener = (...args) => { add(...args); throw new Error(failure); };
    } else if (failure === 'observer constructor') {
      env.view.ResizeObserver = class { constructor() { throw new Error(failure); } };
    } else if (failure === 'observe') {
      const Original = env.view.ResizeObserver;
      env.view.ResizeObserver = class extends Original { observe(target) { super.observe(target); throw new Error(failure); } };
    } else {
      env.view.requestAnimationFrame = () => { throw new Error(failure); };
    }
    assert.throws(() => new Starfield(env.canvas, options), error => error.message === failure);
    emptyResources(env);
  }
});

check('stopping, configuring, and destroying one instance does not affect another', () => {
  const env = fixture();
  const a = new Starfield(env.canvas, options);
  const b = new Starfield(new env.Canvas(), options);
  a.stop().updateConfig({ stars: { count: 8 } });
  assert.equal(env.frames.size, 1);
  assert.equal(b.stars.length, 4);
  a.destroy();
  assert.equal(env.observers.size, 1);
  env.step(0);
  env.step(16);
  assert.equal(b.elapsedTime, 16);
  assert.equal(env.frames.size, 1);
  b.destroy();
  emptyResources(env);
});

