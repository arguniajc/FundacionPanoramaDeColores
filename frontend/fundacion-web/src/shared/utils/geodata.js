import { countries } from 'countries-list';
import colombiaStates from './colombia_states.json';
import colombiaCities from './colombia_cities.json';

export const PAISES = Object.values(countries)
  .map(c => c.name)
  .sort((a, b) => a.localeCompare(b, 'es'));

export const DEPARTAMENTOS_COLOMBIA = colombiaStates.map(s => s.name);

export const CIUDADES_COLOMBIA = colombiaCities;

export const TIPOS_DOCUMENTO    = ['RC', 'TI', 'CC', 'CE', 'PA', 'PEP', 'PPT', 'NIT', 'Otro'];
export const GENEROS            = ['Masculino', 'Femenino', 'No binario', 'Prefiero no decir'];
export const TIPOS_SANGRE       = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−'];
export const ESTRATOS           = ['1', '2', '3', '4', '5', '6'];
export const NIVELES_EDUCATIVOS = [
  'Sin escolaridad', 'Preescolar', 'Primaria incompleta', 'Primaria completa',
  'Secundaria incompleta', 'Secundaria completa', 'Técnico / Tecnólogo',
  'Universitario incompleto', 'Universitario completo', 'Posgrado',
];
