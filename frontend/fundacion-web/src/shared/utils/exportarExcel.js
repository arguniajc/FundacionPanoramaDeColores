import * as XLSX from 'xlsx';

/**
 * Genera y descarga un archivo .xlsx.
 * @param {string} nombreArchivo - nombre sin extensión
 * @param {{ nombre: string, datos: object[] }[]} hojas
 */
export function exportarExcel(nombreArchivo, hojas) {
  const wb = XLSX.utils.book_new();
  hojas.forEach(({ nombre, datos }) => {
    const ws = XLSX.utils.json_to_sheet(datos.length ? datos : [{}]);
    XLSX.utils.book_append_sheet(wb, ws, nombre.substring(0, 31));
  });
  XLSX.writeFile(wb, `${nombreArchivo}.xlsx`);
}
