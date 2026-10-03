import { defineConfig } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  // Relative base so the same build works on GitHub Pages project sites and from file://
  base: './',
  // One self-contained HTML file: it is both the hosted app and the template for saved patient files.
  plugins: [viteSingleFile()],
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
  test: { environment: 'jsdom' },
});
