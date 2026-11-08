import { createElement, Fragment } from 'react';

/**
 * helperText de un campo: su mensaje de error (si hay) y, debajo, un extra opcional
 * (p. ej. el botón "→ No registra"). Sin nada que mostrar devuelve undefined, para que
 * MUI no deje un helper vacío asociado al campo.
 */
export const ayuda = (msg, extra) => (!msg && !extra ? undefined : createElement(Fragment, null, msg || null, extra || null));
