import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
export default defineConfig({
  root: fileURLToPath(new URL('../demo/benchmark', import.meta.url)),
  base: './',
  server: { hmr: false },
  build: { outDir: '../../dist-benchmark', emptyOutDir: true },
});
