using System.Text;
using FundacionPanorama.API.Data;
using FundacionPanorama.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
// ReSharper disable once RedundantUsingDirective
using Microsoft.Extensions.Logging;

var builder = WebApplication.CreateBuilder(args);

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

// ── Controllers + OpenAPI ────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

// ── Auto-migración: añade columnas nuevas si no existen ──────────────────────
using (var scope = app.Services.CreateScope())
{
    var db     = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        db.Database.ExecuteSqlRaw(
            "ALTER TABLE inscripciones ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true;"
        );
        logger.LogInformation("✅ Migración OK — columna 'activo' verificada.");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "❌ Error en migración automática: {Msg}", ex.Message);
    }
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
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// ── Diagnóstico sin auth ─────────────────────────────────────────────────────
app.MapGet("/api/health", async (AppDbContext db) =>
{
    try
    {
        // Verifica conexión y cuenta registros
        var total = await db.Inscripciones.CountAsync();

        // Verifica si la columna activo existe
        var columnas = await db.Database
            .SqlQueryRaw<string>(
                "SELECT column_name FROM information_schema.columns " +
                "WHERE table_name='inscripciones' AND column_name='activo'")
            .ToListAsync();

        return Results.Ok(new
        {
            estado          = "OK",
            totalInscritos  = total,
            columnaActivo   = columnas.Count > 0 ? "existe" : "NO EXISTE — ejecuta la migración",
            timestamp       = DateTime.UtcNow
        });
    }
    catch (Exception ex)
    {
        return Results.Problem(
            title:      "Error de conexión a la base de datos",
            detail:     ex.Message,
            statusCode: 500);
    }
});

app.Run();
