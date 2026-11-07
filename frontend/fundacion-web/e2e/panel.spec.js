import { test, expect } from './support/fixtures.js';
import { USUARIO, STATS_NINOS } from './support/datos.js';

const MODULOS_ADMIN = [
  'Dashboard', 'Beneficiarios', 'Donantes y Donaciones', 'Proyectos', 'Inscripciones a proyectos',
  'Sedes', 'Actividades', 'Voluntarios', 'Talento Humano', 'Organigrama', 'Contabilidad',
  'Inventario', 'Reportes', 'Documentos', 'Log Descargas', 'Seguridad', 'Equipo', 'Configuración',
];

test.describe('Panel', () => {
  test('con sesión de administrador carga el dashboard y el menú completo', async ({ page, api, sesion }) => {
    await sesion();
    api.on('GET', '/api/beneficiarios/stats-ninos', STATS_NINOS);

    await page.goto('');

    await expect(page).toHaveURL(/#\/sede$/);
    await expect(page.getByRole('heading', { name: /, Ana$/ })).toBeVisible();
    await expect(page.getByText('Niños activos').first()).toBeVisible();

    const menu = page.locator('.MuiDrawer-paper');
    await expect(menu.getByText(USUARIO.nombre)).toBeVisible();
    await expect(menu.getByText(USUARIO.email)).toBeVisible();
    for (const modulo of MODULOS_ADMIN)
      await expect(menu.getByRole('button', { name: modulo, exact: true })).toBeVisible();
    await expect(menu.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();

    // El token viaja en cada petición a la API
    const stats = api.llamadas('GET', '/api/beneficiarios/stats-ninos')[0];
    expect(stats.headers.authorization).toMatch(/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/);
  });

  test('un rol con permisos limitados solo ve sus módulos', async ({ page, sesion }) => {
    await sesion({ rol: 'coordinador', permisos: { beneficiarios: ['ver'], actividades: ['ver'] } });

    await page.goto('#/sede');

    const menu = page.locator('.MuiDrawer-paper');
    await expect(menu.getByRole('button', { name: 'Beneficiarios', exact: true })).toBeVisible();
    await expect(menu.getByRole('button', { name: 'Actividades', exact: true })).toBeVisible();
    await expect(menu.getByRole('button', { name: 'Contabilidad', exact: true })).toHaveCount(0);
    await expect(menu.getByRole('button', { name: 'Configuración', exact: true })).toHaveCount(0);
  });

  test('cerrar sesión limpia la sesión y vuelve al acceso', async ({ page, sesion }) => {
    await sesion();
    await page.goto('#/sede');

    await page.locator('.MuiDrawer-paper').getByRole('button', { name: 'Cerrar sesión' }).click();

    await expect(page).toHaveURL(/#\/acceso$/);
    await expect(page.getByTestId('google-login')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('admin_token'))).toBeNull();
  });
});
