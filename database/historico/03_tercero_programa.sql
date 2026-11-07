-- Agrega columnas de entidad ejecutora (tercero) a la tabla programas
ALTER TABLE programas ADD COLUMN IF NOT EXISTS tiene_tercero BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE programas ADD COLUMN IF NOT EXISTS nombre_tercero VARCHAR(200);
