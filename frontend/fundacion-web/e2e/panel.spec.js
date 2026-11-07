import { test, expect } from './support/fixtures.js';
import { USUARIO, STATS_NINOS } from './support/datos.js';

const MODULOS_ADMIN = [
  'Inicio', 'Beneficiarios', 'Proyectos', 'Inscripciones', 'Actividades', 'Sedes', 'Voluntarios',
  'Donaciones', 'Contabilidad', 'Inventario', 'Talento humano', 'Organigrama',
  'Reportes', 'Documentos', 'Log de descargas', 'Seguridad', 'Equipo', 'Configuración',
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
    for (const modulo of MODULOS_ADMIN)
      await expect(menu.getByRole('button', { name: modulo, exact: true })).toBeVisible();

    // Datos del usuario en el menú de la cuenta
    await page.getByRole('button', { name: 'Mi cuenta' }).click();
    await expect(page.getByRole('menu').getByText(USUARIO.nombre)).toBeVisible();
    await expect(page.getByRole('menu').getByText(USUARIO.email)).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Cerrar sesión' })).toBeVisible();

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

  test('el buscador del menú filtra los módulos', async ({ page, sesion }) => {
    await sesion();
    await page.goto('#/sede');

    const menu = page.locator('.MuiDrawer-paper').first();
    await menu.getByRole('textbox', { name: 'Buscar módulo' }).fill('conta');
    await expect(menu.getByRole('button', { name: 'Contabilidad', exact: true })).toBeVisible();
    await expect(menu.getByRole('button', { name: 'Proyectos', exact: true })).toHaveCount(0);
  });

  test('el menú se puede compactar y ocultar, y la elección se recuerda', async ({ page, sesion }) => {
    await sesion();
    await page.goto('#/sede');

    const menu = page.locator('.MuiDrawer-paper').first();
    await menu.getByRole('button', { name: 'Contraer menú' }).click();
    await expect(menu.getByRole('textbox', { name: 'Buscar módulo' })).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('sidebarVista'))).toBe('compacto');

    await page.getByRole('button', { name: 'Mostrar u ocultar el menú' }).click();
    await expect(menu.getByRole('button')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('sidebarVista'))).toBe('oculto');

    await page.reload();
    await expect(page.locator('.MuiDrawer-paper').first().getByRole('button')).toHaveCount(0);

    // Al volver a mostrarlo regresa a la vista compacta que tenía
    await page.getByRole('button', { name: 'Mostrar u ocultar el menú' }).click();
    await expect(page.locator('.MuiDrawer-paper').first().getByRole('button', { name: 'Expandir menú' })).toBeVisible();
  });

  test('cerrar sesión limpia la sesión y vuelve al acceso', async ({ page, sesion }) => {
    await sesion();
    await page.goto('#/sede');

    await page.getByRole('button', { name: 'Mi cuenta' }).click();
    await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click();

    await expect(page).toHaveURL(/#\/acceso$/);
    await expect(page.getByTestId('google-login')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('admin_token'))).toBeNull();
  });
});
