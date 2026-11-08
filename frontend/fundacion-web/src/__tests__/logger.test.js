import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// IS_DEV se lee al cargar el módulo: se recarga con el entorno simulado en cada prueba.
async function cargarLogger(dev) {
  vi.resetModules();
  vi.stubEnv('DEV', dev);
  return (await import('@/shared/utils/logger')).default;
}

const errorAxios = {
  isAxiosError: true,
  message: 'Request failed with status code 400',
  config: { method: 'post', url: '/api/beneficiarios?buscar=Valentina' },
  response: { status: 400, data: { mensaje: 'Documento 1107123456 ya existe', eps: 'Sura' } },
};

const textoImpreso = spy => JSON.stringify(spy.mock.calls);

describe('logger', () => {
  let log, error, group;
  beforeEach(() => {
    log   = vi.spyOn(console, 'log').mockImplementation(() => {});
    error = vi.spyOn(console, 'error').mockImplementation(() => {});
    group = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
    vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

  describe('en producción', () => {
    it('no imprime cuerpos de peticiones ni respuestas', async () => {
      const logger = await cargarLogger(false);
      logger.api.request('post', '/api/beneficiarios', { nombre: 'Valentina' });
      logger.api.response('get', '/api/beneficiarios', 200, { data: [{ nombre: 'Valentina' }] });
      expect(log).not.toHaveBeenCalled();
      expect(group).not.toHaveBeenCalled();
    });

    it('un error de API solo muestra status, método y ruta (sin cuerpo ni parámetros)', async () => {
      const logger = await cargarLogger(false);
      logger.api.error('post', '/api/beneficiarios?buscar=Valentina', 400, errorAxios.response.data, errorAxios.message);
      const impreso = textoImpreso(error);
      expect(impreso).toContain('400 POST /api/beneficiarios');
      expect(impreso).not.toContain('1107123456');
      expect(impreso).not.toContain('Valentina');
    });

    it('logger.error resume los errores de axios', async () => {
      const logger = await cargarLogger(false);
      logger.error('Promise sin manejar:', errorAxios);
      const impreso = textoImpreso(error);
      expect(impreso).toContain('[API] 400 POST /api/beneficiarios');
      expect(impreso).not.toContain('Sura');
      expect(impreso).not.toContain('Valentina');
    });
  });

  describe('en desarrollo', () => {
    it('muestra los cuerpos para depurar', async () => {
      const logger = await cargarLogger(true);
      logger.api.response('get', '/api/beneficiarios', 200, { nombre: 'Valentina' });
      expect(textoImpreso(log)).toContain('Valentina');
      logger.api.error('post', '/api/x', 400, { mensaje: 'detalle' }, 'falló');
      expect(textoImpreso(error)).toContain('detalle');
    });
  });
});
