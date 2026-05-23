import { countries } from 'countries-list';
import colombiaCities from './colombia_cities.json';
import worldStates    from './world_states.json';

export const PAISES = Object.values(countries)
  .map(c => c.name)
  .sort((a, b) => a.localeCompare(b, 'es'));

export const DEPARTAMENTOS_COLOMBIA = (worldStates['Colombia'] ?? [])
  .slice()
  .sort((a, b) => a.localeCompare(b, 'es'));

export const CIUDADES_COLOMBIA = [...colombiaCities]
  .sort((a, b) => a.localeCompare(b, 'es'));

export function getEstadosDePais(paisNombre) {
  const estados = worldStates[paisNombre || 'Colombia'] ?? [];
  return estados.slice().sort((a, b) => a.localeCompare(b, 'es'));
}

// Colombia → autocomplete with all municipalities.
// Other countries → [] so the city field stays freeSolo (user escribe libremente).
export function getCiudadesDeUbicacion(paisNombre) {
  const esColombia = !paisNombre || paisNombre === 'Colombia';
  return esColombia ? CIUDADES_COLOMBIA : [];
}

export const TIPOS_DOCUMENTO    = ['RC', 'TI', 'CC', 'CE', 'PA', 'PEP', 'PPT', 'NIT', 'Otro'];
export const GENEROS            = ['Masculino', 'Femenino', 'No binario', 'Prefiero no decir'];
export const TIPOS_SANGRE       = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−'];
export const ESTRATOS           = ['1', '2', '3', '4', '5', '6'];
export const NIVELES_EDUCATIVOS = [
  'Sin escolaridad', 'Preescolar', 'Primaria incompleta', 'Primaria completa',
  'Secundaria incompleta', 'Secundaria completa', 'Técnico / Tecnólogo',
  'Universitario incompleto', 'Universitario completo', 'Posgrado',
];
export const TALLAS_ROPA    = ['T2','T4','T6','T8','T10','T12','T14','T16','XS','S','M','L','XL','XXL','XXXL'];
export const TALLAS_PANTALON = [
  '2','4','6','8','10','12','14','16','18','20','22','24',
  '26','28','30','32','34','36','38','40','42','44',
];
export const TALLAS_ZAPATOS = [
  '20','21','22','23','24','25','26','27','28','29','30',
  '31','32','33','34','35','36','37','38','39','40',
  '41','42','43','44','45','46',
];
export const EPS_LIST = [
  'AIC EPSI (Asociación Indígena del Cauca)',
  'Aliansalud EPS',
  'Anas Wayuu EPSI',
  'Asmet Salud EPS',
  'Cajacopi EPS',
  'Capital Salud EPS-S',
  'Capresoca EPS',
  'Comfachocó EPS',
  'ComfaOriente EPS',
  'Comfenalco Valle EPS',
  'Compensar EPS',
  'Coosalud',
  'Dusakawi EPSI',
  'Emssanar EPS',
  'EPS Familiar de Colombia',
  'EPS Sanitas',
  'EPS Sura',
  'Famisanar EPS',
  'Mallamas EPSI',
  'Mutual Ser EPS',
  'Nueva EPS',
  'Pijaos Salud EPSI',
  'Salud Mía EPS',
  'Salud Total EPS',
  'Savia Salud EPS',
  'Servicio Occidental de Salud (SOS)',
];
export const VALORACIONES   = ['1 — Muy malo','2 — Malo','3 — Regular','4 — Bueno','5 — Excelente'];
export const RELACIONES_TUTOR = [
  'Abuelo(a)', 'Tío(a)', 'Hermano(a) mayor', 'Primo(a)',
  'Padrino / Madrina', 'Tutor legal designado',
  'Otra relación familiar', 'Otro',
];
export const AUTOIDENTIFICACION = [
  'Indígena',
  'Afrodescendiente / Afrocolombiano(a)',
  'Raizal del Archipiélago',
  'Palenquero(a)',
  'Gitano(a) ROM',
  'Mestizo(a)',
  'Blanco(a)',
  'Ninguna de las anteriores',
];
export const GRADOS_COLOMBIA = [
  'Parvulario', 'Pre-jardín', 'Jardín', 'Transición',
  'Grado 1°', 'Grado 2°', 'Grado 3°', 'Grado 4°', 'Grado 5°',
  'Grado 6°', 'Grado 7°', 'Grado 8°', 'Grado 9°',
  'Grado 10°', 'Grado 11°',
];
export const JORNADAS_ESCOLARES = ['Mañana', 'Tarde', 'Noche', 'Única', 'Sabatina', 'Fin de semana'];

export const CATEGORIAS_INVENTARIO = [
  'Material escolar', 'Equipos electrónicos', 'Deportivo',
  'Ropa y calzado', 'Alimentos', 'Medicamentos',
  'Muebles y enseres', 'Herramientas', 'Otros',
];

export const UNIDADES_MEDIDA = [
  'unidad', 'par', 'set', 'kit',
  'kg', 'g', 'mg', 'lb',
  'lt', 'ml', 'galón',
  'metro', 'cm', 'rollo',
  'caja', 'paquete', 'bolsa', 'sobre', 'bulto',
  'hoja', 'resma',
  'docena', 'otro',
];
