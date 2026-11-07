import { useState, useCallback } from 'react';
import { validarEsquema } from '@/shared/utils/validacion';

/**
 * Validación de formularios con mensajes claros (ver shared/utils/validacion.js).
 *
 *   const v = useValidacion(ESQUEMA, form);
 *   <TextField {...v.props('email')} ... />           // error + helperText + onBlur
 *   <ResumenErrores {...v.resumen} accion="guardar" /> // aviso junto a los botones
 *   const guardar = () => { if (!v.validarTodo()) return; ... };
 *
 * Los mensajes de un campo aparecen cuando el usuario ya pasó por él o intentó guardar.
 * `campos` limita la validación (p. ej. los del paso actual de un asistente).
 */
export function useValidacion(esquema, form, campos) {
  const [tocados, setTocados]   = useState({});
  const [verResumen, setResumen] = useState(false);

  const errores = validarEsquema(esquema, form, campos);
  const hayErrores = Object.keys(errores).length > 0;

  const tocar = useCallback(campo => setTocados(p => (p[campo] ? p : { ...p, [campo]: true })), []);
  const err   = campo => (tocados[campo] ? (errores[campo] ?? '') : '');

  /** Marca todos los campos y muestra el resumen. Devuelve true si se puede guardar. */
  const validarTodo = () => {
    if (!hayErrores) { setResumen(false); return true; }
    setTocados(p => ({ ...p, ...Object.fromEntries(Object.keys(errores).map(c => [c, true])) }));
    setResumen(true);
    return false;
  };

  /** Props para un TextField (o el TextField de un Autocomplete). Un helperText propio se mantiene si no hay error. */
  const props = (campo, helperText) => ({
    error:      !!err(campo),
    helperText: err(campo) || helperText,
    onBlur:     () => tocar(campo),
  });

  /** Reinicia el estado (p. ej. al abrir el formulario para otro registro). */
  const reiniciar = useCallback(() => { setTocados({}); setResumen(false); }, []);

  return {
    errores, hayErrores, err, tocar, props, validarTodo, reiniciar,
    resumen: {
      visible:  verResumen && hayErrores,
      errores,
      esquema,
      onClose:  () => setResumen(false),
    },
  };
}
