-- Módulo de Nómina: períodos y liquidaciones

CREATE TABLE IF NOT EXISTS nomina_periodos (
    id          SERIAL PRIMARY KEY,
    mes         SMALLINT     NOT NULL CHECK (mes BETWEEN 1 AND 12),
    anio        SMALLINT     NOT NULL CHECK (anio >= 2020),
    fecha_pago  DATE,
    estado      VARCHAR(20)  NOT NULL DEFAULT 'borrador'
                             CHECK (estado IN ('borrador', 'cerrado')),
    observacion TEXT,
    creado_en   TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (mes, anio)
);

CREATE TABLE IF NOT EXISTS nomina_liquidaciones (
    id                  SERIAL PRIMARY KEY,
    periodo_id          INTEGER      NOT NULL REFERENCES nomina_periodos(id) ON DELETE CASCADE,
    empleado_id         UUID         NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
    dias_trabajados     SMALLINT     NOT NULL DEFAULT 30,
    salario_base        NUMERIC(14,2) NOT NULL DEFAULT 0,
    auxilio_transporte  NUMERIC(14,2) NOT NULL DEFAULT 0,
    horas_extras        NUMERIC(14,2) NOT NULL DEFAULT 0,
    bonificaciones      NUMERIC(14,2) NOT NULL DEFAULT 0,
    deduccion_salud     NUMERIC(14,2) NOT NULL DEFAULT 0,
    deduccion_pension   NUMERIC(14,2) NOT NULL DEFAULT 0,
    retencion_fuente    NUMERIC(14,2) NOT NULL DEFAULT 0,
    otras_deducciones   NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_devengado     NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_deducciones   NUMERIC(14,2) NOT NULL DEFAULT 0,
    neto_pagar          NUMERIC(14,2) NOT NULL DEFAULT 0,
    observacion         TEXT,
    creado_en           TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (periodo_id, empleado_id)
);

CREATE INDEX IF NOT EXISTS idx_nomina_liq_periodo ON nomina_liquidaciones(periodo_id);
CREATE INDEX IF NOT EXISTS idx_nomina_liq_empleado ON nomina_liquidaciones(empleado_id);
