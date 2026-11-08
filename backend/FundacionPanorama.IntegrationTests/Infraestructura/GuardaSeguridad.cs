using Npgsql;

namespace FundacionPanorama.IntegrationTests.Infraestructura;

/// <summary>
/// Última barrera contra tocar una BD real: toda cadena de conexión que usan las pruebas pasa por aquí.
/// Solo se aceptan hosts locales (o el host que reporta el contenedor de Testcontainers) y bases cuyo
/// nombre lleva el prefijo de prueba. Las cadenas se construyen en el fixture; nunca se leen de
/// appsettings ni de variables de entorno.
/// </summary>
public static class GuardaSeguridad
{
    public const string PrefijoBd = "panorama_it_";

    static readonly HashSet<string> HostsLocales = new(StringComparer.OrdinalIgnoreCase)
        { "localhost", "127.0.0.1", "::1", "[::1]" };

    /// <summary>Lanza si la cadena no apunta a una BD de prueba local.</summary>
    public static void Verificar(string connStr, string? hostContenedor = null)
    {
        VerificarHost(connStr, hostContenedor);
        var bd = new NpgsqlConnectionStringBuilder(connStr).Database ?? "";
        if (!bd.StartsWith(PrefijoBd, StringComparison.Ordinal))
            throw new InvalidOperationException($"ABORTADO: la base '{bd}' no es una base temporal de prueba.");
    }

    /// <summary>Lanza si el host no es local (o el del contenedor de prueba). Para la conexión de administración.</summary>
    public static void VerificarHost(string connStr, string? hostContenedor = null)
    {
        var b = new NpgsqlConnectionStringBuilder(connStr);
        var host = b.Host ?? "";
        var hostOk = HostsLocales.Contains(host)
                     || (hostContenedor is not null && string.Equals(host, hostContenedor, StringComparison.OrdinalIgnoreCase));
        if (!hostOk || host.Contains(',') || host.Contains("supabase", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException(
                $"ABORTADO: la cadena de conexión apunta a '{host}', que no es localhost ni el contenedor de prueba.");
    }
}
