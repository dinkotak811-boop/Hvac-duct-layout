import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import {defineConfig} from 'vite';

// Build used by `npm run build:single`: everything in ONE chunk so the
// output can be inlined into a single offline-capable HTML file.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  resolve: {
    alias: {'@': path.resolve(import.meta.dirname, '.')},
  },
  build: {
    outDir: 'dist-single',
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100 * 1024 * 1024,
    chunkSizeWarningLimit: 10000,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
