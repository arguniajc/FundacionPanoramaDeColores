using Microsoft.Extensions.Logging;
using Npgsql;

namespace FundacionPanorama.API.Data;

public static class DbMigrations
{
    public static async Task RunAsync(string connStr, ILogger logger)
    {
        async Task Migrar(string sql, string etiqueta)
        {
            try
            {
                await using var conn = new NpgsqlConnection(connStr);
                await conn.OpenAsync();
                await using var cmd = conn.CreateCommand();
                cmd.CommandText = sql;
                await cmd.ExecuteNonQueryAsync();
                logger.LogInformation("✅ Migración OK: {E}", etiqueta);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "⚠️  Migración omitida [{E}]: {M}", etiqueta, ex.Message);
            }
        }

        async Task MigrarUnaVez(string sql, string etiqueta)
        {
            try
            {
                await using var conn = new NpgsqlConnection(connStr);
                await conn.OpenAsync();
                await using var claim = conn.CreateCommand();
                claim.CommandText = "INSERT INTO _migraciones_ejecutadas (etiqueta) VALUES (@e) ON CONFLICT (etiqueta) DO NOTHING";
                claim.Parameters.AddWithValue("e", etiqueta);
                if (await claim.ExecuteNonQueryAsync() == 0) return;
                await using var cmd = conn.CreateCommand();
                cmd.CommandText = sql;
                await cmd.ExecuteNonQueryAsync();
                logger.LogInformation("✅ Migración única OK: {E}", etiqueta);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "⚠️  Migración única omitida [{E}]: {M}", etiqueta, ex.Message);
            }
        }

        // Control de migraciones idempotentes
        await Migrar("""
            CREATE TABLE IF NOT EXISTS _migraciones_ejecutadas (
                etiqueta VARCHAR(200) PRIMARY KEY,
                ejecutado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """, "_migraciones_ejecutadas.create");

        // Recrear tablas de inventario si fueron creadas con esquema incompleto
        await MigrarUnaVez("DROP TABLE IF EXISTS cat_tipo_movimiento_inv CASCADE", "inventario.drop_cat_tipo_v2");
        await MigrarUnaVez("DROP TABLE IF EXISTS inventario_movimientos CASCADE",  "inventario.drop_movimientos_v2");
        await MigrarUnaVez("DROP TABLE IF EXISTS inventario_items CASCADE",        "inventario.drop_items_v2");

        // ── Columnas retroactivas ─────────────────────────────────────────────
        await Migrar("ALTER TABLE beneficiarios ADD COLUMN IF NOT EXISTS motivo_baja VARCHAR(500)",                                    "beneficiarios.motivo_baja");
        await Migrar("ALTER TABLE beneficiarios ADD COLUMN IF NOT EXISTS pais_nacimiento VARCHAR(100)",                                "beneficiarios.pais_nacimiento");
        await Migrar("ALTER TABLE beneficiarios ADD COLUMN IF NOT EXISTS departamento_nacimiento VARCHAR(100)",                        "beneficiarios.departamento_nacimiento");
        await Migrar("ALTER TABLE beneficiarios ADD COLUMN IF NOT EXISTS ciudad_nacimiento VARCHAR(100)",                              "beneficiarios.ciudad_nacimiento");
        await Migrar("ALTER TABLE beneficiarios ADD COLUMN IF NOT EXISTS barrio VARCHAR(100)",                                         "beneficiarios.barrio");
        await Migrar("ALTER TABLE beneficiarios ADD COLUMN IF NOT EXISTS num_personas_vive INT",                                       "beneficiarios.num_personas_vive");
        await Migrar("ALTER TABLE beneficiarios ADD COLUMN IF NOT EXISTS num_hermanos INT",                                            "beneficiarios.num_hermanos");
        await Migrar("ALTER TABLE beneficiarios ADD COLUMN IF NOT EXISTS nombre_colegio VARCHAR(200)",                                 "beneficiarios.nombre_colegio");
        await Migrar("ALTER TABLE beneficiarios ADD COLUMN IF NOT EXISTS grado_escolar VARCHAR(50)",                                   "beneficiarios.grado_escolar");
        await Migrar("ALTER TABLE beneficiarios ADD COLUMN IF NOT EXISTS tiene_discapacidad BOOLEAN NOT NULL DEFAULT false",           "beneficiarios.tiene_discapacidad");
        await Migrar("ALTER TABLE beneficiarios ADD COLUMN IF NOT EXISTS descripcion_discapacidad TEXT",                               "beneficiarios.descripcion_discapacidad");
        await Migrar("ALTER TABLE beneficiarios ADD COLUMN IF NOT EXISTS vive_con_nino BOOLEAN",                                       "beneficiarios.vive_con_nino");
        await Migrar("ALTER TABLE beneficiarios ADD COLUMN IF NOT EXISTS autorizacion BOOLEAN NOT NULL DEFAULT false",                 "beneficiarios.autorizacion");
        await Migrar("ALTER TABLE beneficiarios ADD COLUMN IF NOT EXISTS genero VARCHAR(20)",                                          "beneficiarios.genero");
        await Migrar("ALTER TABLE beneficiario_talla ADD COLUMN IF NOT EXISTS peso_kg DECIMAL(5,2)",                                   "beneficiario_talla.peso_kg");
        await Migrar("ALTER TABLE beneficiario_talla ADD COLUMN IF NOT EXISTS talla_cm INT",                                           "beneficiario_talla.talla_cm");
        await Migrar("ALTER TABLE sedes ADD COLUMN IF NOT EXISTS direccion VARCHAR(300)",            "sedes.direccion");
        await Migrar("ALTER TABLE sedes ADD COLUMN IF NOT EXISTS ciudad VARCHAR(100)",               "sedes.ciudad");
        await Migrar("ALTER TABLE sedes ADD COLUMN IF NOT EXISTS telefono VARCHAR(30)",              "sedes.telefono");
        await Migrar("ALTER TABLE sedes ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true", "sedes.activo");
        await Migrar("ALTER TABLE sedes ADD COLUMN IF NOT EXISTS fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()", "sedes.fecha_creacion");
        await Migrar("ALTER TABLE sedes ADD COLUMN IF NOT EXISTS fecha_modificacion TIMESTAMPTZ NOT NULL DEFAULT NOW()", "sedes.fecha_modificacion");
        await Migrar("ALTER TABLE programas ADD COLUMN IF NOT EXISTS sede_id UUID",                  "programas.sede_id");
        await Migrar("ALTER TABLE programas ADD COLUMN IF NOT EXISTS descripcion VARCHAR(500)",      "programas.descripcion");
        await Migrar("ALTER TABLE programas ADD COLUMN IF NOT EXISTS cupo_maximo INT",               "programas.cupo_maximo");
        await Migrar("ALTER TABLE programas ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true", "programas.activo");
        await Migrar("ALTER TABLE programas ADD COLUMN IF NOT EXISTS fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()", "programas.fecha_creacion");
        await Migrar("ALTER TABLE programas ADD COLUMN IF NOT EXISTS fecha_modificacion TIMESTAMPTZ NOT NULL DEFAULT NOW()", "programas.fecha_modificacion");
        await Migrar("ALTER TABLE programas ADD COLUMN IF NOT EXISTS tiene_tercero BOOLEAN NOT NULL DEFAULT FALSE",  "programas.tiene_tercero");
        await Migrar("ALTER TABLE programas ADD COLUMN IF NOT EXISTS nombre_tercero VARCHAR(200)",                   "programas.nombre_tercero");

        // ── Tablas nuevas ─────────────────────────────────────────────────────
        await Migrar("""
            CREATE TABLE IF NOT EXISTS log_descargas (
                id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
                usuario_email   VARCHAR(255) NOT NULL,
                beneficiario_id UUID         NOT NULL,
                tipo_archivo    VARCHAR(100) NOT NULL DEFAULT 'documento',
                url_archivo     TEXT,
                descargado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
            )
            """, "log_descargas");

        await Migrar("""
            CREATE TABLE IF NOT EXISTS documentos_institucionales (
                id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
                titulo             VARCHAR(200) NOT NULL,
                descripcion        TEXT,
                categoria          VARCHAR(50)  NOT NULL DEFAULT 'Otros',
                url                TEXT         NOT NULL,
                nombre_original    VARCHAR(200),
                subido_por_email   VARCHAR(200),
                activo             BOOLEAN      NOT NULL DEFAULT true,
                fecha_creacion     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                fecha_modificacion TIMESTAMPTZ  NOT NULL DEFAULT NOW()
            )
            """, "documentos_institucionales");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_documentos_inst_categoria ON documentos_institucionales(categoria)", "documentos_institucionales.idx_categoria");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_documentos_inst_activo    ON documentos_institucionales(activo)",    "documentos_institucionales.idx_activo");

        await Migrar("""
            CREATE TABLE IF NOT EXISTS inscripciones (
                id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                beneficiario_id    UUID        NOT NULL,
                programa_id        UUID        NOT NULL,
                estado             VARCHAR(30) NOT NULL DEFAULT 'activa',
                fecha_inscripcion  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                datos              TEXT        NOT NULL DEFAULT '{}',
                observaciones      TEXT,
                activo             BOOLEAN     NOT NULL DEFAULT true,
                fecha_creacion     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                fecha_modificacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """, "inscripciones");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_inscripciones_programa      ON inscripciones(programa_id)",      "inscripciones.idx_programa");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_inscripciones_beneficiario  ON inscripciones(beneficiario_id)",  "inscripciones.idx_beneficiario");

        // ── Módulo Inventario ─────────────────────────────────────────────────
        await Migrar("""
            CREATE TABLE IF NOT EXISTS cat_tipo_movimiento_inv (
                id           SERIAL      PRIMARY KEY,
                codigo       VARCHAR(50) NOT NULL UNIQUE,
                nombre       VARCHAR(100) NOT NULL,
                descripcion  TEXT,
                afecta_stock CHAR(1)     NOT NULL DEFAULT '+'
            )
            """, "cat_tipo_movimiento_inv");

        await Migrar("""
            INSERT INTO cat_tipo_movimiento_inv (codigo, nombre, descripcion, afecta_stock) VALUES
                ('ENTRADA',            'Entrada',              'Artículo recibido o comprado',                '+'),
                ('SALIDA',             'Salida para uso',       'Artículo usado internamente',                '-'),
                ('DONACION_RECIBIDA',  'Donación recibida',     'Artículo recibido como donación',            '+'),
                ('DONACION_ENTREGADA', 'Donación entregada',    'Artículo entregado a programa/beneficiario', '-'),
                ('AJUSTE_POSITIVO',    'Ajuste positivo',       'Corrección de inventario hacia arriba',      '+'),
                ('AJUSTE_NEGATIVO',    'Ajuste negativo',       'Corrección de inventario hacia abajo',       '-')
            ON CONFLICT (codigo) DO NOTHING
            """, "cat_tipo_movimiento_inv.seed");

        await Migrar("""
            CREATE TABLE IF NOT EXISTS inventario_items (
                id                 UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
                codigo             VARCHAR(50),
                nombre             VARCHAR(200)   NOT NULL,
                descripcion        TEXT,
                unidad_medida      VARCHAR(50)    NOT NULL DEFAULT 'unidad',
                stock_actual       NUMERIC(12,2)  NOT NULL DEFAULT 0,
                stock_minimo       NUMERIC(12,2)  NOT NULL DEFAULT 0,
                activo             BOOLEAN        NOT NULL DEFAULT true,
                fecha_creacion     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
                fecha_modificacion TIMESTAMPTZ    NOT NULL DEFAULT NOW()
            )
            """, "inventario_items");

        await Migrar("""
            CREATE TABLE IF NOT EXISTS inventario_movimientos (
                id                 UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
                item_id            UUID           NOT NULL,
                tipo_movimiento_id INT            NOT NULL,
                cantidad           NUMERIC(12,2)  NOT NULL,
                stock_resultante   NUMERIC(12,2)  NOT NULL,
                motivo             TEXT,
                donante            VARCHAR(200),
                usuario_email      VARCHAR(255),
                fecha_movimiento   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
                fecha_creacion     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
            )
            """, "inventario_movimientos");

        await Migrar("CREATE INDEX IF NOT EXISTS idx_inv_mov_item  ON inventario_movimientos(item_id)",         "inventario_movimientos.idx_item");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_inv_mov_fecha ON inventario_movimientos(fecha_movimiento)", "inventario_movimientos.idx_fecha");

        await Migrar("ALTER TABLE inventario_items ADD COLUMN IF NOT EXISTS sede_id     UUID",                                        "inventario_items.sede_id");
        await Migrar("ALTER TABLE inventario_items ADD COLUMN IF NOT EXISTS categoria   VARCHAR(50) NOT NULL DEFAULT 'Otros'",        "inventario_items.categoria");
        await Migrar("ALTER TABLE inventario_movimientos ADD COLUMN IF NOT EXISTS sede_destino_id     UUID",                          "inventario_movimientos.sede_destino_id");
        await Migrar("ALTER TABLE inventario_movimientos ADD COLUMN IF NOT EXISTS donante_id          UUID",                          "inventario_movimientos.donante_id");
        await Migrar("ALTER TABLE inventario_movimientos ADD COLUMN IF NOT EXISTS transferencia_grupo UUID",                          "inventario_movimientos.transferencia_grupo");
        await Migrar("ALTER TABLE inventario_movimientos ADD COLUMN IF NOT EXISTS beneficiario_id     UUID",                          "inventario_movimientos.beneficiario_id");
        await Migrar("ALTER TABLE inventario_movimientos ADD COLUMN IF NOT EXISTS programa_id         UUID",                          "inventario_movimientos.programa_id");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_inv_mov_sede_destino ON inventario_movimientos(sede_destino_id)", "inventario_movimientos.idx_sede_destino");

        await Migrar("ALTER TABLE cat_tipo_movimiento_inv ADD COLUMN IF NOT EXISTS descripcion TEXT",   "cat_tipo_movimiento_inv.add_descripcion");
        await Migrar("ALTER TABLE cat_tipo_movimiento_inv ADD COLUMN IF NOT EXISTS codigo VARCHAR(50)", "cat_tipo_movimiento_inv.add_codigo");
        await Migrar("""
            UPDATE cat_tipo_movimiento_inv SET codigo =
              CASE
                WHEN nombre ILIKE '%transferencia%' AND afecta_stock = '-' THEN 'TRANSFERENCIA_SALIDA'
                WHEN nombre ILIKE '%transferencia%' AND afecta_stock = '+' THEN 'TRANSFERENCIA_ENTRADA'
                WHEN nombre ILIKE '%donaci%' AND nombre ILIKE '%entregada%' THEN 'DONACION_ENTREGADA'
                WHEN nombre ILIKE '%donaci%'                                THEN 'DONACION_RECIBIDA'
                WHEN nombre ILIKE '%ajuste%' AND afecta_stock = '-'         THEN 'AJUSTE_NEGATIVO'
                WHEN nombre ILIKE '%ajuste%'                                THEN 'AJUSTE_POSITIVO'
                WHEN afecta_stock = '-'                                     THEN 'SALIDA'
                ELSE                                                             'ENTRADA'
              END
            WHERE codigo IS NULL
            """, "cat_tipo_movimiento_inv.set_codigos");
        await Migrar("CREATE UNIQUE INDEX IF NOT EXISTS idx_cat_tipo_mov_codigo ON cat_tipo_movimiento_inv(codigo) WHERE codigo IS NOT NULL", "cat_tipo_movimiento_inv.unique_codigo");

        await Migrar("ALTER TABLE inventario_movimientos ADD COLUMN IF NOT EXISTS stock_resultante   NUMERIC(12,2) NOT NULL DEFAULT 0", "inventario_movimientos.add_stock_resultante");
        await Migrar("ALTER TABLE inventario_movimientos ADD COLUMN IF NOT EXISTS motivo             TEXT",                             "inventario_movimientos.add_motivo");
        await Migrar("ALTER TABLE inventario_movimientos ADD COLUMN IF NOT EXISTS donante            VARCHAR(200)",                    "inventario_movimientos.add_donante");
        await Migrar("ALTER TABLE inventario_movimientos ADD COLUMN IF NOT EXISTS usuario_email      VARCHAR(255)",                    "inventario_movimientos.add_usuario_email");
        await Migrar("ALTER TABLE inventario_movimientos ADD COLUMN IF NOT EXISTS fecha_movimiento   TIMESTAMPTZ DEFAULT NOW()",       "inventario_movimientos.add_fecha_movimiento");

        await Migrar("""
            INSERT INTO cat_tipo_movimiento_inv (codigo, nombre, descripcion, afecta_stock) VALUES
                ('TRANSFERENCIA_SALIDA',  'Transferencia salida',  'Artículo enviado a otra sede', '-'),
                ('TRANSFERENCIA_ENTRADA', 'Transferencia entrada', 'Artículo recibido de otra sede', '+')
            ON CONFLICT (codigo) DO NOTHING
            """, "cat_tipo_movimiento_inv.transfers");

        // ── Módulo Donantes / Donaciones ──────────────────────────────────────
        await Migrar("""
            CREATE TABLE IF NOT EXISTS donantes (
                id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
                nombre             VARCHAR(200) NOT NULL,
                tipo               VARCHAR(20)  NOT NULL DEFAULT 'persona',
                documento          VARCHAR(50),
                email              VARCHAR(200),
                telefono           VARCHAR(30),
                activo             BOOLEAN      NOT NULL DEFAULT true,
                fecha_creacion     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                fecha_modificacion TIMESTAMPTZ  NOT NULL DEFAULT NOW()
            )
            """, "donantes");

        await Migrar("ALTER TABLE donantes ADD COLUMN IF NOT EXISTS tipo      VARCHAR(20)  NOT NULL DEFAULT 'persona'", "donantes.tipo");
        await Migrar("ALTER TABLE donantes ADD COLUMN IF NOT EXISTS documento VARCHAR(50)",                             "donantes.documento");
        await Migrar("ALTER TABLE donantes ADD COLUMN IF NOT EXISTS ciudad    VARCHAR(100)",                           "donantes.ciudad");
        await Migrar("ALTER TABLE donantes ADD COLUMN IF NOT EXISTS notas     TEXT",                                   "donantes.notas");

        await Migrar("""
            CREATE TABLE IF NOT EXISTS donaciones (
                id                 UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
                donante_id         UUID           NOT NULL,
                tipo               VARCHAR(20)    NOT NULL DEFAULT 'dinero',
                monto              NUMERIC(14,2),
                item_id            UUID,
                nombre_item        VARCHAR(200),
                cantidad           NUMERIC(12,2),
                unidad_medida      VARCHAR(50),
                programa_id        UUID,
                sede_id            UUID,
                descripcion        TEXT,
                fecha_donacion     DATE           NOT NULL DEFAULT CURRENT_DATE,
                recibo_numero      VARCHAR(50),
                activo             BOOLEAN        NOT NULL DEFAULT true,
                fecha_creacion     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
                fecha_modificacion TIMESTAMPTZ    NOT NULL DEFAULT NOW()
            )
            """, "donaciones");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_donaciones_donante  ON donaciones(donante_id)",   "donaciones.idx_donante");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_donaciones_fecha    ON donaciones(fecha_donacion)", "donaciones.idx_fecha");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_donaciones_programa ON donaciones(programa_id)",  "donaciones.idx_programa");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_donaciones_sede     ON donaciones(sede_id)",      "donaciones.idx_sede");

        await Migrar("ALTER TABLE donaciones ADD COLUMN IF NOT EXISTS tipo          VARCHAR(20)    NOT NULL DEFAULT 'dinero'",     "donaciones.tipo");
        await Migrar("ALTER TABLE donaciones ADD COLUMN IF NOT EXISTS monto         NUMERIC(14,2)",                               "donaciones.monto");
        await Migrar("ALTER TABLE donaciones ADD COLUMN IF NOT EXISTS item_id       UUID",                                         "donaciones.item_id");
        await Migrar("ALTER TABLE donaciones ADD COLUMN IF NOT EXISTS nombre_item   VARCHAR(200)",                                 "donaciones.nombre_item");
        await Migrar("ALTER TABLE donaciones ADD COLUMN IF NOT EXISTS cantidad      NUMERIC(12,2)",                               "donaciones.cantidad");
        await Migrar("ALTER TABLE donaciones ADD COLUMN IF NOT EXISTS unidad_medida VARCHAR(50)",                                  "donaciones.unidad_medida");
        await Migrar("ALTER TABLE donaciones ADD COLUMN IF NOT EXISTS programa_id   UUID",                                         "donaciones.programa_id");
        await Migrar("ALTER TABLE donaciones ADD COLUMN IF NOT EXISTS sede_id       UUID",                                         "donaciones.sede_id");
        await Migrar("ALTER TABLE donaciones ADD COLUMN IF NOT EXISTS recibo_numero VARCHAR(50)",                                  "donaciones.recibo_numero");
        await Migrar("ALTER TABLE donaciones ADD COLUMN IF NOT EXISTS descripcion    TEXT",                                         "donaciones.descripcion");
        await Migrar("ALTER TABLE donaciones ADD COLUMN IF NOT EXISTS activo        BOOLEAN        NOT NULL DEFAULT true",         "donaciones.activo");
        await Migrar("ALTER TABLE donaciones ADD COLUMN IF NOT EXISTS fecha_donacion DATE           NOT NULL DEFAULT CURRENT_DATE", "donaciones.fecha_donacion");
        await Migrar("ALTER TABLE donaciones ADD COLUMN IF NOT EXISTS fecha_creacion     TIMESTAMPTZ NOT NULL DEFAULT NOW()",       "donaciones.fecha_creacion");
        await Migrar("ALTER TABLE donaciones ADD COLUMN IF NOT EXISTS fecha_modificacion TIMESTAMPTZ NOT NULL DEFAULT NOW()",       "donaciones.fecha_modificacion");

        // ── Módulo Voluntarios ────────────────────────────────────────────────
        await Migrar("""
            CREATE TABLE IF NOT EXISTS voluntarios (
                id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
                nombre             VARCHAR(200) NOT NULL,
                tipo_documento     VARCHAR(20),
                documento          VARCHAR(50),
                email              VARCHAR(200),
                telefono           VARCHAR(30),
                ciudad             VARCHAR(100),
                fecha_nacimiento   DATE,
                fecha_inicio       DATE,
                profesion          VARCHAR(100),
                notas              TEXT,
                activo             BOOLEAN      NOT NULL DEFAULT true,
                fecha_creacion     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                fecha_modificacion TIMESTAMPTZ  NOT NULL DEFAULT NOW()
            )
            """, "voluntarios");

        await Migrar("""
            CREATE TABLE IF NOT EXISTS voluntario_programas (
                id                 UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
                voluntario_id      UUID           NOT NULL,
                programa_id        UUID,
                sede_id            UUID,
                horas_semanales    NUMERIC(6,2)   NOT NULL DEFAULT 0,
                fecha_inicio       DATE,
                activo             BOOLEAN        NOT NULL DEFAULT true,
                fecha_creacion     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
            )
            """, "voluntario_programas");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_vol_prog_voluntario ON voluntario_programas(voluntario_id)", "voluntario_programas.idx_voluntario");
        await Migrar(@"
            UPDATE voluntario_programas SET activo = false
            WHERE activo = true
              AND voluntario_id IN (SELECT id FROM voluntarios WHERE activo = false)",
            "voluntario_programas.limpiar_huerfanas");

        // ── Módulo Configuración ──────────────────────────────────────────────
        await Migrar("""
            CREATE TABLE IF NOT EXISTS configuracion (
                id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                nombre_fundacion VARCHAR(200),
                nit              VARCHAR(50),
                direccion        VARCHAR(300),
                telefono         VARCHAR(30),
                nombre_rep_legal VARCHAR(200),
                tipo_doc_rep     VARCHAR(20),
                documento_rep    VARCHAR(50),
                cargo_rep        VARCHAR(100),
                firma_rep        TEXT,
                updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """, "configuracion");

        await Migrar("ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS color_primario      VARCHAR(7)   NOT NULL DEFAULT '#4E1B95'", "configuracion.color_primario");
        await Migrar("ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS color_sidebar       VARCHAR(7)   NOT NULL DEFAULT '#150830'", "configuracion.color_sidebar");
        await Migrar("ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS tagline             VARCHAR(500)",                            "configuracion.tagline");
        await Migrar("ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS mision              TEXT",                                    "configuracion.mision");
        await Migrar("ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS vision              TEXT",                                    "configuracion.vision");
        await Migrar("ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS email_contacto      VARCHAR(200)",                            "configuracion.email_contacto");
        await Migrar("ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS sitio_web           VARCHAR(300)",                            "configuracion.sitio_web");
        await Migrar("ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS mensaje_bienvenida  TEXT",                                    "configuracion.mensaje_bienvenida");
        await Migrar("ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS footer_texto        VARCHAR(500)",                            "configuracion.footer_texto");
        await Migrar("ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS web_contenido       TEXT",                                    "configuracion.web_contenido");

        await Migrar("ALTER TABLE programas ADD COLUMN IF NOT EXISTS rep_autorizado         BOOLEAN     NOT NULL DEFAULT false", "programas.rep_autorizado");
        await Migrar("ALTER TABLE programas ADD COLUMN IF NOT EXISTS rep_autorizacion_fecha TIMESTAMPTZ",                       "programas.rep_autorizacion_fecha");
        await Migrar("ALTER TABLE programas ADD COLUMN IF NOT EXISTS rep_firma              TEXT",                               "programas.rep_firma");
        await Migrar("ALTER TABLE programas ADD COLUMN IF NOT EXISTS rep_nombre             VARCHAR(200)",                      "programas.rep_nombre");
        await Migrar("ALTER TABLE programas ADD COLUMN IF NOT EXISTS rep_documento          VARCHAR(50)",                       "programas.rep_documento");
        await Migrar("ALTER TABLE programas ADD COLUMN IF NOT EXISTS rep_cargo              VARCHAR(100)",                      "programas.rep_cargo");

        await Migrar("""
            CREATE TABLE IF NOT EXISTS programas_campos (
                id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
                programa_id        UUID         NOT NULL,
                etiqueta           VARCHAR(100) NOT NULL,
                tipo               VARCHAR(30)  NOT NULL DEFAULT 'text',
                obligatorio        BOOLEAN      NOT NULL DEFAULT false,
                opciones_json      TEXT,
                orden              INT          NOT NULL DEFAULT 0,
                activo             BOOLEAN      NOT NULL DEFAULT true,
                fecha_creacion     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                fecha_modificacion TIMESTAMPTZ  NOT NULL DEFAULT NOW()
            )
            """, "programas_campos");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_programas_campos_programa ON programas_campos(programa_id)", "programas_campos.idx_programa");
        await Migrar("ALTER TABLE programas_campos ADD COLUMN IF NOT EXISTS seccion  VARCHAR(100)",       "programas_campos.seccion");
        await Migrar("ALTER TABLE programas_campos ADD COLUMN IF NOT EXISTS columnas INT NOT NULL DEFAULT 6", "programas_campos.columnas");
        await Migrar("""
            DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_name='programas_campos' AND column_name='opciones') THEN
                    ALTER TABLE programas_campos RENAME COLUMN opciones TO opciones_json;
                END IF;
            END $$
            """, "programas_campos.rename_opciones");

        // ── Módulo Talento Humano ─────────────────────────────────────────────
        await Migrar("""
            CREATE TABLE IF NOT EXISTS empleados (
                id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
                nombres             VARCHAR(200) NOT NULL,
                apellidos           VARCHAR(200) NOT NULL,
                tipo_documento      VARCHAR(20),
                numero_documento    VARCHAR(50),
                email               VARCHAR(200),
                telefono            VARCHAR(30),
                celular             VARCHAR(30),
                cargo               VARCHAR(100),
                area                VARCHAR(100),
                sede_id             UUID,
                tipo_contrato       VARCHAR(50),
                fecha_ingreso       DATE,
                fecha_fin_contrato  DATE,
                salario             NUMERIC(14,2),
                eps                 VARCHAR(100),
                pension             VARCHAR(100),
                activo              BOOLEAN      NOT NULL DEFAULT true,
                foto_url            TEXT,
                notas               TEXT,
                fecha_creacion      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                fecha_modificacion  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
            )
            """, "empleados");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_empleados_sede  ON empleados(sede_id)",  "empleados.idx_sede");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_empleados_activo ON empleados(activo)", "empleados.idx_activo");

        await Migrar("ALTER TABLE empleados ADD COLUMN IF NOT EXISTS nombres            VARCHAR(200) NOT NULL DEFAULT ''",              "empleados.nombres");
        await Migrar("ALTER TABLE empleados ADD COLUMN IF NOT EXISTS apellidos          VARCHAR(200) NOT NULL DEFAULT ''",              "empleados.apellidos");
        await Migrar("ALTER TABLE empleados ADD COLUMN IF NOT EXISTS tipo_documento     VARCHAR(20)",                                   "empleados.tipo_documento");
        await Migrar("ALTER TABLE empleados ADD COLUMN IF NOT EXISTS numero_documento   VARCHAR(50)",                                   "empleados.numero_documento");
        await Migrar("ALTER TABLE empleados ADD COLUMN IF NOT EXISTS email              VARCHAR(200)",                                  "empleados.email");
        await Migrar("ALTER TABLE empleados ADD COLUMN IF NOT EXISTS telefono           VARCHAR(30)",                                   "empleados.telefono");
        await Migrar("ALTER TABLE empleados ADD COLUMN IF NOT EXISTS celular            VARCHAR(30)",                                   "empleados.celular");
        await Migrar("ALTER TABLE empleados ADD COLUMN IF NOT EXISTS cargo              VARCHAR(100)",                                  "empleados.cargo");
        await Migrar("ALTER TABLE empleados ADD COLUMN IF NOT EXISTS area               VARCHAR(100)",                                  "empleados.area");
        await Migrar("ALTER TABLE empleados ADD COLUMN IF NOT EXISTS sede_id            UUID",                                          "empleados.sede_id");
        await Migrar("ALTER TABLE empleados ADD COLUMN IF NOT EXISTS tipo_contrato      VARCHAR(50)",                                   "empleados.tipo_contrato");
        await Migrar("ALTER TABLE empleados ADD COLUMN IF NOT EXISTS fecha_ingreso      DATE",                                          "empleados.fecha_ingreso");
        await Migrar("ALTER TABLE empleados ADD COLUMN IF NOT EXISTS fecha_fin_contrato DATE",                                          "empleados.fecha_fin_contrato");
        await Migrar("ALTER TABLE empleados ADD COLUMN IF NOT EXISTS salario            NUMERIC(14,2)",                                 "empleados.salario");
        await Migrar("ALTER TABLE empleados ADD COLUMN IF NOT EXISTS eps                VARCHAR(100)",                                  "empleados.eps");
        await Migrar("ALTER TABLE empleados ADD COLUMN IF NOT EXISTS pension            VARCHAR(100)",                                  "empleados.pension");
        await Migrar("ALTER TABLE empleados ADD COLUMN IF NOT EXISTS foto_url           TEXT",                                          "empleados.foto_url");
        await Migrar("ALTER TABLE empleados ADD COLUMN IF NOT EXISTS notas              TEXT",                                          "empleados.notas");
        await Migrar("ALTER TABLE empleados ADD COLUMN IF NOT EXISTS fecha_modificacion TIMESTAMPTZ NOT NULL DEFAULT NOW()",            "empleados.fecha_modificacion");
        await Migrar("ALTER TABLE empleados DROP COLUMN IF EXISTS nombre",                                                              "empleados.drop_nombre_singular");

        await Migrar("""
            CREATE TABLE IF NOT EXISTS novedades_empleado (
                id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                empleado_id  UUID        NOT NULL,
                tipo         VARCHAR(50) NOT NULL,
                fecha_inicio DATE        NOT NULL,
                fecha_fin    DATE,
                dias         INT,
                descripcion  TEXT,
                estado       VARCHAR(30) NOT NULL DEFAULT 'pendiente',
                fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """, "novedades_empleado");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_novedades_empleado ON novedades_empleado(empleado_id)", "novedades_empleado.idx_empleado");

        // ── Módulo Contabilidad ───────────────────────────────────────────────
        await Migrar("""
            CREATE TABLE IF NOT EXISTS cat_contable (
                id          SERIAL       PRIMARY KEY,
                tipo        VARCHAR(20)  NOT NULL,
                codigo_puc  VARCHAR(20)  NOT NULL UNIQUE,
                nombre      VARCHAR(100) NOT NULL,
                descripcion TEXT,
                icono       VARCHAR(50)
            )
            """, "cat_contable");

        await Migrar("""
            INSERT INTO cat_contable (tipo, codigo_puc, nombre, descripcion) VALUES
                ('ingreso', '4110', 'Cuotas y aportes',           'Cuotas de socios o aportes de asociados'),
                ('ingreso', '4120', 'Donaciones en dinero',        'Auxilios y donaciones en dinero recibidos'),
                ('ingreso', '4130', 'Donaciones en especie',       'Auxilios y donaciones en especie valorizadas'),
                ('ingreso', '4140', 'Convenios y contratos',       'Ingresos por convenios y contratos de cooperación'),
                ('ingreso', '4215', 'Ingresos por actividades',    'Ingresos de actividades propias de la entidad'),
                ('ingreso', '4810', 'Rendimientos financieros',    'Intereses y rendimientos de inversiones'),
                ('ingreso', '4295', 'Otros ingresos',              'Ingresos ordinarios no clasificados'),
                ('egreso',  '5105', 'Honorarios y consultorías',   'Pagos a profesionales independientes'),
                ('egreso',  '5110', 'Arrendamientos',              'Alquiler de instalaciones y equipos'),
                ('egreso',  '5120', 'Seguros',                     'Pólizas de seguros'),
                ('egreso',  '5130', 'Servicios públicos',          'Agua, energía, internet, teléfono'),
                ('egreso',  '5145', 'Mantenimiento',               'Mantenimiento de instalaciones y equipos'),
                ('egreso',  '5155', 'Transporte y viáticos',       'Gastos de desplazamiento y viáticos'),
                ('egreso',  '5205', 'Gastos de personal',          'Salarios, prestaciones y seguridad social'),
                ('egreso',  '5270', 'Materiales y suministros',    'Útiles, papelería y materiales'),
                ('egreso',  '5290', 'Gastos en beneficiarios',     'Gastos directos en atención de beneficiarios'),
                ('egreso',  '5330', 'Impuestos y tasas',           'Impuestos locales y tasas'),
                ('egreso',  '5195', 'Otros gastos',                'Gastos no clasificados en otras categorías')
            ON CONFLICT (codigo_puc) DO NOTHING
            """, "cat_contable.seed");

        await Migrar("""
            CREATE TABLE IF NOT EXISTS cuentas_caja (
                id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
                nombre         VARCHAR(100)   NOT NULL,
                tipo           VARCHAR(20)    NOT NULL DEFAULT 'caja',
                banco          VARCHAR(100),
                numero_cuenta  VARCHAR(50),
                saldo_inicial  NUMERIC(14,2)  NOT NULL DEFAULT 0,
                saldo_actual   NUMERIC(14,2)  NOT NULL DEFAULT 0,
                activo         BOOLEAN        NOT NULL DEFAULT true,
                fecha_creacion TIMESTAMPTZ    NOT NULL DEFAULT NOW()
            )
            """, "cuentas_caja");

        await Migrar("""
            CREATE TABLE IF NOT EXISTS movimientos_contables (
                id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
                tipo               VARCHAR(20)   NOT NULL,
                fecha              DATE          NOT NULL,
                concepto           VARCHAR(200)  NOT NULL,
                monto              NUMERIC(14,2) NOT NULL,
                cuenta_id          UUID          NOT NULL,
                categoria_id       INT           NOT NULL,
                programa_id        UUID,
                tercero_nombre     VARCHAR(200),
                tercero_documento  VARCHAR(50),
                numero_soporte     VARCHAR(100),
                descripcion        TEXT,
                fecha_creacion     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
            )
            """, "movimientos_contables");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_mov_cont_fecha    ON movimientos_contables(fecha)",        "movimientos_contables.idx_fecha");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_mov_cont_cuenta   ON movimientos_contables(cuenta_id)",    "movimientos_contables.idx_cuenta");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_mov_cont_programa ON movimientos_contables(programa_id)",  "movimientos_contables.idx_programa");

        await Migrar("""
            CREATE TABLE IF NOT EXISTS presupuesto_contable (
                id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
                anio                INT           NOT NULL,
                programa_id         UUID,
                categoria_id        INT           NOT NULL,
                monto_presupuestado NUMERIC(14,2) NOT NULL,
                fecha_creacion      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
            )
            """, "presupuesto_contable");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_presupuesto_anio ON presupuesto_contable(anio)", "presupuesto_contable.idx_anio");

        await Migrar("""
            CREATE TABLE IF NOT EXISTS arqueos_caja (
                id            SERIAL        PRIMARY KEY,
                cuenta_id     UUID          NOT NULL,
                fecha         DATE          NOT NULL,
                saldo_sistema NUMERIC(14,2) NOT NULL,
                saldo_fisico  NUMERIC(14,2) NOT NULL,
                observacion   TEXT,
                responsable   VARCHAR(200),
                creado_en     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
            )
            """, "arqueos_caja");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_arqueos_cuenta ON arqueos_caja(cuenta_id, fecha)", "arqueos_caja.idx_cuenta");

        await Migrar("""
            INSERT INTO cat_contable (tipo, codigo_puc, nombre, descripcion) VALUES
                ('ingreso', 'TR-01', 'Reposición / Traslado entrada', 'Transferencia entrante entre cuentas propias'),
                ('egreso',  'TR-02', 'Reposición / Traslado salida',  'Transferencia saliente entre cuentas propias')
            ON CONFLICT (codigo_puc) DO NOTHING
            """, "cat_contable.traslados");

        // ── Módulo Roles y Permisos ───────────────────────────────────────────
        await Migrar("ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check", "usuarios.drop_rol_check");
        await Migrar("""
            CREATE TABLE IF NOT EXISTS usuarios (
                id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
                email              VARCHAR(200) NOT NULL UNIQUE,
                nombre             VARCHAR(200),
                avatar_url         TEXT,
                rol                VARCHAR(50)  NOT NULL DEFAULT 'trabajador_social',
                activo             BOOLEAN      NOT NULL DEFAULT true,
                fecha_creacion     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                fecha_modificacion TIMESTAMPTZ  NOT NULL DEFAULT NOW()
            )
            """, "usuarios");

        await Migrar("""
            CREATE TABLE IF NOT EXISTS roles_permisos (
                rol       VARCHAR(50) NOT NULL,
                modulo    VARCHAR(50) NOT NULL,
                accion    VARCHAR(20) NOT NULL,
                permitido BOOLEAN     NOT NULL DEFAULT false,
                PRIMARY KEY (rol, modulo, accion)
            )
            """, "roles_permisos");

        await Migrar("""
            INSERT INTO roles_permisos (rol, modulo, accion, permitido) VALUES
              ('representante_legal','dashboard','ver',true),
              ('representante_legal','beneficiarios','ver',true),('representante_legal','beneficiarios','exportar',true),
              ('representante_legal','donantes','ver',true),
              ('representante_legal','donaciones','ver',true),('representante_legal','donaciones','autorizar',true),
              ('representante_legal','programas','ver',true),('representante_legal','programas','autorizar',true),
              ('representante_legal','inscripciones','ver',true),
              ('representante_legal','sedes','ver',true),
              ('representante_legal','actividades','ver',true),
              ('representante_legal','voluntarios','ver',true),
              ('representante_legal','talento_humano','ver',true),
              ('representante_legal','contabilidad','ver',true),
              ('representante_legal','inventario','ver',true),
              ('representante_legal','reportes','ver',true),('representante_legal','reportes','exportar',true),
              ('representante_legal','documentos','ver',true),('representante_legal','documentos','crear',true),
              ('representante_legal','documentos','editar',true),('representante_legal','documentos','eliminar',true),
              ('sistemas','dashboard','ver',true),
              ('sistemas','sedes','ver',true),('sistemas','sedes','crear',true),('sistemas','sedes','editar',true),('sistemas','sedes','eliminar',true),
              ('sistemas','reportes','ver',true),
              ('sistemas','documentos','ver',true),
              ('sistemas','log_descargas','ver',true),
              ('sistemas','seguridad','ver',true),('sistemas','seguridad','crear',true),('sistemas','seguridad','editar',true),('sistemas','seguridad','eliminar',true),
              ('sistemas','configuracion','ver',true),('sistemas','configuracion','editar',true),
              ('coordinador_programas','dashboard','ver',true),
              ('coordinador_programas','beneficiarios','ver',true),('coordinador_programas','beneficiarios','crear',true),
              ('coordinador_programas','beneficiarios','editar',true),('coordinador_programas','beneficiarios','exportar',true),
              ('coordinador_programas','programas','ver',true),('coordinador_programas','programas','crear',true),('coordinador_programas','programas','editar',true),
              ('coordinador_programas','inscripciones','ver',true),('coordinador_programas','inscripciones','crear',true),
              ('coordinador_programas','inscripciones','editar',true),('coordinador_programas','inscripciones','eliminar',true),
              ('coordinador_programas','sedes','ver',true),
              ('coordinador_programas','actividades','ver',true),('coordinador_programas','actividades','crear',true),
              ('coordinador_programas','actividades','editar',true),('coordinador_programas','actividades','eliminar',true),
              ('coordinador_programas','inventario','ver',true),('coordinador_programas','inventario','crear',true),('coordinador_programas','inventario','editar',true),
              ('coordinador_programas','reportes','ver',true),('coordinador_programas','reportes','exportar',true),
              ('coordinador_programas','documentos','ver',true),('coordinador_programas','documentos','crear',true),
              ('trabajador_social','dashboard','ver',true),
              ('trabajador_social','beneficiarios','ver',true),('trabajador_social','beneficiarios','crear',true),('trabajador_social','beneficiarios','editar',true),
              ('trabajador_social','programas','ver',true),
              ('trabajador_social','inscripciones','ver',true),('trabajador_social','inscripciones','crear',true),('trabajador_social','inscripciones','editar',true),
              ('trabajador_social','sedes','ver',true),
              ('trabajador_social','actividades','ver',true),('trabajador_social','actividades','crear',true),('trabajador_social','actividades','editar',true),
              ('trabajador_social','inventario','ver',true),
              ('trabajador_social','reportes','ver',true),
              ('trabajador_social','documentos','ver',true),
              ('tesorero','dashboard','ver',true),
              ('tesorero','donantes','ver',true),('tesorero','donantes','crear',true),('tesorero','donantes','editar',true),('tesorero','donantes','eliminar',true),
              ('tesorero','donaciones','ver',true),('tesorero','donaciones','crear',true),('tesorero','donaciones','editar',true),
              ('tesorero','donaciones','eliminar',true),('tesorero','donaciones','exportar',true),
              ('tesorero','contabilidad','ver',true),('tesorero','contabilidad','crear',true),('tesorero','contabilidad','editar',true),
              ('tesorero','inventario','ver',true),
              ('tesorero','reportes','ver',true),('tesorero','reportes','exportar',true),
              ('tesorero','documentos','ver',true),
              ('contador','dashboard','ver',true),
              ('contador','donantes','ver',true),
              ('contador','donaciones','ver',true),('contador','donaciones','exportar',true),
              ('contador','contabilidad','ver',true),('contador','contabilidad','crear',true),('contador','contabilidad','editar',true),('contador','contabilidad','exportar',true),
              ('contador','inventario','ver',true),
              ('contador','reportes','ver',true),('contador','reportes','exportar',true),
              ('contador','documentos','ver',true),
              ('secretario','dashboard','ver',true),
              ('secretario','beneficiarios','ver',true),
              ('secretario','programas','ver',true),
              ('secretario','inscripciones','ver',true),
              ('secretario','sedes','ver',true),
              ('secretario','actividades','ver',true),('secretario','actividades','crear',true),('secretario','actividades','editar',true),
              ('secretario','voluntarios','ver',true),
              ('secretario','talento_humano','ver',true),
              ('secretario','reportes','ver',true),
              ('secretario','documentos','ver',true),('secretario','documentos','crear',true),('secretario','documentos','editar',true),
              ('talento_humano','dashboard','ver',true),
              ('talento_humano','voluntarios','ver',true),('talento_humano','voluntarios','crear',true),('talento_humano','voluntarios','editar',true),
              ('talento_humano','voluntarios','eliminar',true),('talento_humano','voluntarios','exportar',true),
              ('talento_humano','talento_humano','ver',true),('talento_humano','talento_humano','crear',true),
              ('talento_humano','talento_humano','editar',true),('talento_humano','talento_humano','eliminar',true),
              ('talento_humano','sedes','ver',true),
              ('talento_humano','reportes','ver',true),
              ('talento_humano','documentos','ver',true),
              ('auditor','dashboard','ver',true),
              ('auditor','beneficiarios','ver',true),
              ('auditor','donantes','ver',true),
              ('auditor','donaciones','ver',true),
              ('auditor','programas','ver',true),
              ('auditor','inscripciones','ver',true),
              ('auditor','sedes','ver',true),
              ('auditor','actividades','ver',true),
              ('auditor','voluntarios','ver',true),
              ('auditor','talento_humano','ver',true),
              ('auditor','contabilidad','ver',true),
              ('auditor','inventario','ver',true),
              ('auditor','reportes','ver',true),('auditor','reportes','exportar',true),
              ('auditor','documentos','ver',true),
              ('auditor','log_descargas','ver',true)
            ON CONFLICT (rol, modulo, accion) DO NOTHING
            """, "roles_permisos.seed");

        await Migrar("DELETE FROM roles_permisos WHERE modulo = 'equipo' AND rol <> 'administrador'", "roles_permisos.equipo_solo_admin");

        // ── Módulo Actividades ────────────────────────────────────────────────
        await Migrar("""
            CREATE TABLE IF NOT EXISTS actividades (
                id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
                titulo       VARCHAR(200) NOT NULL,
                descripcion  TEXT,
                programa_id  UUID         REFERENCES programas(id) ON DELETE SET NULL,
                fecha_inicio TIMESTAMPTZ  NOT NULL,
                fecha_fin    TIMESTAMPTZ,
                lugar        VARCHAR(200),
                estado       VARCHAR(20)  NOT NULL DEFAULT 'programada',
                created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
            )
            """, "actividades");

        await Migrar("""
            CREATE TABLE IF NOT EXISTS actividad_asistencia (
                actividad_id    UUID    NOT NULL REFERENCES actividades(id) ON DELETE CASCADE,
                beneficiario_id UUID    NOT NULL REFERENCES beneficiarios(id) ON DELETE CASCADE,
                asistio         BOOLEAN NOT NULL DEFAULT false,
                PRIMARY KEY (actividad_id, beneficiario_id)
            )
            """, "actividad_asistencia");

        await Migrar("""
            CREATE TABLE IF NOT EXISTS organigrama_personas (
                id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
                cargo          VARCHAR(200) NOT NULL,
                orden          INT          NOT NULL DEFAULT 0,
                empleado_id    UUID         REFERENCES empleados(id) ON DELETE SET NULL,
                nombre_externo VARCHAR(200),
                foto_url       TEXT,
                parent_id      UUID         REFERENCES organigrama_personas(id) ON DELETE SET NULL,
                activo         BOOLEAN      NOT NULL DEFAULT TRUE,
                created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
            )
            """, "organigrama_personas");

        await Migrar("ALTER TABLE organigrama_personas ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES organigrama_personas(id) ON DELETE SET NULL", "organigrama_personas.parent_id");
        await Migrar("ALTER TABLE organigrama_personas ALTER COLUMN cargo TYPE VARCHAR(200)",                                                            "organigrama_personas.cargo_200");

        // ── D1: Foreign key constraints ───────────────────────────────────────
        await MigrarUnaVez("""
            ALTER TABLE inventario_movimientos
              ADD CONSTRAINT fk_invmov_item
              FOREIGN KEY (item_id) REFERENCES inventario_items(id) ON DELETE CASCADE NOT VALID
            """, "fk.invmov_item");

        await MigrarUnaVez("""
            ALTER TABLE inventario_movimientos
              ADD CONSTRAINT fk_invmov_tipo
              FOREIGN KEY (tipo_movimiento_id) REFERENCES cat_tipo_movimiento_inv(id) ON DELETE RESTRICT NOT VALID
            """, "fk.invmov_tipo");

        await MigrarUnaVez("""
            ALTER TABLE donaciones
              ADD CONSTRAINT fk_donaciones_donante
              FOREIGN KEY (donante_id) REFERENCES donantes(id) ON DELETE RESTRICT NOT VALID
            """, "fk.donaciones_donante");

        await MigrarUnaVez("""
            ALTER TABLE inventario_items
              ADD CONSTRAINT fk_invitems_sede
              FOREIGN KEY (sede_id) REFERENCES sedes(id) ON DELETE SET NULL NOT VALID
            """, "fk.invitems_sede");

        // ── D2: inscripciones.datos TEXT → JSONB ─────────────────────────────
        await MigrarUnaVez("""
            ALTER TABLE inscripciones
              ALTER COLUMN datos TYPE JSONB USING datos::jsonb
            """, "inscripciones.datos_jsonb");

        await Migrar("""
            CREATE INDEX IF NOT EXISTS idx_inscripciones_datos_gin
              ON inscripciones USING GIN (datos jsonb_path_ops)
            """, "inscripciones.idx_datos_gin");

        // ── A2: Índices de rendimiento ────────────────────────────────────────
        await Migrar("CREATE INDEX IF NOT EXISTS idx_beneficiarios_activo          ON beneficiarios(activo)",                            "idx.beneficiarios_activo");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_beneficiarios_activo_fecha    ON beneficiarios(activo, fecha_creacion)",            "idx.beneficiarios_activo_fecha");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_beneficiarios_num_doc         ON beneficiarios(numero_documento)",                  "idx.beneficiarios_num_doc");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_ben_talla_ben_activo          ON beneficiario_talla(beneficiario_id, activo)",      "idx.ben_talla_ben_activo");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_archivos_entidad              ON archivos(entidad_tipo, entidad_id, activo)",       "idx.archivos_entidad");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_inscripciones_activo_estado   ON inscripciones(activo, estado)",                   "idx.inscripciones_activo_estado");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_organigrama_activo            ON organigrama_personas(activo, orden)",              "idx.organigrama_activo");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_voluntarios_activo            ON voluntarios(activo)",                              "idx.voluntarios_activo");
    }
}
