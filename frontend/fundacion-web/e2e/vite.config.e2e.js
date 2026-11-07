// Configuración de Vite solo para las pruebas e2e: la misma del proyecto, pero
// compila en dist-e2e/ (para no pisar el dist/ que se publica) y sin el plugin
// que escribe dist/.nojekyll (no aplica aquí y fallaría si dist/ no existe).
import { defineConfig, mergeConfig } from 'vite';
import base from '../vite.config.js';

export default mergeConfig(
  { ...base, plugins: base.plugins.filter(p => p?.name !== 'nojekyll') },
  defineConfig({
    build:   { outDir: 'dist-e2e', emptyOutDir: true },
    preview: { port: 4179, strictPort: true },
  }),
);
