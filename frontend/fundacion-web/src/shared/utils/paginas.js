/** Tope de registros por página que acepta la API en los listados paginados. */
export const POR_PAGINA_MAXIMO = 100;

/**
 * Pide TODAS las páginas de un listado paginado en el servidor (respuesta `{ data, total }`).
 * Se usa al exportar (todos los registros del filtro actual, no solo la página visible)
 * y donde se necesita la lista completa (p. ej. elegir empleado en el organigrama).
 *
 * @param {(params: object) => Promise<{ data: { data: any[], total: number } }>} pedir
 *        Función del repositorio, p. ej. `inscripcionesRepository.listar`.
 * @param {object} [params] Filtros actuales (sin pagina/porPagina).
 * @returns {Promise<any[]>}
 */
export async function obtenerTodasLasPaginas(pedir, params = {}) {
  const todos = [];
  for (let pagina = 1; ; pagina++) {
    const { data } = await pedir({ ...params, pagina, porPagina: POR_PAGINA_MAXIMO });
    const lote = data?.data ?? [];
    todos.push(...lote);
    if (lote.length < POR_PAGINA_MAXIMO || todos.length >= (data?.total ?? 0)) break;
  }
  return todos;
}
