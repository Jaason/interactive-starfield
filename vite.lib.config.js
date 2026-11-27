import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: false,
  plugins: [{
    name: 'starfield-declarations',
    async generateBundle() {
      const source = await readFile(new URL('./src/index.d.ts', import.meta.url), 'utf8');
      // Each module format needs declarations with the matching module identity.
      for (const fileName of ['index.d.ts', 'index.d.cts']) {
        this.emitFile({ type: 'asset', fileName, source });
      }
    },
  }],
  build: {
    outDir: 'dist-lib',
    emptyOutDir: true,
    target: 'es2020',
    lib: {
      entry: fileURLToPath(new URL('./src/index.js', import.meta.url)),
      name: 'InteractiveStarfield',
      formats: ['es', 'umd'],
      fileName: format => format === 'es' ? 'starfield.js' : 'starfield.umd.cjs',
    },
  },
});
