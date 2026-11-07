import { describe, it, expect, afterEach, vi } from 'vitest';
import { fechaLocalISO } from '@/shared/utils/fecha';

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
