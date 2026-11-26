// Run with a local demo server and Chrome remote debugging on port 9228.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { CDP, browser } from './helpers/cdp.mjs';
const url = process.argv[2] ?? 'http://127.0.0.1:5173/';
const targets = [];
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const instrumentation = `
window.__frames = new Set();
const request = window.requestAnimationFrame.bind(window), cancel = window.cancelAnimationFrame.bind(window);
window.requestAnimationFrame = callback => { const id = request(time => { __frames.delete(id); callback(time); }); __frames.add(id); return id; };
window.cancelAnimationFrame = id => { __frames.delete(id); cancel(id); };
window.__listeners = { window: new Map(), document: new Map() };
for (const [name, target] of [['window', window], ['document', document]]) {
 const add = target.addEventListener.bind(target), remove = target.removeEventListener.bind(target);
 target.addEventListener = (type, callback, options) => {
  const set = __listeners[name].get(type) ?? new Set(); set.add(callback); __listeners[name].set(type, set);
  options?.signal?.addEventListener('abort', () => { set.delete(callback); if (!set.size) __listeners[name].delete(type); }, { once: true });
  add(type, callback, options);
 };
 target.removeEventListener = (type, callback, options) => {
  const set = __listeners[name].get(type); set?.delete(callback); if (!set?.size) __listeners[name].delete(type); remove(type, callback, options);
 };
}
window.__observers = new Set();
const NativeObserver = ResizeObserver;
window.ResizeObserver = class extends NativeObserver {
 observe(...args) { super.observe(...args); __observers.add(this); }
 disconnect() { super.disconnect(); __observers.delete(this); }
};
window.__resources = () => ({ frames: __frames.size, observers: __observers.size,
 window: Object.fromEntries([...__listeners.window].map(([key, set]) => [key, set.size])),
 document: Object.fromEntries([...__listeners.document].map(([key, set]) => [key, set.size])) });
`;
async function page(width, height) {
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
  const list = await (await fetch('http://127.0.0.1:9228/json/list')).json();
  const c = await CDP.connect(list.find(target => target.id === targetId).webSocketDebuggerUrl);
  targets.push({ targetId, c });
  await c.send('Page.enable'); await c.send('Runtime.enable');
  await c.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 800 });
  await c.send('Page.addScriptToEvaluateOnNewDocument', { source: instrumentation });
  await c.send('Page.navigate', { url }); await c.send('Page.bringToFront');
  for (let i = 0; i < 100; i++) {
    if (await c.evaluate('!!document.querySelector("#playback") && !document.querySelector("#playback").disabled')) return c;
    await wait(50);
  }
  throw new Error(`Demo initialization failed: ${JSON.stringify(c.errors)}`);
}
const set = (c, selector, value, event = 'change') => c.evaluate(`(() => { const input = document.querySelector(${JSON.stringify(selector)}); input.value = ${JSON.stringify(String(value))}; input.dispatchEvent(new Event(${JSON.stringify(event)}, { bubbles: true })); })()`);
const click = (c, selector) => c.evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
async function exported(c) {
  await click(c, '#open-code'); await set(c, '#code-format', 'json');
  assert.equal(await c.evaluate('document.querySelector("#code-dialog").open'), true);
  const config = await c.evaluate('JSON.parse(document.querySelector("#code-output").value)');
  await click(c, '#close-code'); return config;
}
const report = { url, checks: [] };
try {
  const c = await page(1440, 900);
  await wait(600);
  const resources = await c.evaluate('__resources()');
  assert.equal(resources.frames, 2); assert.equal(resources.observers, 1);
  assert.equal(await c.evaluate('document.querySelector("#controls").hidden'), false);
  assert.equal((await exported(c)).stars.count, 240);
  await writeFile('/private/tmp/starfield-demo-desktop.png', Buffer.from((await c.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  report.checks.push('Initial configuration, desktop layout and two bounded RAF loops');

  for (const [preset, count] of [['deep-space', 90], ['milky-way', 360], ['constellation', 180], ['default', 240]]) {
    await set(c, '#preset', preset);
    const config = await exported(c); assert.equal(config.stars.count, count); assert.equal(config.preset, undefined);
  }
  await set(c, '#stars-count', 310);
  assert.equal((await exported(c)).stars.count, 310);
  assert.equal(await c.evaluate('document.querySelector("#custom-label").hidden'), false);
  await set(c, '#stars-count', 240);
  assert.equal(await c.evaluate('document.querySelector("#custom-label").hidden'), true);
  await set(c, '#stars-minSpeed', 40);
  assert.equal(await c.evaluate('document.querySelector("#notice").hidden'), false);
  await set(c, '#stars-maxSpeed', 50);
  assert.equal((await exported(c)).stars.minSpeed, 40);
  await click(c, '#reset'); assert.equal((await exported(c)).stars.count, 240);
  await click(c, '#add-color'); assert.equal((await exported(c)).stars.colors.length, 4);
  await click(c, '[data-remove-color="3"]'); assert.equal((await exported(c)).stars.colors.length, 3);
  report.checks.push('Presets, copied JSON, overrides, range validation, reset and palette editing');

  await click(c, '#playback'); assert.equal(await c.evaluate('__frames.size'), 0);
  for (let i = 0; i < 100; i++) await set(c, '#preset', ['deep-space', 'milky-way', 'constellation', 'default'][i % 4]);
  assert.equal(await c.evaluate('__frames.size'), 0);
  await click(c, '#playback'); await wait(100);
  assert.deepEqual(await c.evaluate('__resources()'), resources);
  await c.evaluate(`window.__moves = 0; window.addEventListener('mousemove', () => __moves++);
    document.querySelector('#controls').dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 1200, clientY: 200 }));`);
  assert.equal(await c.evaluate('__moves'), 0);
  await c.evaluate("document.body.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 700, clientY: 400 }))");
  assert.equal(await c.evaluate('__moves'), 1);
  report.checks.push('100 paused switches retain resources; UI movement does not reach canvas listeners');

  await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await wait(150); assert.equal(await c.evaluate('__frames.size'), 0);
  assert.equal(await c.evaluate('document.querySelector("#playback-status").textContent'), 'Reduced motion');
  await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await wait(150); assert.equal(await c.evaluate('__frames.size'), 2);
  await click(c, '#open-code');
  await c.evaluate(`Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async value => { window.__copied = value; } } })`);
  await click(c, '#copy-code'); await wait(50); assert.equal(await c.evaluate('typeof __copied'), 'string');
  await c.evaluate(`Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw Error('Denied'); } } })`);
  await click(c, '#copy-code'); await wait(50);
  assert.equal(await c.evaluate('document.querySelector("#code-output").selectionStart'), 0);
  assert.ok((await c.evaluate('document.querySelector("#copy-status").textContent')).includes('manually'));
  await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  assert.equal(await c.evaluate('document.querySelector("#code-dialog").open'), false);
  assert.equal(await c.evaluate('document.activeElement.id'), 'open-code');
  report.checks.push('Reduced motion, clipboard success/fallback and Escape focus restoration');

  const beforeHide = await c.evaluate('__resources()');
  await c.evaluate("window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }))");
  assert.equal(await c.evaluate('__frames.size'), 0); assert.equal(await c.evaluate('__observers.size'), 0);
  await c.evaluate("window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))");
  await wait(100); assert.deepEqual(await c.evaluate('__resources()'), beforeHide);
  report.checks.push('Simulated pagehide/pageshow cleanup and restoration');

  const mobile = await page(390, 844);
  await wait(150); assert.equal(await c.evaluate('__frames.size'), 0); // Native background tab suspension.
  assert.equal(await mobile.evaluate('document.querySelector("#controls").hidden'), true);
  assert.equal(await mobile.evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  await writeFile('/private/tmp/starfield-demo-mobile.png', Buffer.from((await mobile.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  await click(mobile, '#toggle-controls'); assert.equal(await mobile.evaluate('document.activeElement.id'), 'preset');
  await set(mobile, '#preset', 'deep-space');
  await writeFile('/private/tmp/starfield-demo-mobile-panel.png', Buffer.from((await mobile.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  assert.equal(await mobile.evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  await click(mobile, '#close-controls'); assert.equal(await mobile.evaluate('document.activeElement.id'), 'toggle-controls');
  await mobile.evaluate('document.querySelector(".brand").focus()');
  await mobile.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await mobile.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  assert.equal(await mobile.evaluate('document.activeElement.textContent'), 'Benchmark');
  await mobile.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: 500 }] });
  await mobile.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 220, y: 520 }] });
  await mobile.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.equal(mobile.errors.length, 0); assert.equal(c.errors.length, 0);
  report.checks.push('390px layout, mobile sheet/focus, keyboard, emulated touch and real tab hiding');
  const benchmarkURL = await mobile.evaluate('document.querySelector("nav a").href');
  await mobile.send('Page.navigate', { url: benchmarkURL }); await wait(1000);
  assert.equal(await mobile.evaluate('!!window.starfieldBenchmark'), true);
  assert.equal(mobile.errors.length, 0);
  report.checks.push('Relative benchmark link loads its working page');
  console.log(JSON.stringify(report, null, 2));
} finally {
  for (const { targetId, c } of targets) { await browser.send('Target.closeTarget', { targetId }); c.socket.close(); }
  browser.socket.close();
}
