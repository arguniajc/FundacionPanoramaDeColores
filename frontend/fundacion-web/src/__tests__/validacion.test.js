import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { r, vacio, validarCampo, validarEsquema } from '@/shared/utils/validacion';

// Fecha fija: 15 de junio de 2026 (hora local).
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0));
});
afterEach(() => vi.useRealTimers());

describe('vacio', () => {
  it('trata null, undefined y espacios como vacíos', () => {
    expect(vacio(null)).toBe(true);
    expect(vacio(undefined)).toBe(true);
    expect(vacio('   ')).toBe(true);
    expect(vacio(0)).toBe(false);
    expect(vacio('a')).toBe(false);
  });
});

describe('r.obligatorio', () => {
  const regla = r.obligatorio('Ana');
  it('acepta un valor con contenido', () => {
    expect(regla('x')).toBe('');
    expect(regla(0)).toBe('');
    expect(regla(true)).toBe('');
  });
  it('rechaza vacío, espacios y false, con ejemplo', () => {
    expect(regla('')).toBe('Es obligatorio. Ejemplo: Ana');
    expect(regla('  ')).toBe('Es obligatorio. Ejemplo: Ana');
    expect(regla(null)).toContain('Es obligatorio');
    expect(regla(false)).toContain('Es obligatorio');
  });
  it('sin ejemplo no agrega texto extra', () => {
    expect(r.obligatorio()('')).toBe('Es obligatorio.');
  });
});

describe('r.seleccion', () => {
  it('acepta una opción y rechaza vacío', () => {
    expect(r.seleccion('CC')('TI')).toBe('');
    expect(r.seleccion('CC')('')).toBe('Selecciona una opción. Ejemplo: CC');
  });
});

describe('r.texto', () => {
  it('vacío es válido (no es obligatorio)', () => {
    expect(r.texto({ min: 3 })('')).toBe('');
  });
  it('controla largo mínimo y máximo', () => {
    expect(r.texto({ min: 3 })('ab')).toContain('al menos 3 caracteres');
    expect(r.texto({ min: 3 })('abc')).toBe('');
    expect(r.texto({ max: 5 })('abcdef')).toContain('máximo 5 caracteres');
    expect(r.texto({ max: 5 })('  abcde  ')).toBe('');
  });
  it('soloLetras rechaza números y símbolos pero acepta tildes y ñ', () => {
    const regla = r.texto({ soloLetras: true });
    expect(regla('José Muñoz')).toBe('');
    expect(regla("O'Neil-Pérez")).toBe('');
    expect(regla('Ana2')).toContain('solo letras');
    expect(regla('Ana@')).toContain('solo letras');
  });
});

describe('r.nombreCompleto', () => {
  const regla = r.nombreCompleto();
  it('acepta nombre y apellido', () => {
    expect(regla('Ana Gómez')).toBe('');
    expect(regla('')).toBe('');
  });
  it('rechaza una sola palabra', () => {
    expect(regla('Ana')).toBe('Escribe nombre y apellido. Ejemplo: Ana Gómez');
  });
  it('rechaza números', () => {
    expect(regla('Ana G0mez')).toContain('solo letras');
  });
});

describe('r.correo', () => {
  const regla = r.correo();
  it('acepta correos válidos', () => {
    expect(regla('ana@correo.com')).toBe('');
    expect(regla(' ana.g@sub.dominio.co ')).toBe('');
    expect(regla('')).toBe('');
  });
  it('rechaza correos inválidos', () => {
    expect(regla('ana')).toContain('El correo no es válido');
    expect(regla('ana@correo')).toContain('El correo no es válido');
    expect(regla('ana@correo.c')).toContain('El correo no es válido');
    expect(regla('a na@correo.com')).toContain('El correo no es válido');
  });
});

describe('r.celular', () => {
  const regla = r.celular();
  it('acepta 10 dígitos que empiezan por 3 (espacios se ignoran)', () => {
    expect(regla('3001234567')).toBe('');
    expect(regla('300 123 4567')).toBe('');
  });
  it('rechaza otros formatos', () => {
    expect(regla('2001234567')).toContain('celular de 10 dígitos');
    expect(regla('300123456')).toContain('celular de 10 dígitos');
    expect(regla('300-123-4567')).toContain('celular de 10 dígitos');
  });
});

describe('r.telefono', () => {
  const regla = r.telefono();
  it('acepta celular, fijo nacional y fijo local', () => {
    expect(regla('3001234567')).toBe('');
    expect(regla('602 444 1234')).toBe('');
    expect(regla('602-4441234')).toBe('');
    expect(regla('4441234')).toBe('');
  });
  it('rechaza formatos inválidos', () => {
    expect(regla('12345')).toContain('Escribe un celular');
    expect(regla('5024441234')).toContain('Escribe un celular');
    expect(regla('300abc4567')).toContain('Escribe un celular');
  });
});

describe('r.nit', () => {
  const regla = r.nit();
  it('acepta NIT con y sin dígito de verificación', () => {
    expect(regla('900123456')).toBe('');
    expect(regla('900123456-7')).toBe('');
  });
  it('rechaza puntos, letras o largo inválido', () => {
    expect(regla('900.123.456-7')).toContain('El NIT');
    expect(regla('12345')).toContain('El NIT');
    expect(regla('900123456-78')).toContain('El NIT');
  });
});

describe('r.documento', () => {
  it('numérico: 6 a 11 dígitos', () => {
    const regla = r.documento();
    expect(regla('123456')).toBe('');
    expect(regla('12345678901')).toBe('');
    expect(regla('12345')).toContain('de 6 a 11 dígitos');
    expect(regla('123456789012')).toContain('de 6 a 11 dígitos');
    expect(regla('1.144.123')).toContain('de 6 a 11 dígitos');
  });
  it('alfanumérico: 4 a 15 letras o números', () => {
    const regla = r.documento({ alfanumerico: true });
    expect(regla('AB123456')).toBe('');
    expect(regla('AB1')).toContain('de 4 a 15 letras o números');
    expect(regla('AB-123456')).toContain('de 4 a 15 letras o números');
  });
});

describe('r.documentoSegunTipo', () => {
  const regla = r.documentoSegunTipo('tipo');
  it('NIT usa la regla de NIT', () => {
    expect(regla('900123456-7', { tipo: 'NIT' })).toBe('');
    expect(regla('AB123', { tipo: 'NIT' })).toContain('El NIT');
  });
  it('RC, TI, CC y NUIP son numéricos', () => {
    for (const tipo of ['RC', 'TI', 'CC', 'NUIP']) {
      expect(regla('1107123456', { tipo })).toBe('');
      expect(regla('AB123456', { tipo })).toContain('de 6 a 11 dígitos');
    }
    expect(regla('12', { tipo: 'CC' })).toContain('1144123456');
    expect(regla('12', { tipo: 'TI' })).toContain('1107123456');
  });
  it('otros tipos (PA, CE…) aceptan letras y números', () => {
    expect(regla('AB123456', { tipo: 'PA' })).toBe('');
    expect(regla('AB 12', { tipo: 'PA' })).toContain('letras o números');
    expect(regla('123456', { tipo: 'CE' })).toBe('');
  });
});

describe('r.numero', () => {
  it('vacío es válido y acepta coma decimal', () => {
    expect(r.numero()('')).toBe('');
    expect(r.numero({ min: 1, max: 10 })('2,5')).toBe('');
  });
  it('rechaza texto', () => {
    expect(r.numero({ ejemplo: '10' })('abc')).toBe('Escribe solo números. Ejemplo: 10');
  });
  it('entero rechaza decimales', () => {
    expect(r.numero({ entero: true })('2.5')).toContain('número entero');
    expect(r.numero({ entero: true })('2')).toBe('');
  });
  it('rango con mínimo y máximo, con unidad', () => {
    const regla = r.numero({ min: 1, max: 250, unidad: 'cm' });
    expect(regla('0')).toBe('Debe estar entre 1 y 250 cm.');
    expect(regla('251')).toBe('Debe ser máximo 250 cm.');
    expect(regla('250')).toBe('');
  });
  it('solo mínimo', () => {
    expect(r.numero({ min: 5 })('4')).toBe('Debe ser mínimo 5.');
  });
});

describe('r.monto', () => {
  const regla = r.monto();
  it('acepta montos positivos', () => {
    expect(regla('50000')).toBe('');
    expect(regla('')).toBe('');
  });
  it('rechaza cero, negativos y símbolos', () => {
    expect(regla('0')).toContain('mayor que 0');
    expect(regla('-5')).toContain('mayor que 0');
    expect(regla('$50.000')).toContain('solo números');
  });
});

describe('r.fecha', () => {
  it('acepta una fecha válida y vacío', () => {
    expect(r.fecha()('2026-03-15')).toBe('');
    expect(r.fecha()('')).toBe('');
  });
  it('rechaza fechas inválidas', () => {
    expect(r.fecha({ ejemplo: '15/03/2026' })('abc')).toBe('La fecha no es válida. Ejemplo: 15/03/2026');
    expect(r.fecha()('2026-13-01')).toContain('no es válida');
  });
  // new Date('2026-02-30') se corre al 2 de marzo; parsearFechaISO lo detecta,
  // así que un día inexistente ya no se acepta.
  it('rechaza un día que no existe (30 de febrero)', () => {
    expect(r.fecha()('2026-02-30')).toContain('no es válida');
  });
  it('noFutura', () => {
    const regla = r.fecha({ noFutura: true });
    expect(regla('2026-06-15')).toBe('');
    expect(regla('2026-06-16')).toContain('no puede ser futura');
  });
  it('noPasada', () => {
    const regla = r.fecha({ noPasada: true });
    expect(regla('2026-06-15')).toBe('');
    expect(regla('2026-06-14')).toContain('no puede ser anterior a hoy');
  });
});

describe('r.fechaDesde', () => {
  const regla = r.fechaDesde('inicio', 'la fecha de inicio');
  it('acepta fechas iguales o posteriores', () => {
    expect(regla('2026-03-10', { inicio: '2026-03-10' })).toBe('');
    expect(regla('2026-03-11', { inicio: '2026-03-10' })).toBe('');
  });
  it('rechaza fechas anteriores', () => {
    expect(regla('2026-03-09', { inicio: '2026-03-10' })).toBe('No puede ser anterior a la fecha de inicio.');
  });
  it('no valida si falta alguna de las dos', () => {
    expect(regla('', { inicio: '2026-03-10' })).toBe('');
    expect(regla('2026-03-09', { inicio: '' })).toBe('');
  });
});

describe('r.si', () => {
  const regla = r.si(f => f.tiene === 'si', r.obligatorio());
  it('aplica la regla solo si se cumple la condición', () => {
    expect(regla('', { tiene: 'si' })).toBe('Es obligatorio.');
    expect(regla('', { tiene: 'no' })).toBe('');
  });
});

describe('r.propia', () => {
  it('devuelve la misma función, que recibe valor y form', () => {
    const fn = (v, form) => (v === form.otro ? '' : 'distinto');
    const regla = r.propia(fn);
    expect(regla).toBe(fn);
    expect(regla('a', { otro: 'a' })).toBe('');
    expect(regla('a', { otro: 'b' })).toBe('distinto');
  });
});

describe('validarCampo / validarEsquema', () => {
  const ESQUEMA = {
    nombre: { etiqueta: 'Nombre', reglas: [r.obligatorio('Ana Gómez'), r.texto({ min: 3 })] },
    email:  { etiqueta: 'Correo', reglas: [r.correo()] },
    fin:    { etiqueta: 'Fin', reglas: [r.fechaDesde('inicio', 'el inicio')] },
  };

  it('validarCampo devuelve el primer error', () => {
    expect(validarCampo(ESQUEMA, 'nombre', { nombre: '' })).toBe('Es obligatorio. Ejemplo: Ana Gómez');
    expect(validarCampo(ESQUEMA, 'nombre', { nombre: 'An' })).toContain('al menos 3');
    expect(validarCampo(ESQUEMA, 'nombre', { nombre: 'Ana' })).toBe('');
  });
  it('validarCampo con un campo sin esquema devuelve vacío', () => {
    expect(validarCampo(ESQUEMA, 'otro', {})).toBe('');
  });
  it('validarCampo pasa el formulario completo a la regla', () => {
    expect(validarCampo(ESQUEMA, 'fin', { inicio: '2026-03-10', fin: '2026-03-01' })).toContain('el inicio');
  });
  it('validarEsquema devuelve solo los campos que fallan', () => {
    expect(validarEsquema(ESQUEMA, { nombre: '', email: 'malo', fin: '' })).toEqual({
      nombre: 'Es obligatorio. Ejemplo: Ana Gómez',
      email: expect.stringContaining('El correo no es válido'),
    });
    expect(validarEsquema(ESQUEMA, { nombre: 'Ana', email: 'a@b.co' })).toEqual({});
  });
  it('validarEsquema puede limitarse a algunos campos', () => {
    expect(validarEsquema(ESQUEMA, { nombre: '', email: 'malo' }, ['email'])).toEqual({
      email: expect.any(String),
    });
  });
});
