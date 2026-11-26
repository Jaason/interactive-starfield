# Interactive Starfield — Roadmap

## Project goal

Release a lightweight, reusable, configurable,
dependency-free JavaScript starfield library on npm
with comprehensive documentation and a live interactive demo.

The library should be suitable for production websites,
landing pages, portfolios and web applications.

## Core objectives

- Zero runtime dependencies.
- Framework-agnostic architecture.
- Simple and intuitive public API.
- Customizable visual effects.
- Multiple independent instances.
- Desktop and mobile support.
- High-DPI display support.
- Long-running animation stability.
- Efficient memory and resource management.
- Accessibility and reduced motion support.
- TypeScript support.
- Comprehensive documentation.
- Interactive demo and performance benchmarks.

---

## Milestone 0 — Repository setup

- [x] Create GitHub repository
- [x] Add repository description
- [x] Add GitHub topics
- [x] Add MIT license
- [x] Add .gitignore
- [x] Add initial README
- [x] Set repository visibility to private
- [x] Clone repository locally
- [ ] Import original JSFiddle prototype
- [ ] Add AGENTS.md
- [ ] Add ROADMAP.md
- [ ] Commit original prototype and project documentation

Original prototype:
https://jsfiddle.net/Jaason/yztaebxm/

---

## Milestone 1 — Project foundation

- [x] Initialize package.json
- [x] Configure Vite
- [x] Create src/ directory
- [x] Create demo/ directory
- [x] Extract Star class
- [x] Extract ShootingStar class
- [x] Extract Starfield class
- [x] Extract default configuration
- [x] Review shared utility extraction (none needed for this extraction)
- [x] Create public entry point
- [x] Verify development environment
- [x] Verify visual parity with the original prototype

### Acceptance criteria

- [x] Project runs locally using Vite
- [x] Original prototype remains unchanged
- [x] Existing visual effects are preserved
- [x] Existing configuration values are preserved
- [x] Code is organized into ES modules
- [x] No unnecessary abstractions introduced
- [x] No runtime errors

### Foundation verification and approved scope exception

Implemented, verified, and approved by the user on 2026-11-25.
Milestone 1 is complete with the approved scope exception below.
Subsequent milestone progress is recorded below.

- Vite development server, production build, and production preview verified.
- Public entry point imported in Node without browser globals.
- All three prototype SHA-256 hashes match their pre-extraction values.
- Eighteen seeded Chrome comparisons matched canvas pixels and particle state:
  nine scenarios at each of DPR 1 and DPR 3. See README verification notes.
- Development and production preview rendered without JavaScript exceptions.
- Runtime dependency tree is empty. No shared utility abstraction was necessary.
- Short rendering-cost samples were recorded; these do not establish FPS targets,
  post-GC memory stability, cross-browser compatibility, or long-running stability.

The user approved the foundation-only plan, including deferring inherited lifecycle
limitations to Milestone 3. For this milestone only, the definition-of-done resource
cleanup requirement is deferred: listeners and animation callbacks still retain
instances, and stop/destroy, visibility handling, and duplicate-loop protection
are not implemented. This is an explicit scope exception, not a claim that those
issues are resolved. Configuration isolation remains Milestone 2 work.

---

## Milestone 2 — Public library API

- [x] Design Starfield constructor API
- [x] Support canvas elements and CSS selectors
- [x] Support partial user configuration
- [x] Implement nested configuration merging
- [x] Remove global mutable state
- [x] Support multiple independent instances
- [x] Support container-based sizing
- [x] Validate configuration
- [x] Handle invalid configuration gracefully
- [x] Prevent mutation of default configuration
- [x] Prevent shared mutable configuration between instances

### Acceptance criteria

- [x] Library can be initialized through its public API
- [x] Partial configuration preserves default values
- [x] Multiple instances operate independently
- [x] Each instance owns its configuration and state
- [x] Invalid initialization produces meaningful errors
- [x] No framework-specific dependencies

### API verification and approved scope exception

Implemented, verified, and approved by the user on 2026-11-25.
Milestone 2 is complete with the approved scope exception below.
Milestone 3 implementation and verification are recorded below.

- Constructor accepts a canvas or selector and optional partial configuration.
- Each instance owns a copied, validated, frozen configuration and local state.
- CSS determines canvas size; DPR scales only the drawing buffer. A size guard
  prevents intrinsic canvas layout from repeatedly multiplying buffer dimensions.
- Mouse/touch positions are mapped to each canvas, including after scrolling.
- Thirteen focused Node check groups passed with `npm run verify:api`.
- Forty-two deterministic Chrome comparisons matched the original canvas output
  and particle state at DPR 1 and DPR 3. Multiple-instance checks passed at DPR 2.
- Invalid initialization registered no event listeners or animation frames.
- Development preview, production build/preview, and zero runtime dependencies
  were verified. The original prototype remains unchanged.
- Bounded rendering samples and their limitations are documented in README.

The user approved extending the lifecycle scope exception through Milestone 2.
Window listeners and animation callbacks still retain successfully initialized
instances; cleanup, stop/start/destroy, duplicate-loop protection, visibility,
and large-delta handling remain Milestone 3 work. No observers or global instance
registry were added. Container dimensions refresh at initialization and window
resize; independent container resize observation also remains Milestone 3 work.
The overall cleanup requirement is explicitly deferred for this milestone, not
claimed as satisfied. Full Vitest setup remains Milestone 5 work.

---

## Milestone 3 — Lifecycle management

- [x] Implement start()
- [x] Implement stop()
- [x] Implement destroy()
- [x] Implement updateConfig()
- [x] Prevent duplicate animation loops
- [x] Clean up event listeners
- [x] Cancel animation frames
- [x] Handle container resizing
- [x] Disconnect observers when destroyed
- [x] Handle document visibility changes
- [x] Handle large deltaTime values after inactivity
- [x] Evaluate off-screen rendering suspension
- [x] Define behavior after an instance is destroyed

### Acceptance criteria

- [x] start() does not create duplicate animation loops
- [x] stop() suspends animation
- [x] Animation can be restarted safely
- [x] destroy() releases instance-owned resources
- [x] Repeated lifecycle operations do not accumulate resources
- [x] No active animation frames after stop() or destroy()
- [x] No retained event listeners after destroy()
- [x] Returning from a background tab does not cause
      unexpected animation jumps

### Lifecycle verification

Implemented, verified, and approved by the user on 2026-11-25.
Milestone 3 is complete. Milestone 4 progress is recorded below. The lifecycle scope exceptions from
Milestones 1 and 2 are resolved by this implementation and its cleanup checks.

- Added idempotent start/stop, destroy with listener/observer/frame cleanup,
  and atomic partial configuration updates against the current configuration.
- Guarded stale callbacks and partial initialization failures.
- Implemented native document-visibility suspension, a shared active-time clock,
  zero delta on resume, and a 50 ms cap for other delayed frames.
- Added ResizeObserver with a window-resize fallback, unchanged-size detection,
  deferred resizing while stopped/hidden, and zero-size suspension/recovery.
- Evaluated off-screen suspension: viewport-only IntersectionObserver suspension
  is deferred; document visibility and invalid/zero-size suspension are supported.
  Off-screen nonzero canvases can be stopped explicitly by the host.
- All 13 API and 20 lifecycle check groups passed, including repeated operations,
  rollback, failed updates, post-destroy behavior, and multiple instances.
- Chrome verified native tab switching, native container resize observation,
  100 start/stop operations, configuration updates, and resource cleanup.
- A bounded browser memory test completed three batches of 100 destroy cycles
  after warm-up. Post-GC weak references found no retained tested instances or
  removed canvases; no tracked listeners, observers, or frames remained.
- Forty-two rendering comparisons passed with the reference timeline normalized
  for the approved clock change. All prototype files remain unchanged.
- Build, development/production preview, and zero runtime dependencies verified.
- README records method contracts, timing changes, measurements, and limits.
  Long-running animation and cross-browser stability are not claimed by these tests.

---

## Milestone 4 — Presets

- [x] Create preset configuration architecture
- [x] Implement Default preset
- [x] Implement Deep Space preset
- [x] Implement Milky Way preset
- [x] Implement Constellation preset
- [x] Allow user configuration to override presets
- [x] Support changing presets at runtime
- [x] Document preset configuration

### Acceptance criteria

- [x] Each preset provides a distinct visual appearance
- [x] Presets do not mutate default configuration
- [x] User configuration takes precedence over preset values
- [x] Presets can be switched safely at runtime
- [x] Preset changes do not cause resource accumulation

### Preset verification

Implemented, verified, and approved by the user on 2026-11-26.
Milestone 4 is complete.
Milestone 5 has not been started.

- Four immutable internal presets resolve through the existing configuration
  validation and atomic update path; no rendering or lifecycle changes were needed.
- Explicit preset selection resets previous overrides; overrides in the same call
  win. Ordinary partial updates retain their existing behavior.
- All 13 API, 20 lifecycle, and 13 preset check groups passed; build and zero
  runtime dependencies verified. Original prototype hashes remain unchanged.
- Ten deterministic Chrome comparisons matched Default against omitted preset at
  DPR 1 and 3. Browser captures show distinct appearances for the four presets.
- Four batches of 100 browser switches preserved two independent instances and
  fixed resource counts. Post-GC checks found zero retained replaced configurations
  or star collections; final destruction removed all tracked resources.
- README records settings, switching semantics, bounded rendering/memory results,
  and limitations. These checks do not establish long-running or mobile performance.

---

## Milestone 5 — Quality and performance

### Rendering and architecture review

- [ ] Review deltaTime handling
- [ ] Review frame-rate-dependent mouse repulsion
- [ ] Align connections with rendered star positions
- [ ] Review galaxy generation algorithm
- [ ] Review rendering performance
- [ ] Review per-frame object and array allocations
- [ ] Review quadratic connection calculations
- [ ] Review Canvas 2D shadowBlur performance
- [ ] Review canvas resizing behavior
- [ ] Review high-DPI canvas memory consumption
- [ ] Evaluate configurable device pixel ratio limits
- [ ] Evaluate configurable rendering limits
- [ ] Review resource cleanup
- [ ] Review garbage collection behavior
- [ ] Avoid premature optimization
- [ ] Measure performance before and after optimizations

### Accessibility and compatibility

- [ ] Support prefers-reduced-motion
- [ ] Ensure decorative canvas does not interfere
      with accessibility
- [ ] Ensure canvas does not block page interaction
- [ ] Test mobile behavior
- [ ] Test touch interaction
- [ ] Test high-DPI displays
- [ ] Test different viewport sizes
- [ ] Test different refresh rates
- [ ] Test Chromium-based browsers
- [ ] Test Firefox
- [ ] Test Safari

### Automated testing

- [ ] Configure Vitest
- [ ] Add configuration merging tests
- [ ] Add configuration validation tests
- [ ] Add preset tests
- [ ] Add star generation tests
- [ ] Add lifecycle management tests
- [ ] Add resource cleanup tests
- [ ] Add multiple instance tests
- [ ] Add deltaTime handling tests
- [ ] Add regression tests for identified bugs
- [ ] Add TypeScript declarations
- [ ] Verify TypeScript declarations

### Benchmark infrastructure

- [ ] Create benchmark/ directory
- [ ] Create dedicated benchmark page
- [ ] Implement FPS measurement
- [ ] Implement frame duration measurement
- [ ] Implement update and rendering time measurement
- [ ] Implement dropped frame tracking
- [ ] Implement configurable star count
- [ ] Implement individual effect toggles
- [ ] Implement multiple instance testing
- [ ] Implement repeated lifecycle testing
- [ ] Implement long-running test scenarios
- [ ] Ensure benchmark data does not grow indefinitely
- [ ] Ensure benchmark instrumentation does not introduce
      significant performance overhead
- [ ] Create docs/PERFORMANCE.md

### Long-running stability and performance tests

#### Performance targets

- Target 60 FPS with the default configuration on a
  documented reference device with a 60 Hz display.
- Target total frame duration within the 16.67 ms
  frame budget.
- Target library update and rendering time below 8 ms
  per frame on the reference device.
- Maintain zero runtime dependencies.
- Support at least 8 hours of continuous rendering
  without progressive performance degradation.
- Maintain stable memory usage after garbage collection.
- Avoid excessive CPU, GPU and memory consumption.
- Avoid blocking the main thread.
- Leave sufficient resources for the host application.

#### Stability tests

- [ ] Profile memory usage during a 30-minute animation
- [ ] Run an extended 8-hour stability test
- [ ] Verify heap usage stabilizes over time
- [ ] Test 100 initialization and destruction cycles
- [ ] Test 100 start and stop cycles
- [ ] Test 100 configuration updates
- [ ] Test repeated canvas resizing
- [ ] Test background tab and visibility changes
- [ ] Test high-DPI displays
- [ ] Test desktop and mobile devices
- [ ] Benchmark 100, 250, 500 and 1000 stars
- [ ] Benchmark with all visual effects enabled
- [ ] Benchmark individual visual effects
- [ ] Benchmark multiple simultaneous instances
- [ ] Verify resource cleanup after destroy()

#### Acceptance criteria

- [ ] No detected memory leaks
- [ ] No unbounded heap growth
- [ ] No unbounded internal collection growth
- [ ] No progressive FPS degradation
- [ ] No progressive increase in frame duration
- [ ] No browser freezes or crashes
- [ ] No unhandled runtime errors
- [ ] No accumulating event listeners or observers
- [ ] No duplicate animation loops
- [ ] No retained destroyed Starfield instances
- [ ] No active animation frames after stop() or destroy()
- [ ] Stable behavior after returning from a background tab
- [ ] Stable behavior after repeated configuration changes
- [ ] Stable behavior after repeated resizing
- [ ] Performance targets met with the default configuration
- [ ] Zero runtime dependencies verified

#### Benchmark reporting

- [ ] Document reference hardware and operating system
- [ ] Document browser and browser version
- [ ] Document viewport size and device pixel ratio
- [ ] Document display refresh rate
- [ ] Record tested configuration and enabled effects
- [ ] Record test duration
- [ ] Record average FPS and frame duration
- [ ] Record p95 and p99 frame duration
- [ ] Record dropped frames and long tasks
- [ ] Record initial, peak and final heap usage
- [ ] Record post-GC heap usage where measurable
- [ ] Record CPU and GPU usage where measurable
- [ ] Compare results before and after optimizations
- [ ] Document known limitations and trade-offs
- [ ] Save benchmark results in docs/PERFORMANCE.md

Performance targets are reference goals, not universal
guarantees across all devices and configurations.

JavaScript heap usage alone is not sufficient to evaluate
total memory consumption. Canvas backing stores, browser
resources and GPU memory should also be considered
where measurable.

Temporary memory fluctuations caused by garbage collection
are expected. The primary concern is sustained,
unbounded memory growth over time.

Tests must be executed and results documented before
marking them as completed.

Do not mark unexecuted tests as passed or fabricate
benchmark results.

---

## Milestone 6 — Interactive demo page

- [ ] Create responsive demo layout
- [ ] Create full-screen starfield preview
- [ ] Add interactive configuration panel
- [ ] Add preset selector
- [ ] Add live configuration updates
- [ ] Add star count controls
- [ ] Add star size controls
- [ ] Add star speed controls
- [ ] Add star color controls
- [ ] Add twinkle controls
- [ ] Add parallax controls
- [ ] Add mouse repulsion controls
- [ ] Add shooting star controls
- [ ] Add galaxy generation controls
- [ ] Add connection controls
- [ ] Add glow controls
- [ ] Add reset to defaults
- [ ] Add FPS counter
- [ ] Add start and stop controls
- [ ] Add copy configuration button
- [ ] Add installation and usage examples
- [ ] Add GitHub repository link
- [ ] Add npm package link after publication
- [ ] Add benchmark page link
- [ ] Verify mobile layout
- [ ] Verify keyboard accessibility

### Acceptance criteria

- [ ] Configuration changes are reflected in real time
- [ ] Configuration updates do not accumulate resources
- [ ] Presets can be switched without page reload
- [ ] Users can copy a valid configuration
- [ ] Demo works on desktop and mobile devices
- [ ] Demo uses the public library API
- [ ] Demo does not depend on internal library implementation
- [ ] Demo controls do not interfere with canvas interaction

---

## Milestone 7 — Documentation

### README

- [ ] Project introduction
- [ ] Feature overview
- [ ] Live demo link
- [ ] Installation instructions
- [ ] Quick start
- [ ] Configuration reference
- [ ] Presets reference
- [ ] Public API documentation
- [ ] Lifecycle management documentation
- [ ] Usage examples
- [ ] TypeScript usage examples
- [ ] Browser compatibility
- [ ] Accessibility recommendations
- [ ] Performance recommendations
- [ ] Known limitations
- [ ] Demo screenshots or GIFs
- [ ] Benchmark results summary
- [ ] License information
- [ ] Contribution guidelines

### Additional documentation

- [ ] Complete docs/PERFORMANCE.md
- [ ] Document benchmark methodology
- [ ] Document reference hardware
- [ ] Document performance results
- [ ] Document memory management approach
- [ ] Document rendering trade-offs
- [ ] Create CONTRIBUTING.md
- [ ] Create CHANGELOG.md

### Acceptance criteria

- [ ] Installation instructions are verified
- [ ] All documented examples work
- [ ] All public API methods are documented
- [ ] Configuration options and defaults are documented
- [ ] Performance claims are supported by measurements
- [ ] Known limitations are clearly documented

---

## Milestone 8 — npm package preparation

- [ ] Configure Vite library mode
- [ ] Generate ESM build
- [ ] Generate UMD build
- [ ] Configure package exports
- [ ] Include TypeScript declarations
- [ ] Configure package metadata
- [ ] Configure package keywords
- [ ] Configure repository URL
- [ ] Configure homepage URL
- [ ] Configure bugs URL
- [ ] Configure published files
- [ ] Exclude prototype from npm package
- [ ] Exclude demo from npm package
- [ ] Exclude benchmark from npm package
- [ ] Exclude development-only files
- [ ] Verify zero runtime dependencies
- [ ] Verify package bundle size
- [ ] Inspect npm pack output
- [ ] Test package in an external vanilla JavaScript project
- [ ] Test package in an external TypeScript project
- [ ] Test package in a React application
- [ ] Verify npm package name availability

### Acceptance criteria

- [ ] Package builds successfully
- [ ] ESM imports work correctly
- [ ] UMD build works correctly
- [ ] TypeScript declarations are resolved correctly
- [ ] Package contains only intended distribution files
- [ ] Package can be installed from a local npm tarball
- [ ] Library works outside the development repository
- [ ] Importing the package does not start rendering
      or access browser globals prematurely
- [ ] Zero runtime dependencies verified

---

## Milestone 9 — CI/CD and deployment

- [ ] Configure GitHub Actions
- [ ] Automate dependency installation
- [ ] Automate unit tests
- [ ] Automate build validation
- [ ] Automate TypeScript declaration validation
- [ ] Automate npm package validation
- [ ] Configure demo deployment workflow
- [ ] Deploy demo to GitHub Pages
- [ ] Deploy benchmark page
- [ ] Verify production build
- [ ] Verify asset paths
- [ ] Update GitHub website URL
- [ ] Add CI status badge to README
- [ ] Add npm version badge after publication
- [ ] Add license badge to README

### Acceptance criteria

- [ ] CI runs on pull requests and main branch updates
- [ ] Failed tests prevent successful CI validation
- [ ] Failed builds prevent deployment
- [ ] Demo deployment is reproducible
- [ ] Production demo works correctly
- [ ] No credentials or secrets are exposed

GitHub Pages deployment may require making the repository
public or using a GitHub plan that supports Pages
for private repositories.

---

## Milestone 10 — First release

### Pre-release checklist

- [ ] Review all previous milestones
- [ ] Verify acceptance criteria
- [ ] Review outstanding bugs
- [ ] Review outstanding performance issues
- [ ] Review long-running stability test results
- [ ] Review memory profiling results
- [ ] Review public API
- [ ] Review documentation
- [ ] Review package contents
- [ ] Review license
- [ ] Review repository history for sensitive information
- [ ] Verify all tests pass
- [ ] Verify production build
- [ ] Finalize CHANGELOG.md
- [ ] Set version to 0.1.0

### Publication

- [ ] Change GitHub repository visibility to public
- [ ] Publish package to npm
- [ ] Create Git tag v0.1.0
- [ ] Create GitHub release
- [ ] Verify installation from npm
- [ ] Verify public demo
- [ ] Verify benchmark page
- [ ] Verify documentation links
- [ ] Update GitHub repository metadata
- [ ] Add project to portfolio

### Post-release

- [ ] Monitor reported issues
- [ ] Collect user feedback
- [ ] Review real-world performance
- [ ] Fix identified bugs
- [ ] Plan subsequent releases
- [ ] Review API stability before v1.0.0

---

## Definition of done

A milestone can be considered complete only when:

- All required tasks are completed.
- All applicable acceptance criteria are satisfied.
- Existing functionality is preserved unless changes
  have been explicitly approved.
- Relevant automated tests pass.
- The project builds successfully.
- No known critical bugs remain.
- No known memory leaks or resource accumulation
  issues remain.
- Performance regressions have been investigated.
- Relevant documentation has been updated.
- Known limitations and trade-offs are documented.
- Changes have been reviewed and approved.

Do not mark tasks as completed without verification.

Do not start the next milestone without approval.

Do not commit, push, deploy or publish without approval.

---

## Future considerations

The following features are outside the initial release scope.
Evaluate them only after the core library is stable.

- [ ] Additional visual presets
- [ ] Spiral galaxy generation
- [ ] Nebula effects
- [ ] Custom star shapes
- [ ] Custom color palettes
- [ ] Configurable background gradients
- [ ] Adaptive rendering quality
- [ ] Configurable FPS limits
- [ ] Spatial partitioning for particle connections
- [ ] OffscreenCanvas support
- [ ] Web Worker rendering
- [ ] React integration package
- [ ] Vue integration package
- [ ] Web Component integration
- [ ] Advanced plugin architecture
- [ ] WebGL renderer

Future features should be justified by actual use cases,
performance measurements or user feedback.

Avoid increasing complexity without a measurable benefit.
