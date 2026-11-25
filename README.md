# interactive-starfield

A lightweight, dependency-free JavaScript library for creating interactive starfield backgrounds with Canvas 2D, featuring parallax, particle connections, mouse repulsion, shooting stars, and procedural galaxy generation.

## Development

This repository is at the project-foundation stage. It is private to npm
(`private: true` in `package.json`) and is not ready for production use.
Vite is a development dependency; the starfield has no runtime dependencies.

Use Node.js 20.19+ in the 20.x line, or Node.js 22.12+; a current supported
LTS release is recommended. Install and start the local demo:

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. Manually reload after source or CSS edits:
hot updates are disabled until instance cleanup is implemented, so editing
does not create additional running instances in the same document.

Build and inspect the production demo:

```sh
npm run build
npm run preview
```

The build writes the demo to `dist/`. Library distribution builds and npm
package exports are planned for Milestone 8.

## Source layout

- `prototype/`: unchanged original implementation, used as the parity reference.
- `src/defaultConfig.js`: the original configuration values.
- `src/Star.js`: star generation, movement, interaction, and drawing.
- `src/ShootingStar.js`: reusable shooting-star state and drawing.
- `src/Starfield.js`: viewport sizing, input, connections, and frame orchestration.
- `src/index.js`: public module entry point; exports `Starfield` without starting it.
- `demo/`: minimal page, styling, and initialization through the entry point.

The demo currently uses the prototype's canvas/context constructor shape:

```js
import { Starfield } from '../src/index.js';

const canvas = document.querySelector('#starfield');
const ctx = canvas.getContext('2d');
new Starfield(canvas, ctx);
```

This is a provisional development interface. Construction starts animation.
Selector support, partial configuration, validation, and container sizing are
Milestone 2 work. Particle classes and configuration are internal modules;
do not mutate instance internals as a configuration API.

## Preserved behavior and current limitations

Extraction preserves the prototype's defaults, random generation formulas,
rendering order, timing constants, resize regeneration, and visual effects.
The demo explicitly loads the supplied CSS, which the original HTML does
not link. The original files remain unchanged.

Pointer state now belongs to each coordinator and is passed to its stars.
Configuration is passed explicitly to particles, but the internal default
object is still shared. Configuration isolation and complete multiple-instance
support remain Milestone 2 work.

The approved Milestone 1 scope retains these inherited limitations:

- No `start()`, `stop()`, `destroy()`, or `updateConfig()` API; global event
  listeners and animation callbacks retain instances. Use one initialization
  per page and reload the page to discard it. Cleanup is Milestone 3 work.
- No explicit hidden/off-screen pause, duplicate-loop guard, or delta-time
  limit. Returning after inactivity can cause animation jumps.
- Full-window dimensions and pointer coordinates; no container sizing.
- Repulsion and friction depend on frame rate. Connections use undisplaced
  positions, while visible stars also include parallax and repulsion offsets.
- Galaxy generation is an initial distribution; stars subsequently drift and
  wrap. Resizing regenerates all stars and resets the shooting star.
- Connections have quadratic cost among nearby stars. Per-star glow,
  temporary allocations, and uncapped DPR may be expensive on some devices.
- Reduced-motion support, TypeScript declarations, the Vitest suite, and
  extended performance/stability verification are planned for later milestones.

These behaviors are retained for parity, not presented as production guarantees.
No performance improvement or long-running memory stability is claimed.

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
