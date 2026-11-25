# interactive-starfield

A lightweight, dependency-free JavaScript library for creating interactive starfield backgrounds with Canvas 2D, featuring parallax, particle connections, mouse repulsion, shooting stars, and procedural galaxy generation.

## Development

The public API is under development. The package is marked `private: true`
and is not ready for production use. Vite is a development dependency;
the starfield has no runtime dependencies.

Use Node.js 20.19+ in the 20.x line, or Node.js 22.12+; a current supported
LTS release is recommended. Install and start the local demo:

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. Manually reload after source or CSS edits:
hot module updates remain disabled in the minimal demo.

Run focused API checks, build, and inspect the production demo:

```sh
npm run verify:api
npm run verify:lifecycle
npm run build
npm run preview
```

The API and lifecycle checks use Node built-ins without additional dependencies. The full
Vitest suite remains planned for Milestone 5. The build writes the demo to
`dist/`; library distribution builds and npm package exports are Milestone 8 work.

## Public API

Importing the entry point does not access browser globals or start rendering.
Create an instance in a browser after its canvas is mounted and has a positive
CSS size:

```js
import { Starfield } from '../src/index.js';

const field = new Starfield('#starfield', {
  stars: { count: 120 },
  glow: { enabled: false },
});
```

`new Starfield(target, options?)` accepts a canvas element or a CSS selector.
A selector resolves the first matching element in the current document; that
element must be a canvas. The library obtains its 2D context and starts animation.
The former development signature `new Starfield(canvas, ctx)` is replaced.

A canvas element can also be passed directly:

```js
const field = new Starfield(document.querySelector('#starfield'));
```

Use one instance per canvas. Multiple instances on distinct canvases have
independent configuration, stars, shooting stars, pointer state, dimensions,
and animation callbacks. There is no global instance registry.

### Configuration

All original values in [src/defaultConfig.js](src/defaultConfig.js) are preserved.
Supply only the settings you want to change. For example, `{ stars: { count: 120 } }`
retains the default star colors, sizes, speeds, and other effects.

- Omitted properties and `undefined` use defaults.
- Known nested sections are merged by field.
- `stars.colors` replaces the entire array and is copied.
- Options must be plain objects (ordinary or null-prototype objects).
- Unknown keys, `null` sections, invalid values, and invalid types are rejected.
- Both defaults and each resolved configuration are deeply frozen for this schema.
- Input objects are never mutated or retained. Changing caller data after
  construction does not update the instance.
- Use `updateConfig()` for runtime changes. Direct writes to instance internals
  are not a supported API.

All numeric settings must be finite numbers; numeric strings are not converted.
The following constraints apply even when an effect is disabled:

| Settings | Valid values |
| --- | --- |
| `stars.count` | Nonnegative safe integer, including `0` |
| `stars.minRadius`, `stars.maxRadius` | Minimum >= 0, maximum > 0, minimum <= maximum |
| Star and shooting-star speed ranges | Both >= 0, minimum <= maximum |
| Effect `enabled` flags | Booleans |
| Twinkle strength/speed, parallax strength, repulsion strength, glow strength | >= 0 |
| `repulsion.friction` | >= 0 and < 1 |
| Repulsion/connection radii and line widths | > 0 |
| `connections.lineOpacity` | Between 0 and 1, inclusive |
| Galaxy center strength, spread, flattening | > 0 |
| `galaxy.rotation` | Any finite number |
| `generation.mode` | `'random'` or `'galaxy'` |
| `stars.colors` | Nonempty array of comma-separated RGB triplet strings, each channel 0–255 |

For example, `'180, 210, 255'` is a valid color. Hex values, color names, and
`rgb(...)` strings are not supported. Zero stars does not disable shooting stars.
Friction must remain below 1 so accumulated repulsion offsets can decay.
Validation does not impose performance caps: large counts, dimensions, DPR,
or effect strengths can still exceed practical device limits.

Initialization throws a `TypeError`, `RangeError`, or `Error` with a descriptive
`Starfield:` message, including option paths such as `stars.count`. Missing or
malformed selectors, non-canvas targets, unavailable contexts, and invalid initial
sizes are rejected before event listeners or animation frames are registered.
There is no silent fallback to defaults for invalid values.

### Lifecycle and runtime configuration

```js
const field = new Starfield('#starfield');
field.stop();
field.updateConfig({ stars: { count: 120 }, glow: { enabled: false } });
field.start();

// When the host removes this background:
field.destroy();
```

| Method | Behavior |
| --- | --- |
| `start()` | Requests playback; preserves the scene and never creates a second frame chain. Returns the instance. |
| `stop()` | Cancels the pending frame and freezes animation time, leaving the last image. Returns the instance. |
| `updateConfig(patch?)` | Validates and merges into the current configuration without changing requested playback. Returns the instance. |
| `destroy()` | Cancels playback, removes listeners, disconnects observers, clears the image, and releases instance-owned references. Returns `undefined`. |

The constructor requests playback automatically. Repeated `start()` and `stop()`
are safe. After destruction, `stop()` and `destroy()` do nothing; `start()` and
`updateConfig()` throw a descriptive error. Create a new instance to reuse the
canvas. Destroy the old instance before reinitializing the same canvas.

`stop()` retains input listeners and the resize observer so the instance can
resume. `destroy()` removes them, including the owning document's visibility
listener. Pending callbacks from earlier playback periods cannot restart rendering.
If resource registration fails during construction, registrations already made
are rolled back before the error is rethrown.

Destruction leaves the canvas in the DOM, with its CSS and backing dimensions
unchanged. The remaining canvas belongs to the host and may still retain browser
or GPU backing storage; removing the element is the host application's decision.

#### Automatic suspension and time

A hidden document pauses rendering through `visibilitychange` and `document.hidden`.
This includes switching to another browser tab. Returning resumes only instances
that still have playback requested: a manually stopped instance stays stopped.
A document hidden during construction starts no frame loop until it becomes visible.

Movement, twinkle, and shooting-star scheduling share an active-animation clock
starting at zero. It does not advance during manual stop, document hiding, or
suspension for invalid/zero canvas size. The first frame after resuming has a
zero movement delta. Remaining frame gaps are clamped to 50 ms without catch-up
loops, so very slow rendering slows simulation instead of jumping ahead.

The shooting-star threshold remains greater than 8000 ms, now measured in active
instance time rather than document age. Existing shooting-star motion and fade
resume from their paused state. This time policy intentionally replaces the
prototype's behavior after inactivity; ordinary rendering formulas and all visual
configuration defaults remain unchanged.

Automatic suspension solely because a nonzero canvas is outside the viewport
was evaluated and deferred. Document visibility and zero-size suspension are
implemented; no `IntersectionObserver`, per-frame viewport polling, or additional
configuration flag has been introduced. Off-screen canvases with positive size
can still consume rendering resources until the host calls `stop()`.

#### Updating configuration

`updateConfig()` merges into the current configuration, not the original defaults.
Omitted fields and `undefined` preserve their current values. The constructor's
validation, copying, freezing, and array-replacement rules also apply to updates.
An empty or value-equivalent patch does not replace configuration or particles.

| Changed settings | Effect |
| --- | --- |
| Twinkle, parallax, repulsion, connections, glow | Existing stars retain their state; new values apply when rendering resumes or on the next frame. |
| Any star setting, generation mode, or galaxy parameter | Regenerate the star collection with the new configuration. |
| Shooting-star speed range | Apply on the next launch; an active shooting star keeps its existing speed. |
| Shooting-star line width | Apply on the next rendered frame. |

Replacement particles are prepared before the new state is committed. Validation
or particle-construction failure leaves configuration, particles, and playback
unchanged. Updates add no listeners, observers, or animation loops. An update while
stopped changes internal state but does not draw or start playback.

Regenerating stars for structural changes keeps the implementation simple but
visibly rerandomizes the scene. Visual-only changes avoid that regeneration.
Changing a twinkle parameter can intentionally change its phase/appearance;
pausing alone does not advance its clock.

### Container sizing and interaction

CSS owns the canvas display size. Give both dimensions a size independent of the
canvas's backing `width`/`height` attributes. For a container background:

```html
<section class="hero">
  <canvas id="hero-stars" aria-hidden="true"></canvas>
</section>
```

```css
.hero {
  position: relative;
  height: 400px;
}

.hero canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
}
```

Initialize with `new Starfield('#hero-stars')`. The library measures the canvas
in CSS pixels, sizes its backing buffer for DPR, and draws in logical coordinates.
It does not assign inline CSS sizes. Use canvases without padding, borders, or CSS
transforms; set presentation and borders on their containers instead.

Dimensions are read at initialization, on window resize, and through one
`ResizeObserver` per instance when available. A real size or DPR change regenerates
stars and resets the shooting star. Repeated notifications for unchanged dimensions
do not regenerate or clear the scene. No layout is read in the animation loop.
Without `ResizeObserver`, window resize remains supported; changes to a container
alone require a subsequent window resize or a stop/start cycle to be detected.

An initially hidden or zero-size canvas is rejected. An observed zero size on a
running canvas suspends rendering while preserving its last valid buffer. A valid
size resumes playback only if the instance was not manually stopped. During manual
stop or document hiding, resize work is deferred until playback can resume, so the
stored last frame is not cleared by resize notifications.

Intrinsic layout that changes when the backing buffer is scaled is rejected at
initialization. If that condition arises later, resizing restores the previous
buffer dimensions, keeps the last valid logical size, and suspends playback until
a valid layout is detected. This prevents repeated
DPR multiplication from growing the canvas indefinitely. This guard adds layout
reads on resize, not on each animation frame.

Mouse and passive touch-move events are observed on the canvas's owning window,
so `pointer-events: none` works. Each instance maps the event to its own canvas.
An event outside that canvas disables its pointer repulsion and connections and
resets parallax to neutral; existing repulsion offsets continue to decay.
Overlapping canvases each respond when the pointer is within their bounds.

The initial pointer is at the canvas center for prototype parity. Position is
remeasured on input, including after scrolling. Scrolling without new input,
leaving the browser, or ending a touch does not independently refresh pointer
state in this milestone.

## Source layout

- `prototype/`: unchanged original implementation and parity reference.
- `src/defaultConfig.js`: immutable original configuration values.
- `src/config.js`: configuration copying, merging, validation, and freezing.
- `src/Star.js`: star generation, movement, interaction, and drawing.
- `src/ShootingStar.js`: reusable shooting-star state and drawing.
- `src/Starfield.js`: public constructor, canvas sizing, input, and frame orchestration.
- `src/index.js`: public `Starfield` export.
- `demo/`: minimal page, styling, and initialization through the entry point.
- `scripts/verify-api.mjs`: focused, repeatable API verification using Node built-ins.
- `scripts/verify-lifecycle.mjs`: lifecycle, update, rollback, and resource checks.
- `scripts/helpers/browser-fixture.mjs`: shared browser doubles for those checks.

## Preserved behavior and current limitations

The prototype's defaults, generation formulas, drawing order, and visual effects
are preserved. The original files remain unchanged. The demo loads the supplied
CSS, which the original HTML does not link. Container coordinates, the active-time
clock, and skipping redundant resize regeneration are intentional API/lifecycle
changes documented above. The previous lifecycle cleanup exception is resolved
by the implementation and verification in Milestone 3.

Remaining limitations:

- Off-screen canvases with positive size are not automatically suspended.
- The canvas must have a positive, independent CSS size at initialization.
- Resize observation depends on browser support; there is a window-resize fallback.
- Repulsion and friction depend on frame rate. Connections use undisplaced
  positions, while visible stars also include parallax and repulsion offsets.
- Galaxy generation is an initial distribution; stars subsequently drift and wrap.
- Connections have quadratic cost among nearby stars. Per-star glow,
  temporary allocations, and uncapped DPR may be expensive on some devices.
- Reduced-motion support, TypeScript declarations, the Vitest suite, and
  extended performance/stability verification are planned for later milestones.

These behaviors are retained for parity, not presented as production guarantees.
No performance improvement or long-running memory stability is claimed.

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
