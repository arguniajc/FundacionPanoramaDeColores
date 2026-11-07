-- =============================================================================
-- FUNDACIÓN PANORAMA DE COLORES — Migración de datos v1.0
-- Distribuye los datos de "inscripciones" al nuevo modelo normalizado
--
-- IMPORTANTE: Ejecutar DESPUÉS de 01_schema.sql
-- Ejecutar completo en el SQL Editor de Supabase
-- Si algo falla, todo el bloque hace ROLLBACK automáticamente
-- =============================================================================

BEGIN;

-- =============================================================================
-- PASO 0 — Renombrar la tabla original (seguridad: nunca borrar)
-- Queda como respaldo con el nombre inscripciones_legacy
-- =============================================================================
ALTER TABLE inscripciones RENAME TO inscripciones_legacy;

-- =============================================================================
-- PASO 1 — Poblar cat_eps con los valores únicos que ya existen
-- =============================================================================
INSERT INTO cat_eps (nombre)
SELECT DISTINCT TRIM(eps)
FROM   inscripciones_legacy
WHERE  eps IS NOT NULL
  AND  TRIM(eps) <> ''
ON CONFLICT (nombre) DO NOTHING;

-- =============================================================================
-- PASO 2 — Migrar BENEFICIARIOS
-- Se conservan exactamente los mismos UUIDs para no romper integridad
-- =============================================================================
INSERT INTO beneficiarios (
  id,
  nombre,
  fecha_nacimiento,
  tipo_documento_id,
  numero_documento,
  activo,
  fecha_creacion
)
SELECT
  i.id,
  TRIM(i.nombre_menor),
  i.fecha_nacimiento,
  -- Mapear código de tipo_documento al id del catálogo
  (SELECT td.id
   FROM   cat_tipo_documento td
   WHERE  td.codigo = UPPER(TRIM(i.tipo_documento))
   LIMIT  1),
  NULLIF(TRIM(i.numero_documento), ''),
  i.activo,
  i.created_at
FROM inscripciones_legacy i
WHERE i.nombre_menor IS NOT NULL
  AND TRIM(i.nombre_menor) <> '';

-- =============================================================================
-- PASO 3 — Migrar ACUDIENTES (deduplicado)
-- Dos registros con mismo nombre+whatsapp se convierten en un solo acudiente
-- =============================================================================
INSERT INTO acudientes (nombre, whatsapp, direccion, activo, fecha_creacion)
SELECT
  TRIM(nombre_acudiente),
  NULLIF(TRIM(whatsapp),  ''),
  NULLIF(TRIM(direccion), ''),
  TRUE,
  MIN(created_at)
FROM   inscripciones_legacy
WHERE  nombre_acudiente IS NOT NULL
  AND  TRIM(nombre_acudiente) <> ''
GROUP BY
  TRIM(nombre_acudiente),
  NULLIF(TRIM(whatsapp),  ''),
  NULLIF(TRIM(direccion), '');

-- =============================================================================
-- PASO 4 — Relación BENEFICIARIO ↔ ACUDIENTE
-- =============================================================================
INSERT INTO beneficiario_acudiente (
  beneficiario_id,
  acudiente_id,
  parentesco_id,
  es_principal
)
SELECT
  i.id,
  a.id,
  -- Mapear parentesco al catálogo (case-insensitive)
  (SELECT p.id
   FROM   cat_parentesco p
   WHERE  LOWER(p.nombre) = LOWER(TRIM(i.parentesco))
   LIMIT  1),
  TRUE   -- el acudiente migrado se marca como principal
FROM inscripciones_legacy i
JOIN acudientes a
  ON  TRIM(LOWER(a.nombre))          = TRIM(LOWER(i.nombre_acudiente))
  AND COALESCE(a.whatsapp, '')       = COALESCE(NULLIF(TRIM(i.whatsapp),''), '')
WHERE i.nombre_acudiente IS NOT NULL
  AND i.id IN (SELECT id FROM beneficiarios)  -- solo los que se migraron
ON CONFLICT (beneficiario_id, acudiente_id) DO NOTHING;

-- =============================================================================
-- PASO 5 — SALUD (EPS + observaciones)
-- =============================================================================
INSERT INTO beneficiario_salud (
  beneficiario_id,
  eps_id,
  observaciones,
  activo,
  fecha_creacion
)
SELECT
  i.id,
  (SELECT e.id FROM cat_eps e
   WHERE  LOWER(TRIM(e.nombre)) = LOWER(TRIM(i.eps))
   LIMIT  1),
  NULLIF(TRIM(i.observaciones_salud), ''),
  i.activo,
  i.created_at
FROM inscripciones_legacy i
WHERE i.id IN (SELECT id FROM beneficiarios);

-- =============================================================================
-- PASO 6 — ALERGIAS
-- Solo los niños con tiene_alergia = 'si'.
-- Se crea un registro genérico en el catálogo;
-- cuando haya más información se puede refinar.
-- =============================================================================

-- Insertar alergia genérica al catálogo si no existe
INSERT INTO alergias_catalogo (nombre, tipo_alergia_id)
VALUES (
  'Alergia registrada (detalle pendiente)',
  (SELECT id FROM cat_tipo_alergia WHERE nombre = 'Otra')
)
ON CONFLICT DO NOTHING;

-- Relacionar beneficiarios con alergia confirmada
INSERT INTO beneficiario_alergia (
  beneficiario_id,
  alergia_id,
  descripcion
)
SELECT
  i.id,
  (SELECT ac.id FROM alergias_catalogo ac
   WHERE  ac.nombre = 'Alergia registrada (detalle pendiente)'
   LIMIT  1),
  NULLIF(TRIM(i.descripcion_alergia), '')
FROM inscripciones_legacy i
WHERE LOWER(TRIM(i.tiene_alergia)) = 'si'
  AND i.id IN (SELECT id FROM beneficiarios)
ON CONFLICT (beneficiario_id, alergia_id) DO NOTHING;

-- =============================================================================
-- PASO 7 — TALLAS
-- Se registra la medición con la fecha de hoy (dato histórico desconocido)
-- =============================================================================
INSERT INTO beneficiario_talla (
  beneficiario_id,
  talla_camisa,
  talla_pantalon,
  talla_zapatos,
  fecha_medicion,
  fecha_creacion
)
SELECT
  i.id,
  NULLIF(TRIM(i.talla_camisa),   ''),
  NULLIF(TRIM(i.talla_pantalon), ''),
  NULLIF(TRIM(i.talla_zapatos),  ''),
  CURRENT_DATE,
  i.created_at
FROM inscripciones_legacy i
WHERE i.id IN (SELECT id FROM beneficiarios)
  AND (
    i.talla_camisa   IS NOT NULL OR
    i.talla_pantalon IS NOT NULL OR
    i.talla_zapatos  IS NOT NULL
  );

-- =============================================================================
-- PASO 8 — ARCHIVOS (fotos del menor y del documento)
-- =============================================================================

-- Foto del menor
INSERT INTO archivos (
  entidad_tipo, entidad_id, tipo_archivo_id, url, activo, fecha_creacion
)
SELECT
  'beneficiario',
  i.id,
  (SELECT id FROM cat_tipo_archivo WHERE nombre = 'Foto del menor'),
  TRIM(i.foto_menor_url),
  i.activo,
  i.created_at
FROM inscripciones_legacy i
WHERE i.foto_menor_url IS NOT NULL
  AND TRIM(i.foto_menor_url) <> ''
  AND i.id IN (SELECT id FROM beneficiarios);

-- Foto del documento de identidad
INSERT INTO archivos (
  entidad_tipo, entidad_id, tipo_archivo_id, url, activo, fecha_creacion
)
SELECT
  'beneficiario',
  i.id,
  (SELECT id FROM cat_tipo_archivo WHERE nombre = 'Foto documento'),
  TRIM(i.foto_documento_url),
  i.activo,
  i.created_at
FROM inscripciones_legacy i
WHERE i.foto_documento_url IS NOT NULL
  AND TRIM(i.foto_documento_url) <> ''
  AND i.id IN (SELECT id FROM beneficiarios);

-- =============================================================================
-- VERIFICACIÓN — Contar registros migrados
-- =============================================================================
DO $$
DECLARE
  v_orig       INTEGER;
  v_ben        INTEGER;
  v_acu        INTEGER;
  v_ba         INTEGER;
  v_salud      INTEGER;
  v_alergias   INTEGER;
  v_tallas     INTEGER;
  v_archivos   INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_orig     FROM inscripciones_legacy;
  SELECT COUNT(*) INTO v_ben      FROM beneficiarios;
  SELECT COUNT(*) INTO v_acu      FROM acudientes;
  SELECT COUNT(*) INTO v_ba       FROM beneficiario_acudiente;
  SELECT COUNT(*) INTO v_salud    FROM beneficiario_salud;
  SELECT COUNT(*) INTO v_alergias FROM beneficiario_alergia;
  SELECT COUNT(*) INTO v_tallas   FROM beneficiario_talla;
  SELECT COUNT(*) INTO v_archivos FROM archivos;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMEN DE MIGRACIÓN';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Registros originales (inscripciones): %', v_orig;
  RAISE NOTICE 'Beneficiarios migrados:               %', v_ben;
  RAISE NOTICE 'Acudientes creados (dedup):           %', v_acu;
  RAISE NOTICE 'Relaciones ben-acudiente:             %', v_ba;
  RAISE NOTICE 'Registros de salud:                   %', v_salud;
  RAISE NOTICE 'Alergias registradas:                 %', v_alergias;
  RAISE NOTICE 'Registros de tallas:                  %', v_tallas;
  RAISE NOTICE 'Archivos migrados:                    %', v_archivos;
  RAISE NOTICE '========================================';

  IF v_ben <> v_orig THEN
    RAISE WARNING 'ATENCIÓN: % registros originales pero % beneficiarios migrados',
      v_orig, v_ben;
  ELSE
    RAISE NOTICE 'OK: Todos los beneficiarios migrados correctamente';
  END IF;
END $$;

COMMIT;

-- =============================================================================
-- FIN DE LA MIGRACIÓN
--
-- La tabla "inscripciones_legacy" queda como respaldo.
-- Puedes eliminarla después de verificar que todo está correcto con:
--   DROP TABLE inscripciones_legacy;
--
-- El backend (.NET / EF Core) necesita actualizarse para usar
-- las nuevas tablas. Esto se hace en el siguiente paso.
-- =============================================================================
