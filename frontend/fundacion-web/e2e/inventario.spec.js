import { test, expect } from './support/fixtures.js';

const SEDES = [{ id: 'sede-1', nombre: 'Sede Yumbo' }];
const TIPOS = [
  { id: 1, codigo: 'ENTRADA_COMPRA', nombre: 'Entrada por compra', afectaStock: '+' },
  { id: 2, codigo: 'SALIDA_ENTREGA', nombre: 'Salida por entrega', afectaStock: '-' },
  { id: 3, codigo: 'TRANSFERENCIA_SALIDA', nombre: 'Transferencia (salida)', afectaStock: '-' },
];
const ARROZ = {
  id: 'it-7', codigo: 'INV-007', nombre: 'Arroz Diana 1 kg', categoria: 'Alimentos', unidadMedida: 'kg',
  stockActual: 12, stockMinimo: 5, tipoTenencia: 'propio', activo: true, sedeId: 'sede-1', nombreSede: 'Sede Yumbo',
};

async function abrirInventario(page, api, sesion, items = []) {
  await sesion();
  api
    .on('GET', '/api/sedes', SEDES)
    .on('GET', '/api/inventario/tipos', TIPOS)
    .on('GET', '/api/inventario/items', items)
    .on('GET', '/api/inventario/stats', { totalItems: items.length, stockBajo: 0, movimientosMes: 0, sinStock: 0 });
  await page.goto('#/sede/inventario');
  await expect(page.getByText('Control de bienes, materiales y donaciones por sede')).toBeVisible();
}

// Los Select enlazan su etiqueta (InputLabel id + labelId): se ubican por su nombre accesible
const combo = (dialogo, etiqueta) => dialogo.getByRole('combobox', { name: etiqueta });

test.describe('Inventario', () => {
  test('crear un artículo envía sede, categoría, unidad y stock', async ({ page, api, sesion }) => {
    api.on('POST', '/api/inventario/items', ({ body }) => ({
      status: 201, json: { ...body, id: 'it-1', codigo: 'INV-001', activo: true, nombreSede: 'Sede Yumbo' },
    }));
    await abrirInventario(page, api, sesion);

    await page.getByRole('button', { name: 'Nuevo artículo' }).first().click();
    const dialogo = page.getByRole('dialog').filter({ hasText: 'Nuevo artículo' });
    await expect(dialogo).toBeVisible();
    // La sede elegida en la página viene preseleccionada
    await expect(combo(dialogo, 'Sede *')).toHaveText('Sede Yumbo');

    await dialogo.getByRole('textbox', { name: /^Nombre/ }).fill('Cuaderno cuadriculado 100 hojas');
    await combo(dialogo, 'Categoría').click();
    await page.getByRole('option', { name: 'Material escolar' }).click();
    await dialogo.getByRole('combobox', { name: /^Unidad/ }).fill('paquete');
    await dialogo.getByRole('textbox', { name: 'Stock inicial' }).fill('40');
    await dialogo.getByRole('textbox', { name: 'Stock mínimo' }).fill('10');

    await dialogo.getByRole('button', { name: 'Crear artículo' }).click();

    await expect(dialogo).toBeHidden();
    await expect(page.getByText('Artículo creado.')).toBeVisible();
    await expect(page.getByText('Cuaderno cuadriculado 100 hojas')).toBeVisible();

    const llamadas = api.llamadas('POST', '/api/inventario/items');
    expect(llamadas).toHaveLength(1);
    expect(llamadas[0].body).toEqual({
      sedeId: 'sede-1',
      nombre: 'Cuaderno cuadriculado 100 hojas',
      descripcion: null,
      unidadMedida: 'paquete',
      categoria: 'Material escolar',
      stockActual: 40,
      stockMinimo: 10,
      tipoTenencia: 'propio',
      comodante: null, comodatoContrato: null, comodatoFechaInicio: null, comodatoFechaFin: null,
    });
  });

  test('registrar una salida no deja sacar más del stock y envía la cantidad válida', async ({ page, api, sesion }) => {
    api.on('POST', '/api/inventario/movimientos', () => ({ json: { nuevoStock: 7 } }));
    await abrirInventario(page, api, sesion, [ARROZ]);

    await page.getByRole('button', { name: 'Movimiento' }).click();
    const dialogo = page.getByRole('dialog').filter({ hasText: 'Registrar movimiento' });
    await expect(dialogo).toContainText('Arroz Diana 1 kg · Stock: 12 kg');

    // Las transferencias tienen su propio diálogo: no se ofrecen aquí
    await combo(dialogo, 'Tipo de movimiento').click();
    await expect(page.getByRole('option', { name: 'Transferencia (salida)' })).toHaveCount(0);
    await page.getByRole('option', { name: 'Salida por entrega' }).click();

    const cantidad = dialogo.getByRole('textbox', { name: /^Cantidad/ });
    await cantidad.fill('20');
    // Al salir del campo aparece su mensaje (y se mueven los botones): se sale antes de pulsar
    await cantidad.blur();
    await expect(cantidad).toHaveAccessibleDescription('Solo hay 12 kg disponibles en esta sede. Escribe una cantidad entre 1 y 12.');
    await dialogo.getByRole('button', { name: 'Registrar' }).click();
    await expect(dialogo.getByRole('alert').filter({ hasText: 'Corrige estos datos para registrar el movimiento' }))
      .toContainText('Cantidad: Solo hay 12 kg disponibles en esta sede. Escribe una cantidad entre 1 y 12.');
    expect(api.llamadas('POST', '/api/inventario/movimientos')).toHaveLength(0);

    await cantidad.fill('5');
    await expect(dialogo.getByText('Stock resultante estimado: 7 kg')).toBeVisible();
    await dialogo.getByRole('textbox', { name: 'Motivo / observación' }).fill('Mercados para familias');
    await dialogo.getByRole('button', { name: 'Registrar' }).click();

    await expect(dialogo).toBeHidden();
    await expect(page.getByText('Movimiento registrado.')).toBeVisible();
    const llamadas = api.llamadas('POST', '/api/inventario/movimientos');
    expect(llamadas).toHaveLength(1);
    expect(llamadas[0].body).toEqual({
      itemId: 'it-7', tipoMovimientoId: 2, cantidad: 5,
      motivo: 'Mercados para familias', donante: null, donanteId: null,
    });
  });
});
