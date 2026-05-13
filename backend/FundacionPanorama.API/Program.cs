using System.Text;
using FundacionPanorama.API.Data;
using FundacionPanorama.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using Scalar.AspNetCore;
using Microsoft.Extensions.Logging;

// ── Puerto dinámico para Render (usa la variable PORT del entorno) ─────────────
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls($"http://+:{port}");

// ── Base de datos (PostgreSQL via EF Core) ──────────────────────────────────
// Cambiar la cadena de conexión en appsettings.json para apuntar a otra BD
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// ── Autenticación JWT ────────────────────────────────────────────────────────
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("JWT Key no configurada en appsettings.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = builder.Configuration["Jwt:Issuer"],
            ValidAudience            = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();

// ── CORS ─────────────────────────────────────────────────────────────────────
var origenesPermitidos = builder.Configuration
    .GetSection("Cors:OrigenesPermitidos")
    .Get<string[]>() ?? Array.Empty<string>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("PoliticaCors", policy =>
        policy.WithOrigins(origenesPermitidos)
              .AllowAnyHeader()
              .AllowAnyMethod());
});

// ── Servicios propios ────────────────────────────────────────────────────────
builder.Services.AddScoped<AuthService>();
builder.Services.Configure<SupabaseOptions>(builder.Configuration.GetSection("Supabase"));
builder.Services.AddHttpClient();
builder.Services.AddScoped<SupabaseStorageService>();

// ── Controllers + OpenAPI ────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

// ── Auto-migración via Npgsql directo (sin EF Core) ──────────────────────────
{
    var migLogger = app.Services.GetRequiredService<ILogger<Program>>();
    var connStr   = app.Configuration.GetConnectionString("DefaultConnection")!;

    await using var conn = new NpgsqlConnection(connStr);
    await conn.OpenAsync();

    async Task Migrar(string sql, string etiqueta)
    {
        try
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = sql;
            await cmd.ExecuteNonQueryAsync();
            migLogger.LogInformation("✅ Migración OK: {E}", etiqueta);
        }
        catch (Exception ex)
        {
            migLogger.LogWarning(ex, "⚠️  Migración omitida [{E}]: {M}", etiqueta, ex.Message);
            // Reset connection state after a failed statement
            try { await conn.CloseAsync(); await conn.OpenAsync(); } catch { /* ignored */ }
        }
    }

    // ── Columnas retroactivas en tablas que ya existían ───────────────────────
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

    // ── Tablas nuevas ─────────────────────────────────────────────────────────
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
    await Migrar("ALTER TABLE inscripciones ADD COLUMN IF NOT EXISTS estado            VARCHAR(30)  NOT NULL DEFAULT 'activa'", "inscripciones.estado");
    await Migrar("ALTER TABLE inscripciones ADD COLUMN IF NOT EXISTS fecha_inscripcion TIMESTAMPTZ NOT NULL DEFAULT NOW()",     "inscripciones.fecha_inscripcion");
    await Migrar("ALTER TABLE inscripciones ADD COLUMN IF NOT EXISTS datos             TEXT        NOT NULL DEFAULT '{}'",      "inscripciones.datos");
    await Migrar("ALTER TABLE inscripciones ADD COLUMN IF NOT EXISTS observaciones     TEXT",                                   "inscripciones.observaciones");
    await Migrar("ALTER TABLE inscripciones ADD COLUMN IF NOT EXISTS activo            BOOLEAN     NOT NULL DEFAULT true",      "inscripciones.activo");
    await Migrar("CREATE INDEX IF NOT EXISTS idx_inscripciones_programa      ON inscripciones(programa_id)",      "inscripciones.idx_programa");
    await Migrar("CREATE INDEX IF NOT EXISTS idx_inscripciones_beneficiario  ON inscripciones(beneficiario_id)",  "inscripciones.idx_beneficiario");

    // ── Módulo Inventario ─────────────────────────────────────────────────────
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

    // Columnas adicionales inventario (retroactivas)
    await Migrar("ALTER TABLE inventario_items ADD COLUMN IF NOT EXISTS sede_id     UUID",                                        "inventario_items.sede_id");
    await Migrar("ALTER TABLE inventario_items ADD COLUMN IF NOT EXISTS categoria   VARCHAR(50) NOT NULL DEFAULT 'Otros'",        "inventario_items.categoria");
    await Migrar("ALTER TABLE inventario_movimientos ADD COLUMN IF NOT EXISTS sede_destino_id     UUID",                          "inventario_movimientos.sede_destino_id");
    await Migrar("ALTER TABLE inventario_movimientos ADD COLUMN IF NOT EXISTS donante_id          UUID",                          "inventario_movimientos.donante_id");
    await Migrar("ALTER TABLE inventario_movimientos ADD COLUMN IF NOT EXISTS transferencia_grupo UUID",                          "inventario_movimientos.transferencia_grupo");
    await Migrar("ALTER TABLE inventario_movimientos ADD COLUMN IF NOT EXISTS beneficiario_id     UUID",                          "inventario_movimientos.beneficiario_id");
    await Migrar("ALTER TABLE inventario_movimientos ADD COLUMN IF NOT EXISTS programa_id         UUID",                          "inventario_movimientos.programa_id");
    await Migrar("CREATE INDEX IF NOT EXISTS idx_inv_mov_sede_destino ON inventario_movimientos(sede_destino_id)", "inventario_movimientos.idx_sede_destino");

    await Migrar("""
        INSERT INTO cat_tipo_movimiento_inv (codigo, nombre, descripcion, afecta_stock) VALUES
            ('TRANSFERENCIA_SALIDA',  'Transferencia salida',  'Artículo enviado a otra sede', '-'),
            ('TRANSFERENCIA_ENTRADA', 'Transferencia entrada', 'Artículo recibido de otra sede', '+')
        ON CONFLICT (codigo) DO NOTHING
        """, "cat_tipo_movimiento_inv.transfers");

    // Tabla donantes (si no existe aún)
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

    // Columnas adicionales donantes
    await Migrar("ALTER TABLE donantes ADD COLUMN IF NOT EXISTS ciudad   VARCHAR(100)",  "donantes.ciudad");
    await Migrar("ALTER TABLE donantes ADD COLUMN IF NOT EXISTS notas    TEXT",           "donantes.notas");

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

    // ── Módulo Voluntarios ────────────────────────────────────────────────────
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
    // Limpiar asignaciones huérfanas de voluntarios inactivos
    await Migrar(@"
        UPDATE voluntario_programas SET activo = false
        WHERE activo = true
          AND voluntario_id IN (SELECT id FROM voluntarios WHERE activo = false)",
        "voluntario_programas.limpiar_huerfanas");

    // ── Módulo Configuración / Representante Legal ────────────────────────────
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

    // ── Columnas adicionales configuracion ───────────────────────────────────
    await Migrar("ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS color_primario      VARCHAR(7)   NOT NULL DEFAULT '#4E1B95'", "configuracion.color_primario");
    await Migrar("ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS color_sidebar       VARCHAR(7)   NOT NULL DEFAULT '#150830'", "configuracion.color_sidebar");
    await Migrar("ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS tagline             VARCHAR(500)",                            "configuracion.tagline");
    await Migrar("ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS mision              TEXT",                                    "configuracion.mision");
    await Migrar("ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS vision              TEXT",                                    "configuracion.vision");
    await Migrar("ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS email_contacto      VARCHAR(200)",                            "configuracion.email_contacto");
    await Migrar("ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS sitio_web           VARCHAR(300)",                            "configuracion.sitio_web");
    await Migrar("ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS mensaje_bienvenida  TEXT",                                    "configuracion.mensaje_bienvenida");
    await Migrar("ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS footer_texto        VARCHAR(500)",                            "configuracion.footer_texto");

    await Migrar("ALTER TABLE programas ADD COLUMN IF NOT EXISTS rep_autorizado         BOOLEAN     NOT NULL DEFAULT false", "programas.rep_autorizado");
    await Migrar("ALTER TABLE programas ADD COLUMN IF NOT EXISTS rep_autorizacion_fecha TIMESTAMPTZ",                       "programas.rep_autorizacion_fecha");
    await Migrar("ALTER TABLE programas ADD COLUMN IF NOT EXISTS rep_firma              TEXT",                               "programas.rep_firma");
    await Migrar("ALTER TABLE programas ADD COLUMN IF NOT EXISTS rep_nombre             VARCHAR(200)",                      "programas.rep_nombre");
    await Migrar("ALTER TABLE programas ADD COLUMN IF NOT EXISTS rep_documento          VARCHAR(50)",                       "programas.rep_documento");
    await Migrar("ALTER TABLE programas ADD COLUMN IF NOT EXISTS rep_cargo              VARCHAR(100)",                      "programas.rep_cargo");

    // Columnas retroactivas voluntarios (por si la tabla existía vacía)
    await Migrar("ALTER TABLE voluntarios ADD COLUMN IF NOT EXISTS tipo_documento     VARCHAR(20)",  "voluntarios.tipo_documento");
    await Migrar("ALTER TABLE voluntarios ADD COLUMN IF NOT EXISTS documento          VARCHAR(50)",  "voluntarios.documento");
    await Migrar("ALTER TABLE voluntarios ADD COLUMN IF NOT EXISTS email              VARCHAR(200)", "voluntarios.email");
    await Migrar("ALTER TABLE voluntarios ADD COLUMN IF NOT EXISTS telefono           VARCHAR(30)",  "voluntarios.telefono");
    await Migrar("ALTER TABLE voluntarios ADD COLUMN IF NOT EXISTS ciudad             VARCHAR(100)", "voluntarios.ciudad");
    await Migrar("ALTER TABLE voluntarios ADD COLUMN IF NOT EXISTS fecha_nacimiento   DATE",         "voluntarios.fecha_nacimiento");
    await Migrar("ALTER TABLE voluntarios ADD COLUMN IF NOT EXISTS fecha_inicio       DATE",         "voluntarios.fecha_inicio");
    await Migrar("ALTER TABLE voluntarios ADD COLUMN IF NOT EXISTS profesion          VARCHAR(100)", "voluntarios.profesion");
    await Migrar("ALTER TABLE voluntarios ADD COLUMN IF NOT EXISTS notas              TEXT",         "voluntarios.notas");
    await Migrar("ALTER TABLE voluntarios ADD COLUMN IF NOT EXISTS activo             BOOLEAN NOT NULL DEFAULT true",              "voluntarios.activo");
    await Migrar("ALTER TABLE voluntarios ADD COLUMN IF NOT EXISTS fecha_creacion     TIMESTAMPTZ NOT NULL DEFAULT NOW()",         "voluntarios.fecha_creacion");
    await Migrar("ALTER TABLE voluntarios ADD COLUMN IF NOT EXISTS fecha_modificacion TIMESTAMPTZ NOT NULL DEFAULT NOW()",         "voluntarios.fecha_modificacion");

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
}

// ── Pipeline HTTP ─────────────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(options =>
    {
        options.Title           = "Fundación Panorama de Colores — API";
        options.Theme           = ScalarTheme.Purple;
        options.WithHttpBearerAuthentication(b => b.Token = "");
    });
}

app.UseCors("PoliticaCors");

// Captura excepciones no manejadas DESPUÉS de CORS para que la respuesta
// de error incluya el header Access-Control-Allow-Origin
app.UseExceptionHandler(errApp => errApp.Run(async ctx =>
{
    ctx.Response.StatusCode  = 500;
    ctx.Response.ContentType = "application/json";
    var ex       = ctx.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
    var exLogger = ctx.RequestServices.GetRequiredService<ILogger<Program>>();
    if (ex is not null)
        exLogger.LogError(ex, "❌ Excepción no manejada en {Method} {Path}",
            ctx.Request.Method, ctx.Request.Path);
    var msg   = ex?.Message              ?? "Error interno del servidor.";
    var inner = ex?.InnerException?.Message ?? "";
    await ctx.Response.WriteAsJsonAsync(new { error = msg, inner });
}));

// Permite que Google Sign-In funcione con postMessage
app.Use(async (context, next) =>
{
    context.Response.Headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups";
    await next();
});

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// ── Diagnóstico sin auth (manejado por HealthController) ────────────────────

app.Run();
