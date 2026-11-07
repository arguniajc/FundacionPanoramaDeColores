-- Migración: dividir el campo nombre de beneficiarios en 4 columnas.
-- Heurística de split por palabras:
--   2 palabras : primer_nombre | primer_apellido
--   3 palabras : primer_nombre | primer_apellido | segundo_apellido
--   4+ palabras: primer_nombre | segundo_nombre  | primer_apellido | segundo_apellido (restante)

ALTER TABLE beneficiarios
  ADD COLUMN primer_nombre    VARCHAR(80),
  ADD COLUMN segundo_nombre   VARCHAR(80),
  ADD COLUMN primer_apellido  VARCHAR(80),
  ADD COLUMN segundo_apellido VARCHAR(80);

UPDATE beneficiarios
SET
  primer_nombre = (string_to_array(TRIM(REGEXP_REPLACE(nombre, '\s+', ' ', 'g')), ' '))[1],

  segundo_nombre = CASE
    WHEN array_length(string_to_array(TRIM(REGEXP_REPLACE(nombre, '\s+', ' ', 'g')), ' '), 1) >= 4
    THEN (string_to_array(TRIM(REGEXP_REPLACE(nombre, '\s+', ' ', 'g')), ' '))[2]
    ELSE NULL
  END,

  primer_apellido = CASE
    WHEN array_length(string_to_array(TRIM(REGEXP_REPLACE(nombre, '\s+', ' ', 'g')), ' '), 1) = 1
      THEN (string_to_array(TRIM(REGEXP_REPLACE(nombre, '\s+', ' ', 'g')), ' '))[1]
    WHEN array_length(string_to_array(TRIM(REGEXP_REPLACE(nombre, '\s+', ' ', 'g')), ' '), 1) IN (2, 3)
      THEN (string_to_array(TRIM(REGEXP_REPLACE(nombre, '\s+', ' ', 'g')), ' '))[2]
    ELSE (string_to_array(TRIM(REGEXP_REPLACE(nombre, '\s+', ' ', 'g')), ' '))[3]
  END,

  segundo_apellido = CASE
    WHEN array_length(string_to_array(TRIM(REGEXP_REPLACE(nombre, '\s+', ' ', 'g')), ' '), 1) = 3
      THEN (string_to_array(TRIM(REGEXP_REPLACE(nombre, '\s+', ' ', 'g')), ' '))[3]
    WHEN array_length(string_to_array(TRIM(REGEXP_REPLACE(nombre, '\s+', ' ', 'g')), ' '), 1) >= 4
      THEN array_to_string((string_to_array(TRIM(REGEXP_REPLACE(nombre, '\s+', ' ', 'g')), ' '))[4:], ' ')
    ELSE NULL
  END
WHERE nombre IS NOT NULL;

-- Fallback por si algún nombre era nulo o vacío
UPDATE beneficiarios SET primer_nombre   = 'SinNombre'   WHERE primer_nombre   IS NULL;
UPDATE beneficiarios SET primer_apellido = 'SinApellido' WHERE primer_apellido IS NULL;

ALTER TABLE beneficiarios
  ALTER COLUMN primer_nombre   SET NOT NULL,
  ALTER COLUMN primer_apellido SET NOT NULL;

DROP INDEX IF EXISTS idx_ben_nombre;
ALTER TABLE beneficiarios DROP COLUMN nombre;

CREATE INDEX idx_ben_nombres ON beneficiarios (primer_nombre, primer_apellido);
