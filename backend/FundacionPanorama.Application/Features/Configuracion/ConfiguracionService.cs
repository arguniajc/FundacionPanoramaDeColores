using FundacionPanorama.Application.Features.Configuracion.DTOs;
using FundacionPanorama.Application.Features.Configuracion.Interfaces;
using FundacionPanorama.Application.Shared;
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
        if (Validar.PrimerError(() => ValidarCampos(dto)) is { } errorCampo)
            return Result.Failure<ConfiguracionDto>(errorCampo);

        // Los errores de BD se propagan al manejador global, que los registra en
        // el log con un código y responde al cliente sin detalles técnicos.
        var result = await repo.GuardarAsync(dto, ct);
        return Result.Success(result);
    }

    /// <summary>
    /// Formato y longitudes según las columnas de configuracion: colores VARCHAR(7) "#rrggbb",
    /// nombre 200, nit 50, dirección 300, teléfono 30, rep. legal 200/20/50/100, fuente 100,
    /// tagline y pie de página 500, correo 200, sitio web 300, SMTP 200 y puerto 1–65535.
    /// </summary>
    public static void ValidarCampos(GuardarConfiguracionDto dto)
    {
        Validar.Largo(dto.NombreFundacion, 200, "El nombre de la fundación");
        Validar.Largo(dto.Nit, 50, "El NIT");
        Validar.Largo(dto.Direccion, 300, "La dirección");
        Validar.Largo(dto.Telefono, 30, "El teléfono");
        Validar.Largo(dto.NombreRepLegal, 200, "El nombre del representante legal");
        Validar.Largo(dto.TipoDocRep, 20, "El tipo de documento del representante");
        Validar.Largo(dto.DocumentoRep, 50, "El documento del representante");
        Validar.Largo(dto.CargoRep, 100, "El cargo del representante");
        Validar.ImagenBase64(dto.FirmaRep, "La firma del representante");

        Validar.Color(dto.ColorPrimario, "El color primario");
        Validar.Color(dto.ColorSidebar, "El color del menú lateral");
        Validar.Color(dto.ColorSecundario, "El color secundario");
        Validar.Color(dto.ColorGradiente, "El color del degradado");
        Validar.Color(dto.ColorOscuroFondo, "El color de fondo (modo oscuro)");
        Validar.Color(dto.ColorOscuroPaper, "El color de tarjetas (modo oscuro)");
        Validar.Color(dto.ColorOscuroSidebar, "El color del menú lateral (modo oscuro)");
        Validar.Color(dto.ColorAccento, "El color de acento");
        Validar.Largo(dto.FontFamily, 100, "La fuente");

        Validar.Largo(dto.Tagline, 500, "El eslogan");
        Validar.Largo(dto.FooterTexto, 500, "El texto del pie de página");
        Validar.Correo(dto.EmailContacto, 200, "El correo de contacto", "contacto@fundacion.org");
        Validar.Largo(dto.SitioWeb, 300, "El sitio web");
        Validar.Exigir(dto.SitioWeb is null || !EsquemaPeligroso.IsMatch(
                new string(dto.SitioWeb.Where(c => !char.IsWhiteSpace(c) && !char.IsControl(c)).ToArray())),
            "El sitio web no es un enlace válido. Ejemplo: https://www.fundacion.org");

        Validar.Largo(dto.SmtpHost, 200, "El servidor de correo");
        Validar.Exigir(dto.SmtpPuerto is null or >= 1 and <= 65535, "El puerto del correo debe estar entre 1 y 65535. Ejemplo: 587");
        Validar.Largo(dto.SmtpUsuario, 200, "El usuario del correo");
        Validar.Largo(dto.SmtpDeNombre, 200, "El nombre del remitente");
        Validar.Correo(dto.SmtpDeEmail, 200, "El correo del remitente", "notificaciones@fundacion.org");
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
