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
hot updates are disabled until instance cleanup is implemented, so editing
does not create additional running instances in the same document.

Run focused API checks, build, and inspect the production demo:

```sh
npm run verify:api
npm run build
npm run preview
```

The API checks use Node built-ins without additional dependencies. The full
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
- Runtime configuration changes through `updateConfig()` remain Milestone 3 work;
  direct writes to instance internals are not a supported API.

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

Dimensions are read at initialization and on window resize. Successful resize
regenerates the stars and resets the shooting star, preserving prototype behavior.
Changes to a container alone are not automatically observed until Milestone 3.
An initially hidden or zero-size canvas is rejected. If an existing canvas becomes
hidden, a resize keeps its last valid drawing size; rendering is not suspended yet.

Intrinsic layout that changes when the backing buffer is scaled is rejected at
initialization. If that condition arises later, resizing restores the previous
buffer dimensions and keeps the last valid logical size. This prevents repeated
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

## Preserved behavior and current limitations

The prototype's defaults, generation formulas, drawing order, timing constants,
resize regeneration, and visual effects are preserved for full-screen use. The
original files remain unchanged. The demo loads the supplied CSS, which the
original HTML does not link. Container coordinates and outside-pointer behavior
are intentional API changes for embedded and multiple instances.

The approved Milestone 2 scope retains these inherited limitations:

- No `start()`, `stop()`, `destroy()`, or `updateConfig()` API; window listeners
  and animation callbacks retain instances. Initialize each canvas once per page
  and reload the page to discard instances. Cleanup remains Milestone 3 work.
- No explicit hidden/off-screen pause, duplicate-loop guard, or delta-time
  limit. Returning after inactivity can cause animation jumps.
- Repulsion and friction depend on frame rate. Connections use undisplaced
  positions, while visible stars also include parallax and repulsion offsets.
- Galaxy generation is an initial distribution; stars subsequently drift and wrap.
- Connections have quadratic cost among nearby stars. Per-star glow,
  temporary allocations, and uncapped DPR may be expensive on some devices.
- Reduced-motion support, TypeScript declarations, the Vitest suite, and
  extended performance/stability verification are planned for later milestones.

These behaviors are retained for parity, not presented as production guarantees.
No performance improvement or long-running memory stability is claimed.

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
