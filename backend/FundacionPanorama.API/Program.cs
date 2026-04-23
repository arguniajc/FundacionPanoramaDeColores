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
    await Migrar("ALTER TABLE beneficiarios ADD COLUMN IF NOT EXISTS motivo_baja VARCHAR(500)", "beneficiarios.motivo_baja");
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
