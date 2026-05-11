import { countries } from 'countries-list';
import colombiaStates from './colombia_states.json';
import colombiaCities from './colombia_cities.json';

export const PAISES = Object.values(countries)
  .map(c => c.name)
  .sort((a, b) => a.localeCompare(b, 'es'));

export const DEPARTAMENTOS_COLOMBIA = colombiaStates.map(s => s.name);

export const CIUDADES_COLOMBIA = colombiaCities;
