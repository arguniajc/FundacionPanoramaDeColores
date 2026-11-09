/**
 * sinTipoDocumento
 * Lógica del aviso "beneficiarios sin tipo de documento": registros guardados con PA, RAMV, PEP,
 * "Sin documento" u "Otro" antes de que el catálogo de la base de datos tuviera esos códigos, que
 * quedaron sin tipo. La API (GET /api/beneficiarios/sin-tipo-documento) trae cada uno con
 * una `sugerencia` (o null si hay que revisarlo a mano).
 * Sin React, sin Axios, sin MUI — solo lógica.
 */
import { opcionesTipoDocumento, opcionConValorActual } from '@/shared/constants/tiposDocumento';
import { esSinDocumento } from './validacionBeneficiario';

/** Opciones del selector según niño/adulto (catálogo del panel), incluyendo la sugerencia si no está. */
export function opcionesParaCorregir(tipo, sugerencia) {
  return opcionConValorActual(opcionesTipoDocumento(tipo === 'adulto' ? 'adulto' : 'menor'), sugerencia);
}

/** Texto del aviso de la página: "1 beneficiario sin tipo de documento" / "3 beneficiarios …". */
export function textoAviso(n) {
  return `${n} beneficiario${n === 1 ? '' : 's'} sin tipo de documento`;
}

/** Por qué se sugiere (o no) un tipo, para mostrarlo junto a la sugerencia. */
export function motivoSugerencia(fila) {
  if (!fila.numeroDocumento) return 'No tiene número de documento';
  if (fila.sugerencia) return 'Según la edad';
  return /^\d+$/.test(fila.numeroDocumento)
    ? 'Revisa el número: no tiene la longitud de un documento colombiano'
    : 'El número tiene letras: revisa el documento (PA, PPT, RAMV…)';
}

/** Aviso bajo el selector: elegir "Sin documento" cuando hay número guardado lo borra. */
export function avisoSeleccion(fila, valor) {
  return esSinDocumento(valor) && fila.numeroDocumento ? 'Se quitará el número guardado.' : '';
}

/** Cuerpo de PATCH /api/beneficiarios/tipo-documento/lote con las filas que tienen sugerencia. */
export function correccionesSugeridas(filas) {
  return filas.filter(f => f.sugerencia).map(f => ({ id: f.id, tipoDocumento: f.sugerencia }));
}

/** Filas que quedan después de corregir las de `ids`. */
export function quitarCorregidos(filas, ids) {
  const corregidos = new Set(ids);
  return filas.filter(f => !corregidos.has(f.id));
}
