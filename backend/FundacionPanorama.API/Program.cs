using System.Text;
using FundacionPanorama.API.Data;
using FundacionPanorama.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
// ReSharper disable once RedundantUsingDirective
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

// ── Auto-migración: cada sentencia en su propio try-catch para que un fallo
//    no bloquee las migraciones siguientes ────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db     = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    void Migrar(string sql, string etiqueta)
    {
        try   { db.Database.ExecuteSqlRaw(sql); logger.LogInformation("✅ Migración OK: {E}", etiqueta); }
        catch (Exception ex) { logger.LogWarning("⚠️ Migración omitida [{E}]: {M}", etiqueta, ex.Message); }
    }

    Migrar("ALTER TABLE inscripciones ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true;",
           "inscripciones.activo");

    Migrar("ALTER TABLE beneficiarios ADD COLUMN IF NOT EXISTS motivo_baja VARCHAR(500);",
           "beneficiarios.motivo_baja");

    Migrar("""
        CREATE TABLE IF NOT EXISTS log_descargas (
            id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
            usuario_email   VARCHAR(255) NOT NULL,
            beneficiario_id UUID         NOT NULL,
            tipo_archivo    VARCHAR(100) NOT NULL DEFAULT 'documento',
            url_archivo     TEXT,
            descargado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        );
        """, "log_descargas");

    Migrar("""
        CREATE TABLE IF NOT EXISTS sedes (
            id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
            nombre             VARCHAR(150) NOT NULL,
            direccion          VARCHAR(300),
            ciudad             VARCHAR(100),
            telefono           VARCHAR(30),
            activo             BOOLEAN      NOT NULL DEFAULT true,
            fecha_creacion     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            fecha_modificacion TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        );
        """, "sedes");

    Migrar("""
        CREATE TABLE IF NOT EXISTS programas (
            id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
            sede_id            UUID         NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
            nombre             VARCHAR(150) NOT NULL,
            descripcion        VARCHAR(500),
            cupo_maximo        INT,
            activo             BOOLEAN      NOT NULL DEFAULT true,
            fecha_creacion     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            fecha_modificacion TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        );
        """, "programas");

    Migrar("""
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
        );
        CREATE INDEX IF NOT EXISTS idx_documentos_inst_categoria ON documentos_institucionales(categoria);
        CREATE INDEX IF NOT EXISTS idx_documentos_inst_activo    ON documentos_institucionales(activo);
        """, "documentos_institucionales");

    Migrar("""
        CREATE TABLE IF NOT EXISTS inscripciones (
            id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
            beneficiario_id    UUID         NOT NULL REFERENCES beneficiarios(id),
            programa_id        UUID         NOT NULL REFERENCES programas(id),
            estado             VARCHAR(30)  NOT NULL DEFAULT 'activa',
            fecha_inscripcion  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            datos              JSONB        NOT NULL DEFAULT '{}',
            observaciones      TEXT,
            activo             BOOLEAN      NOT NULL DEFAULT true,
            fecha_creacion     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            fecha_modificacion TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_inscripciones_programa     ON inscripciones(programa_id);
        CREATE INDEX IF NOT EXISTS idx_inscripciones_beneficiario ON inscripciones(beneficiario_id);
        """, "inscripciones");

    Migrar("ALTER TABLE inscripciones ADD COLUMN IF NOT EXISTS estado VARCHAR(30) NOT NULL DEFAULT 'activa';",
           "inscripciones.estado");
    Migrar("ALTER TABLE inscripciones ADD COLUMN IF NOT EXISTS fecha_inscripcion TIMESTAMPTZ NOT NULL DEFAULT NOW();",
           "inscripciones.fecha_inscripcion");
    Migrar("ALTER TABLE inscripciones ADD COLUMN IF NOT EXISTS datos JSONB NOT NULL DEFAULT '{}';",
           "inscripciones.datos");
    Migrar("ALTER TABLE inscripciones ADD COLUMN IF NOT EXISTS observaciones TEXT;",
           "inscripciones.observaciones");

    Migrar("""
        CREATE TABLE IF NOT EXISTS programas_campos (
            id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
            programa_id        UUID         NOT NULL REFERENCES programas(id) ON DELETE CASCADE,
            etiqueta           VARCHAR(100) NOT NULL,
            tipo               VARCHAR(30)  NOT NULL DEFAULT 'text',
            obligatorio        BOOLEAN      NOT NULL DEFAULT false,
            opciones           TEXT,
            orden              INT          NOT NULL DEFAULT 0,
            activo             BOOLEAN      NOT NULL DEFAULT true,
            fecha_creacion     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            fecha_modificacion TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_programas_campos_programa ON programas_campos(programa_id);
        """, "programas_campos");
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
    await ctx.Response.WriteAsync("{\"error\":\"Error interno del servidor.\"}");
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
