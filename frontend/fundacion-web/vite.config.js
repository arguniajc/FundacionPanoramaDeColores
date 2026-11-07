import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'

export default defineConfig({
  plugins: [
    react(),
    // Genera dist/.nojekyll para que GitHub Pages no corra Jekyll al copiar a gestion/
    { name: 'nojekyll', closeBundle() { writeFileSync('dist/.nojekyll', '') } },
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  base: '/gestion/',
  // Pruebas unitarias (vitest lee este archivo): lógica pura, sin DOM.
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
  },
})
