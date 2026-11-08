import { test, expect, listadoVacio } from './support/fixtures.js';

const CUENTAS = [
  { id: 'cta-caja', nombre: 'Caja general', tipo: 'caja', saldoActual: 800000 },
  { id: 'cta-banco', nombre: 'Bancolombia ahorros', tipo: 'cuenta_bancaria', banco: 'Bancolombia', numeroCuenta: '123', saldoActual: 2500000 },
];
const CATEGORIAS = [
  { id: 1, tipo: 'ingreso', codigoPuc: '4120', nombre: 'Donaciones en dinero' },
  { id: 7, tipo: 'egreso',  codigoPuc: '5195', nombre: 'Diversos' },
  { id: 8, tipo: 'egreso',  codigoPuc: '5110', nombre: 'Honorarios' },
];

/** Abre Contabilidad con cuentas y categorías; el listado de movimientos queda vacío. */
async function abrirContabilidad(page, api, sesion) {
  await sesion();
  api
    .on('GET', '/api/contabilidad/stats', { saldoTotal: 3300000, ingresosMes: 0, egresosMes: 0, balanceMes: 0, ultimosDosMeses: [] })
    .on('GET', '/api/contabilidad/cuentas', CUENTAS)
    .on('GET', '/api/contabilidad/categorias', CATEGORIAS)
    .on('GET', '/api/contabilidad/movimientos', listadoVacio)
    .on('GET', '/api/sedes', [{ id: 1, nombre: 'Sede Yumbo', programas: [{ id: 'prog-1', nombre: 'Arte y pintura' }] }]);
  await page.goto('#/sede/contabilidad');
  await expect(page.getByText('Registra ingresos y egresos con categorías PUC.')).toBeVisible();
}

async function abrirEgreso(page) {
  await page.getByRole('button', { name: 'Registrar Egreso' }).click();
  const dialogo = page.getByRole('dialog').filter({ hasText: 'Registrar Egreso' });
  await expect(dialogo).toBeVisible();
  return dialogo;
}

// Los Select enlazan su etiqueta (InputLabel id + labelId): se ubican por su nombre accesible
const combo = (dialogo, etiqueta) => dialogo.getByRole('combobox', { name: etiqueta });

async function elegir(page, dialogo, etiqueta, opcion) {
  await combo(dialogo, etiqueta).click();
  await page.getByRole('option', { name: opcion }).click();
}

test.describe('Contabilidad — movimientos', () => {
  test('registrar un egreso envía tipo, monto, cuenta, categoría y la retención calculada', async ({ page, api, sesion }) => {
    api.on('POST', '/api/contabilidad/movimientos', () => ({ status: 201, json: { id: 'mov-1' } }));
    await abrirContabilidad(page, api, sesion);
    const dialogo = await abrirEgreso(page);

    await dialogo.getByRole('spinbutton', { name: /^Monto/ }).fill('150000');
    await dialogo.getByRole('textbox', { name: /^Concepto \*/ }).fill('Honorarios del contador marzo');
    await elegir(page, dialogo, 'Cuenta *', 'Bancolombia ahorros');
    // Las categorías se filtran por tipo: en un egreso no aparece la de ingreso
    await combo(dialogo, 'Categoría PUC').click();
    await expect(page.getByRole('option', { name: '4120 — Donaciones en dinero' })).toHaveCount(0);
    await page.getByRole('option', { name: '5110 — Honorarios' }).click();
    await dialogo.getByRole('textbox', { name: 'NIT / Documento del tercero' }).fill('900123456-7');
    // Al elegir la tarifa se calcula el valor retenido (4 % de 150.000)
    await elegir(page, dialogo, 'Tarifa de retención', '4% — Honorarios (persona natural)');
    await expect(dialogo.getByRole('spinbutton', { name: 'Valor retenido' })).toHaveValue('6000.00');

    await dialogo.getByRole('button', { name: 'Registrar' }).click();

    await expect(dialogo).toBeHidden();
    const llamadas = api.llamadas('POST', '/api/contabilidad/movimientos');
    expect(llamadas).toHaveLength(1);
    expect(llamadas[0].body).toMatchObject({
      tipo: 'egreso',
      monto: 150000,
      concepto: 'Honorarios del contador marzo',
      cuentaId: 'cta-banco',
      categoriaId: 8,
      programaId: null,
      terceroDocumento: '900123456-7',
      tarifaRetencion: 4,
      retencionPracticada: 6000,
    });
    expect(llamadas[0].body.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Tras guardar se recargan saldos y movimientos
    await expect.poll(() => api.llamadas('GET', '/api/contabilidad/stats').length).toBeGreaterThan(1);
  });

  test('un formulario inválido no se envía y explica qué corregir', async ({ page, api, sesion }) => {
    await abrirContabilidad(page, api, sesion);
    const dialogo = await abrirEgreso(page);

    await dialogo.getByRole('button', { name: 'Registrar' }).click();

    const resumen = dialogo.getByRole('alert').filter({ hasText: 'Corrige estos datos para registrar el movimiento' });
    await expect(resumen).toBeVisible();
    await expect(resumen.getByRole('listitem')).toContainText([
      'Monto: Es obligatorio. Ejemplo: 150000',
      'Concepto: Es obligatorio. Ejemplo: Compra de útiles escolares',
      'Categoría PUC: Selecciona una opción.',
    ]);

    // Una retención mayor que el monto tampoco pasa
    await dialogo.getByRole('spinbutton', { name: /^Monto/ }).fill('10000');
    await dialogo.getByRole('textbox', { name: /^Concepto \*/ }).fill('Compra de papelería');
    await elegir(page, dialogo, 'Categoría PUC', '5195 — Diversos');
    await dialogo.getByRole('spinbutton', { name: 'Valor retenido' }).fill('20000');
    await dialogo.getByRole('button', { name: 'Registrar' }).click();
    await expect(resumen.getByRole('listitem')).toHaveText([
      'Valor retenido: La retención no puede ser mayor que el monto del movimiento.',
    ]);

    await expect(dialogo).toBeVisible();
    expect(api.llamadas('POST', '/api/contabilidad/movimientos')).toHaveLength(0);
  });
});
