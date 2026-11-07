namespace FundacionPanorama.Application.Features.Archivos.Interfaces;

/// <summary>Columna de texto/JSON de la BD (esquema public) que contiene URLs del bucket.</summary>
public record ColumnaConUrls(string Tabla, string Columna, string Tipo);

/// <summary>
/// SQL de la migración de archivos al bucket privado: descubre columnas con URLs públicas,
/// lee sus valores y reemplaza URLs. Los identificadores se citan con comillas dobles.
/// </summary>
public interface IAlmacenamientoMigracionRepository
{
    /// <summary>Columnas text/varchar/json/jsonb de tablas base cuyo valor contiene <paramref name="prefijo"/>.</summary>
    Task<List<ColumnaConUrls>> ColumnasConPrefijoAsync(string prefijo, CancellationToken ct = default);

    /// <summary>Valores (como texto) de la columna que contienen <paramref name="prefijo"/>.</summary>
    Task<List<string>> ValoresConPrefijoAsync(string tabla, string columna, string prefijo, CancellationToken ct = default);

    /// <summary>Reemplaza <paramref name="url"/> por <paramref name="referencia"/> en la columna; devuelve las filas actualizadas.</summary>
    Task<int> ReemplazarAsync(ColumnaConUrls columna, string url, string referencia, CancellationToken ct = default);
}
