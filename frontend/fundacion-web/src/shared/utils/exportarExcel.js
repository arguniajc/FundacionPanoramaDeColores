import { notificar } from './notificar';
import apiClient from '@/infrastructure/http/apiClient';

/**
 * Genera y descarga un archivo .xlsx.
 *
 * @param {string} nombreArchivo - nombre sin extensión
 * @param {Array<{
 *   nombre: string,
 *   datos?: object[],     // json_to_sheet: array de objetos planos
 *   filas?: any[][],      // aoa_to_sheet: primer elemento = cabeceras, resto = filas
 *   cols?: number[],      // anchos de columna en caracteres  [30, 15, 14, ...]
 *   altoFilas?: number[], // alturas de fila en puntos        [22, 16]  (0/null = auto)
 *   comentarios?: Array<{ col: number, row: number, texto: string }>,
 * }>} hojas
 * @returns {Promise<boolean>} true si se descargó; si falla avisa con el toast global y devuelve false
 */
export async function exportarExcel(nombreArchivo, hojas) {
  try {
    await generarExcel(nombreArchivo, hojas);
    registrarExportacion(nombreArchivo, hojas);
    return true;
  } catch (err) {
    console.error(err);
    notificar('No se pudo generar el archivo Excel. Intenta de nuevo; si persiste, avisa al administrador.', 'error');
    return false;
  }
}

/**
 * Deja constancia en el servidor de quién exportó qué y cuántos registros (Ley 1581:
 * los listados incluyen datos de menores). No bloquea ni avisa si falla: el archivo
 * ya se descargó.
 */
export function registrarExportacion(nombreArchivo, hojas) {
  const registros = hojas.reduce((n, h) => n + (h.datos?.length ?? Math.max(0, (h.filas?.length ?? 1) - 1)), 0);
  const modulo = (window.location.hash.match(/#\/sede\/([^/?]+)/)?.[1] ?? 'inicio').slice(0, 100);
  apiClient.post('/api/archivos/log-exportacion', { archivo: String(nombreArchivo).slice(0, 200), modulo, registros })
    .catch(() => { /* el registro es auxiliar: no interrumpe la descarga */ });
}

async function generarExcel(nombreArchivo, hojas) {
  // SheetJS (~420 kB minificado) se carga solo al exportar, no con la página.
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  hojas.forEach(({ nombre, datos, filas, cols, altoFilas, comentarios }) => {
    const ws = filas
      ? XLSX.utils.aoa_to_sheet(filas)
      : XLSX.utils.json_to_sheet(datos?.length ? datos : [{}]);

    if (cols?.length)
      ws['!cols'] = cols.map(wch => ({ wch }));

    if (altoFilas?.length)
      ws['!rows'] = altoFilas.map(hpt => (hpt ? { hpt } : {}));

    comentarios?.forEach(({ col, row, texto }) => {
      const addr = XLSX.utils.encode_cell({ c: col, r: row });
      if (!ws[addr]) ws[addr] = { v: '', t: 's' };
      ws[addr].c = [{ a: 'Ayuda', t: texto }];
    });

    XLSX.utils.book_append_sheet(wb, ws, nombre.substring(0, 31));
  });

  XLSX.writeFile(wb, `${nombreArchivo}.xlsx`);
}
