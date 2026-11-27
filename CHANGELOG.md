# Changelog

User-visible changes are recorded here. No npm release has been published;
`0.0.0` in package metadata is a development placeholder, not a released version.

## Unreleased

### Added

- Dependency-free ES module library extracted from the original Canvas 2D prototype.
- Canvas/selector constructor, validated nested configuration, immutable defaults,
  independent instances, container sizing, and TypeScript source declarations.
- Default, Deep Space, Milky Way, and Constellation presets with runtime switching.
- Public start, stop, destroy, and atomic configuration update methods.
- Hidden-document and zero-size suspension, resize observation, and bounded
  animation deltas; resource cleanup on destruction.
- Respect for reduced motion and an optional device pixel ratio cap.
- Interactive playground with live controls, palette editing, configuration export,
  pause/reset, frame cadence display, and a shared benchmark build.
- Vitest coverage, browser checks, benchmark tooling, and recorded 30-minute
  headless Chrome stability results.
- User-facing documentation, runnable examples, contribution guide, and separate
  historical verification records.
- ESM and UMD distribution builds, conditional exports with matching TypeScript
  declarations, package metadata, and automatic local-tarball builds.
- Package-content, installed-consumer, rendering-parity, and browser checks for
  vanilla JavaScript, TypeScript, and React effect cleanup.

### Changed from the prototype

- Configuration and pointer state belong to each instance rather than globals.
- Canvas sizing follows independent CSS dimensions and pointer coordinates are local.
- Animation uses an active clock; resume starts with zero movement delta and other
  delayed frames are capped at 50 ms. Shooting stars use active-instance time.
- Repulsion follows elapsed time with a 60 Hz reference.
- Connections follow rendered star positions, including parallax and repulsion.
- DPR-only changes preserve particles; CSS-size changes regenerate the field.
- Reused positions and nearby-star storage replace some per-frame allocations.

### Release status and known limits

- Original prototype files and configuration values remain preserved. Approved
  behavior changes above are intentional; full pixel parity is not claimed.
- Local npm packaging/exports are prepared. Release publication, GitHub Pages
  deployment, and CI remain future milestones. The package stays private with
  development version `0.0.0`; no registry installation is advertised.
- Safari/Firefox compatibility checks and the eight-hour stability test are
  explicitly deferred. Physical-mobile and physical-display performance checks
  remain outstanding. A 30-minute headless result does not replace them.
- See [performance notes](docs/PERFORMANCE.md) for measured costs and limitations.
