import { test, expect } from 'vitest';
import { Starfield } from '../src/index.js';
import { createConfig } from '../src/config.js';
import { fixture } from '../scripts/helpers/browser-fixture.mjs';

test('reduced motion renders once without RAF and responds to preference changes', () => {
  const env = fixture(400, 240, 2, { reducedMotion: true });
  const field = new Starfield(env.canvas);
  expect(env.frames.size).toBe(0);
  expect(env.calls.some(c => c[0] === 'arc')).toBe(true);
  expect(field.elapsedTime).toBe(0);
  env.motion(false); expect(env.frames.size).toBe(1);
  env.step(1000); env.step(1016); expect(field.elapsedTime).toBe(16);
  env.motion(true); expect(env.frames.size).toBe(0);
  env.motion(false); env.step(999999); expect(field.elapsedTime).toBe(16);
  field.destroy(); expect(env.mediaListeners.size).toBe(0);
});
test('preference changes never resume manually stopped or hidden instances', () => {
  const env = fixture(400, 240, 2, { reducedMotion: false });
  const field = new Starfield(env.canvas); field.stop(); env.calls.length = 0;
  env.motion(true); env.motion(false); expect(env.frames.size).toBe(0); expect(env.calls.length).toBe(0);
  env.visibility(true); field.start(); env.motion(true); expect(env.calls.length).toBe(0);
  env.visibility(false); expect(env.frames.size).toBe(0); expect(env.calls.some(c => c[0] === 'arc')).toBe(true);
  field.destroy();
});
test('static fields redraw on configuration and size changes, with explicit opt-out supported', () => {
  const env = fixture(400, 240, 3, { reducedMotion: true });
  const field = new Starfield(env.canvas); env.calls.length = 0;
  field.updateConfig({ preset: 'deep-space' });
  expect(env.calls.filter(c => c[0] === 'arc').length).toBe(90);
  env.canvas.clientWidth = 500; env.resize(); expect(field.width).toBe(500); expect(env.frames.size).toBe(0);
  field.updateConfig({ accessibility: { respectReducedMotion: false } }); expect(env.frames.size).toBe(1);
  field.updateConfig({ accessibility: { respectReducedMotion: true } }); expect(env.frames.size).toBe(0);
  field.destroy();
});
test('DPR cap preserves native default, applies at runtime and defers while stopped', () => {
  const env = fixture(400, 240, 3);
  const field = new Starfield(env.canvas); expect(env.canvas.width).toBe(1200);
  const stars = field.stars;
  field.updateConfig({ rendering: { maxDpr: 2 } }); expect(env.canvas.width).toBe(800);
  expect(field.stars).toBe(stars);
  expect(field.width).toBe(400); expect(env.frames.size).toBe(1);
  field.stop().updateConfig({ rendering: { maxDpr: 1 } }); expect(env.canvas.width).toBe(800);
  field.start(); expect(env.canvas.width).toBe(400);
  field.updateConfig({ rendering: { maxDpr: null } }); expect(env.canvas.width).toBe(1200);
  field.updateConfig({ rendering: { maxDpr: 4 } }); expect(env.canvas.width).toBe(1200);
  field.destroy();
});
test('new configuration validates atomically and cleanup remains bounded for 100 media cycles', () => {
  for (const maxDpr of [0, -1, Infinity, NaN, '2']) expect(() => createConfig({ rendering: { maxDpr } })).toThrow();
  for (const value of [null, 0, 'true']) expect(() => createConfig({ accessibility: { respectReducedMotion: value } })).toThrow();
  const env = fixture(400, 240, 2, { reducedMotion: true });
  for (let i = 0; i < 100; i++) {
    const field = new Starfield(env.canvas, { stars: { count: 4 } }); env.motion(false); env.motion(true); field.destroy();
    env.calls.length = 0;
    expect(env.mediaListeners.size).toBe(0); expect(env.frames.size).toBe(0); expect(env.observers.size).toBe(0);
  }
});
