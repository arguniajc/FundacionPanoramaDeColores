import { test, expect, mockListaBeneficiarios } from './support/fixtures.js';
import { BORRADOR_VALIDO, BORRADOR_ADULTO_VALIDO } from './support/datos.js';

// Un borrador por tipo, en sessionStorage, con el paso: { form, paso }
const DRAFT_KEY        = 'nuevo_beneficiario_draft_nino';
const DRAFT_KEY_ADULTO = 'nuevo_beneficiario_draft_adulto';

/** Abre el formulario desde la lista de niños (o de adultos), opcionalmente con un borrador guardado. */
async function abrirFormulario(page, api, sesion, borrador, { adulto = false } = {}) {
  const clave = adulto ? DRAFT_KEY_ADULTO : DRAFT_KEY;
  await sesion(borrador ? { extraSesion: { [clave]: JSON.stringify({ form: borrador, paso: 0 }) } } : {});
  mockListaBeneficiarios(api);
  await page.goto(adulto ? '#/sede/adultos' : '#/sede/beneficiarios');
  await page.getByRole('button', { name: adulto ? '+ Nuevo adulto' : '+ Nuevo beneficiario' }).click();
  const dialogo = page.getByRole('dialog').filter({ hasText: 'Inscribir nuevo beneficiario' });
  await expect(dialogo).toBeVisible();
  // Terminada la animación de apertura el cursor queda en el primer campo; esperarlo evita que ese
  // foco llegue en medio de lo que la prueba escribe
  await expect(dialogo.getByRole('textbox', { name: /^Primer nombre/ })).toBeFocused();
  return dialogo;
}

const pasoActivo = dialogo => dialogo.locator('.MuiStepLabel-label.Mui-active');
const borradorGuardado = (page, clave = DRAFT_KEY) => page.evaluate(k => sessionStorage.getItem(k), clave);

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
    await expect(dialogo.getByText('Campo obligatorio')).toBeVisible();

    // Al abrir, el cursor queda en el primer campo
    const primerNombre = dialogo.getByRole('textbox', { name: /^Primer nombre/ });
    await expect(primerNombre).toBeFocused();
    // Obligatorio marcado una sola vez (por `required`), sin "*" escrito en la etiqueta
    await expect(primerNombre).toHaveAttribute('required', '');
    await expect(dialogo.locator('label').filter({ hasText: 'Primer nombre' })).toHaveText(/^Primer nombre\s*\*$/);

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
    // Cada campo muestra su propio mensaje debajo (también los Select y el departamento)
    await expect(primerNombre).toHaveAttribute('aria-invalid', 'true');
    await expect(primerNombre).toHaveAccessibleDescription('Es obligatorio. Ejemplo: María');
    await expect(dialogo.getByRole('combobox', { name: /^Género/ }))
      .toHaveAccessibleDescription('Selecciona una opción. Ejemplo: Femenino');
    await expect(dialogo.getByRole('combobox', { name: /^Departamento/ }))
      .toHaveAccessibleDescription('Selecciona el departamento de nacimiento. Ejemplo: Valle del Cauca');

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
    await expect(whatsapp).toHaveAttribute('inputmode', 'tel');
    await expect(whatsapp).toHaveAttribute('autocomplete', 'off');
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

  test('"Sin documento" no exige el número ni consulta duplicados', async ({ page, api, sesion }) => {
    api.on('POST', '/api/beneficiarios', () => ({ status: 201, json: { id: 999 } }));
    const dialogo = await abrirFormulario(page, api, sesion, { ...BORRADOR_VALIDO, numeroDocumento: '' });

    await dialogo.getByRole('combobox', { name: /^Tipo de documento/ }).click();
    await page.getByRole('option', { name: 'Sin documento' }).click();

    const numero = dialogo.getByRole('textbox', { name: /^Número de documento/ });
    await expect(numero).toBeDisabled();
    await expect(numero).not.toHaveAttribute('required', '');
    await expect(dialogo.getByText('No aplica: el beneficiario no tiene documento.')).toBeVisible();

    await avanzar(dialogo, 4);
    await dialogo.getByRole('button', { name: 'Inscribir beneficiario' }).click();
    await expect(dialogo).toBeHidden();

    expect(api.llamadas('POST', '/api/beneficiarios/verificar-documento')).toHaveLength(0);
    expect(api.llamadas('POST', '/api/beneficiarios')[0].body)
      .toMatchObject({ tipoDocumento: 'Sin documento', numeroDocumento: null });
  });

  test('documento ya registrado: muestra a quién y permite abrir su ficha', async ({ page, api, sesion }) => {
    api.on('POST', '/api/beneficiarios/verificar-documento', { existe: true, id: 102, nombre: 'Santiago Pérez Mina' });
    api.on('GET', /^\/api\/beneficiarios\/\d+\/historial$/, []);
    const dialogo = await abrirFormulario(page, api, sesion, { ...BORRADOR_VALIDO, numeroDocumento: '' });

    const numero = dialogo.getByRole('textbox', { name: /^Número de documento/ });
    await expect(numero).toHaveAttribute('inputmode', 'numeric');
    await numero.fill('1107654321');
    await numero.blur();

    const aviso = dialogo.getByRole('alert').filter({ hasText: 'ya está registrado' });
    await expect(aviso).toContainText('a nombre de Santiago Pérez Mina');
    await expect(dialogo.getByRole('img', { name: 'Documento disponible' })).toHaveCount(0);
    expect(api.llamadas('POST', '/api/beneficiarios/verificar-documento')[0].body).toEqual({ numero: '1107654321' });

    // No deja continuar con un documento repetido
    await dialogo.getByRole('button', { name: 'Siguiente' }).click();
    await expect(pasoActivo(dialogo)).toHaveText('Datos personales');
    await expect(dialogo.getByRole('alert').filter({ hasText: 'Corrige estos datos' }))
      .toContainText('Número de documento: Este documento ya está registrado');

    await aviso.getByRole('button', { name: 'Ver beneficiario' }).click();
    await expect(dialogo).toBeHidden();
    await expect.poll(() => api.llamadas('GET', '/api/beneficiarios/102').length).toBeGreaterThan(0);
    // El borrador queda guardado para seguir después
    expect(await borradorGuardado(page)).not.toBeNull();
  });

  test('si la verificación del documento falla no muestra el check verde', async ({ page, api, sesion }) => {
    api.on('POST', '/api/beneficiarios/verificar-documento', () => ({ status: 500, json: { mensaje: 'Error interno del servidor.' } }));
    const dialogo = await abrirFormulario(page, api, sesion, { ...BORRADOR_VALIDO, numeroDocumento: '' });

    const numero = dialogo.getByRole('textbox', { name: /^Número de documento/ });
    await numero.fill('1107999888');
    await numero.blur();
    await expect(numero).toHaveAccessibleDescription('No se pudo comprobar si ya está registrado; se revisará al guardar.');
    await expect(dialogo.getByRole('img', { name: 'Documento disponible' })).toHaveCount(0);

    // Con la API respondiendo bien, el check sí aparece
    api.on('POST', '/api/beneficiarios/verificar-documento', { existe: false, id: null, nombre: null });
    await numero.fill('1107999887');
    await numero.blur();
    await expect(dialogo.getByRole('img', { name: 'Documento disponible' })).toBeVisible();
  });

  test('al cambiar la fecha a la de un adulto avisa y conserva el tipo de documento elegido', async ({ page, api, sesion }) => {
    const dialogo = await abrirFormulario(page, api, sesion, BORRADOR_VALIDO); // TI elegido a mano

    await dialogo.getByLabel(/^Fecha de nacimiento/).fill('1990-01-01');

    await expect(dialogo.getByRole('status')).toContainText('Se cambió a "Adulto" por la edad');
    await expect(dialogo.getByRole('button', { name: 'Adulto (18 años en adelante)' })).toHaveAttribute('aria-pressed', 'true');
    await expect(dialogo.getByRole('combobox', { name: /^Tipo de documento/ })).toHaveText('TI');
  });

  test('el stepper permite volver a un paso ya completado y enfoca su primer campo', async ({ page, api, sesion }) => {
    const dialogo = await abrirFormulario(page, api, sesion, BORRADOR_VALIDO);
    await avanzar(dialogo, 2);
    await expect(pasoActivo(dialogo)).toHaveText('Salud');

    // (en MUI 9 cada paso del stepper es una pestaña: role=tab)
    await dialogo.getByRole('tab', { name: 'Datos personales' }).click();
    await expect(pasoActivo(dialogo)).toHaveText('Datos personales');
    await expect(dialogo.getByRole('textbox', { name: /^Primer nombre/ })).toBeFocused();

    // Y regresar hasta donde ya había llegado
    await dialogo.getByRole('tab', { name: 'Salud' }).click();
    await expect(pasoActivo(dialogo)).toHaveText('Salud');
    await expect(dialogo.getByRole('tab', { name: 'Acudiente' })).toBeDisabled();
  });

  test('al cerrar con cambios ofrece seguir, salir guardando el borrador o descartarlo', async ({ page, api, sesion }) => {
    const dialogo = await abrirFormulario(page, api, sesion);
    await dialogo.getByRole('textbox', { name: /^Primer nombre/ }).fill('Lucía');

    await dialogo.getByRole('button', { name: 'Cerrar' }).click();
    const confirmar = page.getByRole('dialog').filter({ hasText: '¿Salir del formulario?' });
    await expect(confirmar.getByRole('button', { name: 'Seguir editando' })).toBeVisible();
    await confirmar.getByRole('button', { name: 'Salir (se guarda el borrador)' }).click();
    await expect(dialogo).toBeHidden();
    expect(JSON.parse(await borradorGuardado(page))).toMatchObject({ form: { primerNombre: 'Lucía' }, paso: 0 });

    // Al volver a abrirlo se restaura; ahora se descarta
    await page.getByRole('button', { name: '+ Nuevo beneficiario' }).click();
    await expect(dialogo.getByText('Se restauró un borrador guardado anteriormente.')).toBeVisible();
    await expect(dialogo.getByRole('textbox', { name: /^Primer nombre/ })).toHaveValue('Lucía');
    await dialogo.getByRole('button', { name: 'Cerrar' }).click();
    await confirmar.getByRole('button', { name: 'Descartar borrador' }).click();
    await expect(dialogo).toBeHidden();
    expect(await borradorGuardado(page)).toBeNull();
  });

  test('sin cambios se cierra directo (también en Adultos)', async ({ page, api, sesion }) => {
    const dialogo = await abrirFormulario(page, api, sesion, null, { adulto: true });
    await dialogo.getByRole('button', { name: 'Cerrar' }).click();
    await expect(dialogo).toBeHidden();
    await expect(page.getByText('¿Salir del formulario?')).toHaveCount(0);
  });

  test('adulto: pide su celular / WhatsApp, acepta "No registra" y lo envía', async ({ page, api, sesion }) => {
    api.on('POST', '/api/beneficiarios', () => ({ status: 201, json: { id: 999 } }));
    const dialogo = await abrirFormulario(page, api, sesion, { ...BORRADOR_ADULTO_VALIDO, celular: '' }, { adulto: true });

    await avanzar(dialogo, 3);
    await expect(pasoActivo(dialogo)).toHaveText('Contacto');
    const celular = dialogo.getByRole('textbox', { name: /^Celular \/ WhatsApp/ });
    await expect(celular).toHaveAttribute('required', '');
    await expect(celular).toHaveAttribute('inputmode', 'tel');

    await celular.fill('12345');
    await celular.blur();
    await expect(celular).toHaveAccessibleDescription(
      /Debe ser un celular de 10 dígitos que empiece por 3, sin espacios\. Ejemplo: 3001234567/);
    await dialogo.getByRole('button', { name: 'Siguiente' }).click();
    await expect(pasoActivo(dialogo)).toHaveText('Contacto');

    // "No registra" es un botón accesible por teclado
    await celular.fill('');
    const noRegistra = dialogo.getByRole('button', { name: 'Marcar Celular / WhatsApp como "No registra"' });
    await noRegistra.focus();
    await page.keyboard.press('Enter');
    await expect(celular).toHaveValue('No registra');

    await avanzar(dialogo, 1);
    await dialogo.getByRole('button', { name: 'Inscribir beneficiario' }).click();
    await expect(dialogo).toBeHidden();
    expect(api.llamadas('POST', '/api/beneficiarios')[0].body).toMatchObject({
      tipo: 'adulto', celular: 'No registra', whatsapp: null, nombreAcudiente: null, direccion: 'Calle 5 # 10-20',
    });
    expect(await borradorGuardado(page, DRAFT_KEY_ADULTO)).toBeNull();
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
      whatsapp: '3001234567', viveConNino: true, numHermanos: 2, pesoKg: 28, autorizacion: true, celular: null,
    });
    // El borrador se conserva para no perder lo escrito
    expect(await borradorGuardado(page)).not.toBeNull();
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
    expect(await borradorGuardado(page)).toBeNull();
  });
});
