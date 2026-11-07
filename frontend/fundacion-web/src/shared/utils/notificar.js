/**
 * Avisos globales desde código que no es un componente (utilidades, servicios).
 * El ToastProvider escucha este evento y muestra el mensaje en el toast global.
 *
 *   notificar('No se pudo generar el archivo Excel.', 'error');
 */
export const EVENTO_NOTIFICAR = 'app:notificar';

export function notificar(mensaje, severidad = 'info') {
  window.dispatchEvent(new CustomEvent(EVENTO_NOTIFICAR, { detail: { mensaje, severidad } }));
}
