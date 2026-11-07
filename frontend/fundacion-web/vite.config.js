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
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          // React/ReactDOM/router siempre se cargan al inicio y cambian poco:
          // en su propio chunk el navegador los conserva en caché entre despliegues.
          // (MUI no se agrupa: juntarlo metería en la carga inicial componentes
          // que hoy solo usan las páginas diferidas.)
          groups: [
            { name: 'react-vendor', test: /node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/ },
          ],
        },
      },
    },
  },
  // Pruebas unitarias (vitest lee este archivo): lógica pura, sin DOM.
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
  },
})
