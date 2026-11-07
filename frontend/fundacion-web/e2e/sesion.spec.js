// Aviso de inactividad (ControlSesion): a los 55 min sin actividad aparece
// "¿Sigues ahí?" y a los 60 min se cierra la sesión. Se usa el reloj simulado de
// Playwright para adelantar el tiempo en vez de esperar.
import { test, expect } from './support/fixtures.js';
import { USUARIO, crearJwt } from './support/datos.js';

const MIN = 60_000;

test.describe('Sesión por inactividad', () => {
  let inicio;

  test.beforeEach(async ({ page, sesion }) => {
    await page.clock.install();
    await sesion();
    await page.goto('#/sede');
    await expect(page.getByRole('heading', { name: /, Ana$/ })).toBeVisible();
    inicio = await page.evaluate(() => Date.now());
  });

  test('a los 55 minutos avisa y "Seguir conectado" renueva el token', async ({ page, api }) => {
    const nuevoToken = crearJwt({ venceEnMin: 9 * 60 });
    api.on('POST', '/api/auth/renovar', {
      token: nuevoToken, rol: 'administrador', permisos: {}, ...USUARIO,
    });

    // Salta 55 min y congela el reloj para que la cuenta regresiva no avance mientras se hace clic.
    await page.clock.pauseAt(inicio + 55 * MIN + 1000);

    const aviso = page.getByRole('dialog').filter({ hasText: '¿Sigues ahí?' });
    await expect(aviso).toBeVisible();
    await expect(aviso).toContainText(/tu sesión se cerrará en [45]:\d\d por inactividad/);

    await aviso.getByRole('button', { name: 'Seguir conectado' }).click();
    await page.clock.resume();

    await expect(aviso).toBeHidden();
    await expect.poll(() => api.llamadas('POST', '/api/auth/renovar').length).toBe(1);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('admin_token'))).toBe(nuevoToken);
  });

  test('si nadie responde, a los 60 minutos cierra la sesión', async ({ page }) => {
    await page.clock.fastForward('55:00');
    await expect(page.getByText('¿Sigues ahí?')).toBeVisible();

    await page.clock.fastForward('05:01');

    await expect(page).toHaveURL(/#\/acceso$/, { timeout: 3000 });
    expect(await page.evaluate(() => localStorage.getItem('admin_token'))).toBeNull();
  });
});
