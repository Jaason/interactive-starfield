import { test, expect } from 'vitest';
import Star from '../src/Star.js';
import { Starfield } from '../src/index.js';
import { createConfig } from '../src/config.js';
import { fixture } from '../scripts/helpers/browser-fixture.mjs';
import { Samples } from '../benchmark/metrics.js';

function stationary(friction = .9) {
  const star = new Star(400, 240, createConfig({ repulsion: { friction } }),
    { active: true, x: 100, y: 100, normalizedX: .3, normalizedY: -.2 });
  Object.assign(star, { x: 125, y: 100, vx: 0, vy: 0, offsetX: 10, offsetY: 5 });
  return star;
}
test('repulsion preserves the 60 Hz recurrence and zero delta does not move it', () => {
  const star = stationary();
  star.update(400, 240, 0);
  expect([star.offsetX, star.offsetY]).toEqual([10, 5]);
  star.update(400, 240, 1 / 60);
  expect(star.offsetX).toBeCloseTo((10 + 11) * .9, 12);
  expect(star.offsetY).toBeCloseTo(4.5, 12);
});
test.each([0, .5, .9, .999])('stationary force is consistent at 30/60/120/144 Hz, friction %s', friction => {
  const states = [30, 60, 120, 144].map(hz => {
    const star = stationary(friction);
    for (let i = 0; i < hz * 2; i++) star.update(400, 240, 1 / hz);
    return [star.offsetX, star.offsetY];
  });
  for (const [x, y] of states) { expect(x).toBeCloseTo(states[0][0], 8); expect(y).toBeCloseTo(states[0][1], 8); }
});
test('drift and wrapping remain finite across refresh rates and the pointer center', () => {
  for (const hz of [30, 60, 120, 144]) {
    const star = stationary(); Object.assign(star, { x: 100, y: 100, vx: 2, vy: 3 });
    for (let i = 0; i < hz; i++) star.update(400, 240, 1 / hz);
    expect(star.x).toBeCloseTo(102, 9); expect(star.y).toBeCloseTo(103, 9);
    expect(Number.isFinite(star.offsetX)).toBe(true);
    Object.assign(star, { x: 411, y: -11 }); star.update(400, 240, 0);
    expect([star.x, star.y]).toEqual([-10, 250]);
  }
});
test('connections meet rendered star centers after parallax and repulsion', () => {
  const env = fixture();
  const field = new Starfield(env.canvas, { stars: { count: 2 }, connections: { radius: 200, mouseRadius: 300 } });
  Object.assign(field.pointer, { x: 100, y: 100, normalizedX: .4, normalizedY: -.2 });
  Object.assign(field.stars[0], { x: 100, y: 100, offsetX: 20, offsetY: 10 });
  Object.assign(field.stars[1], { x: 140, y: 120, offsetX: -5, offsetY: -10 });
  env.calls.length = 0; field._render();
  const centers = env.calls.filter(c => c[0] === 'arc').map(c => c.slice(1, 3));
  expect(env.calls.find(c => c[0] === 'moveTo').slice(1)).toEqual(centers[0]);
  expect(env.calls.find(c => c[0] === 'lineTo').slice(1)).toEqual(centers[1]);
  const scratch = field._nearbyStars;
  field._render(); expect(field._nearbyStars).toBe(scratch);
  field.stop().updateConfig({ stars: { count: 0 } }); expect(scratch.length).toBe(0);
  field.destroy();
});
test.each(['random', 'galaxy'])('generation %s respects finite position, radius, speed and color bounds', mode => {
  const config = createConfig({ generation: { mode } });
  for (let i = 0; i < 500; i++) {
    const star = new Star(400, 240, config, { active: false });
    expect(Number.isFinite(star.x + star.y)).toBe(true);
    expect(star.x).toBeGreaterThanOrEqual(0); expect(star.x).toBeLessThanOrEqual(400);
    expect(star.y).toBeGreaterThanOrEqual(0); expect(star.y).toBeLessThanOrEqual(240);
    expect(star.radius).toBeGreaterThanOrEqual(.5); expect(star.radius).toBeLessThanOrEqual(2);
    const speed = Math.hypot(star.vx, star.vy) / star.depth;
    expect(speed).toBeGreaterThanOrEqual(8); expect(speed).toBeLessThanOrEqual(18);
    expect(config.stars.colors).toContain(star.color);
  }
});
test('benchmark samples retain bounded storage and lifetime aggregates', () => {
  const samples = new Samples(10);
  for (let i = 1; i <= 100; i++) samples.add(i);
  expect(samples.values.length).toBe(10);
  expect(samples.summary()).toEqual({ count: 100, mean: 50.5, max: 100, windowP95: 100, windowP99: 100 });
});
