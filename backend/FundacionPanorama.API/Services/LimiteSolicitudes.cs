using System.Security.Claims;

namespace FundacionPanorama.API.Services;

/// <summary>
/// Claves de partición del limitador de solicitudes (Program.cs → AddRateLimiter).
///
/// IP real del cliente: la API corre en Render, detrás de Cloudflare y del proxy de Render.
///  1. CF-Connecting-IP: la pone Cloudflare y sobrescribe la que mande el cliente.
///  2. Si falta, X-Forwarded-For tomando el ÚLTIMO valor: es el que añade el proxy de Render
///     (de confianza). Los primeros valores los puede escribir el cliente a su gusto, así que
///     usar el primero permitía saltarse el límite cambiando la cabecera en cada intento.
///  3. Si no hay cabeceras (local), la IP de la conexión.
/// True-Client-IP ya no se usa: fuera del plan Enterprise de Cloudflare llega tal como la
/// manda el cliente. No se usa UseForwardedHeaders porque Render no publica IPs fijas para
/// su proxy (KnownProxies no se puede configurar) y cambiaría RemoteIpAddress en toda la app.
/// </summary>
public static class LimiteSolicitudes
{
    public const string PoliticaAuth       = "auth";
    public const string PoliticaFirmar     = "archivos-firmar";
    public const string PoliticaOcr        = "ocr-factura";
    public const string PoliticaImportar   = "importar-xlsx";

    public static string IpCliente(HttpContext ctx)
    {
        var h = ctx.Request.Headers;
        var cf = h["CF-Connecting-IP"].FirstOrDefault()?.Trim();
        if (!string.IsNullOrWhiteSpace(cf)) return cf;

        // Varias cabeceras X-Forwarded-For equivalen a una sola separada por comas
        var reenviadas = string.Join(',', h["X-Forwarded-For"].ToArray())
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (reenviadas.Length > 0) return reenviadas[^1];

        return ctx.Connection.RemoteIpAddress?.ToString() ?? "desconocida";
    }

    /// <summary>Por usuario si hay sesión (así una oficina con una sola IP no comparte cupo); si no, por IP.</summary>
    public static string UsuarioOIp(HttpContext ctx)
    {
        var email = ctx.User.FindFirst(ClaimTypes.Email)?.Value ?? ctx.User.FindFirst("email")?.Value;
        return ctx.User.Identity?.IsAuthenticated == true && !string.IsNullOrWhiteSpace(email)
            ? "u:" + email.ToLowerInvariant()
            : "ip:" + IpCliente(ctx);
    }
}
