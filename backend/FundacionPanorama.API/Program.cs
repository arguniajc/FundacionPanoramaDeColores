using System.IO.Compression;
using System.Text;
using System.Threading.RateLimiting;
using FundacionPanorama.API.Data;
using FundacionPanorama.API.Services;
using FundacionPanorama.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Timeouts;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using Scalar.AspNetCore;
using Microsoft.Extensions.Logging;

// ── Puerto dinámico para Render (usa la variable PORT del entorno) ─────────────
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls($"http://+:{port}");

// ── Límite de tamaño de request (10 MB — previene uploads abusivos) ───────────
builder.WebHost.ConfigureKestrel(k =>
    k.Limits.MaxRequestBodySize = 10 * 1024 * 1024);

// ── Secretos obligatorios ────────────────────────────────────────────────────
// No viven en appsettings.json: en producción llegan por variables de entorno
// (ConnectionStrings__DefaultConnection, Jwt__Key, Supabase__ServiceKey) y en
// local por appsettings.Development.json (ignorado por git).
string Requerido(string clave) =>
    builder.Configuration[clave] is { } valor && !string.IsNullOrWhiteSpace(valor)
        ? valor
        : throw new InvalidOperationException(
            $"Falta la configuración '{clave}'. Defínela como variable de entorno '{clave.Replace(":", "__")}'.");

var connStr = Requerido("ConnectionStrings:DefaultConnection");
var jwtKey  = Requerido("Jwt:Key");
Requerido("Supabase:ServiceKey");

// ── Base de datos (PostgreSQL via EF Core) ──────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connStr));

// ── Autenticación JWT ────────────────────────────────────────────────────────

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
builder.Services.AddScoped<FundacionPanorama.API.Services.EmailService>();
builder.Services.Configure<SupabaseOptions>(builder.Configuration.GetSection("Supabase"));
builder.Services.AddHttpClient();
builder.Services.AddScoped<SupabaseStorageService>();

// ── Capas de arquitectura (Infrastructure + Application) ─────────────────────
builder.Services.AddInfrastructure(connStr);

// ── Controllers + OpenAPI ────────────────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(o =>
        o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase);
builder.Services.AddOpenApi();
builder.Services.AddMemoryCache();

// ── C1: Compresión Brotli + Gzip ─────────────────────────────────────────────
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
    options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(
        ["application/json", "application/javascript", "text/css"]);
});
builder.Services.Configure<BrotliCompressionProviderOptions>(o => o.Level = CompressionLevel.Fastest);
builder.Services.Configure<GzipCompressionProviderOptions>(o  => o.Level  = CompressionLevel.Fastest);

// ── C3: Timeout de request — 30 s por defecto (protege BD lenta / ataques slow-read) ─
builder.Services.AddRequestTimeouts(options =>
    options.DefaultPolicy = new RequestTimeoutPolicy
    {
        Timeout           = TimeSpan.FromSeconds(30),
        TimeoutStatusCode = StatusCodes.Status504GatewayTimeout,
    });

// ── B1: Rate limiting — máx 10 intentos/min por IP en el endpoint de login ──
// Cada IP tiene su propio cupo (antes era un único cupo compartido por todos los usuarios).
// Render está detrás de Cloudflare: la IP real del cliente llega en estas cabeceras.
static string IpCliente(HttpContext ctx)
{
    var h = ctx.Request.Headers;
    var ip = h["CF-Connecting-IP"].FirstOrDefault()
          ?? h["True-Client-IP"].FirstOrDefault()
          ?? h["X-Forwarded-For"].FirstOrDefault()?.Split(',')[0].Trim();
    return string.IsNullOrWhiteSpace(ip) ? ctx.Connection.RemoteIpAddress?.ToString() ?? "desconocida" : ip;
}

builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("auth", ctx => RateLimitPartition.GetFixedWindowLimiter(IpCliente(ctx), _ =>
        new FixedWindowRateLimiterOptions
        {
            Window               = TimeSpan.FromMinutes(1),
            PermitLimit          = 10,
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit           = 0,
        }));
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, ct) =>
    {
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsJsonAsync(
            new { mensaje = "Demasiados intentos de inicio de sesión. Espera un minuto e intenta de nuevo." }, ct);
    };
});

var app = builder.Build();

// ── Auto-migración via Npgsql directo (sin EF Core) ──────────────────────────
{
    var migLogger  = app.Services.GetRequiredService<ILogger<Program>>();
    var migConnStr = app.Configuration.GetConnectionString("DefaultConnection")!;
    await DbMigrations.RunAsync(migConnStr, migLogger);
}
// ── Pipeline HTTP ─────────────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(options =>
    {
        options.Title           = "Fundación Panorama de Colores — API";
        options.Theme           = ScalarTheme.Purple;
        options.AddHttpAuthentication("bearer", b => b.Token = "");
    });
}

// ── C1: Compresión de respuestas (antes de CORS para comprimir también preflight) ─
app.UseResponseCompression();

// ── C3: Timeout de request ───────────────────────────────────────────────────
app.UseRequestTimeouts();

app.UseCors("PoliticaCors");

// ── B2: Cabeceras de seguridad HTTP ──────────────────────────────────────────
app.Use(async (ctx, next) =>
{
    ctx.Response.Headers["X-Content-Type-Options"]  = "nosniff";
    ctx.Response.Headers["X-Frame-Options"]          = "DENY";
    ctx.Response.Headers["Referrer-Policy"]          = "strict-origin-when-cross-origin";
    ctx.Response.Headers["Permissions-Policy"]       = "camera=(), microphone=(), geolocation=()";
    await next();
});

// ── B1: Rate limiter ─────────────────────────────────────────────────────────
app.UseRateLimiter();

// Captura excepciones no manejadas DESPUÉS de CORS para que la respuesta
// de error incluya el header Access-Control-Allow-Origin
app.UseExceptionHandler(errApp => errApp.Run(async ctx =>
{
    ctx.Response.StatusCode  = 500;
    ctx.Response.ContentType = "application/json";
    var ex       = ctx.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
    var exLogger = ctx.RequestServices.GetRequiredService<ILogger<Program>>();
    // Código corto para cruzar el mensaje que ve el usuario con el log de Render.
    // El detalle técnico de la excepción solo va al log, nunca al cliente.
    var codigo   = Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
    if (ex is not null)
        exLogger.LogError(ex, "❌ Excepción no manejada [{Codigo}] en {Method} {Path}",
            codigo, ctx.Request.Method, ctx.Request.Path);
    await ctx.Response.WriteAsJsonAsync(new { mensaje = "Error interno del servidor.", codigo });
}));

// Permite que Google Sign-In funcione con postMessage
app.Use(async (context, next) =>
{
    context.Response.Headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups";
    await next();
});

// ── Observabilidad: log de cada request (método, ruta, status, duración) ────
app.Use(async (ctx, next) =>
{
    var sw = System.Diagnostics.Stopwatch.StartNew();
    await next();
    sw.Stop();
    var reqLogger = ctx.RequestServices.GetRequiredService<ILogger<Program>>();
    reqLogger.LogInformation("{Method} {Path} → {Status} en {Ms}ms",
        ctx.Request.Method, ctx.Request.Path, ctx.Response.StatusCode, sw.ElapsedMilliseconds);
});

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// ── Diagnóstico sin auth (manejado por HealthController) ────────────────────

app.Run();
