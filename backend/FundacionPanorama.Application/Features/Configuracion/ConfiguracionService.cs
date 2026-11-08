using FundacionPanorama.Application.Features.Configuracion.DTOs;
using FundacionPanorama.Application.Features.Configuracion.Interfaces;
using FundacionPanorama.Domain.Shared;

namespace FundacionPanorama.Application.Features.Configuracion;

public class ConfiguracionService(IConfiguracionRepository repo)
{
    public Task<ConfiguracionDto?> ObtenerAsync(CancellationToken ct = default)
        => repo.ObtenerAsync(ct);

    public Task<ConfiguracionPublicaDto?> ObtenerPublicaAsync(CancellationToken ct = default)
        => repo.ObtenerPublicaAsync(ct);

    public async Task<Result<ConfiguracionDto>> GuardarAsync(GuardarConfiguracionDto dto, CancellationToken ct = default)
    {
        if (ValidarWebContenido(dto.WebContenido) is { } error)
            return Result.Failure<ConfiguracionDto>(error);

        // Los errores de BD se propagan al manejador global, que los registra en
        // el log con un código y responde al cliente sin detalles técnicos.
        var result = await repo.GuardarAsync(dto, ct);
        return Result.Success(result);
    }

    static readonly System.Text.RegularExpressions.Regex EsquemaPeligroso =
        new(@"^(javascript|vbscript|data|file):", System.Text.RegularExpressions.RegexOptions.IgnoreCase);

    /// <summary>
    /// El contenido de la web pública (JSON) se pinta en el sitio como enlaces e imágenes:
    /// se rechaza cualquier texto que sea un enlace ejecutable ("javascript:", "data:"…).
    /// Los navegadores ignoran espacios y tabulaciones dentro del esquema, así que se quitan antes.
    /// </summary>
    public static string? ValidarWebContenido(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        System.Text.Json.JsonDocument doc;
        try { doc = System.Text.Json.JsonDocument.Parse(json); }
        catch (System.Text.Json.JsonException) { return "El contenido de la página web no tiene un formato válido."; }

        using (doc)
            return Textos(doc.RootElement)
                .Select(t => new string(t.Where(c => !char.IsWhiteSpace(c) && !char.IsControl(c)).ToArray()))
                .Any(t => EsquemaPeligroso.IsMatch(t))
                ? "El contenido de la página web tiene un enlace no permitido. Usa enlaces que empiecen por https://"
                : null;
    }

    static IEnumerable<string> Textos(System.Text.Json.JsonElement e) => e.ValueKind switch
    {
        System.Text.Json.JsonValueKind.String => [e.GetString() ?? ""],
        System.Text.Json.JsonValueKind.Object => e.EnumerateObject().SelectMany(p => Textos(p.Value)),
        System.Text.Json.JsonValueKind.Array  => e.EnumerateArray().SelectMany(Textos),
        _ => [],
    };
}
