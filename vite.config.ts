import { defineConfig } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';

const single = process.env.SINGLE === '1';

export default defineConfig({
  // Relative base so the same build works on GitHub Pages project sites and from file://
  base: './',
  plugins: single ? [viteSingleFile()] : [],
  build: {
    outDir: single ? 'dist-single' : 'dist',
    target: 'es2020',
  },
  test: { environment: 'jsdom' },
});
