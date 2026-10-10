import { defineConfig } from 'vite';

export default defineConfig({
  // Относительные пути — игру можно положить в любую подпапку сайта техникума.
  base: './',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 8192,
    target: 'es2020'
  }
});
