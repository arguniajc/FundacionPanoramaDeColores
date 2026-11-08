import { describe, it, expect, afterEach, vi } from 'vitest';
import { fmt, fmtFecha } from '@/presentation/modules/contabilidad/pages/components/formato';
import { fmtMoney } from '@/presentation/modules/donaciones/pages/components/helpers';
import { fmtNum, estadoStock } from '@/presentation/modules/inventario/pages/components/helpers';
import { calcEdad, agruparPorSeccion, fmtFechaCorta } from '@/presentation/modules/inscripciones/pages/components/camposUtils';

// Intl separa "$" y el número con un espacio duro: se normaliza para comparar
const plano = s => s.replace(/\s/g, ' ');

describe('formato de moneda (pesos colombianos, sin decimales)', () => {
  it('contabilidad: puntos de miles y signo $', () => {
    expect(plano(fmt(1250000))).toBe('$ 1.250.000');
    expect(plano(fmt(-5000))).toBe('-$ 5.000');
    expect(plano(fmt(1999.6))).toBe('$ 2.000');
  });

  it('contabilidad: sin valor muestra $ 0', () => {
    expect(plano(fmt(null))).toBe('$ 0');
    expect(plano(fmt(undefined))).toBe('$ 0');
  });

  it('donaciones: mismo formato y tolera texto o vacío', () => {
    expect(plano(fmtMoney(500000))).toBe('$ 500.000');
    expect(plano(fmtMoney('75000'))).toBe('$ 75.000');
    expect(plano(fmtMoney(null))).toBe('$ 0');
  });
});

describe('fmtFecha (contabilidad)', () => {
  it('muestra dd/mm/aaaa del mismo día, sin correrse por la zona horaria', () => {
    expect(fmtFecha('2026-03-05')).toBe('05/03/2026');
    expect(fmtFecha('2026-01-01')).toBe('01/01/2026');
  });

  it('sin fecha devuelve vacío', () => expect(fmtFecha(null)).toBe(''));
});

describe('fmtNum (inventario)', () => {
  it('enteros con puntos de miles', () => {
    expect(fmtNum(12000)).toBe('12.000');
    expect(fmtNum('7')).toBe('7');
  });

  it('decimales con coma y dos cifras', () => {
    expect(fmtNum(1234.5)).toBe('1.234,50');
    expect(fmtNum(0.25)).toBe('0,25');
  });
});

describe('estadoStock (inventario)', () => {
  it('sin unidades es "Sin stock"', () => {
    expect(estadoStock({ stockActual: 0, stockMinimo: 5 })).toEqual({ label: 'Sin stock', color: 'error', pct: 0 });
    expect(estadoStock({ stockActual: -2, stockMinimo: 0 }).label).toBe('Sin stock');
  });

  it('por debajo del mínimo es "Stock bajo" con el porcentaje del mínimo', () => {
    expect(estadoStock({ stockActual: 3, stockMinimo: 10 })).toEqual({ label: 'Stock bajo', color: 'warning', pct: 30 });
  });

  it('justo en el mínimo ya está en stock', () => {
    expect(estadoStock({ stockActual: 10, stockMinimo: 10 })).toMatchObject({ label: 'En stock', pct: 50 });
  });

  it('la barra llega al 100 % con el doble del mínimo y no lo pasa', () => {
    expect(estadoStock({ stockActual: 20, stockMinimo: 10 }).pct).toBe(100);
    expect(estadoStock({ stockActual: 90, stockMinimo: 10 }).pct).toBe(100);
  });

  it('sin mínimo definido cualquier existencia está al 100 %', () => {
    expect(estadoStock({ stockActual: 1, stockMinimo: 0 })).toEqual({ label: 'En stock', color: 'success', pct: 100 });
  });
});

describe('calcEdad (formulario de inscripción)', () => {
  afterEach(() => vi.useRealTimers());

  it('cuenta el año solo desde el día del cumpleaños', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 19, 23, 0));
    expect(calcEdad('1985-05-20')).toBe(40);
    vi.setSystemTime(new Date(2026, 4, 20, 0, 30));
    expect(calcEdad('1985-05-20')).toBe(41);
  });

  it('distingue menor y mayor de edad (regla del acudiente)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 10));
    expect(calcEdad('2008-01-11')).toBe(17);
    expect(calcEdad('2008-01-10')).toBe(18);
  });

  it('sin fecha devuelve null', () => {
    expect(calcEdad('')).toBeNull();
    expect(calcEdad(undefined)).toBeNull();
  });
});

describe('agruparPorSeccion', () => {
  it('agrupa en el orden en que aparece cada sección por primera vez', () => {
    const campos = [
      { id: 1, seccion: 'Salud' },
      { id: 2, seccion: '' },
      { id: 3, seccion: 'Salud ' },
      { id: 4, seccion: 'Colegio' },
      { id: 5 },
    ];
    expect(agruparPorSeccion(campos)).toEqual([
      { seccion: 'Salud', campos: [campos[0], campos[2]] },
      { seccion: '', campos: [campos[1], campos[4]] },
      { seccion: 'Colegio', campos: [campos[3]] },
    ]);
  });

  it('sin campos no hay secciones', () => expect(agruparPorSeccion([])).toEqual([]));
});

describe('fmtFechaCorta', () => {
  it('muestra el mes en letras', () => expect(fmtFechaCorta('2026-03-05')).toBe('05 de marzo de 2026'));
  it('sin fecha muestra un guion', () => expect(fmtFechaCorta(null)).toBe('—'));
});
