import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  errorCampoDinamico, erroresCamposDinamicos,
} from '@/presentation/modules/inscripciones/pages/components/validacionFormulario';

// Fecha fija: 15 de junio de 2026 (hora local).
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0));
});
afterEach(() => vi.useRealTimers());

const campo = (tipo, obligatorio = true, extra = {}) => ({ tipo, obligatorio, ...extra });
const err = (tipo, valor, obligatorio = true, extra) => errorCampoDinamico(campo(tipo, obligatorio, extra), valor);

describe('errorCampoDinamico — obligatorio', () => {
  it('campo vacío no obligatorio está bien', () => {
    expect(err('text', '', false)).toBe('');
    expect(err('email', undefined, false)).toBe('');
  });
  it('texto obligatorio vacío', () => {
    expect(err('text', '')).toBe('Es obligatorio.');
  });
  it('el mensaje trae el ejemplo según el tipo', () => {
    expect(err('email', '')).toBe('Es obligatorio. Ejemplo: nombre@correo.com');
    expect(err('telefono', '')).toBe('Es obligatorio. Ejemplo: 3001234567');
    expect(err('number', '')).toBe('Es obligatorio. Ejemplo: 10');
    expect(err('date', '')).toBe('Es obligatorio. Ejemplo: 15/03/2026');
  });
  it('select y listas predefinidas piden una opción', () => {
    expect(err('select', '', true, { opciones: ['Mañana', 'Tarde'] })).toBe('Selecciona una opción. Ejemplo: Mañana');
    expect(err('tipo_documento', '')).toBe('Selecciona una opción. Ejemplo: RC');
  });
  it('tipos especiales tienen su propio mensaje', () => {
    expect(err('daterange', '')).toContain('Escribe las fechas Desde y Hasta');
    expect(err('documento_id', '')).toContain('Selecciona el tipo y escribe el número');
    expect(err('document', '')).toContain('Falta el documento');
    expect(err('firma', '')).toContain('Falta la firma');
  });
});

describe('errorCampoDinamico — formato', () => {
  it('email', () => {
    expect(err('email', 'ana@correo.com')).toBe('');
    expect(err('email', 'ana@correo')).toContain('El correo no es válido');
  });
  it('telefono', () => {
    expect(err('telefono', '3001234567')).toBe('');
    expect(err('telefono', '6024441234')).toBe('');
    expect(err('telefono', '123')).toContain('Escribe un celular');
  });
  it('numero', () => {
    expect(err('number', '12')).toBe('');
    expect(err('number', 'doce')).toBe('Escribe solo números. Ejemplo: 10');
  });
  it('peso, altura y edad con rangos', () => {
    expect(err('peso', '301')).toBe('Debe ser máximo 300 kg. Ejemplo: 25.5');
    expect(err('altura', '0')).toBe('Debe estar entre 1 y 250 cm. Ejemplo: 120');
    expect(err('edad', '8.5')).toContain('número entero');
    expect(err('edad', '8')).toBe('');
  });
  it('fecha', () => {
    expect(err('date', '2026-03-15')).toBe('');
    expect(err('date', 'xx')).toBe('La fecha no es válida. Ejemplo: 15/03/2026');
    expect(err('fecha_nac', '2027-01-01')).toContain('no puede ser futura');
    expect(err('fecha_nac', '2015-03-15')).toBe('');
  });
  it('tipo desconocido con valor está bien', () => {
    expect(err('text', 'lo que sea')).toBe('');
  });
});

describe('errorCampoDinamico — daterange', () => {
  const rango = (desde, hasta) => JSON.stringify({ desde, hasta });
  it('rango válido', () => {
    expect(err('daterange', rango('2026-02-01', '2026-11-30'))).toBe('');
  });
  it('JSON inválido', () => {
    expect(err('daterange', '{malo')).toContain('Las fechas no son válidas');
  });
  it('faltan Desde o Hasta si es obligatorio', () => {
    expect(err('daterange', rango('', '2026-11-30'))).toContain('Falta la fecha Desde');
    expect(err('daterange', rango('2026-02-01', ''))).toContain('Falta la fecha Hasta');
    expect(err('daterange', rango('2026-02-01', ''), false)).toBe('');
  });
  it('Hasta no puede ser anterior a Desde', () => {
    expect(err('daterange', rango('2026-11-30', '2026-02-01'))).toBe('No puede ser anterior a la fecha Desde.');
  });
});

describe('errorCampoDinamico — documento_id', () => {
  const doc = (tipo, numero) => JSON.stringify({ tipo, numero });
  it('documento válido', () => {
    expect(err('documento_id', doc('TI', '1107123456'))).toBe('');
    expect(err('documento_id', doc('PA', 'AB123456'))).toBe('');
    expect(err('documento_id', doc('NIT', '900123456-7'))).toBe('');
  });
  it('JSON inválido', () => {
    expect(err('documento_id', 'no-json')).toContain('El documento no es válido');
  });
  it('faltan tipo o número si es obligatorio', () => {
    expect(err('documento_id', doc('', '1107123456'))).toContain('Selecciona el tipo de documento');
    expect(err('documento_id', doc('TI', ''))).toContain('Escribe el número de documento');
  });
  it('formato según el tipo', () => {
    expect(err('documento_id', doc('TI', 'AB123'))).toContain('de 6 a 11 dígitos');
    expect(err('documento_id', doc('PA', 'AB-1'))).toContain('letras o números');
  });
});

describe('erroresCamposDinamicos', () => {
  it('reúne errores por id y omite paneles desactivados', () => {
    const campos = [
      { id: 'c1', tipo: 'email', obligatorio: true },
      { id: 'c2', tipo: 'text', obligatorio: false },
      { id: 'c3', tipo: 'datos_padre', obligatorio: true },
    ];
    expect(erroresCamposDinamicos(campos, { c1: 'malo' }, { c3: false })).toEqual({
      c1: expect.stringContaining('El correo no es válido'),
    });
    expect(Object.keys(erroresCamposDinamicos(campos, { c1: 'a@b.co' }))).toEqual(['c3']);
  });
});
