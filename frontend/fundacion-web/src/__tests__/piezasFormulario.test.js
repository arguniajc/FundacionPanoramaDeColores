import { describe, it, expect } from 'vitest';
import { r, calcularDvNit, nitConDv } from '@/shared/utils/validacion';
import {
  TIPOS_DOCUMENTO_CATALOGO, codigosTipoDocumento, opcionesTipoDocumento, opcionConValorActual,
  esDocumentoNumerico, tecladoDocumento, normalizarTipoDocumento, etiquetaTipoDocumento,
} from '@/shared/constants/tiposDocumento';
import { TIPOS_DOC } from '@/shared/constants/beneficiarios';
import { TIPOS_DOCUMENTO } from '@/shared/utils/geodata';
import {
  limpiarMoneda, formatearMoneda, aValorLimpio, significativosAntes, posicionCursor, limpiarTelefono,
} from '@/shared/utils/entradaCampos';
import { accionAlCerrar, hayCambiosEn } from '@/shared/utils/cierreDialogo';

// ── NIT con dígito de verificación (DIAN, módulo 11) ─────────────────────────
describe('calcularDvNit', () => {
  it('calcula el DV de NIT reales', () => {
    expect(calcularDvNit('800197268')).toBe(4);   // DIAN
    expect(calcularDvNit('899999068')).toBe(1);   // Ecopetrol
    expect(calcularDvNit('890903938')).toBe(8);   // Bancolombia
    expect(calcularDvNit('860034313')).toBe(7);   // Davivienda
    expect(calcularDvNit('900123456')).toBe(8);
  });
  it('cubre los casos residuo 0 y 1 (DV = residuo)', () => {
    // 1 → 1*3 = 3 → r 3 → 8; 4 → 12 → r 1 → 1; 11 → 1*3+1*7 = 10 → 1; 0… → 0
    expect(calcularDvNit('4')).toBe(1);
    expect(calcularDvNit('000000')).toBe(0);
  });
  it('ignora puntos, espacios y un DV ya escrito', () => {
    expect(calcularDvNit('800.197.268')).toBe(4);
    expect(calcularDvNit('800 197 268-9')).toBe(4);
  });
  it('devuelve null si no es un NIT', () => {
    expect(calcularDvNit('')).toBeNull();
    expect(calcularDvNit('abc')).toBeNull();
    expect(calcularDvNit(null)).toBeNull();
    expect(calcularDvNit('1234567890123456')).toBeNull();
  });
  it('nitConDv arma el NIT completo', () => {
    expect(nitConDv('900123456')).toBe('900123456-8');
    expect(nitConDv('800.197.268')).toBe('800197268-4');
    expect(nitConDv('x')).toBe('');
  });
});

describe('r.nit con DV', () => {
  const regla = r.nit();
  it('acepta NIT reales con DV correcto y NIT sin DV', () => {
    for (const nit of ['800197268-4', '899999068-1', '890903938-8', '860034313-7', '900123456', '800197268'])
      expect(regla(nit)).toBe('');
  });
  it('rechaza un DV que no corresponde, diciendo cuál es', () => {
    expect(regla('900123456-7')).toBe('El dígito de verificación no corresponde; debería ser 8. Ejemplo: 900123456-8');
    expect(regla('800197268-0')).toContain('debería ser 4');
    expect(regla('890903938-9')).toContain('debería ser 8');
  });
  it('el formato sigue validándose antes del DV', () => {
    expect(regla('900.123.456-8')).toContain('El NIT lleva solo números');
    expect(regla('12345')).toContain('Ejemplo: 900123456-8');
  });
});

// ── Catálogo de tipos de documento ───────────────────────────────────────────
describe('catálogo de tipos de documento', () => {
  it('cubre todos los códigos pedidos, sin repetidos', () => {
    const codigos = TIPOS_DOCUMENTO_CATALOGO.map(t => t.codigo);
    expect(new Set(codigos).size).toBe(codigos.length);
    for (const c of ['RC', 'TI', 'CC', 'CE', 'NUIP', 'PA', 'PPT', 'PEP', 'RAMV', 'NIT', 'Sin documento', 'Otro'])
      expect(codigos).toContain(c);
  });
  it('las listas derivadas conservan el contenido de antes', () => {
    expect(TIPOS_DOC).toEqual(['RC', 'TI', 'CC', 'CE', 'NUIP', 'PA', 'PPT', 'RAMV', 'Sin documento']);
    expect(TIPOS_DOCUMENTO).toEqual(['RC', 'TI', 'CC', 'CE', 'PA', 'PEP', 'PPT', 'NIT', 'Otro']);
  });
  it('filtra por grupo(s) en el orden del catálogo', () => {
    expect(codigosTipoDocumento('empresa')).toEqual(['NIT', 'Otro']);
    expect(codigosTipoDocumento('menor')).toEqual(['RC', 'TI', 'CE', 'NUIP', 'PA', 'PPT', 'RAMV', 'Sin documento']);
    expect(codigosTipoDocumento('adulto')).not.toContain('TI');
    expect(codigosTipoDocumento()).toHaveLength(TIPOS_DOCUMENTO_CATALOGO.length);
  });
  it('opciones con etiqueta "código – nombre"', () => {
    const op = opcionesTipoDocumento('adulto');
    expect(op.find(o => o.value === 'CC').label).toBe('CC – Cédula de ciudadanía');
    expect(op.find(o => o.value === 'Sin documento').label).toBe('Sin documento');
    expect(etiquetaTipoDocumento('pasaporte')).toBe('PA – Pasaporte');
  });
  it('agrega el valor guardado que no está en la lista', () => {
    const op = opcionConValorActual(opcionesTipoDocumento('empresa'), 'Pasaporte');
    expect(op.map(o => o.value)).toEqual(['NIT', 'Otro', 'Pasaporte']);
    expect(opcionConValorActual(op, 'NIT')).toBe(op);
  });
  it('numérico y teclado', () => {
    for (const c of ['RC', 'TI', 'CC', 'NUIP']) expect(esDocumentoNumerico(c)).toBe(true);
    for (const c of ['CE', 'PA', 'PPT', 'NIT', 'Otro', '', undefined]) expect(esDocumentoNumerico(c)).toBe(false);
    expect(tecladoDocumento('cc')).toBe('numeric');
    expect(tecladoDocumento('NIT')).toBe('tel');
    expect(tecladoDocumento('PA')).toBe('text');
  });
  it('normaliza alias viejos y minúsculas', () => {
    expect(normalizarTipoDocumento('Pasaporte')).toBe('PA');
    expect(normalizarTipoDocumento('PP')).toBe('PA');
    expect(normalizarTipoDocumento('PAS')).toBe('PA');
    expect(normalizarTipoDocumento('nit')).toBe('NIT');
    expect(normalizarTipoDocumento(' cc ')).toBe('CC');
    expect(normalizarTipoDocumento('sin documento')).toBe('Sin documento');
    expect(normalizarTipoDocumento('XYZ')).toBe('XYZ');
    expect(normalizarTipoDocumento(null)).toBe('');
  });
});

describe('r.documentoSegunTipo con el catálogo y alias', () => {
  const regla = r.documentoSegunTipo('tipo');
  it('alias de pasaporte usan la regla alfanumérica', () => {
    for (const tipo of ['Pasaporte', 'PP', 'PAS', 'PA']) {
      expect(regla('AB123456', { tipo })).toBe('');
      expect(regla('AB-1', { tipo })).toContain('letras o números');
    }
  });
  it('NIT en minúsculas valida el DV', () => {
    expect(regla('900123456-8', { tipo: 'nit' })).toBe('');
    expect(regla('900123456-7', { tipo: 'nit' })).toContain('debería ser 8');
  });
  it('numéricos del catálogo (incluido NUIP) y el resto alfanumérico', () => {
    expect(regla('AB123456', { tipo: 'nuip' })).toContain('de 6 a 11 dígitos');
    for (const tipo of ['CE', 'PPT', 'PEP', 'RAMV', 'Otro', 'Sin documento'])
      expect(regla('AB123456', { tipo })).toBe('');
  });
});

// ── CampoMoneda: formateo y limpieza ─────────────────────────────────────────
describe('moneda', () => {
  it('limpia lo escrito a dígitos', () => {
    expect(limpiarMoneda('1.500.000')).toBe('1500000');
    expect(limpiarMoneda('$ 1.500.000')).toBe('1500000');
    expect(limpiarMoneda('1.500,50')).toBe('150050');   // sin decimales, la coma se ignora
    expect(limpiarMoneda('00012')).toBe('12');
    expect(limpiarMoneda('0')).toBe('0');
    expect(limpiarMoneda('abc')).toBe('');
    expect(limpiarMoneda('')).toBe('');
    expect(limpiarMoneda(null)).toBe('');
  });
  it('con decimales: la coma es decimal y se recortan los sobrantes', () => {
    expect(limpiarMoneda('1.500,75', { decimales: 2 })).toBe('1500.75');
    expect(limpiarMoneda('1.500,756', { decimales: 2 })).toBe('1500.75');
    expect(limpiarMoneda('1.500,', { decimales: 2 })).toBe('1500.');
    expect(limpiarMoneda(',5', { decimales: 2 })).toBe('0.5');
    expect(limpiarMoneda('1.500', { decimales: 2 })).toBe('1500');
  });
  it('formatea con puntos de miles es-CO', () => {
    expect(formatearMoneda('1500000')).toBe('1.500.000');
    expect(formatearMoneda('1500')).toBe('1.500');
    expect(formatearMoneda('999')).toBe('999');
    expect(formatearMoneda(1500000)).toBe('1.500.000');
    expect(formatearMoneda('')).toBe('');
    expect(formatearMoneda(null)).toBe('');
    expect(formatearMoneda(Number.NaN)).toBe('');
  });
  it('sin decimales descarta la parte decimal de un valor de la API', () => {
    expect(formatearMoneda('150000.00')).toBe('150.000');
    expect(formatearMoneda(1500.9)).toBe('1.500');
  });
  it('con decimales usa coma y conserva la coma mientras se escribe', () => {
    expect(formatearMoneda('1500.5', { decimales: 2 })).toBe('1.500,5');
    expect(formatearMoneda('1500.', { decimales: 2 })).toBe('1.500,');
    expect(formatearMoneda(1234567.891, { decimales: 2 })).toBe('1.234.567,89');
  });
  it('ida y vuelta: limpiar(formatear(x)) = x', () => {
    for (const x of ['0', '7', '1500', '1500000', '987654321'])
      expect(limpiarMoneda(formatearMoneda(x))).toBe(x);
    expect(limpiarMoneda(formatearMoneda('1500.25', { decimales: 2 }), { decimales: 2 })).toBe('1500.25');
  });
  it('el valor limpio pasa r.monto', () => {
    expect(r.monto()(limpiarMoneda('1.500.000'))).toBe('');
    expect(r.monto()(limpiarMoneda('1.500,5', { decimales: 2 }))).toBe('');
    expect(r.monto()(limpiarMoneda('0'))).toContain('mayor que 0');
  });
  it('aValorLimpio acepta números y strings', () => {
    expect(aValorLimpio(1500)).toBe('1500');
    expect(aValorLimpio('1500')).toBe('1500');
    expect(aValorLimpio(undefined)).toBe('');
    expect(aValorLimpio('1500.456', { decimales: 2 })).toBe('1500.45');
  });
  it('el cursor queda detrás de los mismos dígitos', () => {
    // Usuario escribe "5" en "1.000|" → crudo "1.0005", cursor al final (4 dígitos antes… 5)
    const crudo = '1.0005';
    const sig = significativosAntes(crudo, crudo.length);
    expect(sig).toBe(5);
    expect(posicionCursor(formatearMoneda(limpiarMoneda(crudo)), sig)).toBe('10.005'.length);
    // Insertar "9" en medio: "1.5|00.000" → "1.59|00.000" → "15.900.000", cursor tras "15.9"
    const crudo2 = '1.5900.000';
    const sig2 = significativosAntes(crudo2, 4);
    expect(sig2).toBe(3);
    expect(posicionCursor('15.900.000', sig2)).toBe(4);
    // Borrar todo → cursor al inicio
    expect(posicionCursor('', 0)).toBe(0);
    // Con decimales la coma cuenta
    expect(posicionCursor('1.500,5', significativosAntes('1500,5', 5, { decimales: 2 }), { decimales: 2 })).toBe(6);
  });
});

describe('limpiarTelefono', () => {
  it('deja dígitos, espacios, guiones, paréntesis y + inicial', () => {
    expect(limpiarTelefono('300 123 4567')).toBe('300 123 4567');
    expect(limpiarTelefono('300-abc-4567')).toBe('300--4567');
    expect(limpiarTelefono('+57 (300) 1234567')).toBe('+57 (300) 1234567');
    expect(limpiarTelefono('57+300')).toBe('57300');
    expect(limpiarTelefono('  3001234567')).toBe('3001234567');
    expect(limpiarTelefono('3'.repeat(30))).toHaveLength(20);
    expect(limpiarTelefono(null)).toBe('');
  });
  it('lo limpio pasa r.telefono', () => {
    expect(r.telefono()(limpiarTelefono('300-123-4567'))).toBe('');
  });
});

// ── Cierre de diálogos con cambios ───────────────────────────────────────────
describe('accionAlCerrar', () => {
  it('sin cambios cierra; con cambios pregunta; guardando ignora', () => {
    expect(accionAlCerrar({})).toBe('cerrar');
    expect(accionAlCerrar({ hayCambios: false, reason: 'backdropClick' })).toBe('cerrar');
    expect(accionAlCerrar({ hayCambios: true, reason: 'escapeKeyDown' })).toBe('confirmar');
    expect(accionAlCerrar({ hayCambios: true })).toBe('confirmar');
    expect(accionAlCerrar({ bloqueado: true, hayCambios: true, reason: 'backdropClick' })).toBe('ignorar');
    expect(accionAlCerrar({ bloqueado: true })).toBe('ignorar');
  });
});

describe('hayCambiosEn', () => {
  it('compara en profundidad ignorando vacíos equivalentes y espacios', () => {
    expect(hayCambiosEn({ a: 'x', b: '' }, { a: 'x', b: null })).toBe(false);
    expect(hayCambiosEn({ a: 'Ana ' }, { a: 'Ana' })).toBe(false);
    expect(hayCambiosEn({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(false);
    expect(hayCambiosEn({ l: [1, 2] }, { l: [1, 2] })).toBe(false);
    expect(hayCambiosEn({ a: 'Ana' }, { a: 'Ana María' })).toBe(true);
    expect(hayCambiosEn({ l: [1, 2] }, { l: [2, 1] })).toBe(true);
    expect(hayCambiosEn({ o: { x: true } }, { o: { x: false } })).toBe(true);
  });
});
