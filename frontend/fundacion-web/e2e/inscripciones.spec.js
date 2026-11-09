import { test, expect, listadoVacio, mockListaBeneficiarios } from './support/fixtures.js';

const SEDES = [{
  id: 'sede-1', nombre: 'Sede Yumbo',
  programas: [
    // inscritosActivos: lo envía /api/sedes con la misma regla del control de cupo
    { id: 'prog-arte', nombre: 'Arte y pintura', activo: true, cupoMaximo: 40, inscritosActivos: 12 },
    { id: 'prog-viejo', nombre: 'Programa cerrado', activo: false, cupoMaximo: null, inscritosActivos: 0 },
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
  await dialogo.getByRole('combobox', { name: '¿Quién firma?' }).click();
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

    await expect(dialogo.getByRole('alert').filter({ hasText: 'cupo' })).toContainText(CUPO_LLENO);
    // El diálogo sigue abierto con lo diligenciado para poder elegir otro programa
    await expect(dialogo).toBeVisible();
    await expect(dialogo.getByRole('button', { name: 'Inscribir' })).toBeEnabled();
    expect(api.llamadas('POST', '/api/inscripciones')).toHaveLength(1);
  });
  test('cerrar a mitad del formulario guarda un borrador que se recupera con el mismo beneficiario y programa', async ({ page, api, sesion }) => {
    await sesion();
    mockListaBeneficiarios(api);
    api
      .on('GET', '/api/inscripciones', listadoVacio)
      .on('GET', '/api/sedes', SEDES)
      .on('GET', '/api/sedes/programas/prog-arte/campos', []);
    await page.goto('#/sede/inscripciones');

    const abrirHastaFormulario = async () => {
      await page.getByRole('button', { name: 'Nueva inscripción' }).click();
      const dialogo = page.getByRole('dialog').filter({ hasText: 'Nueva Inscripción' });
      await dialogo.getByRole('combobox', { name: 'Buscar por nombre' }).fill('valen');
      await page.getByRole('option', { name: /Valentina Rodríguez Gómez/ }).click();
      await dialogo.getByRole('button', { name: 'Siguiente' }).click();
      // La tarjeta del programa se elige con el teclado
      const tarjeta = dialogo.getByRole('radio', { name: /Arte y pintura/ });
      await tarjeta.focus();
      await page.keyboard.press('Enter');
      await expect(tarjeta).toHaveAttribute('aria-checked', 'true');
      await dialogo.getByRole('button', { name: 'Siguiente' }).click();
      await expect(dialogo.getByText('Este programa no tiene campos adicionales.')).toBeVisible();
      return dialogo;
    };

    let dialogo = await abrirHastaFormulario();
    await dialogo.getByRole('textbox', { name: 'Nombre completo' }).fill('Ana Gómez');
    // Cerrar con cambios pregunta antes de descartar
    await dialogo.getByRole('button', { name: 'Cancelar' }).click();
    await page.getByRole('button', { name: 'Descartar' }).click();
    await expect(dialogo).toBeHidden();

    dialogo = await abrirHastaFormulario();
    await expect(dialogo.getByText('Recuperamos lo que habías escrito')).toBeVisible();
    await expect(dialogo.getByRole('textbox', { name: 'Nombre completo' })).toHaveValue('Ana Gómez');

    await dialogo.getByRole('button', { name: 'Empezar de cero' }).click();
    await expect(dialogo.getByText('Recuperamos lo que habías escrito')).toHaveCount(0);
    await expect(dialogo.getByRole('textbox', { name: 'Nombre completo' })).toHaveValue('');
  });

  test('muestra los cupos antes de inscribir y un programa lleno o ya inscrito no se puede elegir', async ({ page, api, sesion }) => {
    await sesion();
    mockListaBeneficiarios(api);
    const sedes = [{
      id: 'sede-1', nombre: 'Sede Yumbo',
      programas: [
        { id: 'prog-arte',   nombre: 'Arte y pintura',     activo: true, cupoMaximo: 40,   inscritosActivos: 12 },
        { id: 'prog-danza',  nombre: 'Danza folclórica',   activo: true, cupoMaximo: 20,   inscritosActivos: 20 },
        { id: 'prog-futbol', nombre: 'Escuela de fútbol',  activo: true, cupoMaximo: 10,   inscritosActivos: 9 },
        { id: 'prog-musica', nombre: 'Música',             activo: true, cupoMaximo: null, inscritosActivos: 7 },
      ],
    }];
    api
      // La beneficiaria 101 ya tiene una inscripción activa en Música
      .on('GET', '/api/inscripciones', ({ url }) => (url.searchParams.get('beneficiarioId') === '101'
        ? { json: { data: [{ id: 'ins-9', beneficiarioId: 101, programaId: 'prog-musica', estado: 'activa', activo: true }], total: 1, pagina: 1, porPagina: 100 } }
        : listadoVacio({ url })))
      .on('GET', '/api/sedes', sedes)
      .on('GET', '/api/sedes/programas/prog-arte/campos', []);
    await page.goto('#/sede/inscripciones');
    await page.getByRole('button', { name: 'Nueva inscripción' }).click();
    const dialogo = page.getByRole('dialog').filter({ hasText: 'Nueva Inscripción' });
    await dialogo.getByRole('combobox', { name: 'Buscar por nombre' }).fill('valen');
    await page.getByRole('option', { name: /Valentina Rodríguez Gómez/ }).click();
    await dialogo.getByRole('button', { name: 'Siguiente' }).click();

    const tarjeta = nombre => dialogo.getByRole('radio', { name: new RegExp(nombre) });
    // Ocupación visible en cada tarjeta
    await expect(tarjeta('Arte y pintura')).toContainText('12 de 40 cupos');
    await expect(tarjeta('Escuela de fútbol')).toContainText('9 de 10 cupos · quedan 1');
    await expect(tarjeta('Música')).toContainText('Sin límite de cupos');

    // Lleno: deshabilitado, con "Cupo lleno" y la explicación enlazada
    const llena = tarjeta('Danza folclórica');
    await expect(llena).toBeDisabled();
    await expect(llena).toContainText('20 de 20 cupos');
    await expect(llena).toContainText('Cupo lleno');
    await expect(llena).toHaveAccessibleDescription(/No admite más inscripciones activas/);
    // force: Playwright no hace clic en lo que está aria-disabled; se comprueba que la página tampoco lo elige
    await llena.click({ force: true });
    await expect(llena).toHaveAttribute('aria-checked', 'false');
    await llena.focus();
    await page.keyboard.press('Enter');
    await expect(llena).toHaveAttribute('aria-checked', 'false');
    await dialogo.getByRole('button', { name: 'Siguiente' }).click();
    await expect(dialogo.getByText('Selecciona el programa haciendo clic en su tarjeta.').first()).toBeVisible();

    // Ya inscrito activo: también deshabilitado
    const inscrita = tarjeta('Música');
    await expect(inscrita).toBeDisabled();
    await expect(inscrita).toContainText('Ya inscrito');
    await expect(inscrita).toHaveAccessibleDescription(/ya tiene una inscripción activa/);

    // Los demás se eligen con normalidad
    await expect(tarjeta('Arte y pintura')).toBeEnabled();
    await tarjeta('Arte y pintura').click();
    await expect(tarjeta('Arte y pintura')).toHaveAttribute('aria-checked', 'true');
    await dialogo.getByRole('button', { name: 'Siguiente' }).click();
    await expect(dialogo.getByText('Este programa no tiene campos adicionales.')).toBeVisible();
    expect(api.llamadas('POST', '/api/inscripciones')).toHaveLength(0);
  });
});
