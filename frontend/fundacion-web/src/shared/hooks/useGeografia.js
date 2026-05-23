import { useMemo } from 'react';
import {
  DEPARTAMENTOS_COLOMBIA,
  getCiudadesDeDepartamento,
  getEstadosDePais,
} from '../utils/geodata';

/**
 * Hook reutilizable para campos geográficos en cadena: País → Departamento → Ciudad.
 *
 * @param {string} pais        - Valor actual del campo país.
 * @param {string} departamento - Valor actual del campo departamento.
 *
 * Retorna:
 *  - esColombia: boolean — true si el país seleccionado es Colombia.
 *  - departamentos: string[] — lista de departamentos según el país.
 *  - ciudades: string[] — ciudades del departamento seleccionado (vacío si no hay depto).
 *  - deptoHabilitado: boolean — false hasta que haya un país seleccionado.
 *  - ciudadHabilitada: boolean — false hasta que haya un departamento seleccionado.
 */
export function useGeografia(pais, departamento) {
  const esColombia = pais === 'Colombia';

  const departamentos = useMemo(() => {
    if (!pais) return [];
    return esColombia ? DEPARTAMENTOS_COLOMBIA : getEstadosDePais(pais);
  }, [pais, esColombia]);

  const ciudades = useMemo(() => {
    if (!pais || !departamento) return [];
    if (esColombia) return getCiudadesDeDepartamento(departamento);
    return []; // otros países: ciudad libre
  }, [pais, departamento, esColombia]);

  return {
    esColombia,
    departamentos,
    ciudades,
    deptoHabilitado:  !!pais,
    ciudadHabilitada: !!pais && !!departamento,
  };
}

// Alias de compatibilidad con el nombre anterior
export function useGeografiaColombia(pais, departamento) {
  return useGeografia(pais, departamento);
}
