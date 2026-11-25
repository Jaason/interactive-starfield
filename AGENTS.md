# Interactive Starfield

## Project goal

Build a lightweight, dependency-free, framework-agnostic
JavaScript library for interactive starfield backgrounds
using the Canvas 2D API.

The project will be published on npm and GitHub, with
documentation and an interactive demo page.

## Source of truth

The original working implementation is located in /prototype.

Use it as the foundation for the library.
Preserve existing functionality and visual behavior.

Original prototype:
https://jsfiddle.net/Jaason/yztaebxm/

## Technical stack

- Vanilla JavaScript (ES modules)
- Canvas 2D API
- Vite
- npm
- Vitest
- GitHub Actions
- GitHub Pages
- MIT License

## Development principles

- Zero runtime dependencies.
- Keep the implementation framework-agnostic.
- Prefer simple, readable, maintainable code.
- Avoid unnecessary abstractions and overengineering.
- Follow separation of concerns.
- Preserve existing configuration values and visual behavior.
- Support multiple independent Starfield instances.
- Avoid shared mutable global state.
- Support desktop and mobile devices.
- Handle high-DPI displays.
- Clean up event listeners and animation frames.
- Use English for code, comments and documentation.
- Provide TypeScript declarations before the first stable release.

## Performance and memory management

The library must be designed for continuous, long-running
animations without memory leaks, progressive performance
degradation, or excessive resource consumption.

### Memory management

- Prevent memory leaks and unbounded memory growth.
- Avoid unnecessary object and array allocations inside
  the animation loop.
- Reuse objects and data structures where practical.
- Prevent unbounded growth of internal collections.
- Avoid retaining unnecessary references to DOM elements,
  canvas contexts, or destroyed instances.
- Ensure garbage collection is not prevented by retained
  references or closures.

### Animation lifecycle

- Maintain only one active requestAnimationFrame loop
  per instance.
- Prevent duplicate animation loops.
- Cancel pending animation frames when stopped or destroyed.
- Remove all event listeners and disconnect observers
  when destroying an instance.
- Ensure repeated initialization and destruction do not
  accumulate resources.
- Pause rendering when the document is hidden.
- Consider pausing rendering when the canvas is off-screen.
- Handle large deltaTime values safely after inactivity.

### Rendering performance

- Keep per-frame computational complexity as low as possible.
- Avoid unnecessary calculations and redundant rendering.
- Avoid unnecessary DOM reads and writes in the animation loop.
- Minimize expensive Canvas 2D operations.
- Review algorithms with quadratic or higher complexity.
- Handle high-DPI displays without excessive canvas memory usage.
- Consider configurable device pixel ratio limits.
- Ensure reasonable CPU and GPU usage on mobile devices.
- Avoid blocking the main thread.
- Prefer measured optimizations over premature optimization.

### Performance verification

- Use browser profiling tools to identify performance
  bottlenecks and memory leaks.
- Monitor FPS, frame duration, heap usage and CPU usage.
- Test long-running animations for progressive degradation.
- Test repeated start, stop, destroy and initialization cycles.
- Test repeated resizing and configuration updates.
- Test multiple simultaneous Starfield instances.
- Verify that memory usage stabilizes after garbage collection.
- Report performance regressions and known limitations.
- Do not claim performance improvements without measurements.

Performance and memory management must be considered
during every milestone, not only during the final
optimization phase.

Any trade-offs between visual quality, performance,
memory consumption and code complexity must be
documented and explained.

## Workflow

- Read ROADMAP.md before starting implementation.
- Work on one milestone at a time.
- Explain proposed changes before implementation.
- Do not modify the original prototype.
- Do not introduce unrelated features or fixes.
- Explain important architectural decisions.
- Run relevant tests and build checks after changes.
- Update ROADMAP.md after completing a milestone.
- Report known issues and remaining limitations.
- Wait for approval before starting the next milestone.
- Do not commit, push, deploy or publish without approval.