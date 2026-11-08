import { useEffect, useState } from 'react';

/**
 * Devuelve `valor` con retraso: solo cambia cuando el usuario deja de escribir `ms` milisegundos.
 * Evita pedir una búsqueda al servidor por cada tecla.
 */
export function useValorDiferido(valor, ms = 350) {
  const [diferido, setDiferido] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setDiferido(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return diferido;
}
