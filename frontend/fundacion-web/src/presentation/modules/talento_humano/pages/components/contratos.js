// Catálogos del contrato de un empleado (DialogEmpleado).

export const TIPOS_CONTRATO = ['indefinido', 'fijo', 'prestacion_servicios', 'aprendizaje', 'voluntario', 'otro'];

/** Contratos con fecha de terminación: solo estos muestran y guardan "Fecha fin contrato". */
export const CONTRATOS_CON_FIN = ['fijo', 'aprendizaje', 'prestacion_servicios'];

/** tieneFechaFin('fijo') → true; tieneFechaFin('indefinido') → false. */
export const tieneFechaFin = tipoContrato => CONTRATOS_CON_FIN.includes(tipoContrato);

/** Fondos de pensiones (AFP) de Colombia; el campo también acepta texto libre. */
export const FONDOS_PENSION = ['Colpensiones', 'Porvenir', 'Protección', 'Colfondos', 'Skandia'];
