import { r } from '@/shared/utils/validacion';
import { PARAMETROS_NOMINA_DEFECTO } from '@/presentation/modules/talento_humano/pages/components/nominaFormato';

/**
 * Parámetros de nómina en Configuración. El servidor guarda las tasas como fracción
 * (0.04 = 4 %) y valida: SMLMV y auxilio > 0, tasas entre 0 y 0,2. En pantalla las tasas
 * se editan en porcentaje (0 a 20 %), que es como aparecen en el decreto.
 */
export const TAB_NOMINA = 6;

const porcentaje = { min: 0, max: 20, unidad: '%', ejemplo: '4' };

export const ESQUEMA_NOMINA = {
  nominaSmlmv:             { tab: TAB_NOMINA, etiqueta: 'Nómina · Salario mínimo (SMLMV)', reglas: [r.obligatorio('1423500'), r.monto('1423500')] },
  nominaAuxilioTransporte: { tab: TAB_NOMINA, etiqueta: 'Nómina · Auxilio de transporte',  reglas: [r.obligatorio('200000'), r.monto('200000')] },
  nominaTasaSalud:         { tab: TAB_NOMINA, etiqueta: 'Nómina · Salud del empleado (%)',   reglas: [r.obligatorio('4'), r.numero(porcentaje)] },
  nominaTasaPension:       { tab: TAB_NOMINA, etiqueta: 'Nómina · Pensión del empleado (%)', reglas: [r.obligatorio('4'), r.numero(porcentaje)] },
};

const n = v => Number(String(v ?? '').replace(',', '.'));
/** 0.04 → "4"; 0.045 → "4.5" (redondeado a 2 decimales del porcentaje). */
const aPorcentaje = tasa => String(Math.round(Number(tasa) * 10000) / 100);

/** Valores del formulario a partir de GET /api/configuracion (sin datos: los valores por defecto). */
export function nominaDesdeApi(data) {
  const d = PARAMETROS_NOMINA_DEFECTO;
  const o = (v, def) => (v === null || v === undefined ? def : v);
  return {
    nominaSmlmv:             String(o(data?.nominaSmlmv, d.smlmv)),
    nominaAuxilioTransporte: String(o(data?.nominaAuxilioTransporte, d.auxilioTransporte)),
    nominaTasaSalud:         aPorcentaje(o(data?.nominaTasaSalud, d.tasaSalud)),
    nominaTasaPension:       aPorcentaje(o(data?.nominaTasaPension, d.tasaPension)),
  };
}

/** Campos para PUT /api/configuracion: pesos como número y tasas como fracción (4 → 0.04). */
export function nominaParaApi(form) {
  return {
    nominaSmlmv:             n(form.nominaSmlmv),
    nominaAuxilioTransporte: n(form.nominaAuxilioTransporte),
    nominaTasaSalud:         Math.round(n(form.nominaTasaSalud) * 100) / 10000,
    nominaTasaPension:       Math.round(n(form.nominaTasaPension) * 100) / 10000,
  };
}
