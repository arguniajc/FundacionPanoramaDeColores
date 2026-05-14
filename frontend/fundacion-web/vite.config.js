import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync } from 'fs'

// Plugin que genera .nojekyll en dist/ para que GitHub Pages no corra Jekyll
const nojekyll = {
  name: 'nojekyll',
  closeBundle() { writeFileSync('dist/.nojekyll', '') },
}

export default defineConfig({
  plugins: [react(), nojekyll],
  base: '/gestion/',
})
