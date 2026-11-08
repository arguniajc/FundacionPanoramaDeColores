namespace FundacionPanorama.Application.Shared;

/// <summary>
/// Página de un listado paginado en el servidor. Tiene la misma forma JSON que el listado
/// de beneficiarios (<c>{ data, total, pagina, porPagina }</c>) para que el frontend
/// trate todos los listados igual.
/// </summary>
public class ListaPaginada<T>
{
    public IReadOnlyList<T> Data      { get; init; } = [];
    /// <summary>Total de registros que cumplen los filtros (no solo los de esta página).</summary>
    public int              Total     { get; init; }
    public int              Pagina    { get; init; }
    public int              PorPagina { get; init; }
}

/// <summary>Topes comunes de los listados paginados.</summary>
public static class Paginacion
{
    public const int PorPaginaMaximo = 100;
    /// <summary>Evita desbordar el OFFSET (pagina × porPagina) con valores absurdos.</summary>
    public const int PaginaMaxima    = 100_000;
    /// <summary>Largo máximo del texto de búsqueda.</summary>
    public const int BuscarMaximo    = 100;

    /// <summary>pagina ≥ 1 y 1 ≤ porPagina ≤ 100.</summary>
    public static (int Pagina, int PorPagina) Normalizar(int pagina, int porPagina)
        => (Math.Clamp(pagina, 1, PaginaMaxima), Math.Clamp(porPagina, 1, PorPaginaMaximo));

    /// <summary>Texto de búsqueda sin espacios sobrantes y recortado; null si viene vacío.</summary>
    public static string? NormalizarBusqueda(string? buscar)
    {
        if (string.IsNullOrWhiteSpace(buscar)) return null;
        var t = buscar.Trim();
        return t.Length > BuscarMaximo ? t[..BuscarMaximo] : t;
    }
}
