import { afterEach, test, expect, vi } from 'vitest';
import { createUpdateQueue, configurationCode, hexToRgb, rgbToHex } from '../demo/controls.js';
import { createFrameMeter } from '../demo/frame-meter.js';
import { createConfig } from '../src/config.js';

afterEach(() => vi.useRealTimers());
test('slider updates merge into one bounded patch and flush on release', () => {
  vi.useFakeTimers();
  const apply = vi.fn(() => true);
  const queue = createUpdateQueue(apply);
  for (let count = 1; count <= 100; count++) queue.queue('stars', 'count', count);
  queue.queue('stars', 'maxSpeed', 30);
  queue.queue('glow', 'enabled', false);
  expect(vi.getTimerCount()).toBe(1);
  vi.advanceTimersByTime(120);
  expect(apply).toHaveBeenCalledExactlyOnceWith({ stars: { count: 100, maxSpeed: 30 }, glow: { enabled: false } });
  queue.queue('stars', 'count', 120);
  queue.flush();
  expect(vi.getTimerCount()).toBe(0);
  expect(apply).toHaveBeenCalledTimes(2);
});
test('invalid patches can be corrected together and discarded on reset or teardown', () => {
  vi.useFakeTimers();
  let config = createConfig();
  const queue = createUpdateQueue(patch => {
    try { config = createConfig(patch, config); return true; } catch { return false; }
  });
  queue.queue('stars', 'minSpeed', 30);
  expect(queue.flush()).toBe(false);
  expect(config.stars.minSpeed).toBe(8);
  queue.queue('stars', 'maxSpeed', 40);
  expect(queue.flush()).toBe(true);
  expect(config.stars.minSpeed).toBe(30);
  queue.queue('stars', 'count', 1000); queue.clear();
  vi.runAllTimers(); expect(config.stars.count).toBe(240);
});
test('copied configuration round-trips without preset reset semantics', () => {
  const config = createConfig({ preset: 'milky-way', stars: { count: 310 } });
  const json = JSON.parse(configurationCode(config, 'json'));
  expect(createConfig(json)).toEqual(config);
  expect(json).not.toHaveProperty('preset');
  expect(configurationCode(config, 'javascript')).toContain('new Starfield');
  expect(configurationCode(config, 'setup')).not.toContain('npm install interactive-starfield');
});
test('color controls preserve the preset RGB palettes', () => {
  for (const preset of ['default', 'deep-space', 'milky-way', 'constellation']) {
    for (const rgb of createConfig({ preset }).stars.colors) expect(hexToRgb(rgbToHex(rgb))).toBe(rgb);
  }
});
test('FPS meter keeps one callback, ignores stale callbacks, and stops with frame ID zero', () => {
  const frames = new Map(); let id = 0;
  const report = vi.fn();
  const meter = createFrameMeter(callback => { frames.set(id, callback); return id++; }, key => frames.delete(key), report);
  meter.start(); const stale = frames.get(0); meter.start(); expect(frames.size).toBe(1);
  meter.stop(); expect(frames.size).toBe(0);
  meter.start(); stale(1000); expect(frames.size).toBe(1);
  for (let i = 0; i <= 60; i++) { const [key, callback] = frames.entries().next().value; frames.delete(key); callback(i * 1000 / 60); }
  expect(report.mock.calls.some(([fps]) => fps === 60)).toBe(true);
  meter.stop(); expect(frames.size).toBe(0); expect(report).toHaveBeenLastCalledWith(null);
});
