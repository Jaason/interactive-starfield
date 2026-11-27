# Performance and stability

Milestone 5 is in progress. The checks below are bounded observations, not a
production certification. A continuous 30-minute headless Chrome run completed
on 2026-11-26; the eight-hour test has not run.
The user explicitly deferred the eight-hour run and Safari/Firefox compatibility
tests on 2026-11-26. Safari requires “Allow remote automation”; Firefox requires
installation. Physical mobile tests remain outstanding. None of these deferred
or unavailable checks is marked as passed.

## Environment and reproducibility

Measured 2026-11-26 on Apple M3 Pro, 36 GiB RAM, macOS 15.8.1 (24H32),
Node 26.2.0, Chrome 158.0.8127.37. Chrome ran headless and reported unavailable
CVDisplayLink support. No physical display refresh rate, device CPU utilization,
or GPU utilization was measured. Simulated 60 Hz timestamps and native headless
RAF are distinguished below. Browser processes were local; there was no hosting
or publication.

Run the portable checks:

```sh
npm test
npm run typecheck
npm run build
npm run build:benchmark
npm ls --omit=dev
```

The 61 core Vitest tests cover original API behavior, presets, lifecycle, failure
rollback, star generation, fixed-time repulsion, shared drawing coordinates,
DPR caps, media-query transitions, cleanup, and bounded benchmark storage.
Milestone 6 adds five playground tests (66 total at that milestone).
The old `verify:api`, `verify:lifecycle`, and `verify:presets` commands remain
aliases for the corresponding Vitest suites. TypeScript checks cover supported
calls, immutable resolved configuration, and expected type errors.

### Browser checks

Start `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort` and a dedicated
Chrome instance with remote debugging on loopback port 9228. Use a separate
browser profile. Then run `node scripts/verify-browser.mjs`.
The script temporarily serves its fixtures on loopback port 5180, loads the
previous committed sources (`e927d64`) via Git, and writes
[milestone-5-browser-results.json](milestone-5-browser-results.json).
It closes its own tabs and fixture server. It requires Chrome, the local Git
history, and the dev server; it is separate from the portable Vitest suite.

Start `npm run benchmark -- --host 127.0.0.1 --port 5174 --strictPort`, then run
`node scripts/verify-native.mjs` against the same Chrome debugging port to check
native RAF, real tab visibility transitions, two instances, container resizing,
emulated touch, lifecycle cycles, and cleanup. Emulation is not a physical mobile
device test. Output is [milestone-5-native-results.json](milestone-5-native-results.json).

### Interactive benchmark

`npm run benchmark` opens a separate Vite entry. `npm run build:benchmark` builds
it into `dist-benchmark/`. The HTML entry is shared at `demo/benchmark/index.html`;
the main demo build also includes it at `dist/benchmark/index.html`. Controls select star count, effects, preset, instance
count, optional DPR cap, target refresh rate, and duration. Effect checkboxes
explicitly override presets; selecting a preset does not synchronize those
checkboxes or the count. The page deliberately opts out of reduced motion for
measurement. This is a measurement tool, not the Milestone 6 product demo.

Start/stop/destroy and 100 lifecycle cycles are available. Export JSON before
leaving. Keep the tab visible and the machine awake for continuous runs.
The page measures native RAF intervals, per-instance update/control work and
render submission time, estimated dropped frames, optional long tasks, and
optional Chromium heap readings. Canvas/GPU completion is not forced by readback.
Update time is total instance work minus measured rendering, so includes loop
orchestration and measurement overhead. Summaries are refreshed once per second.

Each timing series uses a 3,600-entry ring and lifetime count/sum/max. Percentiles
refer to the recent window, while means refer to the whole run. Minute history
is bounded to 481 entries. Heap “peak” is the maximum observed at one-second
sampling, not the process's true peak. Missing memory/long-task APIs produce
unavailable data rather than invented measurements. Multi-instance work samples
are per instance, not the total frame budget. Frame gaps over one second are
recorded as interruptions and excluded from active-duration completion; their
cost still appears in interval statistics. A visibility pause is not rendering
time. Estimated dropped frames depend on the selected refresh rate and are not
compositor measurements.

## Memory ownership and verification limits

Each instance owns its immutable resolved configuration, particle collection,
reusable shooting-star object, pointer, resize observer, event handlers, and one
animation frame chain. There is no global instance registry. Nearby-star storage
is reused and cleared when replaced particles would otherwise be retained.
Changing configuration copies caller arrays and does not retain the caller's
objects. Allocations still occur during configuration updates, regeneration,
color-string creation, and shooting-star gradient drawing.

`stop()` cancels animation but deliberately retains resumable scene state and
listeners. `destroy()` cancels the pending frame, removes window/document/media
listeners, disconnects the observer, clears rendering, and releases instance-owned
DOM/context/config/particle references. The host still owns the canvas and any
references it keeps; destroying the instance does not remove the DOM element or
promise that browser/GPU canvas backing storage is immediately released.

Post-GC weak-reference tests and the completed 30-minute run below support only
the tested scenarios. JS heap is not total memory, and the benchmark's bounded
history and measurement overhead are part of the test environment. Do not infer
universal leak freedom or eight-hour stability from a lower final heap reading.

## Rendering changes and trade-offs

- Repulsion uses an elapsed-time extension of the original 60 Hz recurrence:
  `decay = friction ** (deltaTime * 60)` and
  `gain = friction * (1 - decay) / (1 - friction)`.
  Offsets become `offset * decay + force * gain`. Zero elapsed time produces no
  movement; zero friction clears offsets on a positive step. Stationary-force
  tests agree at 30/60/120/144 Hz. Moving forces are sampled per frame, so bitwise
  equality across refresh rates is not promised.
- Each star stores its current rendered position. Connections use that same
  position for pointer proximity, pair distance, opacity, and endpoints.
  This intentionally corrects the old separation between lines and visible stars.
  It changes which pairs qualify, especially in the repelled galaxy center.
- Reused nearby-star storage and scalar positions replace the previous per-frame
  filter array and per-star parallax object. Squared distances reject out-of-range
  pairs before square roots. Color strings and shooting-star gradients still
  allocate; no blanket “allocation-free” claim is made.
- Pair processing remains O(k²) for k nearby stars. Measured connection cost
  warrants further attention, but this change does not add spatial partitioning,
  adaptive quality, line-count caps, or automatic effect disabling. Those alter
  complexity or appearance and are not justified as required here.
- Per-star Canvas shadows remain unchanged. The isolated-effect sample below
  did not justify a sprite cache or approximated glow. This is not proof that
  shadows are cheap on all devices.
- `rendering.maxDpr` defaults to `null` (native). A positive finite cap reduces
  backing-store pixels at the cost of sharpness. DPR-only changes preserve stars
  and active shooting-star state; actual CSS-size changes retain regeneration.
  A 390×844 CSS canvas at DPR 3 has 2,962,440 pixels (~11.3 MiB for one RGBA
  buffer), versus 329,160 (~1.26 MiB) at DPR 1. Actual browser/GPU memory can be
  larger and is not measured by that calculation. No default cap is imposed.
- Galaxy generation remains the original radial power distribution, flattening,
  and radius-dependent angular rotation. A uniform initial angle means that
  rotation does not create spiral arms. Stars drift and wrap; no stationary
  galaxy density or spiral simulation is promised. Strong center concentration
  explains many candidate pairs but was not silently changed.
- `prefers-reduced-motion` produces a static scene by default. Resize and config
  updates can redraw it; pointer movement does not animate it. The preference
  listener is removed on destruction, and manual stop/hidden state take priority.

## Bounded browser results

Twelve pixel comparisons match the previous commit with repulsion and connections
disabled, at 1280×720/DPR 1 and 390×844/DPR 3. These isolate unchanged star drawing,
parallax, twinkle, and glow. They deliberately do not claim pixel parity for the
approved repulsion/connection corrections. The original prototype files remain
unchanged.

The following seeded runs used a centered pointer, all effects enabled,
30 warm-up steps and 60 measured steps at synthetic 60 Hz. Timings include JS and
Canvas submission, without forced readback. Values are mean milliseconds:

| Stars | DPR 1 before / after | DPR 3 before / after |
| --- | --- | --- |
| 100 | 1.42 / 0.44 | 1.92 / 0.49 |
| 250 | 8.48 / 1.82 | 12.24 / 2.62 |
| 500 | 30.23 / 6.75 | 48.45 / 9.35 |
| 1000 | 137.14 / 28.45 | 235.73 / 39.80 |

These differences include changed pair selection after the position correction,
not just faster processing of an identical image. They are not an optimization
speedup factor, a whole-GPU cost, or an FPS guarantee. At 1000 stars the current
sample still exceeds the 16.67 ms budget. p95/p99 are in the raw JSON; with only
60 samples, p99 is effectively the maximum.

At 240 stars, DPR 1, effects enabled individually gave means of 0.14 ms (none),
0.18 (twinkle), 0.24 (parallax), 0.25 (repulsion), 7.60 (connections), and 0.33
(glow). The pointer is centered, so the isolated parallax run does not exercise
large displacements. The connections-only run retains a dense center because
repulsion is off. This identifies a costly scenario, not a universal ranking.

Four batches of 100 configuration changes and stop/start cycles held two instance
resource counts constant. Post-GC JS heap readings were 903,468; 943,080;
961,576; 961,576 bytes. Weak references found no retained replaced configurations
or star arrays. Three further batches of 100 init/destroy cycles found no retained
tested instances or removed canvases after GC, including media listeners.
No tracked listeners, observers, or RAF callbacks remained after destruction.
This establishes bounded cleanup evidence, not eight-hour stability or total
canvas/GPU memory behavior.

## Completed 30-minute run — 2026-11-26

Ran `node scripts/verify-stability.mjs 1800` against commit `be2312c`, from
08:56 to 09:26 Europe/Warsaw. Raw results are in
[milestone-5-stability.json](milestone-5-stability.json). A prior attempt stopped
after about seven recorded minutes for an unknown reason; its process no longer
existed when inspected. That incomplete attempt is preserved separately in
[milestone-5-stability-interrupted.json](milestone-5-stability-interrupted.json)
and is not combined with this run.

This run used the Vite benchmark development server, one instance, 240 stars,
all five effects enabled, a centered pointer, and native DPR 1. The viewport was
1280×900 CSS pixels; the actual canvas was 1200×400 CSS/backing pixels. The
benchmark explicitly opted out of reduced motion. Native RAF was used without
an accelerated clock, forced canvas readback, input, or configuration changes.
The eight-hour ceiling in `final.requestedActiveMs` is the benchmark UI setting;
the runner's `requestedSeconds: 1800` controlled this test and stopped it after
30 minutes. It is not an eight-hour test result.

| Measurement | Result |
| --- | --- |
| Active duration | 1,801.028 seconds (30 min 1.028 sec) |
| Measured instance callbacks | 108,067 |
| Average native RAF rate | 60.002 FPS |
| Mean interval / final-window p95 / p99 | 16.666 / 16.8 / 16.8 ms |
| Mean instance work / final-window p95 / p99 | 0.604 / 0.8 / 0.8 ms |
| Maximum measured instance work | 14.0 ms |
| Recorded errors / interruptions / estimated dropped frames / long tasks | 0 / 0 / 0 / 0 |
| Initial / observed peak page JS heap | 12,643,651 / 12,643,651 bytes |
| Final page heap sample before GC | 8,320,801 bytes |
| CDP used JS heap after GC, start / end | 3,290,216 / 1,109,996 bytes (3.14 / 1.06 MiB) |

There was no sustained increase in frame intervals or instance work in this run.
After the first minute, per-minute mean instance work ranged from about 0.50 to
0.63 ms. At minutes 5, 10, 15, 20, 25 and 30, recent-window work p95 values were
0.7, 0.7, 0.7, 0.8, 0.7 and 0.8 ms respectively. The more expensive first minute
included the initial concentrated galaxy; the scene naturally drifts, so this
is not a constant-density stress test or evidence of an optimization speedup.

Page heap readings fluctuated and sometimes reached higher levels late in the
run, then fell again. Final forced GC reduced used JS heap below the initial
post-GC reading. These observations show no retained-heap growth in this tested
run; they are not proof that every configuration or browser is leak-free. Only
two forced-GC endpoints were measured, and page `performance.memory` readings
are separate from CDP `Runtime.getHeapUsage` readings. Neither represents total
canvas, process, or GPU memory. The lower final value is not claimed as a memory
optimization. The raw report retains all 32 samples and the final snapshot.

The headless/display limitations described above still apply. This completes
the 30-minute profiling task, not the physical-display performance targets,
eight-hour stability verification, or complete Milestone 5 acceptance.

## Long-duration protocol and outstanding acceptance

The runner `node scripts/verify-stability.mjs 28800` uses the benchmark server
on 5174 and Chrome debugging on 9228. It uses native RAF and actual elapsed time,
records a 30-minute checkpoint, and writes `docs/milestone-5-stability.json`
every minute. A duration in seconds may be supplied for a short runner check.
GC is requested at the start and each 30 active minutes; these interventions must
be considered when interpreting pauses. CDP TaskDuration is cumulative renderer
task time, not GPU use or whole-device CPU utilization. A completed run still
requires inspection for trends; process completion alone is not acceptance.

The 30-minute run is recorded above. The eight-hour run remains deferred and
unexecuted; neither that shorter run nor deterministic tests substitute for it.
Also outstanding:

- Safari: deferred by the user on 2026-11-26; enable remote automation before testing.
- Firefox: deferred by the user on 2026-11-26; install a browser or test build first.
- Physical mobile devices and physical 60/120/144 Hz displays.
- Eight-hour heap/frame-time trends, total resource consumption, and CPU/GPU profiling.
- Confirmation of default 60 FPS, 16.67 ms frame budget, and <8 ms library work on
  a documented physical reference display. Short headless results do not certify it.

The eight-hour run and Safari/Firefox tests are explicitly deferred by the user;
their checklist items remain unchecked. When resuming browser compatibility work,
check rendering, preset changes, resizing/DPR, start/stop, tab visibility, reduced
motion, multiple instances, cleanup, console errors, and basic frame timing.
These deferrals do not mark tests passed or waive the other outstanding checks. Milestone 5 remains
open pending those checks and review.
