import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('./demo', import.meta.url)),
  base: './',
  server: {
    // The minimal demo uses manual page reloads for source changes.
    hmr: false,
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
