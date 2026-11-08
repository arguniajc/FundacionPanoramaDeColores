import { test, expect, listadoVacio } from './support/fixtures.js';

const DONANTES = [
  { id: 'don-1', nombre: 'Fundación Éxito', tipo: 'empresa', documento: '890900608-9', activo: true },
  { id: 'don-2', nombre: 'Carlos Mejía', tipo: 'persona', documento: '16789123', activo: true },
];

async function abrirDonaciones(page, api, sesion) {
  await sesion();
  api
    .on('GET', '/api/donantes', ({ url }) => {
      const q = (url.searchParams.get('buscar') ?? '').toLowerCase();
      return { json: DONANTES.filter(d => !q || d.nombre.toLowerCase().includes(q)) };
    })
    .on('GET', '/api/donaciones', listadoVacio)
    .on('GET', '/api/donaciones/stats', { totalDineroMes: 0, totalDineroAnio: 0, totalDineroTotal: 0, totalEspecieMes: 0 })
    .on('GET', '/api/sedes', [{ id: 'sede-1', nombre: 'Sede Yumbo' }])
    .on('GET', '/api/contabilidad/cuentas', [
      { id: 'cta-caja', nombre: 'Caja general', tipo: 'caja', activo: true },
      { id: 'cta-vieja', nombre: 'Cuenta cerrada', tipo: 'caja', activo: false },
    ])
    .on('GET', '/api/contabilidad/categorias', [{ id: 41, tipo: 'ingreso', codigoPuc: '4120', nombre: 'Donaciones en dinero' }]);
  await page.goto('#/sede/donaciones');
  await page.getByRole('tab', { name: 'Donaciones' }).click();
  await page.getByRole('button', { name: 'Nueva donación' }).click();
  const dialogo = page.getByRole('dialog').filter({ hasText: 'Nueva donación' });
  await expect(dialogo).toBeVisible();
  return dialogo;
}

test.describe('Donaciones', () => {
  test('registrar una donación en dinero envía la donación y el ingreso contable', async ({ page, api, sesion }) => {
    api
      .on('POST', '/api/donaciones', ({ body }) => ({
        status: 201,
        json: { ...body, id: 'dn-1', donanteNombre: 'Fundación Éxito', reciboNumero: 'RC-0042', reciboEstado: 'emitido' },
      }))
      .on('POST', '/api/contabilidad/movimientos', () => ({ status: 201, json: { id: 'mov-9' } }));
    const dialogo = await abrirDonaciones(page, api, sesion);

    // El donante se busca en la API mientras se escribe
    await dialogo.getByRole('combobox', { name: /^Donante/ }).fill('éxito');
    await page.getByRole('option', { name: 'Fundación Éxito' }).click();
    expect(api.llamadas('GET', '/api/donantes').some(p => p.url.searchParams.get('buscar') === 'éxito')).toBe(true);

    await dialogo.getByRole('textbox', { name: /^Monto/ }).fill('500000');
    await expect(dialogo.getByRole('textbox', { name: /^Monto/ })).toHaveValue('500.000');
    await dialogo.getByRole('checkbox', { name: 'Registrar ingreso en contabilidad' }).check();
    // Solo se ofrecen las cuentas activas
    await dialogo.getByRole('combobox', { name: 'Cuenta destino' }).click();
    await expect(page.getByRole('option', { name: 'Cuenta cerrada' })).toHaveCount(0);
    await page.getByRole('option', { name: 'Caja general' }).click();
    await dialogo.getByRole('textbox', { name: 'Descripción' }).fill('Aporte campaña útiles');

    await dialogo.getByRole('button', { name: 'Registrar donación' }).click();

    await expect(dialogo).toBeHidden();
    await expect(page.getByText('Donación registrada.')).toBeVisible();

    const donacion = api.llamadas('POST', '/api/donaciones');
    expect(donacion).toHaveLength(1);
    expect(donacion[0].body).toMatchObject({
      donanteId: 'don-1', tipo: 'dinero', monto: 500000,
      itemId: null, nombreItem: null, cantidad: null,
      sedeId: null, programaId: null, descripcion: 'Aporte campaña útiles',
    });
    expect(donacion[0].body.fechaDonacion).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // El ingreso contable usa la categoría PUC 4120 y el número de recibo como soporte
    const movimiento = api.llamadas('POST', '/api/contabilidad/movimientos');
    expect(movimiento).toHaveLength(1);
    expect(movimiento[0].body).toMatchObject({
      tipo: 'ingreso', monto: 500000, cuentaId: 'cta-caja', categoriaId: 41,
      concepto: 'Donación - Fundación Éxito', terceroNombre: 'Fundación Éxito', numeroSoporte: 'RC-0042',
    });
  });

  test('sin donante ni monto no se envía y explica qué falta', async ({ page, api, sesion }) => {
    const dialogo = await abrirDonaciones(page, api, sesion);

    await dialogo.getByRole('button', { name: 'Registrar donación' }).click();

    const resumen = dialogo.getByRole('alert').filter({ hasText: 'Corrige estos datos para registrar la donación' });
    await expect(resumen.getByRole('listitem')).toContainText([
      'Donante: Selecciona una opción.',
      'Monto: Es obligatorio. Ejemplo: 150000',
    ]);
    expect(api.llamadas('POST', '/api/donaciones')).toHaveLength(0);
  });
});

test.describe('Donaciones — creación rápida de donante', () => {
  test('"+ Crear donante" abre el formulario con el nombre escrito y deja el donante seleccionado', async ({ page, api, sesion }) => {
    api
      .on('POST', '/api/donantes/verificar-documento', { existe: false, id: null, nombre: null })
      .on('POST', '/api/donantes', ({ body }) => ({ status: 201, json: { ...body, id: 'don-9', activo: true } }));
    const dialogo = await abrirDonaciones(page, api, sesion);

    await dialogo.getByRole('combobox', { name: /^Donante/ }).fill('Panadería La Espiga');
    await page.getByRole('option', { name: '+ Crear donante «Panadería La Espiga»' }).click();

    const nuevo = page.getByRole('dialog').filter({ hasText: 'Nuevo donante' });
    await expect(nuevo).toBeVisible();
    await expect(nuevo.getByRole('textbox', { name: /^Nombre/ })).toHaveValue('Panadería La Espiga');
    // Persona → CC por defecto; al elegir Empresa se propone NIT y se sugiere el dígito de verificación
    await expect(nuevo.getByRole('combobox', { name: 'Tipo documento' })).toHaveText('CC');
    await nuevo.getByRole('combobox', { name: /^Tipo (Persona|Empresa)/ }).click();
    await page.getByRole('option', { name: 'Empresa' }).click();
    await expect(nuevo.getByRole('combobox', { name: 'Tipo documento' })).toHaveText('NIT');
    const documento = nuevo.getByRole('textbox', { name: 'Documento / NIT' });
    await documento.fill('900123456');
    await expect(documento).toHaveAccessibleDescription('Dígito de verificación: 8 (900123456-8)');
    await documento.fill('900123456-8');
    await documento.blur();
    await expect.poll(() => api.llamadas('POST', '/api/donantes/verificar-documento').length).toBe(1);
    expect(api.llamadas('POST', '/api/donantes/verificar-documento')[0].body)
      .toEqual({ tipo: 'NIT', numero: '900123456-8', excluirId: null });

    await nuevo.getByRole('button', { name: 'Crear donante' }).click();

    await expect(nuevo).toBeHidden();
    await expect(page.getByText('Donante «Panadería La Espiga» creado y seleccionado.')).toBeVisible();
    await expect(dialogo.getByRole('combobox', { name: /^Donante/ })).toHaveValue('Panadería La Espiga');
    const creado = api.llamadas('POST', '/api/donantes');
    expect(creado).toHaveLength(1);
    expect(creado[0].body).toMatchObject({
      nombre: 'Panadería La Espiga', tipo: 'empresa', tipoDocumento: 'NIT', documento: '900123456-8',
    });
  });

  test('un documento repetido avisa y permite usar el donante existente', async ({ page, api, sesion }) => {
    api
      .on('POST', '/api/donantes/verificar-documento', { existe: true, id: 'don-2', nombre: 'Carlos Mejía' })
      .on('GET', '/api/donantes/don-2', { ...DONANTES[1], tipoDocumento: 'CC' });
    const dialogo = await abrirDonaciones(page, api, sesion);

    await dialogo.getByRole('combobox', { name: /^Donante/ }).fill('Carlos Mejia');
    await page.getByRole('option', { name: '+ Crear donante «Carlos Mejia»' }).click();
    const nuevo = page.getByRole('dialog').filter({ hasText: 'Nuevo donante' });
    const documento = nuevo.getByRole('textbox', { name: 'Documento / NIT' });
    await documento.fill('16789123');
    await documento.blur();

    const aviso = nuevo.getByRole('alert').filter({ hasText: 'Ya existe un donante con este documento' });
    await expect(aviso).toContainText('Carlos Mejía');
    await aviso.getByRole('button', { name: 'Usar donante existente' }).click();
    // Hay datos escritos: pregunta antes de descartarlos
    await page.getByRole('button', { name: 'Descartar' }).click();

    await expect(nuevo).toBeHidden();
    await expect(dialogo.getByRole('combobox', { name: /^Donante/ })).toHaveValue('Carlos Mejía');
    expect(api.llamadas('POST', '/api/donantes')).toHaveLength(0);
  });
});
