import { describe, it, expect } from 'vitest';
import { etiquetaHora, formatoFechaISO } from '@/presentation/modules/configuracion/pages/components/resumenDiario';

describe('resumen diario de alertas', () => {
  it('muestra la hora en formato de 12 horas', () => {
    expect(etiquetaHora(0)).toBe('12:00 a. m.');
    expect(etiquetaHora(7)).toBe('7:00 a. m.');
    expect(etiquetaHora(12)).toBe('12:00 p. m.');
    expect(etiquetaHora(23)).toBe('11:00 p. m.');
  });

  it('formatea la fecha ISO sin correr el día', () => {
    expect(formatoFechaISO('2026-11-07')).toBe('07/11/2026');
    expect(formatoFechaISO(null)).toBe('');
  });
});
