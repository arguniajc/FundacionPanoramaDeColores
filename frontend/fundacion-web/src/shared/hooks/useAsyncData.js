import { useState, useCallback, useRef } from 'react';

/**
 * Encapsula el patrón cargando / error / data para cualquier llamada asíncrona.
 *
 * @param {Function} fn       Función async a ejecutar. Recibe los args que le pases a ejecutar().
 *                            Debe devolver el valor que se guarda en data.
 * @param {*}        inicial  Valor inicial de data (default null).
 * @param {string}   errorMsg Mensaje que se muestra si fn lanza una excepción.
 *
 * @returns {{ data, cargando, error, ejecutar, setData, setError }}
 *
 * Uso básico:
 *   const { data: items, cargando, error, ejecutar: cargar } = useAsyncData(
 *     async () => (await miRepo.listar()).data,
 *     { inicial: [], errorMsg: 'No se pudo cargar.' }
 *   );
 *   useEffect(() => { cargar(); }, [cargar]);
 */
export function useAsyncData(fn, { inicial = null, errorMsg = 'Error al cargar.' } = {}) {
  const [data,     setData]     = useState(inicial);
  const [cargando, setCargando] = useState(false);
  const [error,    setError]    = useState('');

  // Refs para que ejecutar() sea estable aunque fn/errorMsg cambien entre renders
  const fnRef       = useRef(fn);       fnRef.current       = fn;
  const errorMsgRef = useRef(errorMsg); errorMsgRef.current = errorMsg;

  const ejecutar = useCallback(async (...args) => {
    setCargando(true);
    setError('');
    try {
      const resultado = await fnRef.current(...args);
      setData(resultado);
      return resultado;
    } catch {
      setError(errorMsgRef.current);
    } finally {
      setCargando(false);
    }
  }, []); // vacío intencional: toda la variabilidad va por refs

  return { data, cargando, error, ejecutar, setData, setError };
}
