export const COLOR = 'var(--color-primario)';

export const TIPOS_CAMPO = [
  { _h: true, label: 'Campos básicos' },
  { value: 'text',     label: 'Texto libre' },
  { value: 'number',   label: 'Número' },
  { value: 'date',     label: 'Fecha' },
  { value: 'daterange',label: 'Rango de fechas (Desde / Hasta)' },
  { value: 'boolean',  label: 'Sí o No' },
  { value: 'select',   label: 'Lista de opciones personalizadas' },
  { value: 'document', label: 'Adjunto PDF' },

  { _h: true, label: 'Identificación y contacto' },
  { value: 'documento_id',   label: 'Documento de identidad (tipo + número)' },
  { value: 'tipo_documento', label: 'Tipo de documento' },
  { value: 'email',          label: 'Correo electrónico' },
  { value: 'telefono',       label: 'Teléfono o celular' },

  { _h: true, label: 'Ubicación geográfica' },
  { value: 'pais',         label: 'País' },
  { value: 'departamento', label: 'Departamento (Colombia)' },
  { value: 'ciudad',       label: 'Ciudad (Colombia)' },

  { _h: true, label: 'Datos personales' },
  { value: 'genero',            label: 'Género' },
  { value: 'tipo_sangre',       label: 'Grupo sanguíneo' },
  { value: 'estrato',           label: 'Estrato socioeconómico' },
  { value: 'nivel_educativo',   label: 'Nivel educativo' },
  { value: 'autoidentificacion',label: 'Autoidentificación étnica' },

  { _h: true, label: 'Medidas y tallas' },
  { value: 'peso',         label: 'Peso (kg)' },
  { value: 'talla',        label: 'Talla / Estatura (cm)' },
  { value: 'altura',       label: 'Altura (cm)' },
  { value: 'talla_ropa',   label: 'Talla de ropa' },
  { value: 'talla_zapatos',label: 'Talla de zapatos' },

  { _h: true, label: 'Escolaridad' },
  { value: 'grado_escolar', label: 'Grado escolar y jornada' },

  { _h: true, label: 'Automáticos del beneficiario' },
  { value: 'edad',      label: 'Edad (calculada automáticamente)' },
  { value: 'fecha_nac', label: 'Fecha de nacimiento (calculada automáticamente)' },

  { _h: true, label: 'Otros' },
  { value: 'valoracion', label: 'Valoración del 1 al 5' },

  { _h: true, label: 'Paneles de información (sub-sección)' },
  { value: 'datos_padre', label: 'Información del padre o acudiente' },
  { value: 'datos_madre', label: 'Información de la madre' },
  { value: 'datos_tutor', label: 'Información del tutor legal (abuelo, tío, hermano…)' },
];

export const secDe           = (c) => c.seccion?.trim() || '';
export const camposDeSeccion  = (campos, sec) =>
  campos.filter(c => secDe(c) === sec).sort((a, b) => a.orden - b.orden);
export const seccionesOrdenadas = (campos) => {
  const seen = new Map();
  for (const c of [...campos].sort((a, b) => a.orden - b.orden)) {
    const s = secDe(c);
    if (!seen.has(s)) seen.set(s, true);
  }
  return [...seen.keys()];
};
export const toDto = (c, orden) => ({
  etiqueta: c.etiqueta, tipo: c.tipo, obligatorio: c.obligatorio,
  opciones: c.opciones, orden, seccion: c.seccion, columnas: c.columnas ?? 6,
});
