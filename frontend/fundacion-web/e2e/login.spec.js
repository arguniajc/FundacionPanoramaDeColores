import { test, expect } from './support/fixtures.js';
import { USUARIO, STATS_NINOS, crearJwt } from './support/datos.js';

test.describe('Acceso', () => {
  test('sin sesión, una ruta protegida redirige a la página de acceso', async ({ page }) => {
    await page.goto('#/sede/beneficiarios');

    await expect(page).toHaveURL(/#\/acceso$/);
    await expect(page.getByText('Panel Administrativo')).toBeVisible();
    await expect(page.getByText('Ingresa con tu cuenta autorizada de Google')).toBeVisible();
    // El script de Google (simulado) dibuja su botón dentro del contenedor de la app
    await expect(page.getByTestId('google-login')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('admin_token'))).toBeNull();
  });

  test('el credential de Google se envía a la API y abre el panel', async ({ page, api }) => {
    api.on('POST', '/api/auth/google', {
      token: crearJwt(), rol: 'administrador', permisos: {}, ...USUARIO,
    });
    api.on('GET', '/api/beneficiarios/stats-ninos', STATS_NINOS);

    await page.goto('#/acceso');
    await page.getByTestId('google-login').click();

    await expect(page).toHaveURL(/#\/sede$/);
    await expect(page.getByRole('heading', { name: /(Buenos días|Buenas tardes|Buenas noches), Ana/ })).toBeVisible();
    expect(api.llamadas('POST', '/api/auth/google')[0].body).toEqual({ idToken: 'credencial-google-falsa' });
    expect(await page.evaluate(() => localStorage.getItem('admin_rol'))).toBe('administrador');
  });

  test('un correo sin permisos (403) ve el mensaje y sigue en el acceso', async ({ page, api }) => {
    api.on('POST', '/api/auth/google', () => ({ status: 403, json: { mensaje: 'Usuario no autorizado' } }));

    await page.goto('#/acceso');
    await page.getByTestId('google-login').click();

    await expect(page.getByRole('alert')).toHaveText('Tu correo no tiene permisos para acceder al panel.');
    await expect(page).toHaveURL(/#\/acceso$/);
  });
});
