// Auditoría de diseño responsive (móvil / tablet / escritorio). NO forma parte de
// `npm run e2e` ni del CI: la configuración principal busca solo *.spec.js y este
// directorio solo tiene *.audit.js.
//
//   npx playwright test -c e2e/auditoria/playwright.audit.config.js
//
// Variables opcionales:
//   AUDITORIA_DIR   carpeta de salida (capturas + resultados.json + resumen.md);
//                   por defecto test-results/auditoria-responsive
//   AUDITORIA_SOLO  filtra rutas/diálogos por nombre (expresión regular)
//
// Usa el mismo servidor que la configuración principal (build e2e + preview en
// el puerto 4179, API falsa en http://api.test).
import { defineConfig, devices } from '@playwright/test';
import base from '../../playwright.config.js';

export default defineConfig({
  ...base,
  testDir: '.',
  testMatch: '**/*.audit.js',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  timeout: 120_000,
  outputDir: '../../test-results/auditoria-tmp',
  globalTeardown: './resumen.js',
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { ...base.webServer, cwd: '../..' },
});
