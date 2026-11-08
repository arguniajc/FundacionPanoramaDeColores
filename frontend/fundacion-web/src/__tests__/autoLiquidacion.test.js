import { describe, it, expect } from 'vitest';
import { mensajeAutoLiquidacion } from '@/presentation/modules/talento_humano/pages/components/nominaFormato';

describe('mensajeAutoLiquidacion (solo crea las que faltan)', () => {
  it('período vacío: cuenta las nuevas', () => {
    expect(mensajeAutoLiquidacion(0, 3)).toBe('3 liquidaciones nuevas.');
    expect(mensajeAutoLiquidacion(0, 1)).toBe('1 liquidación nueva.');
  });

  it('con liquidaciones previas: aclara que no se modificaron', () => {
    expect(mensajeAutoLiquidacion(2, 5)).toBe('3 liquidaciones nuevas. Las 2 existentes no se modificaron.');
    expect(mensajeAutoLiquidacion(1, 2)).toBe('1 liquidación nueva. La existente no se modificó.');
  });

  it('nada por liquidar', () => {
    expect(mensajeAutoLiquidacion(4, 4)).toBe('No había empleados por liquidar: las liquidaciones existentes no se modificaron.');
    expect(mensajeAutoLiquidacion(undefined, undefined)).toMatch(/^No había empleados/);
  });
});
