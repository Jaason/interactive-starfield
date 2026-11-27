# Verification history

These reports describe the versions tested at each milestone. Historical
limitations and commands are preserved as evidence; they are not the current API
contract. See [README](../README.md), [API details](API.md), and
[current performance results](PERFORMANCE.md) for current behavior.

## Milestone 6 verification

Implemented, verified locally, and approved by the user on 2026-11-26.
All 66 Vitest tests, TypeScript checks, the combined build, and the standalone
benchmark build pass. Runtime dependencies remain empty. Chrome tested both the
development page and the production build served under `/interactive-starfield/`.
`node scripts/verify-demo.mjs [url]` repeats browser checks when a local server and
Chrome debugging on port 9228 are running. It writes review screenshots to the
system temporary directory and closes its own tabs.

Checks cover preset values and modified-state restoration, validation, palette
editing, JSON export, clipboard success/fallback, reduced motion, pause/resume,
100 preset switches while paused, stable listener/observer/frame counts, UI input
isolation, Escape and focus restoration, 390×844 layout and emulated touch, native
background-tab suspension, and the relative benchmark link. Simulated
pagehide/pageshow events verify cleanup/restoration; they are not a claim that
native back/forward-cache eligibility was tested in every browser.

Chrome screenshots were reviewed at 1440×900 and 390×844. Physical mobile-device
checks remain outstanding. Safari/Firefox and eight-hour stability tests remain
deferred as recorded in Milestone 5; this demo does not establish those results.

## Milestone 5 progress

Implementation and bounded verification are in progress; this milestone is not
complete. Run `npm run benchmark` for the measurement page. Tests, declarations,
DPR caps, reduced motion, and rendering corrections are implemented. See
[performance results and pending acceptance](PERFORMANCE.md). The continuous
30-minute headless Chrome test completed without observed performance degradation
or retained-heap growth in that run. The full device/browser matrix remains
outstanding; the eight-hour test and Safari/Firefox checks have been explicitly
deferred by the user.
The historical milestone measurements below describe their respective versions.

## Milestone 4 verification

Verified on 2026-11-26 with Node 26.2.0 and local headless Chrome
158.0.8127.37 on macOS. All 46 focused check groups passed, including 13 new
preset groups, plus the production build and empty runtime dependency tree.
Prototype hashes remain unchanged. Ten seeded pixel comparisons matched omitted
preset against explicit Default (five frames each at DPR 1 and 3). Browser
captures confirmed distinct preset appearances at desktop and narrow viewports.

Two simultaneous browser instances survived four batches of 100 preset switches
with unchanged listener/observer/frame counts and the second instance's count
unchanged. Weak references to replaced configurations and star arrays were all
cleared after forced GC in every batch. Used JS heap after clearing measurement
records and another GC was 862,416; 904,516; 916,572; 915,668 bytes. This bounded
sample levels off in its final batches; it does not establish long-term stability
or measure canvas/GPU memory. Destruction left no tracked resources.

The following bounded samples use a seeded scene, centered pointer, controlled
16 ms animation steps, 63 warm-up frames, and 180 measured frames. Each measured
step includes a one-pixel canvas readback to synchronize drawing. Values are
mean / p95 milliseconds, not display FPS or CPU/GPU utilization.

| Preset | 1280×720 CSS, DPR 1 | 390×844 CSS, DPR 3 |
| --- | --- | --- |
| Default | 12.39 / 21.30 | 55.90 / 62.60 |
| Deep Space | 0.45 / 0.40 | 0.70 / 0.70 |
| Milky Way | 1.41 / 1.20 | 1.75 / 1.60 |
| Constellation | 0.87 / 0.90 | 6.33 / 7.40 |

Outliers can make the mean exceed p95. The high Default cost prompted a separate
comparison against the previous commit, `3cccab1`, using the same method:
DPR 1 means were 12.46 ms before / 12.58 ms after; DPR 3 means were 56.04 ms
before / 55.76 ms after. These samples show the expensive default scene already
exists; they do not demonstrate an improvement. Rendering code is unchanged.
The concentrated galaxy and local connections remain profiling candidates for
Milestone 5. Readback, scene age, viewport, pointer, and headless rendering make
these results unsuitable for direct comparison with earlier milestone samples
or claims about actual mobile devices. Chrome reported no display-link support.
The original defaults are deliberately preserved; production FPS, long-running
stability, and cross-browser testing remain outstanding.

## Milestone 3 verification

Verified on 2026-11-25 with Node 26.2.0, Vite 8.3.8, and headless Chrome
158.0.8127.37 on macOS 15.8.1 (arm64). The original prototype files are unchanged.

- All 13 API check groups and 20 lifecycle check groups passed. The lifecycle
  script covers 100 start/stop cycles, 100 same-canvas initialization/destruction
  cycles, 100 configuration updates/resizes, stale callbacks, frame ID zero,
  visibility, clock limits, resize suspension, atomic updates, multiple instances,
  and rollback after partial listener/observer/frame initialization failures.
- Production build and development/production preview passed. No runtime
  dependencies were added. The demo screenshot was visually inspected.
- Forty-two deterministic canvas/state comparisons passed across galaxy, random,
  and disabled-effect configurations at DPR 1 and DPR 3. Seven checkpoints covered
  initial rendering, mouse, touch/launch boundary, active/faded shooting stars,
  resize, and continued motion. The harness used matching seeded input and an
  active timeline beginning at zero. In-memory reference code changed only the
  prototype's initial `lastTime` sentinel from `0` to `null` and its corresponding
  check; movement and drawing formulas were unchanged. The prototype on disk was
  never modified. These checks do not assert parity with the old pause behavior.
- Real Chrome tab switching produced native `visibilitychange`: a hidden tab had
  no pending library frame and its elapsed time stayed fixed. Returning resumed
  playback; repeating the switch after manual `stop()` did not restart it.
- Real `ResizeObserver` notifications verified independent container resizing,
  deferred resizing while stopped, and zero-size pause/recovery without a window
  resize. Two instances maintained one frame each; destroying both left no tracked
  window/document listeners, connected observers, or pending callbacks. Canvas
  pixels were cleared on destruction.
- Browser checks also exercised 100 start/stop operations and 100 configuration
  changes. Invalid updates left state unchanged; stopped updates did not draw.

### Cleanup and memory sample

A dedicated Chrome run performed 100 warm-up initialization/destruction cycles,
then three batches of 100 measured cycles. Each cycle created a canvas and a
240-star instance, stepped one frame, destroyed the instance, and removed the
canvas. The harness yielded for native observer delivery, invoked
`HeapProfiler.collectGarbage`, and checked weak references in a subsequent task.
Control weak references were cleared between batches before measuring heap usage.

| Measured cycles | Post-GC JS heap (bytes) | Live tested instances | Live removed canvases | Pending library frames |
| --- | ---: | ---: | ---: | ---: |
| Warm-up baseline | 725,404 | — | — | 0 |
| 100 | 731,544 | 0 | 0 | 0 |
| 200 | 732,728 | 0 | 0 | 0 |
| 300 | 733,136 | 0 | 0 | 0 |

Each batch ended with zero tracked listeners and connected observers. Heap readings
settled within a small range after warm-up; no tested instance or removed canvas
remained reachable through the weak references after GC. An earlier run retained
the harness's weak-reference records between batches and therefore included their
allocation growth; the table reports the corrected bounded-instrumentation run.

These observations support cleanup for the tested scenarios, not a universal
memory guarantee. JS heap excludes most graphics memory; Chrome's reported backing
storage metric remained 124,310 bytes but is not a measurement of total GPU memory.
An application that retains its canvas after `destroy()` still owns that element
and any associated browser backing storage.

### Bounded rendering sample

At 1280 × 720 / DPR 1 with defaults, 120 warm-up callbacks followed by 600 measured
callbacks at synthetic 16 ms timestamp intervals produced:

| Implementation | Mean callback time | Median | p95 | p99 |
| --- | ---: | ---: | ---: | ---: |
| Prototype reference | 4.72 ms | 4.30 ms | 8.40 ms | 16.00 ms |
| Milestone 3 | 4.77 ms | 4.30 ms | 8.50 ms | 16.00 ms |

The mean difference of approximately 0.05 ms is insufficient evidence of a
performance change. This headless, synchronous test measures update/draw submission,
not displayed FPS or completed GPU work. Chrome emitted display-link warnings;
CPU/GPU utilization was not measured. No 30-minute or eight-hour animation study,
physical-device test, Firefox test, or Safari test was performed in this milestone.
Those broader checks remain Milestone 5 work; the lifecycle cleanup exception is
no longer needed for the implemented and tested operations.

## Milestone 2 verification

Verified on 2026-11-25 with Node 26.2.0, npm 11.13.0, Vite 8.3.8,
and headless Chrome 158.0.8127.37 on macOS 15.8.1 (arm64).

- `npm run verify:api`: 13 check groups passed, covering default preservation,
  nested options, immutable copies, invalid input, initialization failures,
  CSS sizing, DPR, local input, resizing, intrinsic-size growth, and isolation.
- `npm run build`: passed; `npm ls --omit=dev`: empty runtime dependency tree.
- All three prototype hashes remain unchanged.
- Development and production preview rendered with the expected CSS and no
  observed unhandled JavaScript exceptions. Screenshots were visually inspected.
- A temporary Chrome DevTools Protocol harness compared 42 scenes against the
  unchanged prototype: seven checkpoints for each of default galaxy, random
  generation, and disabled effects at 1280 × 720 / DPR 1 and 390 × 844 / DPR 3.
  Canvas PNG output and particle state matched exactly. Checkpoints included
  initial rendering, mouse input, synthetic touch and the shooting-star launch
  boundary, active and faded shooting stars, resize, and inherited large deltas.
- The browser harness verified eight rejected initializations added no listeners
  or animation callbacks, including missing/invalid selectors, non-canvas targets,
  invalid configuration, hidden canvases, intrinsic sizing, and unavailable contexts.
- Two canvases at different offsets and sizes used independent options and pointer
  coordinates at DPR 2. Synthetic touch after scrolling mapped correctly. Changing
  one container and dispatching window resize updated its dimensions independently.
  After 120 stepped frames, star counts remained 12 and 24, with two pending
  callbacks and two listeners per event type (resize, mousemove, touchmove).

The parity harness used identical seeded random input and frame timestamps.
Native resize events settled before reseeding and dispatching the comparison
resize. Overrides were applied before construction in both implementations.
These are controlled browser checks, not physical mobile-device tests.

A short profile used 120 warm-up callbacks and 600 measured callbacks at simulated
60 Hz timestamps, the default configuration, and 1280 × 720 / DPR 1:

| Implementation | Mean callback time | Median | p95 | p99 |
| --- | ---: | ---: | ---: | ---: |
| Prototype | 4.62 ms | 4.20 ms | 8.30 ms | 15.80 ms |
| Milestone 2 | 4.74 ms | 4.40 ms | 8.20 ms | 15.70 ms |

The mean differs by about 0.12 ms in this single run; tail samples are similar.
This is insufficient evidence of a performance improvement or regression.
Callbacks ran synchronously in headless Chrome and measure update/draw submission,
not displayed FPS or completed GPU work. Neither frame loop called
`getBoundingClientRect`; canvas layout is read during sizing and input events.
Chrome reported headless display-link warnings. CPU/GPU utilization was not measured.

JS heap readings from performance metrics increased from 1.28 to 15.92 MB for
this prototype run and 1.34 to 14.74 MB for Milestone 2. These were not post-GC
measurements and exclude canvas/GPU memory. No long-running stability, lifecycle
cleanup, physical-device, Firefox, or Safari guarantee follows from these checks.
The approved lifecycle exception remains in force until Milestone 3.

## Milestone 1 verification

Verified on 2026-11-25 using Node 26.2.0, npm 11.13.0, Vite 8.3.8,
and headless Chrome 158.0.8127.37 on macOS 15.8.1 (arm64).

- `npm install` and `npm run build` succeeded; `npm ls --omit=dev` was empty.
- The Vite development page and production preview rendered the canvas with
  the expected CSS and no observed JavaScript exceptions.
- Importing `src/index.js` in Node succeeded without `window` or `document`.
- All three prototype files retained their pre-extraction SHA-256 hashes.
- Eighteen deterministic browser comparisons matched both PNG canvas output
  and particle state: nine scenarios at 1280 × 720 / DPR 1 and 390 × 844 / DPR 3.
  These covered galaxy rendering, mouse interaction, synthetic touch movement,
  the 8000 ms launch boundary, active and faded shooting stars, resize, random
  generation, disabled effects, and the inherited large-delta behavior.

The temporary browser harness served the original JavaScript with its supplied
CSS, seeded `Math.random`, and stepped queued animation callbacks at identical
timestamps for each implementation. Native resize events were allowed to settle
before reseeding and explicitly dispatching the comparison resize. The prototype
was not edited. Each checked scene retained 240 stars and one pending callback.
The development demo screenshot was also visually inspected. Touch checks used
synthetic events; they do not establish physical mobile-device compatibility.

A bounded rendering sample used the default configuration at 1280 × 720 / DPR 1,
120 warm-up callbacks, and 600 measured callbacks at simulated 60 Hz timestamps:

| Implementation | Mean callback time | Median | p95 | p99 |
| --- | ---: | ---: | ---: | ---: |
| Prototype | 4.59 ms | 4.10 ms | 8.40 ms | 15.90 ms |
| Extracted modules | 4.67 ms | 4.10 ms | 8.50 ms | 16.00 ms |

Callbacks were stepped synchronously in headless Chrome. These values measure
update/draw submission time, not actual display FPS, completed GPU work, or an
end-to-end frame budget. The small difference is not sufficient evidence of a
performance change. Chrome reported display-link initialization warnings in the
headless environment. CPU/GPU utilization was not measured.

JS heap samples increased from approximately 1.23 to 15.17 MB for the prototype
and 1.29 to 15.26 MB for the extraction during this short instrumented run.
Garbage collection was not forced; these samples cannot establish retained
memory growth or post-GC stability and exclude canvas/GPU memory. No 30-minute
or eight-hour stability test, physical-device test, Firefox/Safari test, or
lifecycle cleanup test was performed. The planned Vitest suite remains deferred.
