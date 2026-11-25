import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('./demo', import.meta.url)),
  base: './',
  server: {
    // Use manual page reloads until instance cleanup exists in Milestone 3.
    hmr: false,
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
