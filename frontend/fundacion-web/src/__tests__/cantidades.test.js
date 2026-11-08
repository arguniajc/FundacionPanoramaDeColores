import { describe, it, expect } from 'vitest';
import { limpiarCantidad as cantidadDonacion } from '@/presentation/modules/donaciones/pages/components/helpers';
import { limpiarCantidad as cantidadInventario } from '@/presentation/modules/inventario/pages/components/helpers';

// Campos de cantidad type="text" con teclado numérico (donación en especie, inventario)
describe.each([['donaciones', cantidadDonacion], ['inventario', cantidadInventario]])('limpiarCantidad (%s)', (_, limpiar) => {
  it('deja dígitos y un solo separador decimal; la coma cuenta como punto', () => {
    expect(limpiar('12,5')).toBe('12.5');
    expect(limpiar('1.2.3')).toBe('1.23');
    expect(limpiar('abc3 kg')).toBe('3');
    expect(limpiar('')).toBe('');
    expect(limpiar(null)).toBe('');
  });

  it('sin decimales descarta el separador', () => {
    expect(limpiar('10,5', { decimales: false })).toBe('105');
    expect(limpiar('-7', { decimales: false })).toBe('7');
  });
});
