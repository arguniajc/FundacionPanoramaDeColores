import { DEPARTAMENTOS_COLOMBIA, CIUDADES_COLOMBIA } from '../utils/geodata';

export function useGeografiaColombia() {
  return {
    departamentos:    DEPARTAMENTOS_COLOMBIA,
    ciudades:         CIUDADES_COLOMBIA,
    cargandoCiudades: false,
  };
}
