import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { fechaLocalISO, parsearFechaISO, calcularEdad } from '@/shared/utils/fecha';
import process from 'node:process';

// La app se usa en Colombia (UTC-5): ahí se notan los errores de convertir a UTC
const TZ_ORIGINAL = process.env.TZ;
beforeAll(() => { process.env.TZ = 'America/Bogota'; });
afterAll(() => {
  if (TZ_ORIGINAL === undefined) delete process.env.TZ;
  else process.env.TZ = TZ_ORIGINAL;
});

describe('fechaLocalISO', () => {
  afterEach(() => vi.useRealTimers());

  it('usa la fecha local, no UTC (de noche no salta al día siguiente)', () => {
    expect(fechaLocalISO(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });

  it('rellena mes y día con cero', () => {
    expect(fechaLocalISO(new Date(2026, 8, 1, 0, 0))).toBe('2026-09-01');
    expect(fechaLocalISO(new Date(2026, 11, 31, 12, 0))).toBe('2026-12-31');
  });

  it('por defecto devuelve hoy', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 7, 21, 15));
    expect(fechaLocalISO()).toBe('2026-03-07');
  });
});

describe('parsearFechaISO', () => {
  it('devuelve la medianoche local de ese día', () => {
    const d = parsearFechaISO('2026-03-15');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 2, 15, 0]);
  });

  it('acepta el 29 de febrero solo en año bisiesto', () => {
    expect(parsearFechaISO('2024-02-29')).not.toBeNull();
    expect(parsearFechaISO('2025-02-29')).toBeNull();
  });

  it.each(['2026-02-30', '2026-13-01', '2026-00-10', '15/03/2026', '2026-3-5', '', null, undefined])(
    'rechaza %s', texto => expect(parsearFechaISO(texto)).toBeNull());
});

describe('calcularEdad', () => {
  afterEach(() => vi.useRealTimers());
  const hoyEs = (anio, mes, dia, hora = 10) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(anio, mes - 1, dia, hora));
  };

  it('cumple años el día exacto, ni uno antes', () => {
    hoyEs(2026, 6, 19);
    expect(calcularEdad('2015-06-20')).toBe('10 años');
    hoyEs(2026, 6, 20);
    expect(calcularEdad('2015-06-20')).toBe('11 años');
  });

  it('no cambia por la hora del día (de noche en Colombia ya es otro día en UTC)', () => {
    hoyEs(2026, 6, 19, 22);
    expect(calcularEdad('2015-06-20')).toBe('10 años');
  });

  it('acepta fecha con hora (como la puede devolver la API)', () => {
    hoyEs(2026, 3, 1);
    expect(calcularEdad('2016-03-15T00:00:00')).toBe('9 años');
  });

  it('un bebé de meses tiene 0 años', () => {
    hoyEs(2026, 3, 1);
    expect(calcularEdad('2025-11-20')).toBe('0 años');
  });

  it('sin fecha muestra un guion', () => {
    expect(calcularEdad(null)).toBe('—');
    expect(calcularEdad('')).toBe('—');
  });
});
