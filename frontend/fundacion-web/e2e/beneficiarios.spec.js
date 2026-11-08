import { test, expect, mockListaBeneficiarios } from './support/fixtures.js';
import { BENEFICIARIOS, INCOMPLETOS, FOTO_PRIVADA, PNG_1X1 } from './support/datos.js';

const filas = page => page.locator('table tbody tr');

test.describe('Beneficiarios — Niños', () => {
  test.beforeEach(async ({ api, sesion }) => {
    await sesion();
    mockListaBeneficiarios(api);
  });

  test('muestra la lista que devuelve la API', async ({ page, api }) => {
    await page.goto('#/sede/beneficiarios');

    await expect(page.getByText('Beneficiarios — Niños')).toBeVisible();
    await expect(filas(page)).toHaveCount(BENEFICIARIOS.length);
    for (const b of BENEFICIARIOS)
      await expect(filas(page).filter({ hasText: b.nombreMenor })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Activos (3)' })).toBeVisible();

    const params = api.llamadas('GET', '/api/beneficiarios')[0].url.searchParams;
    expect(Object.fromEntries(params)).toEqual({ pagina: '1', porPagina: '15', estado: 'activos', tipo: 'niño' });
  });

  test('el buscador filtra y envía `buscar` a la API', async ({ page, api }) => {
    await page.goto('#/sede/beneficiarios');
    await expect(filas(page)).toHaveCount(3);

    await page.getByPlaceholder('Buscar nombre, documento, acudiente…').fill('santiago');

    await expect(filas(page)).toHaveCount(1);
    await expect(filas(page).first()).toContainText('Santiago Pérez Mina');
    const conBusqueda = api.llamadas('GET', '/api/beneficiarios')
      .filter(p => p.url.searchParams.get('buscar') === 'santiago');
    expect(conBusqueda).toHaveLength(1); // con debounce: una sola petición, no una por tecla
  });

  test('Editar: obligatorios marcados, error en su campo y documento repetido sin contarse a sí mismo', async ({ page, api }) => {
    api.on('POST', '/api/beneficiarios/verificar-documento', { existe: true, id: 102, nombre: 'Santiago Pérez Mina' });
    api.on('GET', /^\/api\/beneficiarios\/\d+\/historial$/, []);
    await page.goto('#/sede/beneficiarios');
    await filas(page).filter({ hasText: 'Valentina Rodríguez Gómez' }).getByTitle('Editar').click();

    const dialogo = page.getByRole('dialog').filter({ hasText: 'Editar inscripción' });
    await expect(dialogo).toBeVisible();
    await expect(dialogo.getByText('Campo obligatorio')).toBeVisible();

    // Departamento es obligatorio por la regla: lleva la marca y su error queda en el propio campo
    const depto = dialogo.getByRole('combobox', { name: /^Departamento/ });
    await expect(depto).toHaveAttribute('required', '');
    await dialogo.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(dialogo.getByRole('alert').filter({ hasText: 'Corrige estos datos para guardar' }))
      .toContainText('Departamento: Selecciona el departamento de nacimiento. Ejemplo: Valle del Cauca');
    await expect(depto).toHaveAccessibleDescription('Selecciona el departamento de nacimiento. Ejemplo: Valle del Cauca');
    expect(api.llamadas('PUT', '/api/beneficiarios/101')).toHaveLength(0);

    // Su propio número no se consulta; otro número sí, excluyendo al propio registro
    const numero = dialogo.getByRole('textbox', { name: /^Número de documento/ });
    await numero.focus();
    await numero.blur();
    expect(api.llamadas('POST', '/api/beneficiarios/verificar-documento')).toHaveLength(0);
    await numero.fill('1107654321');
    await numero.blur();
    const aviso = dialogo.getByRole('alert').filter({ hasText: 'ya está registrado' });
    await expect(aviso).toContainText('a nombre de Santiago Pérez Mina');
    expect(api.llamadas('POST', '/api/beneficiarios/verificar-documento')[0].body)
      .toEqual({ numero: '1107654321', excluirId: 101 });

    await aviso.getByRole('button', { name: 'Ver beneficiario' }).click();
    await expect(dialogo).toBeHidden();
    await expect.poll(() => api.llamadas('GET', '/api/beneficiarios/102').length).toBeGreaterThan(0);
  });

  test('"Pendientes" consulta los perfiles incompletos solo al abrirse', async ({ page, api }) => {
    api.on('GET', '/api/beneficiarios/incompletos', INCOMPLETOS);
    api.on('POST', '/api/archivos/firmar', ({ body }) => ({
      json: { urls: Object.fromEntries(body.referencias.map(r => [r, PNG_1X1])) },
    }));

    await page.goto('#/sede/beneficiarios');
    await expect(filas(page)).toHaveCount(3);
    expect(api.llamadas('GET', '/api/beneficiarios/incompletos')).toHaveLength(0);

    // (el Tooltip le da al botón el nombre accesible 'Perfiles con datos sin completar')
    await page.getByRole('button').filter({ hasText: 'Pendientes' }).click();

    const dialogo = page.getByRole('dialog');
    await expect(dialogo.getByText('Perfiles pendientes por completar')).toBeVisible();
    await expect(dialogo.getByText('Isabella Castro Ríos')).toBeVisible();
    await expect(dialogo.getByText('60% completo')).toBeVisible();
    await expect(dialogo.getByText('WhatsApp', { exact: true })).toBeVisible();

    const llamadas = api.llamadas('GET', '/api/beneficiarios/incompletos');
    expect(llamadas).toHaveLength(1);
    expect(llamadas[0].url.searchParams.get('tipo')).toBe('niño');

    // La foto es privada: se firma con la API antes de mostrarla
    await expect(dialogo.locator('img')).toHaveAttribute('src', PNG_1X1);
    expect(api.llamadas('POST', '/api/archivos/firmar')[0].body).toEqual({ referencias: [FOTO_PRIVADA] });
  });
});
