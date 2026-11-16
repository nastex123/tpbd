import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  base: './',
  server: {
    host: '127.0.0.1',
    port: 1420,
    strictPort: true,
    proxy: {
      '/api/local': {
        target: 'http://127.0.0.1:8000',
        rewrite: (path) => path.replace(/^\/api\/local/, ''),
      },
    },
  },
  clearScreen: false,
});
