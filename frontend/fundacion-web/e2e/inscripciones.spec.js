import { test, expect, listadoVacio, mockListaBeneficiarios } from './support/fixtures.js';

const SEDES = [{
  id: 'sede-1', nombre: 'Sede Yumbo',
  programas: [
    { id: 'prog-arte', nombre: 'Arte y pintura', activo: true },
    { id: 'prog-viejo', nombre: 'Programa cerrado', activo: false },
  ],
}];
// Mensaje real de InscripcionesController cuando el programa está lleno
const CUPO_LLENO = 'El programa ya alcanzó su cupo máximo. Da de baja una inscripción o aumenta el cupo del programa.';

/** Abre "Nueva inscripción" y la deja lista para pulsar "Inscribir" (programa sin campos adicionales). */
async function llenarInscripcion(page, api, sesion) {
  await sesion();
  mockListaBeneficiarios(api);
  api
    .on('GET', '/api/inscripciones', listadoVacio)
    .on('GET', '/api/sedes', SEDES)
    .on('GET', '/api/sedes/programas/prog-arte/campos', []);
  await page.goto('#/sede/inscripciones');
  await page.getByRole('button', { name: 'Nueva inscripción' }).click();
  const dialogo = page.getByRole('dialog').filter({ hasText: 'Nueva Inscripción' });
  await expect(dialogo).toBeVisible();

  // Paso 1: beneficiario (se busca en la API)
  await dialogo.getByRole('combobox', { name: 'Buscar por nombre' }).fill('valen');
  await page.getByRole('option', { name: /Valentina Rodríguez Gómez/ }).click();
  await dialogo.getByRole('button', { name: 'Siguiente' }).click();

  // Paso 2: programa (solo los activos)
  await expect(dialogo.getByText('Programa cerrado')).toHaveCount(0);
  await dialogo.getByText('Arte y pintura').click();
  await dialogo.getByRole('button', { name: 'Siguiente' }).click();

  // Paso 3: autorización y firma
  await expect(dialogo.getByText('Este programa no tiene campos adicionales.')).toBeVisible();
  await dialogo.locator('.MuiFormControl-root').filter({ hasText: '¿Quién firma?' }).getByRole('combobox').click();
  await page.getByRole('option', { name: 'Madre' }).click();
  await dialogo.getByRole('textbox', { name: 'Nombre completo' }).fill('Ana Gómez');
  await dialogo.getByRole('textbox', { name: 'Número de documento' }).fill('1144123456');
  await firmar(page, dialogo);
  return dialogo;
}

/** Dibuja un trazo en el recuadro de firma y lo confirma. */
async function firmar(page, dialogo) {
  await dialogo.getByRole('button', { name: 'Firmar aquí' }).click();
  const pad = page.getByRole('dialog').filter({ hasText: 'Captura de firma' });
  const lienzo = pad.locator('canvas');
  await expect(lienzo).toBeVisible();
  // El pad se inicializa tras la animación del diálogo: se reintenta hasta que la firma quede capturada
  await expect(async () => {
    const caja = await lienzo.boundingBox();
    await page.mouse.move(caja.x + 30, caja.y + 120);
    await page.mouse.down();
    await page.mouse.move(caja.x + 120, caja.y + 60, { steps: 8 });
    await page.mouse.move(caja.x + 220, caja.y + 140, { steps: 8 });
    await page.mouse.up();
    await pad.getByRole('button', { name: 'Confirmar firma' }).click();
    await expect(pad).toBeHidden({ timeout: 1000 });
  }).toPass();
  await expect(dialogo.getByRole('img', { name: 'Firma capturada' })).toBeVisible();
}

test.describe('Inscripciones', () => {
  test('crear una inscripción envía beneficiario, programa y la autorización firmada', async ({ page, api, sesion }) => {
    api.on('POST', '/api/inscripciones', () => ({
      status: 201,
      json: { id: 'ins-1', nombreBeneficiario: 'Valentina Rodríguez Gómez', nombrePrograma: 'Arte y pintura', estado: 'activa' },
    }));
    const dialogo = await llenarInscripcion(page, api, sesion);
    const listadosAntes = api.llamadas('GET', '/api/inscripciones').length;

    await dialogo.getByRole('button', { name: 'Inscribir' }).click();

    await expect(dialogo).toBeHidden();
    await expect(page.getByText('Valentina Rodríguez Gómez inscrito en Arte y pintura')).toBeVisible();
    await expect.poll(() => api.llamadas('GET', '/api/inscripciones').length).toBeGreaterThan(listadosAntes);

    const llamadas = api.llamadas('POST', '/api/inscripciones');
    expect(llamadas).toHaveLength(1);
    const { beneficiarioId, programaId, datos, observaciones } = llamadas[0].body;
    expect({ beneficiarioId, programaId, observaciones }).toEqual({ beneficiarioId: 101, programaId: 'prog-arte', observaciones: null });
    // `datos` va como texto JSON con la firma y quién autoriza
    const formulario = JSON.parse(datos);
    expect(formulario.__firma_padre__).toMatch(/^data:image\/png;base64,/);
    expect(JSON.parse(formulario.__firma_meta__)).toMatchObject({ quien: 'madre', nombre: 'Ana Gómez', documento: '1144123456' });
  });

  test('sin firma no se envía y explica qué falta', async ({ page, api, sesion }) => {
    await sesion();
    mockListaBeneficiarios(api);
    api
      .on('GET', '/api/inscripciones', listadoVacio)
      .on('GET', '/api/sedes', SEDES)
      .on('GET', '/api/sedes/programas/prog-arte/campos', []);
    await page.goto('#/sede/inscripciones');
    await page.getByRole('button', { name: 'Nueva inscripción' }).click();
    const dialogo = page.getByRole('dialog').filter({ hasText: 'Nueva Inscripción' });

    // Sin beneficiario no avanza
    await dialogo.getByRole('button', { name: 'Siguiente' }).click();
    await expect(dialogo.getByRole('alert').filter({ hasText: 'Corrige estos datos para continuar' }))
      .toContainText('Beneficiario: Busca y selecciona el beneficiario');

    await dialogo.getByRole('combobox', { name: 'Buscar por nombre' }).fill('santi');
    await page.getByRole('option', { name: /Santiago Pérez Mina/ }).click();
    await dialogo.getByRole('button', { name: 'Siguiente' }).click();
    await dialogo.getByText('Arte y pintura').click();
    await dialogo.getByRole('button', { name: 'Siguiente' }).click();
    await dialogo.getByRole('button', { name: 'Inscribir' }).click();

    const resumen = dialogo.getByRole('alert').filter({ hasText: 'Corrige estos datos para inscribir' });
    await expect(resumen.getByRole('listitem')).toContainText([
      '¿Quién firma?: Selecciona quién firma la autorización. Ejemplo: Madre',
      'Nombre de quien firma: Es obligatorio. Ejemplo: Ana Gómez',
      'Documento de quien firma: Es obligatorio. Ejemplo: 1144123456',
      'Firma de autorización: Falta la firma',
    ]);
    expect(api.llamadas('POST', '/api/inscripciones')).toHaveLength(0);
  });

  test('si el programa ya no tiene cupo (409) se muestra el mensaje del servidor', async ({ page, api, sesion }) => {
    api.on('POST', '/api/inscripciones', () => ({ status: 409, json: { mensaje: CUPO_LLENO } }));
    const dialogo = await llenarInscripcion(page, api, sesion);

    await dialogo.getByRole('button', { name: 'Inscribir' }).click();

    await expect(dialogo.getByRole('alert').filter({ hasText: 'cupo' })).toHaveText(CUPO_LLENO);
    // El diálogo sigue abierto con lo diligenciado para poder elegir otro programa
    await expect(dialogo).toBeVisible();
    await expect(dialogo.getByRole('button', { name: 'Inscribir' })).toBeEnabled();
    expect(api.llamadas('POST', '/api/inscripciones')).toHaveLength(1);
  });
});
