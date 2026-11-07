// Pruebas de extremo a extremo (Playwright). Se ejecutan con `npm run e2e`.
// La app se compila apuntando a una API falsa (http://api.test) y cada prueba
// responde esas peticiones con datos de prueba: nunca se llama a la API real
// ni a Google. Ver e2e/support/fixtures.js.
import { defineConfig, devices } from '@playwright/test';

const PUERTO = 4179; // distinto del 4173 de `npm run preview` para no reutilizarlo por error
const CI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  expect: { timeout: 7_000 },
  use: {
    baseURL: `http://localhost:${PUERTO}/gestion/`,
    trace: 'on-first-retry',
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    // Build de producción + preview: es lo más parecido a lo que se publica
    command: 'npx vite build --config e2e/vite.config.e2e.js && npx vite preview --config e2e/vite.config.e2e.js',
    url: `http://localhost:${PUERTO}/gestion/`,
    reuseExistingServer: !CI,
    timeout: 180_000,
    env: {
      VITE_API_URL: 'http://api.test',
      VITE_GOOGLE_CLIENT_ID: 'e2e-client-id.apps.googleusercontent.com',
    },
  },
});
