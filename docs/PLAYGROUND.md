# Interactive playground

Run `npm run dev` and open the printed URL. The canvas fills the viewport; the
settings panel opens on desktop and starts collapsed on small screens. Settings
include the four presets, star count/radius/speed, editable colors, distribution,
galaxy shape, twinkle, parallax, repulsion, shooting stars, connections, glow,
DPR cap, and respect for reduced motion. The panel can be closed for a clear view.

- Preset selection and Reset restore the complete selected baseline. Reset uses
  Default. They preserve the requested pause/play state and discard pending edits.
- The Modified label compares the applied configuration with the selected preset.
- Slider input is merged into at most one pending patch/timer and applied every
  120 ms during dragging, with an immediate flush on change/release. Structural
  changes still regenerate stars; effect-only changes use the library's existing
  update behavior. Invalid values leave the last valid configuration intact and
  show an error; correcting dependent bounds applies the retained patch together.
- UI ranges and the eight-color editor limit are playground limits, not new
  library restrictions. All original default and preset values remain intact.
- Pause/Resume uses the public lifecycle API. Reduced motion and hidden-document
  states suspend the independent frame meter too. The displayed FPS is browser
  frame cadence, not GPU timing or a performance guarantee; use the benchmark
  for detailed measurements. The meter keeps scalar counters, not frame history.
- Configuration export provides resolved JSON, a source-based JavaScript example,
  and local setup commands. It omits preset metadata, so copied overrides cannot
  accidentally reset to another baseline. Clipboard denial selects the text for
  manual copying. npm installation/linking awaits publication; the repository
  and the [hosted playground](https://jaason.github.io/interactive-starfield/) are public.
- Controls have labels and keyboard support. Escape closes the modal or panel;
  closing returns focus to its trigger. Pointer movement over UI is stopped from
  bubbling into the canvas listeners; movement elsewhere still controls stars.
- One Starfield instance is used. Demo listeners use an AbortController, queued
  updates are canceled, the meter stops, and the instance is destroyed on
  pagehide. Two page lifecycle handlers retain the last applied configuration
  for back/forward-cache restoration. The demo uses only the public constructor,
  config, start/stop/updateConfig/destroy; it does not import internal presets or
  inspect renderer state. No production-library files were changed for this demo.

The Benchmark navigation link uses `./benchmark/` in both development and the
shared build. `npm run benchmark` and `npm run build:benchmark` still provide a
standalone benchmark, now using the same HTML entry in `demo/benchmark/`.
No GitHub Pages workflow, deployment, or npm publication is included yet.


See [verification history](VERIFICATION.md#milestone-6-verification) for the
executed browser checks and [performance notes](PERFORMANCE.md) for remaining
verification.
