import { defineConfig } from 'vite';

export default defineConfig({
  // Относительные пути — игру можно положить в любую подпапку сайта техникума.
  base: './',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:3000' }
  },
  build: {
    rollupOptions: { input: { game: 'index.html', teacher: 'teacher/index.html' } },
    outDir: 'dist',
    assetsInlineLimit: 8192,
    target: 'es2020'
  }
});
