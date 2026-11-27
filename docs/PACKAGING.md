# Package preparation

The library is prepared for local tarball installation, not published to npm.
`private: true` and development version `0.0.0` remain in place. Changing them,
publishing, tagging, repository visibility, and deployment belong to the release
workflow and require approval. Deferred Safari/Firefox, physical-device, and
eight-hour checks remain open; see [performance notes](PERFORMANCE.md).

## Build and package layout

`npm run build:lib` uses `vite.lib.config.js` and writes only `dist-lib/`.
`npm run build` still builds the demo/benchmark into `dist/`, and
`npm run build:benchmark` writes `dist-benchmark/`. The outputs are independent.
`npm pack` runs the library build through `prepack`, preventing stale artifacts
in a normal pack operation. Do not bypass scripts when preparing a new tarball.
Consumers of the tarball do not need Vite and run no installation build hook.

| File | Purpose |
| --- | --- |
| `dist-lib/starfield.js` | ESM named `Starfield` export |
| `dist-lib/starfield.umd.cjs` | UMD browser global `InteractiveStarfield`, or CommonJS named export |
| `dist-lib/index.d.ts` | ESM declarations |
| `dist-lib/index.d.cts` | CommonJS declarations |
| `package.json`, `README.md`, `CHANGELOG.md`, `LICENSE` | Metadata and distribution documentation |

The `files` allowlist excludes source, prototype, demo, benchmark, tests, tooling,
screenshots, and development reports. The README links to repository guides;
those guides require repository access while it is private. No extra runtime
packages, polyfills, CSS, images, or source maps are bundled. Syntax is targeted
at ES2020; this is not a browser compatibility certification.

Conditional `exports` choose declarations and JavaScript for `import`/`require`.
The `main`, `module`, and `types` fields serve older resolvers. Public subpaths
also expose `interactive-starfield/starfield.umd.cjs` and
`interactive-starfield/package.json`; implementation modules are not public API.
The declaration files are copied from the single maintained source declaration,
not independently authored. Their extensions distinguish ESM and CommonJS.

The `sideEffects` allowlist preserves repository demo/benchmark startup scripts
and styles. None of those paths is in the tarball, so distribution files remain
eligible for tree shaking. A blanket `false` also affected repository builds and
removed benchmark initialization during verification; the allowlist fixes that.
There are no library rendering, configuration, or lifecycle changes in this step.

For a classic script, copy the installed UMD file to a public `.js` asset and
serve it as JavaScript, then use `InteractiveStarfield.Starfield`. The `.cjs`
distribution extension also allows `require` under the package's `type: module`.
Loading ESM and UMD together creates separate class identities; normally choose
one format for a host application. Imports alone do not initialize a canvas.

The homepage points to the existing repository README, not a speculative Pages
URL. The public npm registry returned E404 for `interactive-starfield` on
2026-11-27. No public package was found; this does not reserve the name or
guarantee publication rights. Check again immediately before publication.

## Verification

```sh
npm test
npm run typecheck
npm run build
npm run build:benchmark
npm run verify:package
node scripts/verify-docs.mjs
```

`verify:package` runs the real prepack hook, checks the exact eight-file tarball,
and installs it offline in a new OS temporary directory. It verifies:

- Zero runtime, optional, or peer dependencies.
- Named ESM/CommonJS imports in a subprocess where reads of browser globals throw.
- TypeScript NodeNext ESM/CommonJS and Bundler resolution, including invalid API
  examples that must fail type checking. The external consumer uses the repository's
  installed compiler; its imports resolve the installed tarball's declarations.
- Seeded source-versus-distribution Canvas operation parity in browser doubles.
- Multiple independent instances, visibility, start/stop/configuration updates,
  and 100 create/update/destroy cycles per format with no tracked resources left.
- Raw/gzip sizes and the actual packed/unpacked archive size.

It prints and retains the isolated consumer path for inspection. It does not
install React, start a browser, publish, or run long-duration tests.

To run the additional browser check, install the host application's React
dependencies **in the printed temporary consumer directory**:

```sh
cd /path/printed/by/verify-package
npm install --save-exact react@19.3.1 react-dom@19.3.1
```

Start a dedicated Chrome session with remote debugging on loopback port 9228
using a separate temporary profile, as in the existing
[browser-check procedure](PERFORMANCE.md#browser-checks). Then, from this repository:

```sh
node scripts/verify-package-browser.mjs /path/printed/by/verify-package
```

The verifier starts loopback Vite servers on ports 5188/5189 and tests development
and production vanilla JavaScript, TypeScript, classic UMD, and React pages.
It checks actual canvas pixels, ten unmount/remount cycles per page, one active
library RAF/observer, listener cleanup, and no runtime exceptions. React's
development StrictMode must perform the initial setup/cleanup/setup sequence.
Production React does not replay effects. React itself is a host dependency only.
The traditional UMD script stays unbundled; Vite's warning about its missing
`type="module"` is expected, and the public asset is copied into the test build.

The script closes its pages and servers; close the separately started Chrome
process after the checks. Temporary consumer directories can be removed after
inspection. This test does not measure browser memory retention or long-term
performance; those require the separate profiling/stability procedure.

## Recorded results

Verification on 2026-11-27 used Node 26.2.0, npm 11.13.0, Vite 8.3.8,
TypeScript 7.0.2, React/ReactDOM 19.3.1, and headless Chrome 158.0.8127.37 on the existing
Apple M3 Pro reference machine. All 66 existing tests, source type checks,
three builds, package verification, and the documentation verifier passed.
All eight external browser cases (four entry pages in development/production)
passed, including React StrictMode replay, actual pixels, ten remounts per case,
zero final tracked resources, and no runtime exceptions. Production playground
checks also passed, including the benchmark link; the standalone production
benchmark also initialized successfully.

The final inspected archive contains eight files: 19,286 bytes compressed and
61,994 bytes unpacked, including metadata/documentation and both formats. No
repository dependencies or library/prototype source files changed.

| Artifact | Raw bytes | Gzip bytes |
| --- | ---: | ---: |
| ESM | 19,705 | 5,515 |
| UMD | 16,718 | 5,082 |

Sizes use Node's `gzipSync` defaults on the emitted JavaScript. They describe
transfer/storage size, not CPU/GPU use or an animation performance improvement.
ESM stays readable for debugging/tree shaking; UMD is minified. Both formats are
included in the archive, but consumers normally load only one.

Build and lifecycle behavior follows the official
[Vite library-mode guide](https://vite.dev/guide/build#library-mode) and
[npm lifecycle documentation](https://docs.npmjs.com/cli/v11/using-npm/scripts/).
