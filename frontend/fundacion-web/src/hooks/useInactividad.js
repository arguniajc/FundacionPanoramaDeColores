import { useEffect, useRef, useCallback } from 'react';

const EVENTOS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'touchmove'];

/**
 * Detecta inactividad del usuario y ejecuta onInactivo tras `minutos` sin actividad.
 * Solo se activa cuando `activo` es true (p.ej. cuando hay sesión iniciada).
 */
export default function useInactividad(minutos = 5, onInactivo, activo = true) {
  const timerRef    = useRef(null);
  const callbackRef = useRef(onInactivo);

  // Mantener referencia actualizada sin re-registrar listeners
  useEffect(() => { callbackRef.current = onInactivo; }, [onInactivo]);

  const resetear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => callbackRef.current?.(), minutos * 60 * 1000);
  }, [minutos]);

  useEffect(() => {
    if (!activo) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    EVENTOS.forEach(e => window.addEventListener(e, resetear, { passive: true }));
    resetear(); // iniciar timer al montar

    return () => {
      EVENTOS.forEach(e => window.removeEventListener(e, resetear));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activo, resetear]);
}
