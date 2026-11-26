// Requires a running benchmark server (5174) and Chrome remote debugging (9228).
// Real elapsed-time test: no accelerated animation clock or simulated eight hours.
import { writeFile } from 'node:fs/promises';
import { CDP, browser } from './helpers/cdp.mjs';
const seconds = Number(process.argv[2] ?? 28800);
if (!Number.isFinite(seconds) || seconds < 1 || seconds > 28800) throw new Error('Duration must be 1–28800 seconds.');
const output = new URL('../docs/milestone-5-stability.json', import.meta.url);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
const targets = await (await fetch('http://127.0.0.1:9228/json/list')).json();
const c = await CDP.connect(targets.find(target => target.id === targetId).webSocketDebuggerUrl);
const report = { status: 'running', startedAt: new Date().toISOString(), requestedSeconds: seconds,
  environment: 'Native RAF in headless Chrome; not a physical display FPS certification.', samples: [] };
let stopping = false;
process.on('SIGINT', () => { stopping = true; });
process.on('SIGTERM', () => { stopping = true; });
try {
  await c.send('Runtime.enable'); await c.send('Page.enable'); await c.send('Performance.enable');
  await c.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await c.send('Page.navigate', { url: 'http://127.0.0.1:5174' });
  for (let i = 0; i < 100 && !await c.evaluate('!!window.starfieldBenchmark'); i++) await wait(100);
  await c.evaluate(`document.querySelector('select[name="duration"]').value='28800';document.querySelector('form').requestSubmit();void 0`);
  await c.send('Page.bringToFront');
  const start = Date.now();
  let nextGC = 0;
  while (!stopping) {
    const snapshot = await c.evaluate('starfieldBenchmark.snapshot()');
    if (snapshot.errors || c.errors.length) throw new Error('Unhandled browser error during stability test.');
    let postGC = null;
    if (snapshot.activeMs >= nextGC) {
      await c.send('HeapProfiler.collectGarbage'); postGC = await c.send('Runtime.getHeapUsage'); nextGC += 1800000;
    }
    const metrics = await c.send('Performance.getMetrics');
    report.samples.push({ wallMs: Date.now() - start, activeMs: snapshot.activeMs,
      hidden: snapshot.hidden, fps: snapshot.fps, frame: snapshot.frame, work: snapshot.instanceWork,
      interruptions: snapshot.interruptions, dropped: snapshot.estimatedDroppedFrames,
      longTasks: snapshot.longTasks, heap: snapshot.heap, postGC,
      taskDurationSeconds: metrics.metrics.find(m => m.name === 'TaskDuration')?.value });
    // Store at most 540 minute records even if a run is interrupted repeatedly.
    if (report.samples.length > 540) report.samples.shift();
    if (snapshot.activeMs >= 1800000 && !report.thirtyMinuteCheckpoint) {
      report.thirtyMinuteCheckpoint = new Date().toISOString();
    }
    if (snapshot.activeMs >= seconds * 1000) { report.status = snapshot.interruptions ? 'completed-with-interruptions' : 'completed'; break; }
    if (Date.now() - start > (seconds + 3600) * 1000) { report.status = 'incomplete-wall-time-limit'; break; }
    await writeFile(output, JSON.stringify(report, null, 2) + '\n');
    console.log(`Active ${(snapshot.activeMs / 60000).toFixed(1)} min; FPS ${snapshot.fps.toFixed(1)}; heap ${snapshot.heap.current}; hidden ${snapshot.hidden}`);
    await wait(Math.min(60000, Math.max(1000, seconds * 1000 - snapshot.activeMs)));
  }
  if (stopping) report.status = 'interrupted';
  report.final = await c.evaluate('starfieldBenchmark.snapshot()');
  await c.evaluate('starfieldBenchmark.stop()');
} catch (error) {
  report.status = 'failed'; report.error = error.message; process.exitCode = 1;
} finally {
  report.updatedAt = new Date().toISOString();
  await writeFile(output, JSON.stringify(report, null, 2) + '\n');
  await browser.send('Target.closeTarget', { targetId }); c.socket.close(); browser.socket.close();
  console.log(report.status);
}
