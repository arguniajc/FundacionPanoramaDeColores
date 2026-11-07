using Microsoft.Extensions.Logging;
using Npgsql;

namespace FundacionPanorama.API.Data;

public static class DbMigrations
{
    public static async Task RunAsync(string connStr, ILogger logger)
    {
        // Cada migración abre su propia conexión: si la credencial es inválida,
        // decenas de intentos fallidos activan el circuit breaker del pooler de
        // Supabase y bloquean todas las conexiones. Se verifica una sola vez antes.
        try
        {
            await using var prueba = new NpgsqlConnection(connStr);
            await prueba.OpenAsync();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "❌ Migraciones canceladas: no se pudo conectar a la BD ({M})", ex.Message);
            return;
        }

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

        // Esquema base para BD vacía (no-op si las tablas ya existen)
        await CrearEsquemaBaseAsync(Migrar);

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
        await Migrar("ALTER TABLE programas ADD COLUMN IF NOT EXISTS tercero_rep_nombre    VARCHAR(200)", "programas.tercero_rep_nombre");
        await Migrar("ALTER TABLE programas ADD COLUMN IF NOT EXISTS tercero_rep_tipo_doc  VARCHAR(20)",  "programas.tercero_rep_tipo_doc");
        await Migrar("ALTER TABLE programas ADD COLUMN IF NOT EXISTS tercero_rep_documento VARCHAR(50)",  "programas.tercero_rep_documento");
        await Migrar("ALTER TABLE programas ADD COLUMN IF NOT EXISTS tercero_rep_cargo     VARCHAR(100)", "programas.tercero_rep_cargo");
        await Migrar("ALTER TABLE programas ADD COLUMN IF NOT EXISTS tercero_rep_firma     TEXT",         "programas.tercero_rep_firma");

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

        await Migrar("ALTER TABLE donantes ADD COLUMN IF NOT EXISTS tipo           VARCHAR(20)  NOT NULL DEFAULT 'persona'", "donantes.tipo");
        await Migrar("ALTER TABLE donantes ADD COLUMN IF NOT EXISTS documento      VARCHAR(50)",                             "donantes.documento");
        await Migrar("ALTER TABLE donantes ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(30)",                             "donantes.tipo_documento");
        await Migrar("ALTER TABLE donantes ADD COLUMN IF NOT EXISTS ciudad         VARCHAR(100)",                           "donantes.ciudad");
        await Migrar("ALTER TABLE donantes ADD COLUMN IF NOT EXISTS pais           VARCHAR(100)",                           "donantes.pais");
        await Migrar("ALTER TABLE donantes ADD COLUMN IF NOT EXISTS departamento   VARCHAR(100)",                           "donantes.departamento");
        await Migrar("ALTER TABLE donantes ADD COLUMN IF NOT EXISTS notas          TEXT",                                   "donantes.notas");

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

        // La versión base (esquema 01) de voluntarios no traía estas columnas.
        await Migrar("ALTER TABLE voluntarios ADD COLUMN IF NOT EXISTS tipo_documento   VARCHAR(20)",  "voluntarios.tipo_documento");
        await Migrar("ALTER TABLE voluntarios ADD COLUMN IF NOT EXISTS documento        VARCHAR(50)",  "voluntarios.documento");
        await Migrar("ALTER TABLE voluntarios ADD COLUMN IF NOT EXISTS ciudad           VARCHAR(100)", "voluntarios.ciudad");
        await Migrar("ALTER TABLE voluntarios ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE",         "voluntarios.fecha_nacimiento");
        await Migrar("ALTER TABLE voluntarios ADD COLUMN IF NOT EXISTS fecha_inicio     DATE",         "voluntarios.fecha_inicio");
        await Migrar("ALTER TABLE voluntarios ADD COLUMN IF NOT EXISTS notas            TEXT",         "voluntarios.notas");

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
        await Migrar("ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS color_secundario    VARCHAR(7)   NOT NULL DEFAULT '#2D984F'", "configuracion.color_secundario");
        await Migrar("ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS color_gradiente     VARCHAR(7)   NOT NULL DEFAULT '#3a1470'", "configuracion.color_gradiente");
        await Migrar("ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS color_oscuro_fondo  VARCHAR(7)   NOT NULL DEFAULT '#0f0f0f'", "configuracion.color_oscuro_fondo");
        await Migrar("ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS color_oscuro_paper  VARCHAR(7)   NOT NULL DEFAULT '#1c1c1c'", "configuracion.color_oscuro_paper");
        await Migrar("ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS color_oscuro_sidebar VARCHAR(7)  NOT NULL DEFAULT '#0d1117'", "configuracion.color_oscuro_sidebar");
        await Migrar("ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS color_acento        VARCHAR(7)   NOT NULL DEFAULT '#FAA112'", "configuracion.color_acento");
        await Migrar("ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS font_family         VARCHAR(100) NOT NULL DEFAULT 'Inter'",   "configuracion.font_family");
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
            CREATE TABLE IF NOT EXISTS programa_horarios (
                id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                programa_id UUID        NOT NULL REFERENCES programas(id) ON DELETE CASCADE,
                dia_semana  SMALLINT    NOT NULL,
                hora_inicio TIME        NOT NULL,
                hora_fin    TIME        NOT NULL,
                lugar       VARCHAR(200),
                activo      BOOLEAN     NOT NULL DEFAULT true,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """, "programa_horarios");

        await Migrar("ALTER TABLE programa_horarios ADD COLUMN IF NOT EXISTS fecha_inicio_vigencia DATE", "programa_horarios.fecha_inicio_vigencia");
        await Migrar("ALTER TABLE programa_horarios ADD COLUMN IF NOT EXISTS fecha_fin_vigencia    DATE", "programa_horarios.fecha_fin_vigencia");

        // ── Comodato en inventario ─────────────────────────────────────────────
        await Migrar("ALTER TABLE inventario_items ADD COLUMN IF NOT EXISTS tipo_tenencia         VARCHAR(20)  NOT NULL DEFAULT 'propio'", "inventario_items.tipo_tenencia");
        await Migrar("ALTER TABLE inventario_items ADD COLUMN IF NOT EXISTS comodante             VARCHAR(200)",                           "inventario_items.comodante");
        await Migrar("ALTER TABLE inventario_items ADD COLUMN IF NOT EXISTS comodato_contrato     VARCHAR(100)",                           "inventario_items.comodato_contrato");
        await Migrar("ALTER TABLE inventario_items ADD COLUMN IF NOT EXISTS comodato_fecha_inicio DATE",                                    "inventario_items.comodato_fecha_inicio");
        await Migrar("ALTER TABLE inventario_items ADD COLUMN IF NOT EXISTS comodato_fecha_fin    DATE",                                    "inventario_items.comodato_fecha_fin");

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

        // Solo crear el índice GIN si datos ya fue convertido a JSONB
        await Migrar("""
            DO $$ BEGIN
                IF (SELECT data_type FROM information_schema.columns
                    WHERE table_name = 'inscripciones' AND column_name = 'datos') = 'jsonb' THEN
                    IF NOT EXISTS (SELECT 1 FROM pg_indexes
                                   WHERE tablename = 'inscripciones'
                                     AND indexname = 'idx_inscripciones_datos_gin') THEN
                        EXECUTE 'CREATE INDEX idx_inscripciones_datos_gin ON inscripciones USING GIN (datos jsonb_path_ops)';
                    END IF;
                END IF;
            END $$
            """, "inscripciones.idx_datos_gin");

        // ── Tablas base de beneficiarios (esquema original) ──────────────────
        await Migrar("""
            CREATE TABLE IF NOT EXISTS beneficiarios (
                id                        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
                nombre                    VARCHAR(200) NOT NULL,
                fecha_nacimiento          DATE,
                tipo_documento_id         SMALLINT,
                numero_documento          VARCHAR(50),
                pais_nacimiento           VARCHAR(100),
                departamento_nacimiento   VARCHAR(100),
                ciudad_nacimiento         VARCHAR(100),
                barrio                    VARCHAR(100),
                num_personas_vive         INT,
                num_hermanos              INT,
                nombre_colegio            VARCHAR(200),
                grado_escolar             VARCHAR(50),
                tiene_discapacidad        BOOLEAN      NOT NULL DEFAULT false,
                descripcion_discapacidad  TEXT,
                vive_con_nino             BOOLEAN,
                genero                    VARCHAR(20),
                autorizacion              BOOLEAN      NOT NULL DEFAULT false,
                motivo_baja               VARCHAR(500),
                activo                    BOOLEAN      NOT NULL DEFAULT true,
                fecha_creacion            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
            )
            """, "beneficiarios.create");

        await Migrar("""
            CREATE TABLE IF NOT EXISTS cat_eps (
                id     SMALLSERIAL  PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL UNIQUE,
                activo BOOLEAN      NOT NULL DEFAULT true
            )
            """, "cat_eps");

        await Migrar("""
            CREATE TABLE IF NOT EXISTS cat_parentescos (
                id     SMALLSERIAL  PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL UNIQUE,
                activo BOOLEAN      NOT NULL DEFAULT true
            )
            """, "cat_parentescos");

        // Eliminar duplicados lowercase antes de crear el índice único
        await Migrar("""
            DO $$ BEGIN
                -- Reasignar referencias de acudiente al registro canónico (menor id)
                UPDATE beneficiario_acudiente ba
                SET parentesco_id = canon.keep_id::smallint
                FROM (
                    SELECT c.id AS old_id, dups.keep_id
                    FROM cat_parentescos c
                    INNER JOIN (
                        SELECT LOWER(nombre) AS low, MIN(id) AS keep_id
                        FROM cat_parentescos
                        GROUP BY LOWER(nombre)
                        HAVING COUNT(*) > 1
                    ) dups ON LOWER(c.nombre) = dups.low AND c.id <> dups.keep_id
                ) canon
                WHERE ba.parentesco_id = canon.old_id::smallint;

                -- Eliminar los duplicados lowercase
                DELETE FROM cat_parentescos a
                USING (
                    SELECT LOWER(nombre) AS low, MIN(id) AS keep_id
                    FROM cat_parentescos
                    GROUP BY LOWER(nombre)
                    HAVING COUNT(*) > 1
                ) dups
                WHERE LOWER(a.nombre) = dups.low AND a.id <> dups.keep_id;
            END $$
            """, "cat_parentescos.dedup_lowercase");

        await Migrar("CREATE UNIQUE INDEX IF NOT EXISTS idx_cat_parentescos_nombre ON cat_parentescos(LOWER(nombre))", "cat_parentescos.unique_nombre");

        // Garantizar restricción UNIQUE en nombre (puede faltar si la tabla existía antes)
        await Migrar("""
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conrelid = 'cat_parentescos'::regclass
                      AND conname  = 'cat_parentescos_nombre_key'
                      AND contype  = 'u'
                ) THEN
                    ALTER TABLE cat_parentescos ADD CONSTRAINT cat_parentescos_nombre_key UNIQUE (nombre);
                END IF;
            END $$
            """, "cat_parentescos.ensure_unique");

        await Migrar("""
            INSERT INTO cat_parentescos (nombre) VALUES
                ('Madre'), ('Padre'), ('Abuela'), ('Abuelo'),
                ('Tía'), ('Tío'), ('Hermana'), ('Hermano'),
                ('Madrastra'), ('Padrastro'), ('Tutora'), ('Tutor'), ('Otro')
            ON CONFLICT (nombre) DO NOTHING
            """, "cat_parentescos.seed");

        await Migrar("""
            CREATE TABLE IF NOT EXISTS cat_tipo_archivo (
                id     SMALLSERIAL  PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL UNIQUE,
                activo BOOLEAN      NOT NULL DEFAULT true
            )
            """, "cat_tipo_archivo");

        await Migrar("""
            INSERT INTO cat_tipo_archivo (nombre) VALUES
                ('Foto del menor'),
                ('Foto documento'),
                ('Foto documento reverso')
            ON CONFLICT (nombre) DO NOTHING
            """, "cat_tipo_archivo.seed");

        await Migrar("""
            CREATE TABLE IF NOT EXISTS acudientes (
                id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
                nombre         VARCHAR(200) NOT NULL,
                whatsapp       VARCHAR(30),
                direccion      VARCHAR(300),
                activo         BOOLEAN      NOT NULL DEFAULT true,
                fecha_creacion TIMESTAMPTZ  NOT NULL DEFAULT NOW()
            )
            """, "acudientes");

        await Migrar("""
            CREATE TABLE IF NOT EXISTS beneficiario_acudiente (
                id              UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
                beneficiario_id UUID     NOT NULL,
                acudiente_id    UUID     NOT NULL,
                parentesco_id   SMALLINT,
                es_principal    BOOLEAN  NOT NULL DEFAULT false,
                activo          BOOLEAN  NOT NULL DEFAULT true
            )
            """, "beneficiario_acudiente");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_ben_acudiente_ben ON beneficiario_acudiente(beneficiario_id)", "beneficiario_acudiente.idx");

        await Migrar("""
            CREATE TABLE IF NOT EXISTS beneficiario_salud (
                id              UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
                beneficiario_id UUID     NOT NULL UNIQUE,
                eps_id          SMALLINT,
                observaciones   TEXT,
                activo          BOOLEAN  NOT NULL DEFAULT true
            )
            """, "beneficiario_salud");

        await Migrar("""
            CREATE TABLE IF NOT EXISTS alergias_catalogo (
                id     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
                nombre VARCHAR(200) NOT NULL,
                activo BOOLEAN      NOT NULL DEFAULT true
            )
            """, "alergias_catalogo");

        await Migrar("""
            CREATE TABLE IF NOT EXISTS beneficiario_alergia (
                id              UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
                beneficiario_id UUID  NOT NULL,
                alergia_id      UUID  NOT NULL,
                descripcion     TEXT,
                activo          BOOLEAN NOT NULL DEFAULT true
            )
            """, "beneficiario_alergia");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_ben_alergia_ben ON beneficiario_alergia(beneficiario_id)", "beneficiario_alergia.idx");

        await Migrar("""
            CREATE TABLE IF NOT EXISTS beneficiario_talla (
                id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
                beneficiario_id UUID         NOT NULL,
                talla_camisa    VARCHAR(10),
                talla_pantalon  VARCHAR(10),
                talla_zapatos   VARCHAR(10),
                peso_kg         DECIMAL(5,2),
                talla_cm        INT,
                fecha_medicion  DATE         NOT NULL DEFAULT CURRENT_DATE,
                activo          BOOLEAN      NOT NULL DEFAULT true,
                fecha_creacion  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
            )
            """, "beneficiario_talla.create");

        await Migrar("""
            CREATE TABLE IF NOT EXISTS archivos (
                id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
                entidad_tipo   VARCHAR(50)  NOT NULL,
                entidad_id     UUID         NOT NULL,
                tipo_archivo_id SMALLINT,
                url            TEXT         NOT NULL,
                activo         BOOLEAN      NOT NULL DEFAULT true,
                fecha_creacion TIMESTAMPTZ  NOT NULL DEFAULT NOW()
            )
            """, "archivos.create");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_archivos_entidad_base ON archivos(entidad_tipo, entidad_id)", "archivos.idx_entidad_base");

        // ── Catálogo tipos de documento ───────────────────────────────────────
        await Migrar("""
            CREATE TABLE IF NOT EXISTS cat_tipos_documento (
                id     SMALLSERIAL  PRIMARY KEY,
                codigo VARCHAR(10)  NOT NULL UNIQUE,
                nombre VARCHAR(100) NOT NULL,
                activo BOOLEAN      NOT NULL DEFAULT true
            )
            """, "cat_tipos_documento");

        await Migrar("""
            INSERT INTO cat_tipos_documento (codigo, nombre) VALUES
                ('CC',   'Cédula de ciudadanía'),
                ('TI',   'Tarjeta de identidad'),
                ('RC',   'Registro civil'),
                ('CE',   'Cédula de extranjería'),
                ('PAS',  'Pasaporte'),
                ('NIT',  'NIT'),
                ('NUIP', 'NUIP'),
                ('PPT',  'Permiso de protección temporal')
            ON CONFLICT (codigo) DO NOTHING
            """, "cat_tipos_documento.seed");

        await Migrar("ALTER TABLE beneficiarios ADD COLUMN IF NOT EXISTS tipo_documento_id SMALLINT REFERENCES cat_tipos_documento(id)", "beneficiarios.tipo_documento_id");

        // ── A2: Índices de rendimiento ────────────────────────────────────────
        await Migrar("CREATE INDEX IF NOT EXISTS idx_beneficiarios_activo          ON beneficiarios(activo)",                            "idx.beneficiarios_activo");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_beneficiarios_activo_fecha    ON beneficiarios(activo, fecha_creacion)",            "idx.beneficiarios_activo_fecha");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_beneficiarios_num_doc         ON beneficiarios(numero_documento)",                  "idx.beneficiarios_num_doc");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_ben_talla_ben_activo          ON beneficiario_talla(beneficiario_id, activo)",      "idx.ben_talla_ben_activo");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_archivos_entidad              ON archivos(entidad_tipo, entidad_id, activo)",       "idx.archivos_entidad");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_inscripciones_activo_estado   ON inscripciones(activo, estado)",                   "idx.inscripciones_activo_estado");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_organigrama_activo            ON organigrama_personas(activo, orden)",              "idx.organigrama_activo");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_voluntarios_activo            ON voluntarios(activo)",                              "idx.voluntarios_activo");
        await Migrar("ALTER TABLE voluntarios ADD COLUMN IF NOT EXISTS pais          VARCHAR(100)", "voluntarios.pais");
        await Migrar("ALTER TABLE voluntarios ADD COLUMN IF NOT EXISTS departamento  VARCHAR(100)", "voluntarios.departamento");

        await Migrar("ALTER TABLE inventario_movimientos ADD COLUMN IF NOT EXISTS donacion_id UUID", "inventario_movimientos.donacion_id");

        // ── Mejoras ESAL/RTE en movimientos_contables ─────────────────────────────
        await Migrar("ALTER TABLE movimientos_contables ADD COLUMN IF NOT EXISTS consecutivo          INTEGER",       "movimientos_contables.consecutivo");
        await Migrar("ALTER TABLE movimientos_contables ADD COLUMN IF NOT EXISTS tipo_soporte         VARCHAR(30)",   "movimientos_contables.tipo_soporte");
        await Migrar("ALTER TABLE movimientos_contables ADD COLUMN IF NOT EXISTS retencion_practicada NUMERIC(14,2)", "movimientos_contables.retencion_practicada");
        await Migrar("ALTER TABLE movimientos_contables ADD COLUMN IF NOT EXISTS tarifa_retencion     NUMERIC(5,2)",  "movimientos_contables.tarifa_retencion");
        await Migrar("ALTER TABLE movimientos_contables ADD COLUMN IF NOT EXISTS concepto_retencion   VARCHAR(100)",  "movimientos_contables.concepto_retencion");

        // ── Email / SMTP ──────────────────────────────────────────────────────
        await Migrar("ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS smtp_host      VARCHAR(200)",                       "configuracion.smtp_host");
        await Migrar("ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS smtp_puerto    INTEGER      DEFAULT 587",            "configuracion.smtp_puerto");
        await Migrar("ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS smtp_usuario   VARCHAR(200)",                       "configuracion.smtp_usuario");
        await Migrar("ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS smtp_clave     TEXT",                               "configuracion.smtp_clave");
        await Migrar("ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS smtp_de_nombre VARCHAR(200)",                       "configuracion.smtp_de_nombre");
        await Migrar("ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS smtp_de_email  VARCHAR(200)",                       "configuracion.smtp_de_email");
        await Migrar("ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS smtp_ssl       BOOLEAN      NOT NULL DEFAULT true",  "configuracion.smtp_ssl");

        // ── Estado del recibo y log de emisiones ──────────────────────────────
        await Migrar("ALTER TABLE donaciones ADD COLUMN IF NOT EXISTS recibo_estado VARCHAR(20) NOT NULL DEFAULT 'emitido'", "donaciones.recibo_estado");
        await Migrar("""
            CREATE TABLE IF NOT EXISTS recibos_log (
                id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                donacion_id         UUID        NOT NULL,
                accion              VARCHAR(20) NOT NULL,
                usuario_email       VARCHAR(200),
                destinatario_email  VARCHAR(200),
                fecha               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                detalle             TEXT
            )
            """, "recibos_log.create");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_recibos_log_donacion ON recibos_log(donacion_id)", "recibos_log.idx_donacion");

        // ── Historial de cambios (audit log) ──────────────────────────────────
        await Migrar("""
            CREATE TABLE IF NOT EXISTS audit_log (
                id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
                entidad_tipo   VARCHAR(50)  NOT NULL,
                entidad_id     UUID         NOT NULL,
                entidad_nombre VARCHAR(300),
                accion         VARCHAR(30)  NOT NULL,
                usuario_email  VARCHAR(200),
                detalle        TEXT,
                fecha          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
            )
            """, "audit_log.create");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_audit_log_entidad ON audit_log(entidad_tipo, entidad_id)", "audit_log.idx_entidad");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_audit_log_fecha   ON audit_log(fecha DESC)",               "audit_log.idx_fecha");

        // ── Anulación de movimientos contables ────────────────────────────────
        await Migrar("ALTER TABLE movimientos_contables ADD COLUMN IF NOT EXISTS anulado BOOLEAN NOT NULL DEFAULT false", "movimientos_contables.anulado");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_mov_cont_anulado ON movimientos_contables(anulado) WHERE anulado = true", "movimientos_contables.idx_anulado");

        // ── Beneficiarios: campo tipo (niño/adulto) ───────────────────────────
        await Migrar("ALTER TABLE beneficiarios ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'niño'", "beneficiarios.tipo");

        // ── Beneficiarios: split nombre → 4 campos separados ─────────────────
        await Migrar("ALTER TABLE beneficiarios ADD COLUMN IF NOT EXISTS primer_nombre    VARCHAR(80)", "beneficiarios.primer_nombre");
        await Migrar("ALTER TABLE beneficiarios ADD COLUMN IF NOT EXISTS segundo_nombre   VARCHAR(80)", "beneficiarios.segundo_nombre");
        await Migrar("ALTER TABLE beneficiarios ADD COLUMN IF NOT EXISTS primer_apellido  VARCHAR(80)", "beneficiarios.primer_apellido");
        await Migrar("ALTER TABLE beneficiarios ADD COLUMN IF NOT EXISTS segundo_apellido VARCHAR(80)", "beneficiarios.segundo_apellido");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_ben_nombres ON beneficiarios (primer_nombre, primer_apellido)", "beneficiarios.idx_nombres");
        await MigrarUnaVez("""
            WITH parts AS (
              SELECT id,
                string_to_array(regexp_replace(trim(nombre), '\s+', ' ', 'g'), ' ') AS ws
              FROM beneficiarios
              WHERE nombre IS NOT NULL AND nombre != ''
            )
            UPDATE beneficiarios b SET
              primer_nombre    = initcap(COALESCE(ws[1], '')),
              segundo_nombre   = CASE WHEN array_length(ws,1) >= 4 THEN initcap(ws[2]) ELSE NULL END,
              primer_apellido  = CASE
                WHEN array_length(ws,1) <= 1 THEN ''
                WHEN array_length(ws,1) <= 3 THEN initcap(ws[2])
                ELSE initcap(ws[3])
              END,
              segundo_apellido = CASE
                WHEN array_length(ws,1) = 3  THEN initcap(ws[3])
                WHEN array_length(ws,1) >= 4 THEN initcap(array_to_string(ws[4:array_length(ws,1)], ' '))
                ELSE NULL
              END
            FROM parts p WHERE b.id = p.id
            """, "beneficiarios.split_nombre_unico");
        await MigrarUnaVez("""
            UPDATE beneficiarios SET
              primer_nombre    = initcap(primer_nombre),
              segundo_nombre   = initcap(segundo_nombre),
              primer_apellido  = initcap(primer_apellido),
              segundo_apellido = initcap(segundo_apellido)
            WHERE primer_nombre IS NOT NULL
              AND (primer_nombre  ~ '[A-ZÁÉÍÓÚÑ]{2,}'
                OR primer_apellido ~ '[A-ZÁÉÍÓÚÑ]{2,}')
            """, "beneficiarios.capitalizar_nombres");

        // Eliminar columna legacy 'nombre' — reemplazada por primer_nombre/apellido
        await Migrar("ALTER TABLE beneficiarios DROP COLUMN IF EXISTS nombre", "beneficiarios.drop_nombre");

        // Un beneficiario solo puede tener una inscripción activa por programa
        await Migrar(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_inscripciones_unique_activa ON inscripciones(beneficiario_id, programa_id) WHERE activo = true",
            "inscripciones.unique_activa");

        // ── Actividades: días adicionales ─────────────────────────────────────
        await Migrar("""
            CREATE TABLE IF NOT EXISTS actividad_dias (
                id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                actividad_id UUID NOT NULL REFERENCES actividades(id) ON DELETE CASCADE,
                fecha        DATE NOT NULL,
                hora_inicio  TIME NOT NULL,
                hora_fin     TIME NOT NULL
            )
            """, "actividad_dias");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_actividad_dias_actividad ON actividad_dias(actividad_id)", "actividad_dias.idx_actividad");

        // ── Nómina ────────────────────────────────────────────────────────────
        await Migrar("""
            CREATE TABLE IF NOT EXISTS nomina_periodos (
                id          SERIAL PRIMARY KEY,
                mes         SMALLINT      NOT NULL CHECK (mes BETWEEN 1 AND 12),
                anio        SMALLINT      NOT NULL CHECK (anio >= 2020),
                fecha_pago  DATE,
                estado      VARCHAR(20)   NOT NULL DEFAULT 'borrador'
                                          CHECK (estado IN ('borrador', 'cerrado')),
                observacion TEXT,
                creado_en   TIMESTAMP     NOT NULL DEFAULT NOW(),
                UNIQUE (mes, anio)
            )
            """, "nomina_periodos");

        await Migrar("""
            CREATE TABLE IF NOT EXISTS nomina_liquidaciones (
                id                  SERIAL PRIMARY KEY,
                periodo_id          INTEGER       NOT NULL REFERENCES nomina_periodos(id) ON DELETE CASCADE,
                empleado_id         UUID          NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
                dias_trabajados     SMALLINT      NOT NULL DEFAULT 30,
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
                creado_en           TIMESTAMP     NOT NULL DEFAULT NOW(),
                UNIQUE (periodo_id, empleado_id)
            )
            """, "nomina_liquidaciones");

        await Migrar("CREATE INDEX IF NOT EXISTS idx_nomina_liq_periodo  ON nomina_liquidaciones(periodo_id)",  "nomina_liquidaciones.idx_periodo");
        await Migrar("CREATE INDEX IF NOT EXISTS idx_nomina_liq_empleado ON nomina_liquidaciones(empleado_id)", "nomina_liquidaciones.idx_empleado");

        await Migrar(
            "ALTER TABLE audit_log ALTER COLUMN entidad_id TYPE TEXT USING entidad_id::TEXT",
            "audit_log.entidad_id_to_text");
        await Migrar(
            "CREATE INDEX IF NOT EXISTS idx_audit_entidad ON audit_log (entidad_tipo, entidad_id)",
            "audit_log.idx_entidad");

        // ── Campos obligatorios (antes database/05 y 07) ──────────────────────
        // Solo se aplica SET NOT NULL si la columna aún admite NULL y no hay filas
        // con NULL; si las hay, el paso se omite con un aviso en el log (no se
        // reescriben datos aquí: el relleno de 07 fue una corrección histórica).
        (string Tabla, string Columna)[] obligatorios =
        [
            ("beneficiarios", "primer_nombre"),
            ("beneficiarios", "primer_apellido"),
            ("beneficiarios", "fecha_nacimiento"),
            ("beneficiarios", "genero"),
            ("beneficiarios", "pais_nacimiento"),
            ("beneficiarios", "departamento_nacimiento"),
            ("beneficiarios", "ciudad_nacimiento"),
            ("beneficiarios", "barrio"),
            ("beneficiarios", "num_personas_vive"),
            ("beneficiarios", "num_hermanos"),
            ("beneficiarios", "numero_documento"),
            ("beneficiario_talla", "talla_camisa"),
            ("beneficiario_talla", "talla_pantalon"),
            ("beneficiario_talla", "talla_zapatos"),
            ("beneficiario_talla", "peso_kg"),
            ("beneficiario_talla", "talla_cm"),
            ("acudientes", "whatsapp"),
            ("acudientes", "direccion"),
            ("beneficiario_acudiente", "parentesco_id"),
            ("beneficiario_salud", "eps_id"),
            ("beneficiario_salud", "observaciones"),
        ];
        foreach (var (tabla, columna) in obligatorios)
            await Migrar(SqlNotNullSiNoHayNulos(tabla, columna), $"{tabla}.{columna}.not_null");
    }

    /// <summary>
    /// SET NOT NULL protegido: no hace nada si la columna no existe o ya es NOT NULL;
    /// lanza (y Migrar lo registra como aviso) si existen filas con NULL.
    /// Tabla y columna son constantes del código, nunca entrada de usuario.
    /// </summary>
    private static string SqlNotNullSiNoHayNulos(string tabla, string columna) => $"""
        DO $nn$
        DECLARE hay_nulos BOOLEAN;
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = current_schema()
                         AND table_name = '{tabla}' AND column_name = '{columna}'
                         AND is_nullable = 'YES') THEN
                EXECUTE 'SELECT EXISTS (SELECT 1 FROM {tabla} WHERE {columna} IS NULL)' INTO hay_nulos;
                IF hay_nulos THEN
                    RAISE EXCEPTION '{tabla}.{columna} tiene filas con NULL; NOT NULL no aplicado';
                END IF;
                ALTER TABLE {tabla} ALTER COLUMN {columna} SET NOT NULL;
            END IF;
        END $nn$
        """;

    /// <summary>
    /// Esquema base (antes database/01_schema.sql). Cada tabla se crea, junto con
    /// sus índices, trigger y datos semilla, SOLO si la tabla no existe: en una BD
    /// ya poblada (producción) todo este bloque es un no-op. Permite levantar un
    /// entorno nuevo desde una BD vacía; los pasos posteriores de RunAsync
    /// completan el esquema hasta su estado actual.
    /// Diferencias deliberadas frente al 01 original:
    ///  - No crea cat_tipo_movimiento_inv / inventario_items / inventario_movimientos:
    ///    esas versiones fueron eliminadas (inventario.drop_*_v2) y RunAsync las
    ///    crea con su esquema vigente.
    ///  - beneficiarios.tipo_documento_id y beneficiario_acudiente.parentesco_id
    ///    quedan sin FK hacia cat_tipo_documento / cat_parentesco: la API guarda ids
    ///    de cat_tipos_documento / cat_parentescos, que no coinciden con esos catálogos.
    ///  - Crea sedes, que ningún script creaba y RunAsync solo altera.
    /// </summary>
    private static async Task CrearEsquemaBaseAsync(Func<string, string, Task> migrar)
    {
        Task SiNoExiste(string tabla, string ddl) => migrar(
            $"DO $base$ BEGIN IF to_regclass('{tabla}') IS NULL THEN\n{ddl}\nEND IF; END $base$",
            $"base.{tabla}");

        await migrar("""
            DO $base$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
                    CREATE EXTENSION pgcrypto;
                END IF;
            END $base$
            """, "base.pgcrypto");

        await migrar("""
            DO $base$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_set_fecha_modificacion') THEN
                    CREATE FUNCTION fn_set_fecha_modificacion() RETURNS TRIGGER AS $fn$
                    BEGIN
                        NEW.fecha_modificacion = NOW();
                        RETURN NEW;
                    END;
                    $fn$ LANGUAGE plpgsql;
                END IF;
            END $base$
            """, "base.fn_set_fecha_modificacion");

        // ── Catálogos ─────────────────────────────────────────────────────────
        await SiNoExiste("cat_tipo_documento", """
            CREATE TABLE cat_tipo_documento (
              id      SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
              codigo  VARCHAR(10) UNIQUE NOT NULL,
              nombre  VARCHAR(60)        NOT NULL,
              activo  BOOLEAN            NOT NULL DEFAULT TRUE
            );
            INSERT INTO cat_tipo_documento (codigo, nombre) VALUES
              ('RC',   'Registro Civil'),
              ('TI',   'Tarjeta de Identidad'),
              ('CC',   'Cédula de Ciudadanía'),
              ('CE',   'Cédula de Extranjería'),
              ('PA',   'Pasaporte'),
              ('NUIP', 'Número Único de Identificación Personal');
            """);

        await SiNoExiste("cat_parentesco", """
            CREATE TABLE cat_parentesco (
              id     SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
              nombre VARCHAR(60) UNIQUE NOT NULL,
              activo BOOLEAN            NOT NULL DEFAULT TRUE
            );
            INSERT INTO cat_parentesco (nombre) VALUES
              ('Madre'), ('Padre'), ('Abuelo'), ('Abuela'),
              ('Tío'), ('Tía'), ('Hermano'), ('Hermana'),
              ('Tutor legal'), ('Otro');
            """);

        await SiNoExiste("cat_eps", """
            CREATE TABLE cat_eps (
              id     SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
              nombre VARCHAR(120) UNIQUE NOT NULL,
              activo BOOLEAN             NOT NULL DEFAULT TRUE
            );
            """);

        await SiNoExiste("cat_tipo_sangre", """
            CREATE TABLE cat_tipo_sangre (
              id     SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
              codigo VARCHAR(5) UNIQUE NOT NULL,
              activo BOOLEAN           NOT NULL DEFAULT TRUE
            );
            INSERT INTO cat_tipo_sangre (codigo) VALUES
              ('A+'), ('A-'), ('B+'), ('B-'), ('AB+'), ('AB-'), ('O+'), ('O-');
            """);

        await SiNoExiste("cat_tipo_alergia", """
            CREATE TABLE cat_tipo_alergia (
              id     SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
              nombre VARCHAR(60) UNIQUE NOT NULL,
              activo BOOLEAN            NOT NULL DEFAULT TRUE
            );
            INSERT INTO cat_tipo_alergia (nombre) VALUES
              ('Alimentaria'), ('Medicamentosa'), ('Ambiental'),
              ('Picadura de insecto'), ('Látex'), ('Otra');
            """);

        await SiNoExiste("cat_tipo_archivo", """
            CREATE TABLE cat_tipo_archivo (
              id     SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
              nombre VARCHAR(60) UNIQUE NOT NULL,
              activo BOOLEAN            NOT NULL DEFAULT TRUE
            );
            INSERT INTO cat_tipo_archivo (nombre) VALUES
              ('Foto del menor'), ('Foto documento'), ('Contrato'),
              ('Acta'), ('Soporte donación'), ('Otro');
            """);

        await SiNoExiste("cat_tipo_evento", """
            CREATE TABLE cat_tipo_evento (
              id     SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
              nombre VARCHAR(60) UNIQUE NOT NULL,
              activo BOOLEAN            NOT NULL DEFAULT TRUE
            );
            INSERT INTO cat_tipo_evento (nombre) VALUES
              ('Taller'), ('Actividad recreativa'), ('Reunión'),
              ('Jornada de salud'), ('Celebración'), ('Capacitación');
            """);

        await SiNoExiste("cat_estado_evento", """
            CREATE TABLE cat_estado_evento (
              id     SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
              nombre VARCHAR(30) UNIQUE NOT NULL,
              activo BOOLEAN            NOT NULL DEFAULT TRUE
            );
            INSERT INTO cat_estado_evento (nombre) VALUES
              ('Planificado'), ('En curso'), ('Finalizado'), ('Cancelado'), ('Pospuesto');
            """);

        await SiNoExiste("cat_categoria_tesoreria", """
            CREATE TABLE cat_categoria_tesoreria (
              id     SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
              nombre VARCHAR(80)  UNIQUE NOT NULL,
              tipo   VARCHAR(10)  NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
              activo BOOLEAN      NOT NULL DEFAULT TRUE
            );
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
            """);

        await SiNoExiste("cat_tipo_donante", """
            CREATE TABLE cat_tipo_donante (
              id     SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
              nombre VARCHAR(60) UNIQUE NOT NULL,
              activo BOOLEAN            NOT NULL DEFAULT TRUE
            );
            INSERT INTO cat_tipo_donante (nombre) VALUES
              ('Persona natural'), ('Empresa'), ('ONG'),
              ('Entidad gubernamental'), ('Otro');
            """);

        // ── Usuarios ──────────────────────────────────────────────────────────
        await SiNoExiste("usuarios", """
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
            CREATE TRIGGER trg_usuarios_mod BEFORE UPDATE ON usuarios
              FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();
            """);

        // ── Sedes (no estaba en ningún script; RunAsync solo le agrega columnas) ──
        await SiNoExiste("sedes", """
            CREATE TABLE sedes (
              id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
              nombre             VARCHAR(150) NOT NULL,
              direccion          VARCHAR(300),
              ciudad             VARCHAR(100),
              telefono           VARCHAR(30),
              activo             BOOLEAN      NOT NULL DEFAULT TRUE,
              fecha_creacion     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
              fecha_modificacion TIMESTAMPTZ  NOT NULL DEFAULT NOW()
            );
            """);

        // ── Beneficiarios ─────────────────────────────────────────────────────
        await SiNoExiste("beneficiarios", """
            CREATE TABLE beneficiarios (
              id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
              primer_nombre        VARCHAR(80)         NOT NULL,
              segundo_nombre       VARCHAR(80),
              primer_apellido      VARCHAR(80)         NOT NULL,
              segundo_apellido     VARCHAR(80),
              fecha_nacimiento     DATE,
              tipo_documento_id    SMALLINT,
              numero_documento     VARCHAR(30) UNIQUE,
              activo               BOOLEAN             NOT NULL DEFAULT TRUE,
              fecha_creacion       TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
              usuario_creacion     UUID        REFERENCES usuarios (id),
              fecha_modificacion   TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
              usuario_modificacion UUID        REFERENCES usuarios (id)
            );
            CREATE INDEX idx_ben_documento ON beneficiarios (numero_documento);
            CREATE INDEX idx_ben_nombres   ON beneficiarios (primer_nombre, primer_apellido);
            CREATE INDEX idx_ben_activo    ON beneficiarios (activo);
            CREATE TRIGGER trg_ben_mod BEFORE UPDATE ON beneficiarios
              FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();
            """);

        await SiNoExiste("acudientes", """
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
            CREATE INDEX idx_acu_nombre   ON acudientes (nombre);
            CREATE INDEX idx_acu_whatsapp ON acudientes (whatsapp);
            CREATE TRIGGER trg_acu_mod BEFORE UPDATE ON acudientes
              FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();
            """);

        await SiNoExiste("beneficiario_acudiente", """
            CREATE TABLE beneficiario_acudiente (
              id                   UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
              beneficiario_id      UUID     NOT NULL REFERENCES beneficiarios (id) ON DELETE CASCADE,
              acudiente_id         UUID     NOT NULL REFERENCES acudientes    (id) ON DELETE CASCADE,
              parentesco_id        SMALLINT,
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
            CREATE TRIGGER trg_ba_mod BEFORE UPDATE ON beneficiario_acudiente
              FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();
            """);

        // ── Salud ─────────────────────────────────────────────────────────────
        await SiNoExiste("beneficiario_salud", """
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
            CREATE TRIGGER trg_salud_mod BEFORE UPDATE ON beneficiario_salud
              FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();
            """);

        await SiNoExiste("alergias_catalogo", """
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
            CREATE TRIGGER trg_alg_cat_mod BEFORE UPDATE ON alergias_catalogo
              FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();
            """);

        await SiNoExiste("beneficiario_alergia", """
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
            CREATE TRIGGER trg_balg_mod BEFORE UPDATE ON beneficiario_alergia
              FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();
            """);

        // ── Tallas ────────────────────────────────────────────────────────────
        await SiNoExiste("beneficiario_talla", """
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
            CREATE INDEX idx_talla_ben_fecha ON beneficiario_talla (beneficiario_id, fecha_medicion DESC);
            CREATE TRIGGER trg_talla_mod BEFORE UPDATE ON beneficiario_talla
              FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();
            """);

        // ── Archivos (polimórfico) ────────────────────────────────────────────
        await SiNoExiste("archivos", """
            CREATE TABLE archivos (
              id                   UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
              entidad_tipo         VARCHAR(30)  NOT NULL,
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
            CREATE TRIGGER trg_arch_mod BEFORE UPDATE ON archivos
              FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();
            """);

        // ── Programas y proyectos ─────────────────────────────────────────────
        await SiNoExiste("programas", """
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
            CREATE TRIGGER trg_prog_mod BEFORE UPDATE ON programas
              FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();
            """);

        await SiNoExiste("proyectos", """
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
            CREATE TRIGGER trg_proy_mod BEFORE UPDATE ON proyectos
              FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();
            """);

        await SiNoExiste("beneficiario_programa", """
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
            CREATE TRIGGER trg_bp_mod BEFORE UPDATE ON beneficiario_programa
              FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();
            """);

        // ── Voluntarios (antes que eventos: evento_asistencia la referencia) ───
        await SiNoExiste("voluntarios", """
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
            CREATE TRIGGER trg_vol_mod BEFORE UPDATE ON voluntarios
              FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();
            """);

        // ── Eventos ───────────────────────────────────────────────────────────
        await SiNoExiste("eventos", """
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
            CREATE INDEX idx_ev_fecha  ON eventos (fecha_inicio);
            CREATE INDEX idx_ev_prog   ON eventos (programa_id);
            CREATE INDEX idx_ev_estado ON eventos (estado_id);
            CREATE TRIGGER trg_ev_mod BEFORE UPDATE ON eventos
              FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();
            """);

        await SiNoExiste("evento_asistencia", """
            CREATE TABLE evento_asistencia (
              id                   UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
              evento_id            UUID    NOT NULL REFERENCES eventos       (id) ON DELETE CASCADE,
              beneficiario_id      UUID             REFERENCES beneficiarios (id),
              voluntario_id        UUID,
              asistio              BOOLEAN,
              observaciones        TEXT,
              activo               BOOLEAN NOT NULL DEFAULT TRUE,
              fecha_creacion       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              usuario_creacion     UUID    REFERENCES usuarios (id),
              fecha_modificacion   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              usuario_modificacion UUID    REFERENCES usuarios (id),
              UNIQUE (evento_id, beneficiario_id),
              CONSTRAINT fk_asis_voluntario FOREIGN KEY (voluntario_id) REFERENCES voluntarios (id)
            );
            CREATE INDEX idx_asis_evento ON evento_asistencia (evento_id);
            CREATE INDEX idx_asis_ben    ON evento_asistencia (beneficiario_id);
            CREATE TRIGGER trg_asis_mod BEFORE UPDATE ON evento_asistencia
              FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();
            """);

        // ── Talento humano ────────────────────────────────────────────────────
        await SiNoExiste("empleados", """
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
            CREATE TRIGGER trg_emp_mod BEFORE UPDATE ON empleados
              FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();
            """);

        // ── Donantes y donaciones ─────────────────────────────────────────────
        await SiNoExiste("donantes", """
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
            CREATE TRIGGER trg_don_mod BEFORE UPDATE ON donantes
              FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();
            """);

        await SiNoExiste("donaciones", """
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
            CREATE TRIGGER trg_dnc_mod BEFORE UPDATE ON donaciones
              FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();
            """);

        // ── Tesorería ─────────────────────────────────────────────────────────
        await SiNoExiste("tesoreria_cuentas", """
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
            CREATE TRIGGER trg_tc_mod BEFORE UPDATE ON tesoreria_cuentas
              FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();
            """);

        await SiNoExiste("tesoreria_movimientos", """
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
            CREATE TRIGGER trg_tmov_mod BEFORE UPDATE ON tesoreria_movimientos
              FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();
            """);

        // ── Actas ─────────────────────────────────────────────────────────────
        await SiNoExiste("actas", """
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
            CREATE TRIGGER trg_acta_mod BEFORE UPDATE ON actas
              FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_modificacion();
            """);
    }
}
