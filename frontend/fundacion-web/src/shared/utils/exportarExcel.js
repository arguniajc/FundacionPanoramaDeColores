import * as XLSX from 'xlsx';

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
 */
export function exportarExcel(nombreArchivo, hojas) {
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
