// Build, pack, and install the real distribution in an isolated consumer project.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { createRequire } from 'node:module';
import { fixture } from './helpers/browser-fixture.mjs';
import { Starfield as SourceStarfield } from '../src/index.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const consumer = await mkdtemp(join(tmpdir(), 'starfield-package-'));
const npm = (args, cwd = root) => execFileSync('npm', args, {
  cwd, encoding: 'utf8', env: { ...process.env, npm_config_cache: join(consumer, '.npm-cache') },
});
const packed = JSON.parse(npm(['pack', '--json', '--pack-destination', consumer]));
assert.equal(packed.length, 1);
const report = packed[0];
assert.deepEqual(report.files.map(file => file.path).sort(), [
  'CHANGELOG.md', 'LICENSE', 'README.md', 'package.json',
  'dist-lib/index.d.cts', 'dist-lib/index.d.ts',
  'dist-lib/starfield.js', 'dist-lib/starfield.umd.cjs',
].sort());
await writeFile(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
npm(['install', '--offline', '--no-audit', '--no-fund', join(consumer, report.filename)], consumer);
const installed = join(consumer, 'node_modules/interactive-starfield');
const metadata = JSON.parse(await readFile(join(installed, 'package.json'), 'utf8'));
for (const key of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
  assert.equal(Object.keys(metadata[key] ?? {}).length, 0, `${key} must be empty`);
}
// Repository entry scripts run on import; published library files do not.
assert.deepEqual(metadata.sideEffects, ['./demo/**', './benchmark/**', '**/*.css']);
assert.deepEqual(JSON.parse(npm(['ls', '--omit=dev', '--json'], consumer)).dependencies['interactive-starfield'].version, metadata.version);

// Poison globals so even reads (including typeof) fail at import time.
await writeFile(join(consumer, 'imports.mjs'), `
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
for (const name of ['window', 'document', 'requestAnimationFrame', 'ResizeObserver', 'matchMedia']) {
  Object.defineProperty(globalThis, name, { get() { throw Error('Premature browser access: ' + name); } });
}
const esm = await import('interactive-starfield');
const cjs = createRequire(import.meta.url)('interactive-starfield');
assert.deepEqual(Object.keys(esm), ['Starfield']);
assert.deepEqual(Object.keys(cjs), ['Starfield']);
assert.equal(typeof esm.Starfield, 'function');
assert.equal(typeof cjs.Starfield, 'function');
`);
execFileSync(process.execPath, ['imports.mjs'], { cwd: consumer, stdio: 'inherit' });

// Verify the published declarations, including negative API cases, in both modes.
const types = (await readFile(join(root, 'tests/types/api.ts'), 'utf8'))
  .replace('../../src/index.js', 'interactive-starfield');
await writeFile(join(consumer, 'api.mts'), types);
await writeFile(join(consumer, 'api.cts'), types);
await copyFile(join(root, 'tests/package/typed.ts'), join(consumer, 'typed.ts'));
const tsconfig = JSON.parse(await readFile(join(root, 'tests/types/tsconfig.json'), 'utf8'));
tsconfig.files = ['api.mts', 'api.cts', 'typed.ts'];
await writeFile(join(consumer, 'tsconfig.json'), JSON.stringify(tsconfig));
const tsc = join(root, 'node_modules/.bin/tsc');
execFileSync(tsc, ['-p', consumer], { stdio: 'inherit' });
await writeFile(join(consumer, 'tsconfig.bundler.json'), JSON.stringify({
  ...tsconfig,
  compilerOptions: { ...tsconfig.compilerOptions, module: 'ESNext', moduleResolution: 'Bundler' },
  files: ['api.mts', 'typed.ts'],
}));
execFileSync(tsc, ['-p', join(consumer, 'tsconfig.bundler.json')], { stdio: 'inherit' });
for (const file of ['index.d.ts', 'index.d.cts']) {
  assert.equal(await readFile(join(installed, 'dist-lib', file), 'utf8'),
    await readFile(join(root, 'src/index.d.ts'), 'utf8'));
}

const { Starfield: ESMStarfield } = await import(pathToFileURL(join(installed, 'dist-lib/starfield.js')));
const { Starfield: UMDStarfield } = createRequire(join(consumer, 'package.json'))('interactive-starfield');
function sample(Starfield) {
  const originalRandom = Math.random;
  let seed = 42;
  Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const f = fixture(400, 240, 2, { reducedMotion: false });
  const drawings = [];
  const first = new Starfield(f.canvas);
  const second = new Starfield(new f.Canvas(), { preset: 'deep-space' });
  try {
    const defaults = JSON.parse(JSON.stringify(first.config));
    for (const time of [0, 16.667, 33.334, 9000, 9033.334]) {
      for (const [id, callback] of [...f.frames]) {
        f.frames.delete(id);
        callback(time);
      }
      drawings.push(f.calls.splice(0));
    }
    first.stop().stop(); assert.equal(f.frames.size, 1);
    first.start().start(); assert.equal(f.frames.size, 2);
    f.visibility(true); assert.equal(f.frames.size, 0);
    f.visibility(false); assert.equal(f.frames.size, 2);
    first.updateConfig({ preset: 'constellation', rendering: { maxDpr: 1 } });
    assert.equal(first.config.stars.count, 180);
    assert.equal(second.config.stars.count, 90);
    for (let i = 0; i < 100; i++) {
      const field = new Starfield(new f.Canvas());
      field.stop().start().updateConfig({ stars: { count: 1 } });
      field.destroy();
    }
    return { defaults, drawings };
  } finally {
    first.destroy(); second.destroy(); Math.random = originalRandom;
    for (const name of ['frames', 'observers', 'listeners', 'documentListeners', 'mediaListeners']) {
      assert.equal(f[name].size, 0, `${name} leaked`);
    }
  }
}
const reference = sample(SourceStarfield);
assert.deepEqual(sample(ESMStarfield), reference);
assert.deepEqual(sample(UMDStarfield), reference);

// Leave isolated fixtures for the optional real-browser/React check.
await mkdir(join(consumer, 'public'));
await copyFile(join(installed, 'dist-lib/starfield.umd.cjs'), join(consumer, 'public/starfield.umd.js'));
for (const file of ['index.html', 'vanilla.js', 'react.html', 'react.js', 'umd.html', 'typed.html']) {
  await copyFile(join(root, 'tests/package', file), join(consumer, file));
}
const sizes = {};
for (const file of ['starfield.js', 'starfield.umd.cjs']) {
  const bytes = await readFile(join(installed, 'dist-lib', file));
  sizes[file] = { bytes: bytes.length, gzipBytes: gzipSync(bytes).length };
}
console.log(JSON.stringify({
  consumer, tarball: report.filename, tarballBytes: report.size,
  unpackedBytes: report.unpackedSize, files: report.files.map(file => file.path), sizes,
  checks: ['local tarball installation', 'zero runtime dependencies', 'browser-free ESM/CJS imports',
    'NodeNext ESM/CJS and Bundler types', 'seeded source/build rendering parity',
    'independent instances, visibility, lifecycle and 100 destroy cycles per format'],
}, null, 2));
