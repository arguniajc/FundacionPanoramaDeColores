import { describe, it, expect } from 'vitest';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';

const resp = (status, data) => ({ response: { status, data } });

describe('mensajeErrorApi', () => {
  it('sin respuesta: problema de conexión', () => {
    expect(mensajeErrorApi(new Error('Network Error'))).toContain('No hay conexión con el servidor');
    expect(mensajeErrorApi(undefined)).toContain('No hay conexión con el servidor');
  });

  it('timeout (ECONNABORTED)', () => {
    expect(mensajeErrorApi({ code: 'ECONNABORTED' })).toContain('tardó demasiado en responder');
  });

  it('400 con lista propia de errores', () => {
    expect(mensajeErrorApi(resp(400, { mensaje: 'x', errores: ['Falta el nombre', '', 'Documento inválido'] })))
      .toBe('Revisa estos datos: Falta el nombre · Documento inválido');
  });

  it('400 con ValidationProblem de ASP.NET: etiquetas y traducciones', () => {
    const msg = mensajeErrorApi(resp(400, {
      errors: {
        dto: ['The dto field is required.'],
        PrimerNombre: ['The PrimerNombre field is required.'],
        '$.pesoKg': ['The JSON value could not be converted to System.Decimal.'],
        'Acudiente.Whatsapp': ['The field Whatsapp must be a string with a maximum length of 10.'],
        CampoRaro: 'Mensaje propio',
        TallaCm: ['The value is not valid.', 'The value is not valid.'],
      },
    }));
    expect(msg).toBe(
      'Revisa estos datos: Primer nombre es obligatorio · Peso tiene un formato inválido · ' +
      'WhatsApp es demasiado largo · CampoRaro Mensaje propio · Estatura tiene un formato inválido',
    );
    expect(msg).not.toContain('dto');
  });

  it('400 sin detalles usa el mensaje del backend o uno genérico', () => {
    expect(mensajeErrorApi(resp(400, { mensaje: 'Datos incompletos' }))).toBe('Datos incompletos');
    expect(mensajeErrorApi(resp(400, {}))).toBe('Algunos datos no son válidos. Revisa el formulario.');
  });

  it('401: sesión expirada (ignora el mensaje del backend)', () => {
    expect(mensajeErrorApi(resp(401, { mensaje: 'Unauthorized' }))).toContain('Tu sesión expiró');
  });

  it('403: permiso', () => {
    expect(mensajeErrorApi(resp(403))).toBe('No tienes permiso para realizar esta acción.');
    expect(mensajeErrorApi(resp(403, { mensaje: 'Solo administradores' }))).toBe('Solo administradores');
  });

  it('404: no existe', () => {
    expect(mensajeErrorApi(resp(404, null))).toContain('ya no existe');
  });

  it('409: con y sin mensaje del backend', () => {
    expect(mensajeErrorApi(resp(409, { mensaje: 'Documento duplicado' }), { conflicto: 'otro' })).toBe('Documento duplicado');
    expect(mensajeErrorApi(resp(409, {}), { conflicto: 'Ya existe ese documento' })).toBe('Ya existe ese documento');
    expect(mensajeErrorApi(resp(409, {}))).toBe('El registro entra en conflicto con otro existente.');
  });

  it('413: archivos muy grandes', () => {
    expect(mensajeErrorApi(resp(413))).toBe('Los archivos adjuntos son demasiado grandes.');
  });

  it('429: demasiadas solicitudes', () => {
    expect(mensajeErrorApi(resp(429))).toContain('Demasiadas solicitudes');
  });

  it('5xx: error del servidor con acción y código', () => {
    expect(mensajeErrorApi(resp(500, { codigo: 'ABC123' }), { accion: 'eliminar' }))
      .toBe('Error del servidor al eliminar. Intenta de nuevo en unos minutos; si persiste, avisa al administrador (código ABC123).');
    expect(mensajeErrorApi(resp(503, {}))).toBe(
      'Error del servidor al guardar. Intenta de nuevo en unos minutos; si persiste, avisa al administrador.',
    );
  });

  it('otro estado: mensaje del backend o genérico con la acción', () => {
    expect(mensajeErrorApi(resp(418, { mensaje: 'Soy una tetera' }))).toBe('Soy una tetera');
    expect(mensajeErrorApi(resp(418, {}), { accion: 'enviar' })).toBe('No se pudo enviar. Intenta de nuevo.');
  });
});
