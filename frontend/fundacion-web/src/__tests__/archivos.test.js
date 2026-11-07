import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/infrastructure/http/apiClient', () => ({ default: { post: vi.fn() } }));

// El módulo guarda caché y lote en variables de módulo: se recarga en cada prueba.
let apiClient;
let archivos;

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  apiClient = (await import('@/infrastructure/http/apiClient')).default;
  apiClient.post.mockReset();
  archivos = await import('@/shared/utils/archivos');
});
afterEach(() => vi.useRealTimers());

const firmarCon = urls => apiClient.post.mockImplementation(async (_ruta, { referencias }) => ({
  data: { urls: Object.fromEntries(referencias.filter(r => urls[r]).map(r => [r, urls[r]])) },
}));

describe('archivos privados', () => {
  it('esPrivado reconoce el prefijo privado://', () => {
    expect(archivos.esPrivado('privado://fotos/a.jpg')).toBe(true);
    expect(archivos.esPrivado('https://x.com/a.jpg')).toBe(false);
    expect(archivos.esPrivado(null)).toBe(false);
  });

  it('valores no privados se devuelven tal cual, sin llamar a la API', async () => {
    await expect(archivos.resolverArchivo('https://cdn.com/a.jpg')).resolves.toBe('https://cdn.com/a.jpg');
    await expect(archivos.resolverArchivo('data:image/png;base64,AAA')).resolves.toBe('data:image/png;base64,AAA');
    await expect(archivos.resolverArchivo('')).resolves.toBeNull();
    await expect(archivos.resolverArchivo(undefined)).resolves.toBeNull();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('firma en UN solo POST los privados pedidos juntos', async () => {
    firmarCon({ 'privado://f/a.jpg': 'https://firmada/a', 'privado://f/b.jpg': 'https://firmada/b' });
    const p = archivos.resolverArchivos(['privado://f/a.jpg', 'https://pub/c.jpg', 'privado://f/b.jpg', 'privado://f/a.jpg']);
    expect(apiClient.post).not.toHaveBeenCalled(); // espera los 20 ms del lote
    await vi.advanceTimersByTimeAsync(20);
    await expect(p).resolves.toEqual(['https://firmada/a', 'https://pub/c.jpg', 'https://firmada/b', 'https://firmada/a']);
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(apiClient.post).toHaveBeenCalledWith('/api/archivos/firmar', {
      referencias: ['privado://f/a.jpg', 'privado://f/b.jpg'],
    });
  });

  it('usa la caché: un segundo pedido no vuelve a llamar a la API', async () => {
    firmarCon({ 'privado://f/a.jpg': 'https://firmada/a' });
    const p1 = archivos.resolverArchivo('privado://f/a.jpg');
    await vi.advanceTimersByTimeAsync(20);
    await expect(p1).resolves.toBe('https://firmada/a');

    const p2 = archivos.resolverArchivo('privado://f/a.jpg');
    await vi.advanceTimersByTimeAsync(20);
    await expect(p2).resolves.toBe('https://firmada/a');
    expect(apiClient.post).toHaveBeenCalledTimes(1);
  });

  it('la caché vence a los 50 minutos y se vuelve a firmar', async () => {
    firmarCon({ 'privado://f/a.jpg': 'https://firmada/a' });
    const p1 = archivos.resolverArchivo('privado://f/a.jpg');
    await vi.advanceTimersByTimeAsync(20);
    await p1;
    vi.setSystemTime(Date.now() + 51 * 60 * 1000);
    const p2 = archivos.resolverArchivo('privado://f/a.jpg');
    await vi.advanceTimersByTimeAsync(20);
    await expect(p2).resolves.toBe('https://firmada/a');
    expect(apiClient.post).toHaveBeenCalledTimes(2);
  });

  it('archivo que ya no existe → null (y no se guarda en caché)', async () => {
    firmarCon({});
    const p = archivos.resolverArchivo('privado://f/borrado.jpg');
    await vi.advanceTimersByTimeAsync(20);
    await expect(p).resolves.toBeNull();

    const p2 = archivos.resolverArchivo('privado://f/borrado.jpg');
    await vi.advanceTimersByTimeAsync(20);
    await expect(p2).resolves.toBeNull();
    expect(apiClient.post).toHaveBeenCalledTimes(2);
  });

  it('si la API falla, se rechaza (resolverArchivos lo convierte en null)', async () => {
    apiClient.post.mockRejectedValue(new Error('500'));
    const p1 = archivos.resolverArchivo('privado://f/a.jpg');
    const p2 = archivos.resolverArchivos(['privado://f/b.jpg']);
    const r1 = expect(p1).rejects.toThrow('500');
    await vi.advanceTimersByTimeAsync(20);
    await r1;
    await expect(p2).resolves.toEqual([null]);
    expect(apiClient.post).toHaveBeenCalledTimes(1);
  });
});
