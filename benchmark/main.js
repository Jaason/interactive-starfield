import { Starfield } from '../src/index.js';
import { Samples } from './metrics.js';
const form = document.querySelector('form');
const stage = document.querySelector('#stage');
const output = document.querySelector('#stats');
const frame = new Samples(), work = new Samples(), render = new Samples(), update = new Samples();
let fields = [], lastTime = null, activeMs = 0, dropped = 0, longTasks = 0;
let startedAt, config, targetHz, duration, monitoring = false, frameId = null;
let heapInitial = null, heapPeak = null, history = [], interruptions = 0, errors = 0;
window.addEventListener('error', () => { errors++; });
window.addEventListener('unhandledrejection', () => { errors++; });
const heap = () => performance.memory?.usedJSHeapSize ?? null;
function clear() {
  for (const field of fields) field.destroy();
  fields = []; stage.replaceChildren();
}
function reset() {
  frame.reset(); work.reset(); render.reset(); update.reset(); interruptions = 0; errors = 0; activeMs = 0; dropped = 0; longTasks = 0;
  lastTime = null; startedAt = new Date().toISOString(); history = [];
  heapInitial = heap(); heapPeak = heapInitial;
}
function snapshot() {
  return { startedAt, exportedAt: new Date().toISOString(), userAgent: navigator.userAgent,
    viewport: [innerWidth, innerHeight], devicePixelRatio, targetHz, config,
    canvasSizes: fields.map(f => ({ css: [f.width, f.height], buffer: [f.canvas.width, f.canvas.height] })),
    instances: fields.length, requestedActiveMs: duration * 1000, activeMs, hidden: document.hidden,
    fps: frame.count && frame.sum ? frame.count * 1000 / frame.sum : 0,
    frame: frame.summary(), instanceWork: work.summary(), instanceRender: render.summary(), instanceUpdate: update.summary(), interruptions, errors, estimatedDroppedFrames: dropped,
    longTasks, heap: { initial: heapInitial, peak: heapPeak, current: heap() }, history,
    notes: 'Percentiles use last 3600 samples. Work is per instance, including JS canvas submission, not full GPU time. Dropped frames are estimates against selected refresh rate. Heap is optional Chromium data, not post-GC or total memory. History retains at most 481 minute records.' };
}
function tick(time) {
  frameId = null;
  if (!monitoring || document.hidden) { lastTime = null; return; }
  if (lastTime !== null) {
    const dt = time - lastTime; frame.add(dt);
    if (dt > 1000) interruptions++;
    else activeMs += dt;
    dropped += Math.max(0, Math.round(dt / (1000 / targetHz)) - 1);
  }
  lastTime = time;
  if (activeMs >= duration * 1000) { stop(); refresh(); return; }
  frameId = requestAnimationFrame(tick);
}
function start() {
  for (const field of fields) field.start();
  monitoring = fields.length > 0; lastTime = null;
  if (monitoring && !document.hidden && frameId === null) frameId = requestAnimationFrame(tick);
}
function stop() {
  monitoring = false; lastTime = null;
  if (frameId !== null) cancelAnimationFrame(frameId);
  frameId = null; for (const field of fields) field.stop();
}
function refresh() {
  const current = heap(); if (current !== null) heapPeak = Math.max(heapPeak ?? 0, current);
  const report = snapshot();
  if (monitoring && history.length < 481 && Math.floor(activeMs / 60000) >= history.length) {
    history.push({ activeMs, fps: report.fps, frame: report.frame, work: report.instanceWork, heap: current });
  }
  output.textContent = [
    `Active: ${(activeMs / 60000).toFixed(1)} / ${(duration / 60).toFixed(1)} minutes | Instances: ${fields.length}`,
    `FPS: ${report.fps.toFixed(1)} | Frame p95/p99: ${report.frame.windowP95.toFixed(2)} / ${report.frame.windowP99.toFixed(2)} ms`,
    `Per-instance work mean/p95: ${report.instanceWork.mean.toFixed(2)} / ${report.instanceWork.windowP95.toFixed(2)} ms`,
    `Estimated dropped frames: ${dropped} | Long tasks: ${longTasks} | Interruptions: ${interruptions} | Errors: ${errors}`,
    `Heap: ${current === null ? 'unavailable' : (current / 1048576).toFixed(2) + ' MiB'} | Minute samples: ${history.length}`,
    'Export JSON for settings, timing breakdown, environment, and sample history.',
  ].join('\n');
}
function apply(event) {
  event?.preventDefault(); stop(); clear();
  const data = new FormData(form);
  targetHz = Number(data.get('hz')); duration = Number(data.get('duration'));
  config = { preset: data.get('preset'), stars: { count: Number(data.get('count')) } };
  // Benchmark explicitly opts into motion even when the OS prefers reduced motion.
  config.accessibility = { respectReducedMotion: false };
  config.rendering = { maxDpr: Number(data.get('dpr')) || null };
  for (const effect of ['twinkle', 'parallax', 'repulsion', 'connections', 'glow']) config[effect] = { enabled: data.has(effect) };
  reset();
  for (let i = 0; i < Number(data.get('instances')); i++) {
    const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true'); stage.append(canvas);
    const field = new Starfield(canvas, config);
    // Benchmark-only instrumentation: no timing code in library production paths.
    const animate = field._animate, draw = field._render;
    let renderTime = 0;
    field._render = function() { const before = performance.now(); draw.call(this); renderTime = performance.now() - before; render.add(renderTime); };
    field._animate = function(time) {
      renderTime = 0; const before = performance.now(); animate.call(this, time);
      const total = performance.now() - before; work.add(total); update.add(Math.max(0, total - renderTime));
    };
    fields.push(field);
  }
  start(); refresh();
}
form.addEventListener('submit', apply);
document.querySelector('#start').onclick = start;
document.querySelector('#stop').onclick = () => { stop(); refresh(); };
document.querySelector('#destroy').onclick = () => { stop(); clear(); refresh(); };
document.querySelector('#cycles').onclick = () => {
  stop();
  const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true'); stage.append(canvas);
  for (let i = 0; i < 100; i++) {
    const field = new Starfield(canvas, config);
    field.stop().start().updateConfig({ preset: ['default', 'deep-space', 'milky-way', 'constellation'][i % 4] });
    field.destroy();
  }
  canvas.remove(); refresh();
};
document.querySelector('#export').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot(), null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'starfield-benchmark.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
document.addEventListener('visibilitychange', () => {
  lastTime = null;
  if (document.hidden) { if (frameId !== null) cancelAnimationFrame(frameId); frameId = null; }
  else if (monitoring && frameId === null) frameId = requestAnimationFrame(tick);
});
let observer;
if (PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
  observer = new PerformanceObserver(list => { if (monitoring) longTasks += list.getEntries().length; });
  observer.observe({ type: 'longtask' });
}
const interval = setInterval(refresh, 1000);
window.addEventListener('pagehide', () => { stop(); clear(); clearInterval(interval); observer?.disconnect(); });
apply();
window.starfieldBenchmark = { snapshot, stop };
