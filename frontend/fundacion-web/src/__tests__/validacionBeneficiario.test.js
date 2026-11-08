import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  edadDesde, validarCampo, validarPaso, validarFormulario, primerPasoConErrores, describirError,
  validarFilaImportacion,
} from '@/domain/beneficiarios/validacionBeneficiario';

// Fecha fija: 15 de junio de 2026 (hora local).
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0));
});
afterEach(() => vi.useRealTimers());

const NINO = {
  tipo: 'nino',
  primerNombre: 'María', segundoNombre: '', primerApellido: 'Rodríguez', segundoApellido: 'Gómez',
  fechaNacimiento: '2016-03-15', tipoDocumento: 'TI', numeroDocumento: '1107123456',
  genero: 'Femenino', departamentoNacimiento: 'Valle del Cauca', ciudadNacimiento: 'Yumbo',
  barrio: 'Panorama', numPersonasVive: '4', numHermanos: '2',
  tallaCamisa: '10', tallaPantalon: '12', tallaZapatos: '32', pesoKg: '25.5', tallaCm: '120',
  eps: 'Nueva EPS', tieneAlergia: 'no', descripcionAlergia: '', tieneDiscapacidad: false, descripcionDiscapacidad: '',
  nombreAcudiente: 'Ana Gómez', parentesco: 'Madre', whatsapp: '3001234567', viveConNino: 'si',
  direccion: 'Calle 5 # 10-20', autorizacion: true,
};

const ADULTO = {
  ...NINO,
  tipo: 'adulto',
  fechaNacimiento: '1985-08-20', tipoDocumento: 'CC', numeroDocumento: '1144123456',
  pesoKg: '65', tallaCm: '165', numHermanos: '0',
  // datos de acudiente no aplican a adultos
  nombreAcudiente: '', parentesco: '', whatsapp: '', viveConNino: '', direccion: '',
};

const err = (form, campo) => validarCampo(campo, form);

describe('edadDesde', () => {
  it('calcula años cumplidos', () => {
    expect(edadDesde('2016-06-15')).toBe(10);
    expect(edadDesde('2016-06-16')).toBe(9);
    expect(edadDesde('2016-07-01')).toBe(9);
  });
  it('devuelve null si no hay fecha o es inválida', () => {
    expect(edadDesde('')).toBeNull();
    expect(edadDesde('abc')).toBeNull();
  });
});

describe('validarFormulario', () => {
  it('un niño válido no tiene errores', () => {
    expect(validarFormulario(NINO)).toEqual({});
    expect(validarFormulario(NINO, { conAutorizacion: true })).toEqual({});
  });
  it('un adulto válido no tiene errores (sin datos de acudiente)', () => {
    expect(validarFormulario(ADULTO)).toEqual({});
  });
  it('la autorización solo se revisa con conAutorizacion', () => {
    const f = { ...NINO, autorizacion: false };
    expect(validarFormulario(f)).toEqual({});
    expect(validarFormulario(f, { conAutorizacion: true })).toEqual({
      autorizacion: 'Debes marcar la casilla de autorización para poder inscribir.',
    });
  });
});

describe('nombres y apellidos', () => {
  it('primer nombre y primer apellido son obligatorios', () => {
    expect(err({ ...NINO, primerNombre: '' }, 'primerNombre')).toBe('Es obligatorio. Ejemplo: María');
    expect(err({ ...NINO, primerApellido: '  ' }, 'primerApellido')).toBe('Es obligatorio. Ejemplo: Rodríguez');
  });
  it('segundo nombre y apellido son opcionales', () => {
    expect(err({ ...NINO, segundoNombre: '' }, 'segundoNombre')).toBe('');
    expect(err({ ...NINO, segundoApellido: undefined }, 'segundoApellido')).toBe('');
  });
  it('rechaza números o símbolos', () => {
    expect(err({ ...NINO, primerNombre: 'Mar1a' }, 'primerNombre')).toContain('solo letras');
    expect(err({ ...NINO, segundoNombre: 'José.' }, 'segundoNombre')).toContain('solo letras');
  });
  it('rechaza una sola letra', () => {
    expect(err({ ...NINO, primerApellido: 'R' }, 'primerApellido')).toContain('al menos 2 letras');
  });
});

describe('fecha de nacimiento según tipo', () => {
  it('obligatoria, con ejemplo según el tipo', () => {
    expect(err({ ...NINO, fechaNacimiento: '' }, 'fechaNacimiento')).toBe('Es obligatoria. Ejemplo: 15/03/2016');
    expect(err({ ...ADULTO, fechaNacimiento: '' }, 'fechaNacimiento')).toBe('Es obligatoria. Ejemplo: 20/08/1985');
  });
  it('rechaza fecha inválida o futura', () => {
    expect(err({ ...NINO, fechaNacimiento: 'xx' }, 'fechaNacimiento')).toContain('no es válida');
    expect(err({ ...NINO, fechaNacimiento: '2026-12-01' }, 'fechaNacimiento')).toContain('no puede ser futura');
  });
  it('rechaza edades mayores a 110', () => {
    expect(err({ ...ADULTO, fechaNacimiento: '1900-01-01' }, 'fechaNacimiento')).toContain('126 años');
  });
  it('un niño debe ser menor de 18', () => {
    expect(err({ ...NINO, fechaNacimiento: '2008-06-15' }, 'fechaNacimiento')).toContain('Tiene 18 años: un niño');
    expect(err({ ...NINO, fechaNacimiento: '2008-06-16' }, 'fechaNacimiento')).toBe('');
  });
  it('un adulto debe tener 18 o más', () => {
    expect(err({ ...ADULTO, fechaNacimiento: '2010-01-01' }, 'fechaNacimiento')).toContain('Tiene 16 años: un adulto');
    expect(err({ ...ADULTO, fechaNacimiento: '2008-06-15' }, 'fechaNacimiento')).toBe('');
  });
});

describe('tipo de documento según edad', () => {
  it('es obligatorio', () => {
    expect(err({ ...NINO, tipoDocumento: '' }, 'tipoDocumento')).toContain('Selecciona el tipo de documento');
  });
  it('un adulto no usa RC ni TI', () => {
    expect(err({ ...ADULTO, tipoDocumento: 'RC' }, 'tipoDocumento')).toContain('Un adulto no usa');
    expect(err({ ...ADULTO, tipoDocumento: 'TI' }, 'tipoDocumento')).toContain('Un adulto no usa');
    expect(err({ ...ADULTO, tipoDocumento: 'PA' }, 'tipoDocumento')).toBe('');
  });
  it('un niño no usa CC', () => {
    expect(err({ ...NINO, tipoDocumento: 'CC' }, 'tipoDocumento')).toContain('Un menor de edad no tiene Cédula');
    expect(err({ ...NINO, tipoDocumento: 'RC' }, 'tipoDocumento')).toBe('');
    expect(err({ ...NINO, tipoDocumento: 'NUIP' }, 'tipoDocumento')).toBe('');
  });
});

describe('número de documento', () => {
  it('es obligatorio, con ejemplo según el tipo', () => {
    expect(err({ ...NINO, numeroDocumento: '' }, 'numeroDocumento')).toBe('Es obligatorio. Ejemplo: 1107123456');
    expect(err({ ...NINO, tipoDocumento: 'PA', numeroDocumento: '' }, 'numeroDocumento')).toBe('Es obligatorio. Ejemplo: AB123456');
  });
  it('tipos numéricos: solo dígitos, 6 a 11', () => {
    expect(err({ ...NINO, numeroDocumento: '1.107.123' }, 'numeroDocumento')).toContain('solo números');
    expect(err({ ...NINO, numeroDocumento: '12345' }, 'numeroDocumento')).toContain('Un documento TI tiene entre 6 y 11 dígitos');
    expect(err({ ...ADULTO, numeroDocumento: '123456789012' }, 'numeroDocumento')).toContain('Un documento CC');
    expect(err({ ...ADULTO, numeroDocumento: '123456' }, 'numeroDocumento')).toBe('');
  });
  it('pasaporte (PA) acepta letras y números', () => {
    const pa = { ...ADULTO, tipoDocumento: 'PA' };
    expect(err({ ...pa, numeroDocumento: 'AB123456' }, 'numeroDocumento')).toBe('');
    expect(err({ ...pa, numeroDocumento: 'AB-123456' }, 'numeroDocumento')).toContain('sin espacios ni guiones');
    expect(err({ ...pa, numeroDocumento: 'AB1' }, 'numeroDocumento')).toContain('4 a 15 caracteres');
  });
});

describe('WhatsApp', () => {
  it('obligatorio y con formato de celular para niños', () => {
    expect(err({ ...NINO, whatsapp: '' }, 'whatsapp')).toBe('Es obligatorio. Ejemplo: 3001234567');
    expect(err({ ...NINO, whatsapp: '2001234567' }, 'whatsapp')).toContain('celular de 10 dígitos');
    expect(err({ ...NINO, whatsapp: '30012345' }, 'whatsapp')).toContain('celular de 10 dígitos');
  });
  it('no aplica a adultos', () => {
    expect(err({ ...ADULTO, whatsapp: 'abc' }, 'whatsapp')).toBe('');
  });
});

describe('peso y estatura según tipo', () => {
  it('peso de niño entre 2 y 150', () => {
    expect(err({ ...NINO, pesoKg: '' }, 'pesoKg')).toBe('Es obligatorio, en kilogramos. Ejemplo: 25.5');
    expect(err({ ...NINO, pesoKg: '1' }, 'pesoKg')).toBe('El peso debe estar entre 2 y 150 kg. Ejemplo: 25.5');
    expect(err({ ...NINO, pesoKg: '151' }, 'pesoKg')).toContain('entre 2 y 150');
    expect(err({ ...NINO, pesoKg: '2,5' }, 'pesoKg')).toBe('');
  });
  it('peso de adulto entre 30 y 250', () => {
    expect(err({ ...ADULTO, pesoKg: '25' }, 'pesoKg')).toBe('El peso debe estar entre 30 y 250 kg. Ejemplo: 65');
    expect(err({ ...ADULTO, pesoKg: 'abc' }, 'pesoKg')).toContain('entre 30 y 250');
    expect(err({ ...ADULTO, pesoKg: '250' }, 'pesoKg')).toBe('');
  });
  it('estatura de niño entre 40 y 200, entera', () => {
    expect(err({ ...NINO, tallaCm: '' }, 'tallaCm')).toBe('Es obligatoria, en centímetros. Ejemplo: 120');
    expect(err({ ...NINO, tallaCm: '39' }, 'tallaCm')).toContain('entre 40 y 200 cm');
    expect(err({ ...NINO, tallaCm: '120.5' }, 'tallaCm')).toContain('números enteros');
  });
  it('estatura de adulto entre 120 y 230', () => {
    expect(err({ ...ADULTO, tallaCm: '110' }, 'tallaCm')).toContain('entre 120 y 230 cm');
    expect(err({ ...ADULTO, tallaCm: '231' }, 'tallaCm')).toContain('entre 120 y 230 cm');
    expect(err({ ...ADULTO, tallaCm: '120' }, 'tallaCm')).toBe('');
  });
});

describe('otros campos del registro', () => {
  it('barrio: obligatorio, "No registra" o 3+ letras', () => {
    expect(err({ ...NINO, barrio: '' }, 'barrio')).toContain('Es obligatorio');
    expect(err({ ...NINO, barrio: 'Pa' }, 'barrio')).toContain('nombre completo del barrio');
    expect(err({ ...NINO, barrio: 'No registra' }, 'barrio')).toBe('');
  });
  it('personas con quienes vive y hermanos: enteros en rango', () => {
    expect(err({ ...NINO, numPersonasVive: '0' }, 'numPersonasVive')).toContain('entre 1 y 20');
    expect(err({ ...NINO, numPersonasVive: '' }, 'numPersonasVive')).toContain('Es obligatorio');
    expect(err({ ...NINO, numHermanos: '1.5' }, 'numHermanos')).toContain('entre 0 y 20');
    expect(err({ ...NINO, numHermanos: '0' }, 'numHermanos')).toBe('');
  });
  it('talla de zapatos entre 15 y 48', () => {
    expect(err({ ...NINO, tallaZapatos: '' }, 'tallaZapatos')).toContain('Es obligatoria');
    expect(err({ ...NINO, tallaZapatos: '50' }, 'tallaZapatos')).toContain('entre 15 y 48');
  });
  it('dirección: solo niños, "No registra" o 5+ caracteres', () => {
    expect(err({ ...NINO, direccion: 'Cl 5' }, 'direccion')).toContain('dirección completa');
    expect(err({ ...NINO, direccion: 'No registra' }, 'direccion')).toBe('');
    expect(err({ ...ADULTO, direccion: '' }, 'direccion')).toBe('');
  });
  it('parentesco y vive con el niño: solo niños', () => {
    expect(err({ ...NINO, parentesco: '' }, 'parentesco')).toContain('Selecciona el parentesco');
    expect(err({ ...NINO, viveConNino: '' }, 'viveConNino')).toBe('Selecciona Sí o No.');
    expect(err({ ...ADULTO, parentesco: '' }, 'parentesco')).toBe('');
  });
});

describe('descripciones condicionales', () => {
  it('alergia: obligatoria solo si tieneAlergia = "si"', () => {
    expect(err({ ...NINO, tieneAlergia: 'si', descripcionAlergia: '' }, 'descripcionAlergia')).toContain('a qué es alérgico');
    expect(err({ ...NINO, tieneAlergia: 'si', descripcionAlergia: 'Maní' }, 'descripcionAlergia')).toBe('');
    expect(err({ ...NINO, tieneAlergia: 'no', descripcionAlergia: '' }, 'descripcionAlergia')).toBe('');
  });
  it('discapacidad: obligatoria solo si tieneDiscapacidad', () => {
    expect(err({ ...NINO, tieneDiscapacidad: true, descripcionDiscapacidad: '' }, 'descripcionDiscapacidad')).toContain('Describe la condición');
    expect(err({ ...NINO, tieneDiscapacidad: false }, 'descripcionDiscapacidad')).toBe('');
  });
});

describe('nombre del acudiente', () => {
  it('requiere nombre y apellido para niños', () => {
    expect(err({ ...NINO, nombreAcudiente: '' }, 'nombreAcudiente')).toBe('Es obligatorio. Ejemplo: Ana Gómez');
    expect(err({ ...NINO, nombreAcudiente: 'Ana' }, 'nombreAcudiente')).toBe('Escribe nombre y apellido. Ejemplo: Ana Gómez');
    expect(err({ ...NINO, nombreAcudiente: 'Ana 2' }, 'nombreAcudiente')).toContain('solo letras');
  });
  it('no aplica a adultos', () => {
    expect(err({ ...ADULTO, nombreAcudiente: '' }, 'nombreAcudiente')).toBe('');
  });
});

describe('autorización', () => {
  it('debe estar marcada', () => {
    expect(err({ ...NINO, autorizacion: false }, 'autorizacion')).toContain('Debes marcar la casilla');
    expect(err({ ...NINO, autorizacion: true }, 'autorizacion')).toBe('');
  });
});

describe('validarPaso / primerPasoConErrores / describirError', () => {
  it('validarPaso solo revisa los campos del paso', () => {
    const f = { ...NINO, primerNombre: '', pesoKg: '' };
    expect(Object.keys(validarPaso(0, f))).toEqual(['primerNombre']);
    expect(Object.keys(validarPaso(1, f))).toEqual(['pesoKg']);
    expect(validarPaso(2, f)).toEqual({});
    expect(validarPaso(99, f)).toEqual({});
  });
  it('primerPasoConErrores devuelve el índice o -1', () => {
    expect(primerPasoConErrores(NINO)).toBe(-1);
    expect(primerPasoConErrores({ ...NINO, whatsapp: '' })).toBe(3);
    expect(primerPasoConErrores({ ...NINO, eps: '', whatsapp: '' })).toBe(2);
    expect(primerPasoConErrores({ ...NINO, autorizacion: false })).toBe(4);
  });
  it('describirError antepone la etiqueta (o el nombre del campo)', () => {
    expect(describirError('pesoKg', 'malo')).toBe('Peso: malo');
    expect(describirError('desconocido', 'malo')).toBe('desconocido: malo');
  });
  it('validarCampo de un campo sin regla devuelve vacío', () => {
    expect(validarCampo('noExiste', NINO)).toBe('');
  });
});

describe('validarFilaImportacion (plantilla Excel)', () => {
  const FILA = { primerNombre: 'Maria', primerApellido: 'Gonzalez', fechaNacimiento: '2015-03-22' };

  it('una fila mínima válida (solo obligatorios) no tiene errores', () => {
    expect(validarFilaImportacion(FILA)).toEqual([]);
    expect(validarFilaImportacion({ ...FILA, tipoDocumento: 'TI', numeroDocumento: '1234567890', whatsapp: '3001234567' })).toEqual([]);
  });

  it('acepta la fecha como DD/MM/AAAA, igual que el servidor', () => {
    expect(validarFilaImportacion({ ...FILA, fechaNacimiento: '22/03/2015' })).toEqual([]);
  });

  it('obligatorios vacíos y fecha inválida', () => {
    const errs = validarFilaImportacion({});
    expect(errs.some(e => e.startsWith('Primer nombre'))).toBe(true);
    expect(errs.some(e => e.startsWith('Primer apellido'))).toBe(true);
    expect(errs.some(e => e.startsWith('Fecha de nacimiento'))).toBe(true);
    expect(validarFilaImportacion({ ...FILA, fechaNacimiento: '2015-13-40' })[0]).toMatch(/no es válida/);
  });

  it('marca documento, WhatsApp y tipo/edad que el servidor rechaza', () => {
    expect(validarFilaImportacion({ ...FILA, tipoDocumento: 'TI', numeroDocumento: '12.345' })[0]).toMatch(/Número de documento/);
    expect(validarFilaImportacion({ ...FILA, whatsapp: '12345' })[0]).toMatch(/WhatsApp/);
    expect(validarFilaImportacion({ ...FILA, tipoDocumento: 'CC', numeroDocumento: '1144123456' })[0]).toMatch(/Cédula/);
    expect(validarFilaImportacion({ ...FILA, tipo: 'adulto' })[0]).toMatch(/adulto debe tener 18/);
    expect(validarFilaImportacion({ ...FILA, primerNombre: 'Mar1a' })[0]).toMatch(/solo letras/);
  });

  it('el WhatsApp no se exige ni se valida para adultos', () => {
    expect(validarFilaImportacion({ ...FILA, tipo: 'adulto', fechaNacimiento: '1985-08-20', whatsapp: '123' })).toEqual([]);
  });

  it('textos más largos que la columna', () => {
    expect(validarFilaImportacion({ ...FILA, direccion: 'x'.repeat(201) })[0]).toMatch(/Dirección: debe tener máximo 200/);
    expect(validarFilaImportacion({ ...FILA, primerNombre: 'a'.repeat(81) }).some(e => /máximo 80/.test(e))).toBe(true);
  });
});
