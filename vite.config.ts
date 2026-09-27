import { defineConfig } from 'vitest/config';

// Configuración de Vite.
// `base` debe coincidir con el nombre del repositorio porque GitHub Pages
// publica el juego en https://habid8374.github.io/shooting_arena/
export default defineConfig({
  base: '/shooting_arena/',
  build: {
    target: 'es2022',
    sourcemap: true,
    // Three.js ocupa ~500 kB; es normal para un juego 3D.
    chunkSizeWarningLimit: 1000,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
