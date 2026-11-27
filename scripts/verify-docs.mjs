import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import defaultConfig from '../src/defaultConfig.js';
import { Starfield as LibraryStarfield } from '../src/index.js';
import { fixture } from './helpers/browser-fixture.mjs';
import { mountBackgrounds } from '../docs/examples/lifecycle.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const documents = ['README.md', 'CONTRIBUTING.md', 'CHANGELOG.md', 'docs/API.md', 'docs/PLAYGROUND.md', 'docs/PERFORMANCE.md', 'docs/VERIFICATION.md'];
const texts = new Map(await Promise.all(documents.map(async name => [name, await readFile(resolve(root, name), 'utf8')])));
const slug = heading => heading.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/ /g, '-');
let links = 0;
for (const [name, markdown] of texts) {
  const withoutCode = markdown.replace(/```[^\n]*\n[\s\S]*?```/g, '');
  for (const match of withoutCode.matchAll(/!?\[[^\]]*\]\(([^\s)]+)\)/g)) {
    const destination = match[1];
    if (/^[a-z][a-z0-9+.-]*:/i.test(destination)) continue;
    const [path, fragment] = destination.split('#');
    const target = path ? resolve(dirname(resolve(root, name)), decodeURIComponent(path)) : resolve(root, name);
    await access(target);
    if (fragment && target.endsWith('.md')) {
      const content = await readFile(target, 'utf8');
      const headings = [...content.matchAll(/^#{1,6} (.+)$/gm)].map(match => slug(match[1]));
      assert.ok(headings.includes(decodeURIComponent(fragment)), `${name}: missing anchor ${destination}`);
    }
    links++;
  }
}

const readme = texts.get('README.md');
const documented = new Map([...readme.matchAll(/^\| `([^`]+)` \| `([^`]+)` \|/gm)].map(([, key, value]) => [key, JSON.parse(value)]));
let defaults = 0;
for (const [section, fields] of Object.entries(defaultConfig)) for (const [key, value] of Object.entries(fields)) {
  assert.deepEqual(documented.get(`${section}.${key}`), value, `README default mismatch: ${section}.${key}`); defaults++;
}
assert.equal(documented.size, defaults, 'README contains unknown configuration defaults');
const typed = readme.match(/<!-- example: typed -->\s*```ts\n([\s\S]*?)```/)[1];
assert.equal(typed.trim(), (await readFile(resolve(root, 'docs/examples/typed.ts'), 'utf8')).trim());

let examples = 0;
for (const name of ['README.md', 'docs/API.md']) {
  for (const [, block] of texts.get(name).matchAll(/```js\n([\s\S]*?)```/g)) {
    const env = fixture();
    env.document.querySelector = () => env.canvas;
    const instances = [];
    class Starfield extends LibraryStarfield {
      constructor(...args) { super(...args); instances.push(this); }
    }
    const prior = Object.getOwnPropertyDescriptor(globalThis, 'document');
    Object.defineProperty(globalThis, 'document', { configurable: true, value: env.document });
    try {
      const code = block.replace(/^import[^\n]*;\s*$/gm, '');
      const declaresField = /(?:const|let|var)\s+field\b/.test(code);
      const field = declaresField ? undefined : new Starfield(env.canvas);
      // Run trusted repository examples in the library's realm: VM-created
      // objects have different prototypes and fail the plain-object contract.
      const execute = new Function('Starfield', 'document', 'suppliedField',
        (declaresField ? '' : 'const field = suppliedField;\n') + code);
      execute(Starfield, env.document, field);
      examples++;
    } finally {
      for (const instance of instances) instance.destroy();
      if (prior) Object.defineProperty(globalThis, 'document', prior); else delete globalThis.document;
    }
    assert.equal(env.frames.size, 0); assert.equal(env.listeners.size, 0); assert.equal(env.observers.size, 0);
  }
}
const env = fixture();
const remove = mountBackgrounds(env.canvas, new env.Canvas());
assert.equal(env.frames.size, 2);
remove(); remove();
assert.equal(env.frames.size, 0); assert.equal(env.listeners.size, 0); assert.equal(env.observers.size, 0);
console.log(`PASS ${links} local links/anchors, ${defaults} configuration defaults, ${examples} JavaScript snippets, TypeScript snippet synchronization, and two-instance cleanup.`);
console.log('Browser rendering, TypeScript compilation, shell setup, and remote links require separate verification.');
