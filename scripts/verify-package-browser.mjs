// First run verify:package; install react/react-dom only in its printed consumer directory.
// Requires a dedicated Chrome debugging session on localhost:9228.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { build, createServer, preview } from 'vite';
import { CDP, browser } from './helpers/cdp.mjs';

if (!process.argv[2]) { browser.socket.close(); throw Error('Pass the external consumer directory from verify:package.'); }
const root = resolve(process.argv[2]);
const targets = [];
const servers = [];
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const entries = ['index.html', 'typed.html', 'umd.html', 'react.html'];
const instrumentation = `
window.framesPending = new Set();
const request = requestAnimationFrame.bind(window), cancel = cancelAnimationFrame.bind(window);
window.requestAnimationFrame = callback => { const id = request(time => { framesPending.delete(id); callback(time); }); framesPending.add(id); return id; };
window.cancelAnimationFrame = id => { framesPending.delete(id); cancel(id); };
window.observers = new Set();
const Observer = ResizeObserver;
window.ResizeObserver = class extends Observer {
  observe(...args) { super.observe(...args); observers.add(this); }
  disconnect() { super.disconnect(); observers.delete(this); }
};
window.handlers = new Set();
function track(target, types) {
  const add = target.addEventListener.bind(target), remove = target.removeEventListener.bind(target);
  target.addEventListener = (type, fn, options) => { if (types.includes(type)) handlers.add(fn); add(type, fn, options); };
  target.removeEventListener = (type, fn, options) => { if (types.includes(type)) handlers.delete(fn); remove(type, fn, options); };
}
track(window, ['resize', 'mousemove', 'touchmove']); track(document, ['visibilitychange']);
const media = matchMedia.bind(window);
window.matchMedia = query => { const result = media(query); track(result, ['change']); return result; };
window.resources = () => [framesPending.size, observers.size, handlers.size];
`;
async function check(base, entry, development) {
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
  const list = await (await fetch('http://127.0.0.1:9228/json/list')).json();
  const c = await CDP.connect(list.find(target => target.id === targetId).webSocketDebuggerUrl);
  targets.push({ targetId, c });
  await c.send('Page.enable'); await c.send('Runtime.enable');
  await c.send('Page.addScriptToEvaluateOnNewDocument', { source: instrumentation });
  await c.send('Page.navigate', { url: base + entry });
  await c.send('Page.bringToFront');
  for (let i = 0; i < 100; i++) {
    if (await c.evaluate('window.ready === true')) break;
    await wait(50);
  }
  assert.equal(await c.evaluate('window.ready'), true, JSON.stringify(c.errors));
  await wait(200);
  const active = await c.evaluate('resources()');
  assert.deepEqual(active, [1, 1, 5]);
  assert.equal(await c.evaluate(`(() => {
    const canvas = document.querySelector('canvas');
    return canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data.some(value => value > 0);
  })()`), true, 'Canvas should contain rendered pixels');
  if (entry === 'react.html' && development) {
    assert.equal(await c.evaluate('mounts'), 2, 'React development StrictMode must exercise effect cleanup/replay');
    assert.equal(await c.evaluate('cleanups'), 1);
  }
  if (entry !== 'react.html') {
    await c.evaluate("field.stop().stop(); field.updateConfig({ preset: 'constellation' }); void 0;");
    assert.deepEqual(await c.evaluate('resources()'), [0, 1, 5]);
    assert.equal(await c.evaluate('field.config.stars.count'), 180);
    await c.evaluate('field.start().start(); void 0;');
    assert.deepEqual(await c.evaluate('resources()'), active);
  }
  for (let i = 0; i < 10; i++) {
    await c.evaluate('unmount()'); assert.deepEqual(await c.evaluate('resources()'), [0, 0, 0]);
    await c.evaluate('mount()'); assert.deepEqual(await c.evaluate('resources()'), active);
  }
  await c.evaluate('unmount(); window.dispose?.()');
  assert.deepEqual(await c.evaluate('resources()'), [0, 0, 0]);
  if (entry === 'react.html') assert.equal(await c.evaluate('mounts === cleanups'), true);
  assert.equal(c.errors.length, 0, JSON.stringify(c.errors));
  console.log(`PASS ${development ? 'development' : 'production'} ${entry}: pixels, lifecycle, 10 remounts, cleanup`);
}
try {
  const react = JSON.parse(await readFile(join(root, 'node_modules/react/package.json'), 'utf8'));
  console.log(`External consumer: ${root}; React ${react.version}`);
  const dev = await createServer({ configFile: false, root, server: { host: '127.0.0.1', port: 5188, strictPort: true, hmr: false } });
  await dev.listen(); servers.push(() => dev.close());
  for (const entry of entries) await check('http://127.0.0.1:5188/', entry, true);
  await build({ configFile: false, root, base: './', build: {
    outDir: 'dist',
    rolldownOptions: { input: entries.map(file => join(root, file)) },
  } });
  const prod = await preview({ configFile: false, root, preview: { host: '127.0.0.1', port: 5189, strictPort: true } });
  servers.push(() => new Promise((resolve, reject) => prod.httpServer.close(error => error ? reject(error) : resolve())));
  for (const entry of entries) await check('http://127.0.0.1:5189/', entry, false);
} finally {
  for (const { targetId, c } of targets) { await browser.send('Target.closeTarget', { targetId }); c.socket.close(); }
  for (const close of servers.reverse()) await close();
  browser.socket.close();
}
