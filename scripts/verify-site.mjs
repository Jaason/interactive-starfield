// Check emitted HTML/assets under both root and GitHub project-site URLs.
// This checks HTML/CSS references, not rendering, JavaScript strings, or remote URLs.
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, join, relative, extname } from 'node:path';

const root = resolve(process.argv[2] ?? 'dist');
async function filesAt(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    assert.ok(!entry.isSymbolicLink(), `Unexpected symlink: ${entry.name}`);
    const path = join(directory, entry.name);
    files.push(...(entry.isDirectory() ? await filesAt(path) : [path]));
  }
  return files;
}
const files = await filesAt(root);
assert.ok(files.includes(join(root, 'index.html')), 'Missing site index');
let checked = 0;
for (const prefix of ['/', '/interactive-starfield/']) {
  const base = new URL(prefix, 'https://pages.example');
  for (const file of files) {
    const extension = extname(file);
    assert.ok(['.html', '.js', '.css'].includes(extension), `Unexpected site artifact: ${file}`);
    const content = await readFile(file, 'utf8');
    const page = new URL(relative(root, file).split('\\').join('/'), base);
    const refs = [];
    if (extension === '.html') {
      for (const [, ref] of content.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)) refs.push(ref);
      assert.match(content, /<script\b[^>]*type=["']module["'][^>]*src=/, `Missing module entry: ${file}`);
    } else if (extension === '.css') {
      for (const [, ref] of content.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g)) refs.push(ref);
    }
    for (const ref of refs) {
      if (ref.startsWith('#') || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(ref)) continue;
      const url = new URL(ref, page);
      assert.ok(url.pathname.startsWith(prefix), `Path escapes project site: ${file} -> ${ref}`);
      let target = resolve(root, decodeURIComponent(url.pathname.slice(prefix.length)));
      assert.ok(target === root || target.startsWith(root + '/'), `Path escapes build: ${ref}`);
      if ((await stat(target)).isDirectory()) target = join(target, 'index.html');
      assert.ok((await stat(target)).isFile(), `Missing asset: ${file} -> ${ref}`);
      checked++;
    }
  }
}
if (files.includes(join(root, 'benchmark/index.html'))) {
  assert.match(await readFile(join(root, 'index.html'), 'utf8'), /href=["']\.\/benchmark\/["']/);
}
console.log(`PASS ${files.length} site files and ${checked} local references at root and /interactive-starfield/.`);
