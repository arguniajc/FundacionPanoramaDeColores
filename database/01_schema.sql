-- =============================================================================
-- FUNDACIÓN PANORAMA DE COLORES — Schema Normalizado v1.0
-- PostgreSQL / Supabase
-- Ejecutar COMPLETO en el SQL Editor de Supabase
-- =============================================================================

-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- FUNCIÓN DE AUDITORÍA AUTOMÁTICA
-- Actualiza fecha_modificacion en cada UPDATE automáticamente
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_set_fecha_modificacion()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fecha_modificacion = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- MÓDULO 0 — CATÁLOGOS
-- Tablas de referencia normalizadas. Evitan textos libres inconsistentes.
-- =============================================================================

CREATE TABLE cat_tipo_documento (
  id      SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  codigo  VARCHAR(10) UNIQUE NOT NULL,   -- RC, TI, CC, CE, PA, NUIP
  nombre  VARCHAR(60)        NOT NULL,
  activo  BOOLEAN            NOT NULL DEFAULT TRUE
);

CREATE TABLE cat_parentesco (
  id     SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR(60) UNIQUE NOT NULL,
  activo BOOLEAN            NOT NULL DEFAULT TRUE
);

CREATE TABLE cat_eps (
  id     SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR(120) UNIQUE NOT NULL,
  activo BOOLEAN             NOT NULL DEFAULT TRUE
);

CREATE TABLE cat_tipo_sangre (
  id     SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  codigo VARCHAR(5) UNIQUE NOT NULL,    -- A+, A-, B+, B-, AB+, AB-, O+, O-
  activo BOOLEAN           NOT NULL DEFAULT TRUE
);

CREATE TABLE cat_tipo_alergia (
  id     SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR(60) UNIQUE NOT NULL,  -- Alimentaria, Medicamentosa, Ambiental…
  activo BOOLEAN            NOT NULL DEFAULT TRUE
);

CREATE TABLE cat_tipo_archivo (
  id     SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR(60) UNIQUE NOT NULL,  -- Foto menor, Foto documento, Contrato…
  activo BOOLEAN            NOT NULL DEFAULT TRUE
);

CREATE TABLE cat_tipo_evento (
  id     SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR(60) UNIQUE NOT NULL,  -- Taller, Actividad, Reunión…
  activo BOOLEAN            NOT NULL DEFAULT TRUE
);

CREATE TABLE cat_estado_evento (
  id     SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR(30) UNIQUE NOT NULL,  -- Planificado, En curso, Finalizado…
  activo BOOLEAN            NOT NULL DEFAULT TRUE
);

CREATE TABLE cat_tipo_movimiento_inv (
  id     SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR(30) UNIQUE NOT NULL,  -- Entrada, Salida, Ajuste, Baja
  activo BOOLEAN            NOT NULL DEFAULT TRUE
);

CREATE TABLE cat_categoria_tesoreria (
  id     SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR(80)  UNIQUE NOT NULL,
  tipo   VARCHAR(10)  NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  activo BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE cat_tipo_donante (
  id     SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR(60) UNIQUE NOT NULL,  -- Persona natural, Empresa, ONG…
  activo BOOLEAN            NOT NULL DEFAULT TRUE
);

-- ── Datos iniciales de catálogos ─────────────────────────────────────────────

INSERT INTO cat_tipo_documento (codigo, nombre) VALUES
  ('RC',   'Registro Civil'),
  ('TI',   'Tarjeta de Identidad'),
  ('CC',   'Cédula de Ciudadanía'),
  ('CE',   'Cédula de Extranjería'),
  ('PA',   'Pasaporte'),
  ('NUIP', 'Número Único de Identificación Personal');

INSERT INTO cat_parentesco (nombre) VALUES
  ('Madre'), ('Padre'), ('Abuelo'), ('Abuela'),
  ('Tío'), ('Tía'), ('Hermano'), ('Hermana'),
  ('Tutor legal'), ('Otro');

INSERT INTO cat_tipo_sangre (codigo) VALUES
  ('A+'), ('A-'), ('B+'), ('B-'), ('AB+'), ('AB-'), ('O+'), ('O-');

INSERT INTO cat_tipo_alergia (nombre) VALUES
  ('Alimentaria'), ('Medicamentosa'), ('Ambiental'),
  ('Picadura de insecto'), ('Látex'), ('Otra');

INSERT INTO cat_tipo_archivo (nombre) VALUES
  ('Foto del menor'), ('Foto documento'), ('Contrato'),
  ('Acta'), ('Soporte donación'), ('Otro');

INSERT INTO cat_tipo_evento (nombre) VALUES
  ('Taller'), ('Actividad recreativa'), ('Reunión'),
  ('Jornada de salud'), ('Celebración'), ('Capacitación');

INSERT INTO cat_estado_evento (nombre) VALUES
  ('Planificado'), ('En curso'), ('Finalizado'), ('Cancelado'), ('Pospuesto');

INSERT INTO cat_tipo_movimiento_inv (nombre) VALUES
  ('Entrada'), ('Salida'), ('Ajuste'), ('Baja'), ('Transferencia');

INSERT INTO cat_categoria_tesoreria (nombre, tipo) VALUES
  ('Donación monetaria',          'ingreso'),
  ('Subsidio estatal',            'ingreso'),
  ('Cuota de membresía',          'ingreso'),
  ('Venta de productos',          'ingreso'),
  ('Otros ingresos',              'ingreso'),
  ('Arriendo sede',               'egreso'),
  ('Servicios públicos',          'egreso'),
  ('Sueldos y honorarios',        'egreso'),
  ('Materiales y suministros',    'egreso'),
  ('Transporte',                  'egreso'),
  ('Alimentación beneficiarios',  'egreso'),
  ('Otros gastos',                'egreso');

INSERT INTO cat_tipo_donante (nombre) VALUES
  ('Persona natural'), ('Empresa'), ('ONG'),
  ('Entidad gubernamental'), ('Otro');

-- =============================================================================
-- MÓDULO 1 — USUARIOS DEL SISTEMA
-- =============================================================================

CREATE TABLE usuarios (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email                VARCHAR(150) UNIQUE NOT NULL,
  nombre               VARCHAR(120)        NOT NULL,
  avatar_url           TEXT,
  rol                  VARCHAR(20)         NOT NULL DEFAULT 'coordinador'
                         CHECK (rol IN ('admin','coordinador','voluntario','tesorero','readonly')),
  activo               BOOLEAN             NOT NULL DEFAULT TRUE,
  fecha_creacion       TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  fecha_modificacion   TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usuarios_email ON usuarios (email);
CREATE INDEX idx_usuarios_rol   ON usuarios (rol);

CREATE TRIGGER trg_usuarios_mod
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();

-- =============================================================================
-- MÓDULO 2 — BENEFICIARIOS
-- =============================================================================

CREATE TABLE beneficiarios (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre               VARCHAR(150)        NOT NULL,
  fecha_nacimiento     DATE,
  tipo_documento_id    SMALLINT    REFERENCES cat_tipo_documento (id),
  numero_documento     VARCHAR(30) UNIQUE,
  activo               BOOLEAN             NOT NULL DEFAULT TRUE,
  fecha_creacion       TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  usuario_creacion     UUID        REFERENCES usuarios (id),
  fecha_modificacion   TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  usuario_modificacion UUID        REFERENCES usuarios (id)
);

CREATE INDEX idx_ben_documento ON beneficiarios (numero_documento);
CREATE INDEX idx_ben_nombre    ON beneficiarios (nombre);
CREATE INDEX idx_ben_activo    ON beneficiarios (activo);

CREATE TRIGGER trg_ben_mod
  BEFORE UPDATE ON beneficiarios
  FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();

-- =============================================================================
-- MÓDULO 3 — ACUDIENTES
-- Un niño puede tener varios acudientes; un acudiente puede tener varios niños
-- =============================================================================

CREATE TABLE acudientes (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre               VARCHAR(150)        NOT NULL,
  whatsapp             VARCHAR(20),
  direccion            TEXT,
  activo               BOOLEAN             NOT NULL DEFAULT TRUE,
  fecha_creacion       TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  usuario_creacion     UUID        REFERENCES usuarios (id),
  fecha_modificacion   TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  usuario_modificacion UUID        REFERENCES usuarios (id)
);

CREATE INDEX idx_acu_nombre    ON acudientes (nombre);
CREATE INDEX idx_acu_whatsapp  ON acudientes (whatsapp);

CREATE TRIGGER trg_acu_mod
  BEFORE UPDATE ON acudientes
  FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();

CREATE TABLE beneficiario_acudiente (
  id                   UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiario_id      UUID     NOT NULL REFERENCES beneficiarios (id) ON DELETE CASCADE,
  acudiente_id         UUID     NOT NULL REFERENCES acudientes    (id) ON DELETE CASCADE,
  parentesco_id        SMALLINT REFERENCES cat_parentesco (id),
  es_principal         BOOLEAN  NOT NULL DEFAULT FALSE,
  activo               BOOLEAN  NOT NULL DEFAULT TRUE,
  fecha_creacion       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_creacion     UUID     REFERENCES usuarios (id),
  fecha_modificacion   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_modificacion UUID     REFERENCES usuarios (id),
  UNIQUE (beneficiario_id, acudiente_id)
);

CREATE INDEX idx_ba_beneficiario ON beneficiario_acudiente (beneficiario_id);
CREATE INDEX idx_ba_acudiente    ON beneficiario_acudiente (acudiente_id);

CREATE TRIGGER trg_ba_mod
  BEFORE UPDATE ON beneficiario_acudiente
  FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();

-- =============================================================================
-- MÓDULO 4 — SALUD
-- =============================================================================

CREATE TABLE beneficiario_salud (
  id                   UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiario_id      UUID     NOT NULL UNIQUE REFERENCES beneficiarios (id) ON DELETE CASCADE,
  eps_id               SMALLINT REFERENCES cat_eps        (id),
  tipo_sangre_id       SMALLINT REFERENCES cat_tipo_sangre(id),
  observaciones        TEXT,
  activo               BOOLEAN  NOT NULL DEFAULT TRUE,
  fecha_creacion       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_creacion     UUID     REFERENCES usuarios (id),
  fecha_modificacion   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_modificacion UUID     REFERENCES usuarios (id)
);

CREATE INDEX idx_salud_ben ON beneficiario_salud (beneficiario_id);

CREATE TRIGGER trg_salud_mod
  BEFORE UPDATE ON beneficiario_salud
  FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();

-- Catálogo de alergias conocidas
CREATE TABLE alergias_catalogo (
  id                   UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre               VARCHAR(120)        NOT NULL,
  tipo_alergia_id      SMALLINT REFERENCES cat_tipo_alergia (id),
  activo               BOOLEAN  NOT NULL DEFAULT TRUE,
  fecha_creacion       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_creacion     UUID     REFERENCES usuarios (id),
  fecha_modificacion   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_modificacion UUID     REFERENCES usuarios (id)
);

CREATE TRIGGER trg_alg_cat_mod
  BEFORE UPDATE ON alergias_catalogo
  FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();

-- Relación Beneficiario ↔ Alergia  (muchos a muchos)
CREATE TABLE beneficiario_alergia (
  id                   UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiario_id      UUID     NOT NULL REFERENCES beneficiarios    (id) ON DELETE CASCADE,
  alergia_id           UUID     NOT NULL REFERENCES alergias_catalogo(id),
  descripcion          TEXT,
  activo               BOOLEAN  NOT NULL DEFAULT TRUE,
  fecha_creacion       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_creacion     UUID     REFERENCES usuarios (id),
  fecha_modificacion   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_modificacion UUID     REFERENCES usuarios (id),
  UNIQUE (beneficiario_id, alergia_id)
);

CREATE INDEX idx_balg_ben ON beneficiario_alergia (beneficiario_id);

CREATE TRIGGER trg_balg_mod
  BEFORE UPDATE ON beneficiario_alergia
  FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();

-- =============================================================================
-- MÓDULO 5 — TALLAS
-- Historial por fecha: se puede ver cómo han crecido los niños
-- =============================================================================

CREATE TABLE beneficiario_talla (
  id                   UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiario_id      UUID     NOT NULL REFERENCES beneficiarios (id) ON DELETE CASCADE,
  talla_camisa         VARCHAR(10),
  talla_pantalon       VARCHAR(10),
  talla_zapatos        VARCHAR(10),
  fecha_medicion       DATE     NOT NULL DEFAULT CURRENT_DATE,
  activo               BOOLEAN  NOT NULL DEFAULT TRUE,
  fecha_creacion       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_creacion     UUID     REFERENCES usuarios (id),
  fecha_modificacion   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_modificacion UUID     REFERENCES usuarios (id)
);

-- Índice para obtener siempre la talla más reciente por niño
CREATE INDEX idx_talla_ben_fecha ON beneficiario_talla (beneficiario_id, fecha_medicion DESC);

CREATE TRIGGER trg_talla_mod
  BEFORE UPDATE ON beneficiario_talla
  FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();

-- =============================================================================
-- MÓDULO 6 — ARCHIVOS
-- Polimórfico: cualquier entidad puede tener archivos asociados
-- =============================================================================

CREATE TABLE archivos (
  id                   UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_tipo         VARCHAR(30)  NOT NULL,  -- 'beneficiario','donante','evento'…
  entidad_id           UUID         NOT NULL,
  tipo_archivo_id      SMALLINT REFERENCES cat_tipo_archivo (id),
  url                  TEXT         NOT NULL,
  nombre_original      VARCHAR(200),
  activo               BOOLEAN      NOT NULL DEFAULT TRUE,
  fecha_creacion       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  usuario_creacion     UUID     REFERENCES usuarios (id),
  fecha_modificacion   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  usuario_modificacion UUID     REFERENCES usuarios (id)
);

CREATE INDEX idx_arch_entidad ON archivos (entidad_tipo, entidad_id);

CREATE TRIGGER trg_arch_mod
  BEFORE UPDATE ON archivos
  FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();

-- =============================================================================
-- MÓDULO 7 — PROGRAMAS Y PROYECTOS
-- =============================================================================

CREATE TABLE programas (
  id                   UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre               VARCHAR(150) NOT NULL,
  descripcion          TEXT,
  fecha_inicio         DATE,
  fecha_fin            DATE,
  activo               BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_creacion     UUID    REFERENCES usuarios (id),
  fecha_modificacion   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_modificacion UUID    REFERENCES usuarios (id)
);

CREATE TRIGGER trg_prog_mod
  BEFORE UPDATE ON programas
  FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();

CREATE TABLE proyectos (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  programa_id          UUID          REFERENCES programas (id),
  nombre               VARCHAR(150)  NOT NULL,
  descripcion          TEXT,
  fecha_inicio         DATE,
  fecha_fin            DATE,
  presupuesto          NUMERIC(15,2),
  activo               BOOLEAN       NOT NULL DEFAULT TRUE,
  fecha_creacion       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  usuario_creacion     UUID          REFERENCES usuarios (id),
  fecha_modificacion   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  usuario_modificacion UUID          REFERENCES usuarios (id)
);

CREATE INDEX idx_proy_programa ON proyectos (programa_id);

CREATE TRIGGER trg_proy_mod
  BEFORE UPDATE ON proyectos
  FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();

-- Inscripción de beneficiarios a programas
CREATE TABLE beneficiario_programa (
  id                   UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiario_id      UUID    NOT NULL REFERENCES beneficiarios (id),
  programa_id          UUID    NOT NULL REFERENCES programas     (id),
  fecha_inscripcion    DATE    NOT NULL DEFAULT CURRENT_DATE,
  activo               BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_creacion     UUID    REFERENCES usuarios (id),
  fecha_modificacion   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_modificacion UUID    REFERENCES usuarios (id),
  UNIQUE (beneficiario_id, programa_id)
);

CREATE INDEX idx_bp_ben  ON beneficiario_programa (beneficiario_id);
CREATE INDEX idx_bp_prog ON beneficiario_programa (programa_id);

CREATE TRIGGER trg_bp_mod
  BEFORE UPDATE ON beneficiario_programa
  FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();

-- =============================================================================
-- MÓDULO 8 — EVENTOS (BASE DEL CALENDARIO)
-- El calendario se construye consultando esta tabla con filtros de fecha
-- =============================================================================

CREATE TABLE eventos (
  id                   UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  programa_id          UUID     REFERENCES programas     (id),
  proyecto_id          UUID     REFERENCES proyectos     (id),
  tipo_evento_id       SMALLINT REFERENCES cat_tipo_evento  (id),
  estado_id            SMALLINT REFERENCES cat_estado_evento(id),
  titulo               VARCHAR(200) NOT NULL,
  descripcion          TEXT,
  lugar                VARCHAR(200),
  fecha_inicio         TIMESTAMPTZ  NOT NULL,
  fecha_fin            TIMESTAMPTZ,
  cupo_maximo          INTEGER,
  activo               BOOLEAN  NOT NULL DEFAULT TRUE,
  fecha_creacion       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_creacion     UUID     REFERENCES usuarios (id),
  fecha_modificacion   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_modificacion UUID     REFERENCES usuarios (id)
);

CREATE INDEX idx_ev_fecha   ON eventos (fecha_inicio);
CREATE INDEX idx_ev_prog    ON eventos (programa_id);
CREATE INDEX idx_ev_estado  ON eventos (estado_id);

CREATE TRIGGER trg_ev_mod
  BEFORE UPDATE ON eventos
  FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();

-- Asistencia a eventos
CREATE TABLE evento_asistencia (
  id                   UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id            UUID    NOT NULL REFERENCES eventos       (id) ON DELETE CASCADE,
  beneficiario_id      UUID             REFERENCES beneficiarios (id),
  voluntario_id        UUID,            -- FK se agrega tras crear tabla voluntarios
  asistio              BOOLEAN,
  observaciones        TEXT,
  activo               BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_creacion     UUID    REFERENCES usuarios (id),
  fecha_modificacion   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_modificacion UUID    REFERENCES usuarios (id),
  UNIQUE (evento_id, beneficiario_id)
);

CREATE INDEX idx_asis_evento ON evento_asistencia (evento_id);
CREATE INDEX idx_asis_ben    ON evento_asistencia (beneficiario_id);

CREATE TRIGGER trg_asis_mod
  BEFORE UPDATE ON evento_asistencia
  FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();

-- =============================================================================
-- MÓDULO 9 — VOLUNTARIOS
-- =============================================================================

CREATE TABLE voluntarios (
  id                   UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre               VARCHAR(150) NOT NULL,
  email                VARCHAR(150),
  telefono             VARCHAR(20),
  whatsapp             VARCHAR(20),
  tipo_documento_id    SMALLINT REFERENCES cat_tipo_documento (id),
  numero_documento     VARCHAR(30),
  profesion            VARCHAR(100),
  activo               BOOLEAN  NOT NULL DEFAULT TRUE,
  fecha_creacion       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_creacion     UUID     REFERENCES usuarios (id),
  fecha_modificacion   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_modificacion UUID     REFERENCES usuarios (id)
);

CREATE INDEX idx_vol_nombre ON voluntarios (nombre);
CREATE INDEX idx_vol_email  ON voluntarios (email);

CREATE TRIGGER trg_vol_mod
  BEFORE UPDATE ON voluntarios
  FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();

-- Ahora que voluntarios existe, agregamos la FK pendiente
ALTER TABLE evento_asistencia
  ADD CONSTRAINT fk_asis_voluntario
  FOREIGN KEY (voluntario_id) REFERENCES voluntarios (id);

-- =============================================================================
-- MÓDULO 10 — TALENTO HUMANO
-- =============================================================================

CREATE TABLE empleados (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre               VARCHAR(150)  NOT NULL,
  email                VARCHAR(150),
  telefono             VARCHAR(20),
  tipo_documento_id    SMALLINT      REFERENCES cat_tipo_documento (id),
  numero_documento     VARCHAR(30)   UNIQUE,
  cargo                VARCHAR(100),
  fecha_ingreso        DATE,
  fecha_retiro         DATE,
  salario              NUMERIC(12,2),
  activo               BOOLEAN       NOT NULL DEFAULT TRUE,
  fecha_creacion       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  usuario_creacion     UUID          REFERENCES usuarios (id),
  fecha_modificacion   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  usuario_modificacion UUID          REFERENCES usuarios (id)
);

CREATE INDEX idx_emp_nombre ON empleados (nombre);

CREATE TRIGGER trg_emp_mod
  BEFORE UPDATE ON empleados
  FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();

-- =============================================================================
-- MÓDULO 11 — DONANTES Y DONACIONES
-- =============================================================================

CREATE TABLE donantes (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_donante_id      SMALLINT      REFERENCES cat_tipo_donante (id),
  nombre               VARCHAR(200)  NOT NULL,
  identificacion       VARCHAR(30),
  email                VARCHAR(150),
  telefono             VARCHAR(20),
  ciudad               VARCHAR(100),
  activo               BOOLEAN       NOT NULL DEFAULT TRUE,
  fecha_creacion       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  usuario_creacion     UUID          REFERENCES usuarios (id),
  fecha_modificacion   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  usuario_modificacion UUID          REFERENCES usuarios (id)
);

CREATE INDEX idx_don_nombre ON donantes (nombre);
CREATE INDEX idx_don_id     ON donantes (identificacion);

CREATE TRIGGER trg_don_mod
  BEFORE UPDATE ON donantes
  FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();

CREATE TABLE donaciones (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  donante_id           UUID          REFERENCES donantes  (id),
  proyecto_id          UUID          REFERENCES proyectos (id),
  fecha                DATE          NOT NULL DEFAULT CURRENT_DATE,
  monto                NUMERIC(15,2),
  en_especie           BOOLEAN       NOT NULL DEFAULT FALSE,
  descripcion_especie  TEXT,
  observaciones        TEXT,
  activo               BOOLEAN       NOT NULL DEFAULT TRUE,
  fecha_creacion       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  usuario_creacion     UUID          REFERENCES usuarios (id),
  fecha_modificacion   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  usuario_modificacion UUID          REFERENCES usuarios (id)
);

CREATE INDEX idx_dnc_donante ON donaciones (donante_id);
CREATE INDEX idx_dnc_fecha   ON donaciones (fecha);
CREATE INDEX idx_dnc_proy    ON donaciones (proyecto_id);

CREATE TRIGGER trg_dnc_mod
  BEFORE UPDATE ON donaciones
  FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();

-- =============================================================================
-- MÓDULO 12 — INVENTARIO
-- =============================================================================

CREATE TABLE inventario_items (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo               VARCHAR(50)   UNIQUE,
  nombre               VARCHAR(150)  NOT NULL,
  descripcion          TEXT,
  unidad_medida        VARCHAR(30),
  stock_actual         NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock_minimo         NUMERIC(10,2)          DEFAULT 0,
  activo               BOOLEAN       NOT NULL DEFAULT TRUE,
  fecha_creacion       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  usuario_creacion     UUID          REFERENCES usuarios (id),
  fecha_modificacion   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  usuario_modificacion UUID          REFERENCES usuarios (id)
);

CREATE INDEX idx_inv_nombre ON inventario_items (nombre);
CREATE INDEX idx_inv_codigo ON inventario_items (codigo);

CREATE TRIGGER trg_inv_mod
  BEFORE UPDATE ON inventario_items
  FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();

CREATE TABLE inventario_movimientos (
  id                   UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id              UUID     NOT NULL REFERENCES inventario_items       (id),
  tipo_movimiento_id   SMALLINT          REFERENCES cat_tipo_movimiento_inv(id),
  cantidad             NUMERIC(10,2) NOT NULL,
  stock_resultante     NUMERIC(10,2) NOT NULL,
  motivo               TEXT,
  evento_id            UUID     REFERENCES eventos (id),
  activo               BOOLEAN  NOT NULL DEFAULT TRUE,
  fecha_creacion       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_creacion     UUID     REFERENCES usuarios (id),
  fecha_modificacion   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_modificacion UUID     REFERENCES usuarios (id)
);

CREATE INDEX idx_invmov_item  ON inventario_movimientos (item_id);
CREATE INDEX idx_invmov_fecha ON inventario_movimientos (fecha_creacion);

CREATE TRIGGER trg_invmov_mod
  BEFORE UPDATE ON inventario_movimientos
  FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();

-- =============================================================================
-- MÓDULO 13 — TESORERÍA
-- =============================================================================

CREATE TABLE tesoreria_cuentas (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre               VARCHAR(100)  NOT NULL,
  banco                VARCHAR(100),
  numero_cuenta        VARCHAR(50),
  saldo_inicial        NUMERIC(15,2) NOT NULL DEFAULT 0,
  saldo_actual         NUMERIC(15,2) NOT NULL DEFAULT 0,
  activo               BOOLEAN       NOT NULL DEFAULT TRUE,
  fecha_creacion       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  usuario_creacion     UUID          REFERENCES usuarios (id),
  fecha_modificacion   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  usuario_modificacion UUID          REFERENCES usuarios (id)
);

CREATE TRIGGER trg_tc_mod
  BEFORE UPDATE ON tesoreria_cuentas
  FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();

CREATE TABLE tesoreria_movimientos (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  cuenta_id            UUID          NOT NULL REFERENCES tesoreria_cuentas       (id),
  categoria_id         SMALLINT               REFERENCES cat_categoria_tesoreria (id),
  donacion_id          UUID                   REFERENCES donaciones  (id),
  proyecto_id          UUID                   REFERENCES proyectos   (id),
  fecha                DATE          NOT NULL DEFAULT CURRENT_DATE,
  tipo                 VARCHAR(10)   NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  monto                NUMERIC(15,2) NOT NULL,
  descripcion          TEXT,
  comprobante_url      TEXT,
  activo               BOOLEAN       NOT NULL DEFAULT TRUE,
  fecha_creacion       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  usuario_creacion     UUID          REFERENCES usuarios (id),
  fecha_modificacion   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  usuario_modificacion UUID          REFERENCES usuarios (id)
);

CREATE INDEX idx_tmov_cuenta ON tesoreria_movimientos (cuenta_id);
CREATE INDEX idx_tmov_fecha  ON tesoreria_movimientos (fecha);
CREATE INDEX idx_tmov_tipo   ON tesoreria_movimientos (tipo);

CREATE TRIGGER trg_tmov_mod
  BEFORE UPDATE ON tesoreria_movimientos
  FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();

-- =============================================================================
-- MÓDULO 14 — ACTAS
-- =============================================================================

CREATE TABLE actas (
  id                   UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id            UUID    REFERENCES eventos (id),
  titulo               VARCHAR(200) NOT NULL,
  contenido            TEXT,
  fecha_acta           DATE    NOT NULL DEFAULT CURRENT_DATE,
  url_documento        TEXT,
  activo               BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_creacion     UUID    REFERENCES usuarios (id),
  fecha_modificacion   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_modificacion UUID    REFERENCES usuarios (id)
);

CREATE INDEX idx_acta_fecha  ON actas (fecha_acta);
CREATE INDEX idx_acta_evento ON actas (evento_id);

CREATE TRIGGER trg_acta_mod
  BEFORE UPDATE ON actas
  FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();

-- =============================================================================
-- FIN DEL SCHEMA
-- Siguiente paso: ejecutar 02_migracion.sql
-- =============================================================================
