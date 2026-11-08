namespace FundacionPanorama.Infrastructure.Persistence;

/// <summary>Patrones para búsquedas con LIKE/ILIKE parametrizadas.</summary>
public static class SqlLike
{
    /// <summary>
    /// "%texto%" con los comodines del usuario escapados: un "%" o "_" escrito en el buscador
    /// se busca literal. Usa el escape por defecto de PostgreSQL (barra invertida).
    /// </summary>
    public static string Contiene(string texto)
        => "%" + texto.Replace(@"\", @"\\").Replace("%", @"\%").Replace("_", @"\_") + "%";
}
