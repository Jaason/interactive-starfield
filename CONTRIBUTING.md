# Contributing

This project is under development and has not been published to npm. Repository
access is required while it is private. Read [AGENTS.md](AGENTS.md) and
[ROADMAP.md](ROADMAP.md) before making changes.

## Local setup

For the full toolchain use Node.js 22.12+ in the 22.x line, Node 24.x, or Node 26+.
The recorded checks used Node 26.2.0 and npm 11.13.0. The package/Vite engine range
also admits Node 20.19+, but the installed Vitest 5 test runner does not; Node 20
is not a supported choice for running the full contributor checks. These are
build/test requirements, not runtime dependencies of the browser library.

```sh
git clone https://github.com/Jaason/interactive-starfield.git
cd interactive-starfield
npm ci
npm run dev
```

Open Vite's printed local URL. Reload manually after edits; HMR is disabled to
avoid retaining old preview instances. The demo includes a link to the benchmark.
`npm run benchmark` starts the standalone benchmark entry.

## Scope and implementation

- Use the existing prototype as the reference; do not edit `prototype/`.
- Keep runtime dependencies at zero and the API framework-agnostic.
- Keep changes within one approved milestone. Describe intended behavior before
  implementation, especially visual changes and changes to configuration defaults.
- Keep code, comments, and documentation in English.
- Preserve independent instances, cleanup, reduced-motion behavior, and safe timing.
- Prefer simple code and measured optimizations. Consider allocation, collection
  bounds, DPR memory, event listeners, observers, and RAF callbacks in every change.
- Never present an unexecuted test or deferred check as passed. Keep known limits
  and measurement conditions with results.

## Checks

```sh
npm test
npm run typecheck
npm run build
npm run build:benchmark
npm ls --omit=dev
node scripts/verify-docs.mjs
```

Use `npm run test:watch` during development. The older `verify:api`,
`verify:lifecycle`, and `verify:presets` commands target individual Vitest suites.
The type check includes the documented TypeScript example. Add focused regression
tests for changed behavior; do not add tests that merely reproduce implementation.

`npm run build` produces the playground and benchmark in `dist/`.
`npm run preview` serves that build locally. `npm run build:benchmark` creates
`dist-benchmark/` separately. These are site builds, not npm library distributions.

For browser fixtures, ports and prerequisites, use
[PERFORMANCE.md](docs/PERFORMANCE.md#browser-checks). Browser scripts require a
separate local Chrome debugging profile. Use loopback addresses, close only the
tabs/processes created for a test, and do not reuse personal browser sessions.
`node scripts/verify-demo.mjs [url]` covers playground behavior; Safari/Firefox
and physical-mobile checks remain separate. The eight-hour test is deferred and
must not be launched as part of a routine check run.

Runnable documentation examples are under `docs/examples/`. Start a repository-root
server with `npm exec -- vite .` and open `/docs/examples/quick-start.html` or
`/docs/examples/multiple.html` under its printed URL. Do not open module examples
through `file://`. The server command uses the locally installed Vite dependency.

## Review and commits

Describe the concrete problem, resulting behavior, relevant tests, and remaining
limitations. Include screenshots for visual changes and comparable measurements
for performance claims. Update the relevant documentation, `CHANGELOG.md` under
`Unreleased`, and the roadmap after verified work.

Use focused commit messages, such as `feat:`, `fix:`, `test:`, or `docs:` followed
by a concise description. Approval is required before committing, pushing,
deploying, publishing, or starting the next milestone. Approval of work with
explicitly deferred tests does not turn those tests into passing results.

Report bugs through the repository with reproduction steps, configuration,
browser/version, viewport, DPR, and relevant errors. For performance reports,
include the duration, hardware, measurement method, and raw output where available;
avoid placing credentials or other private data in reports.

## Source map

| Path | Responsibility |
| --- | --- |
| `src/` | Public entry, immutable configuration, star rendering, lifecycle, declarations |
| `prototype/` | Original reference, kept unchanged |
| `demo/` | Public-API playground and shared benchmark HTML entry |
| `benchmark/` | Measurement UI, bounded samples, standalone Vite configuration |
| `tests/` | Vitest suites and TypeScript checks |
| `scripts/` | Browser and documentation verification helpers |
| `docs/` | API details, examples, measurements, and historical verification |

Contributions are distributed under the project's [MIT license](LICENSE).
