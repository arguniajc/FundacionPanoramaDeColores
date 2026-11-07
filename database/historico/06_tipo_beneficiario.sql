-- Agrega campo tipo a beneficiarios para diferenciar niños de adultos.
-- Retrocompatible: todos los registros existentes quedan como 'niño'.
ALTER TABLE beneficiarios
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'niño';
