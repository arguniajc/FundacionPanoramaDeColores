import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync } from 'fs'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    // Genera dist/.nojekyll para que GitHub Pages no corra Jekyll al copiar a gestion/
    { name: 'nojekyll', closeBundle() { writeFileSync('dist/.nojekyll', '') } },
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  base: '/gestion/',
  esbuild: {
    drop: ['console', 'debugger'],
  },
})
