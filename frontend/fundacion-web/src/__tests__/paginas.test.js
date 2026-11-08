import { describe, it, expect, vi } from 'vitest';
import { obtenerTodasLasPaginas, POR_PAGINA_MAXIMO } from '@/shared/utils/paginas';

const registros = (n, desde = 0) => Array.from({ length: n }, (_, i) => ({ id: desde + i }));

describe('obtenerTodasLasPaginas', () => {
  it('recorre las páginas hasta completar el total y conserva los filtros', async () => {
    const total = POR_PAGINA_MAXIMO * 2 + 5;
    const pedir = vi.fn(async ({ pagina, porPagina }) => {
      const desde = (pagina - 1) * porPagina;
      return { data: { data: registros(Math.min(porPagina, total - desde), desde), total } };
    });

    const todos = await obtenerTodasLasPaginas(pedir, { estado: 'activa' });

    expect(todos).toHaveLength(total);
    expect(pedir).toHaveBeenCalledTimes(3);
    expect(pedir).toHaveBeenNthCalledWith(1, { estado: 'activa', pagina: 1, porPagina: POR_PAGINA_MAXIMO });
    expect(pedir).toHaveBeenNthCalledWith(3, { estado: 'activa', pagina: 3, porPagina: POR_PAGINA_MAXIMO });
  });

  it('se detiene con una página vacía', async () => {
    const pedir = vi.fn(async () => ({ data: { data: [], total: 0 } }));
    expect(await obtenerTodasLasPaginas(pedir)).toEqual([]);
    expect(pedir).toHaveBeenCalledTimes(1);
  });

  it('no se queda en bucle si el total no coincide con lo recibido', async () => {
    const pedir = vi.fn(async () => ({ data: { data: registros(POR_PAGINA_MAXIMO), total: POR_PAGINA_MAXIMO } }));
    expect(await obtenerTodasLasPaginas(pedir)).toHaveLength(POR_PAGINA_MAXIMO);
    expect(pedir).toHaveBeenCalledTimes(1);
  });
});
