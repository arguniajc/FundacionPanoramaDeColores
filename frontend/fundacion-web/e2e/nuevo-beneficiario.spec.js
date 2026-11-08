import { test, expect, mockListaBeneficiarios } from './support/fixtures.js';
import { BORRADOR_VALIDO } from './support/datos.js';

const DRAFT_KEY = 'nuevo_beneficiario_draft';

/** Abre el formulario desde la lista de niños (opcionalmente con un borrador guardado). */
async function abrirFormulario(page, api, sesion, borrador) {
  await sesion(borrador ? { extraSesion: { [DRAFT_KEY]: JSON.stringify(borrador) } } : {});
  mockListaBeneficiarios(api);
  await page.goto('#/sede/beneficiarios');
  await page.getByRole('button', { name: '+ Nuevo beneficiario' }).click();
  const dialogo = page.getByRole('dialog').filter({ hasText: 'Inscribir nuevo beneficiario' });
  await expect(dialogo).toBeVisible();
  return dialogo;
}

const pasoActivo = dialogo => dialogo.locator('.MuiStepLabel-label.Mui-active');

async function avanzar(dialogo, veces) {
  for (let i = 0; i < veces; i++) {
    const antes = await pasoActivo(dialogo).textContent();
    await dialogo.getByRole('button', { name: 'Siguiente' }).click();
    await expect(pasoActivo(dialogo)).not.toHaveText(antes);
  }
}

test.describe('Nuevo beneficiario', () => {
  test('"Siguiente" con campos vacíos no avanza y explica qué corregir', async ({ page, api, sesion }) => {
    const dialogo = await abrirFormulario(page, api, sesion);
    await expect(pasoActivo(dialogo)).toHaveText('Datos personales');

    await dialogo.getByRole('button', { name: 'Siguiente' }).click();

    await expect(pasoActivo(dialogo)).toHaveText('Datos personales');
    const resumen = dialogo.getByRole('alert').filter({ hasText: 'Corrige estos datos para continuar' });
    await expect(resumen).toBeVisible();
    await expect(resumen.getByRole('listitem')).toContainText([
      'Primer nombre: Es obligatorio. Ejemplo: María',
      'Primer apellido: Es obligatorio. Ejemplo: Rodríguez',
      'Fecha de nacimiento: Es obligatoria. Ejemplo: 15/03/2016',
      'Número de documento: Es obligatorio. Ejemplo: 1107654321',
      'Género: Selecciona una opción. Ejemplo: Femenino',
    ]);
    // Cada campo muestra su propio mensaje debajo
    const primerNombre = dialogo.getByRole('textbox', { name: /^Primer nombre/ });
    await expect(primerNombre).toHaveAttribute('aria-invalid', 'true');
    await expect(primerNombre).toHaveAccessibleDescription('Es obligatorio. Ejemplo: María');

    // Al corregir un campo su línea desaparece del resumen
    await primerNombre.fill('maría');
    await expect(primerNombre).toHaveValue('María');
    await expect(resumen).not.toContainText('Primer nombre:');
    await expect(resumen).toContainText('Primer apellido:');
  });

  test('un WhatsApp inválido muestra su mensaje con el ejemplo', async ({ page, api, sesion }) => {
    const dialogo = await abrirFormulario(page, api, sesion, { ...BORRADOR_VALIDO, whatsapp: '' });
    await expect(dialogo.getByText('Se restauró un borrador guardado anteriormente.')).toBeVisible();

    await avanzar(dialogo, 3);
    await expect(pasoActivo(dialogo)).toHaveText('Acudiente');

    const whatsapp = dialogo.getByRole('textbox', { name: /^WhatsApp/ });
    await whatsapp.fill('12345');
    await whatsapp.blur();
    const mensaje = 'Debe ser un celular de 10 dígitos que empiece por 3. Ejemplo: 3001234567';
    await expect(whatsapp).toHaveAccessibleDescription(mensaje);

    await dialogo.getByRole('button', { name: 'Siguiente' }).click();
    await expect(pasoActivo(dialogo)).toHaveText('Acudiente');
    await expect(dialogo.getByRole('alert').filter({ hasText: 'Corrige estos datos' }))
      .toContainText(`WhatsApp: ${mensaje}`);

    await whatsapp.fill('3001234567');
    await avanzar(dialogo, 1);
    await expect(pasoActivo(dialogo)).toHaveText('Autorización');
  });

  test('un error 500 al guardar muestra el mensaje amable con el código', async ({ page, api, sesion }) => {
    api.on('POST', '/api/beneficiarios', () => ({
      status: 500, json: { mensaje: 'Error interno del servidor.', codigo: 'ABCD1234' },
    }));
    const dialogo = await abrirFormulario(page, api, sesion, BORRADOR_VALIDO);

    await avanzar(dialogo, 4);
    await dialogo.getByRole('button', { name: 'Inscribir beneficiario' }).click();

    const alerta = dialogo.getByRole('alert').filter({ hasText: 'Error del servidor' });
    await expect(alerta).toHaveText(
      'Error del servidor al inscribir el beneficiario. Intenta de nuevo en unos minutos; '
      + 'si persiste, avisa al administrador (código ABCD1234).');
    await expect(dialogo).toBeVisible();

    const enviado = api.llamadas('POST', '/api/beneficiarios')[0].body;
    expect(enviado).toMatchObject({
      tipo: 'niño', primerNombre: 'Mariana', primerApellido: 'López', numeroDocumento: '1107999888',
      whatsapp: '3001234567', viveConNino: true, numHermanos: 2, pesoKg: 28, autorizacion: true,
    });
    // El borrador se conserva para no perder lo escrito
    expect(await page.evaluate(k => sessionStorage.getItem(k), DRAFT_KEY)).not.toBeNull();
  });

  test('al guardar bien se cierra, avisa y recarga la lista', async ({ page, api, sesion }) => {
    api.on('POST', '/api/beneficiarios', () => ({ status: 201, json: { id: 999 } }));
    const dialogo = await abrirFormulario(page, api, sesion, BORRADOR_VALIDO);
    const listasAntes = api.llamadas('GET', '/api/beneficiarios').length;

    await avanzar(dialogo, 4);
    await dialogo.getByRole('button', { name: 'Inscribir beneficiario' }).click();

    await expect(dialogo).toBeHidden();
    await expect(page.getByText('Beneficiario inscrito correctamente')).toBeVisible();
    await expect.poll(() => api.llamadas('GET', '/api/beneficiarios').length).toBeGreaterThan(listasAntes);
    expect(await page.evaluate(k => sessionStorage.getItem(k), DRAFT_KEY)).toBeNull();
  });
});
