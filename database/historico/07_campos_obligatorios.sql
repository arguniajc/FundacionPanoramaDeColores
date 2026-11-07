-- =============================================================================
-- Migración 07: Campos obligatorios — beneficiarios, tallas, salud y acudiente
-- Ejecutar en el SQL Editor de Supabase
-- Hace NOT NULL los campos que la fundación exige siempre registrar
-- =============================================================================

-- ── beneficiarios ─────────────────────────────────────────────────────────────

-- fecha_nacimiento: placeholder 2000-01-01 para registros sin ella
UPDATE beneficiarios SET fecha_nacimiento = '2000-01-01' WHERE fecha_nacimiento IS NULL;
ALTER TABLE beneficiarios ALTER COLUMN fecha_nacimiento SET NOT NULL;

-- genero
UPDATE beneficiarios SET genero = 'No especificado' WHERE genero IS NULL OR genero = '';
ALTER TABLE beneficiarios ALTER COLUMN genero SET NOT NULL;

-- pais_nacimiento
UPDATE beneficiarios SET pais_nacimiento = 'Colombia' WHERE pais_nacimiento IS NULL OR pais_nacimiento = '';
ALTER TABLE beneficiarios ALTER COLUMN pais_nacimiento SET NOT NULL;

-- departamento_nacimiento
UPDATE beneficiarios SET departamento_nacimiento = 'No registra' WHERE departamento_nacimiento IS NULL OR departamento_nacimiento = '';
ALTER TABLE beneficiarios ALTER COLUMN departamento_nacimiento SET NOT NULL;

-- ciudad_nacimiento
UPDATE beneficiarios SET ciudad_nacimiento = 'No registra' WHERE ciudad_nacimiento IS NULL OR ciudad_nacimiento = '';
ALTER TABLE beneficiarios ALTER COLUMN ciudad_nacimiento SET NOT NULL;

-- barrio
UPDATE beneficiarios SET barrio = 'No registra' WHERE barrio IS NULL OR barrio = '';
ALTER TABLE beneficiarios ALTER COLUMN barrio SET NOT NULL;

-- num_personas_vive
UPDATE beneficiarios SET num_personas_vive = 1 WHERE num_personas_vive IS NULL;
ALTER TABLE beneficiarios ALTER COLUMN num_personas_vive SET NOT NULL;

-- num_hermanos
UPDATE beneficiarios SET num_hermanos = 0 WHERE num_hermanos IS NULL;
ALTER TABLE beneficiarios ALTER COLUMN num_hermanos SET NOT NULL;

-- numero_documento: asignar placeholder único para registros sin documento
UPDATE beneficiarios
SET numero_documento = 'SN-' || REPLACE(id::text, '-', '')
WHERE numero_documento IS NULL OR numero_documento = '';
ALTER TABLE beneficiarios ALTER COLUMN numero_documento SET NOT NULL;

-- ── beneficiario_talla ────────────────────────────────────────────────────────

UPDATE beneficiario_talla SET talla_camisa   = 'No registra' WHERE talla_camisa   IS NULL;
UPDATE beneficiario_talla SET talla_pantalon = 'No registra' WHERE talla_pantalon IS NULL;
UPDATE beneficiario_talla SET talla_zapatos  = 'No registra' WHERE talla_zapatos  IS NULL;
UPDATE beneficiario_talla SET peso_kg        = 0             WHERE peso_kg        IS NULL;
UPDATE beneficiario_talla SET talla_cm       = 0             WHERE talla_cm       IS NULL;

ALTER TABLE beneficiario_talla
  ALTER COLUMN talla_camisa   SET NOT NULL,
  ALTER COLUMN talla_pantalon SET NOT NULL,
  ALTER COLUMN talla_zapatos  SET NOT NULL,
  ALTER COLUMN peso_kg        SET NOT NULL,
  ALTER COLUMN talla_cm       SET NOT NULL;

-- ── acudientes ────────────────────────────────────────────────────────────────

UPDATE acudientes SET whatsapp  = '' WHERE whatsapp  IS NULL;
UPDATE acudientes SET direccion = '' WHERE direccion IS NULL;

ALTER TABLE acudientes
  ALTER COLUMN whatsapp  SET NOT NULL,
  ALTER COLUMN direccion SET NOT NULL;

-- ── beneficiario_acudiente — parentesco_id ────────────────────────────────────
DO $$
DECLARE v_id SMALLINT;
BEGIN
  SELECT id INTO v_id FROM cat_parentescos WHERE LOWER(nombre) = 'no registra' LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO cat_parentescos (nombre, activo) VALUES ('No registra', true) RETURNING id INTO v_id;
  END IF;
  UPDATE beneficiario_acudiente SET parentesco_id = v_id WHERE parentesco_id IS NULL;
END $$;

ALTER TABLE beneficiario_acudiente ALTER COLUMN parentesco_id SET NOT NULL;

-- ── beneficiario_salud — eps_id y observaciones ───────────────────────────────
DO $$
DECLARE v_id SMALLINT;
BEGIN
  SELECT id INTO v_id FROM cat_eps WHERE LOWER(nombre) = 'no registra' LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO cat_eps (nombre, activo) VALUES ('No registra', true) RETURNING id INTO v_id;
  END IF;
  UPDATE beneficiario_salud SET eps_id = v_id WHERE eps_id IS NULL;
END $$;

UPDATE beneficiario_salud SET observaciones = '' WHERE observaciones IS NULL;

ALTER TABLE beneficiario_salud
  ALTER COLUMN eps_id        SET NOT NULL,
  ALTER COLUMN observaciones SET NOT NULL;
