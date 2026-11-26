import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('./demo', import.meta.url)),
  base: './',
  server: {
    // Reload the demo manually so edits cannot retain old canvas instances.
    hmr: false,
  },
  build: {
    outDir: '../dist',
    rollupOptions: {
      input: {
        demo: fileURLToPath(new URL('./demo/index.html', import.meta.url)),
        benchmark: fileURLToPath(new URL('./demo/benchmark/index.html', import.meta.url)),
      },
    },
    emptyOutDir: true,
  },
});
