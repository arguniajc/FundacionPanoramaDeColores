using System.Net;
using System.Text;
using FundacionPanorama.Application.Features.Alertas;
using FundacionPanorama.Application.Features.Alertas.DTOs;
using FundacionPanorama.Application.Features.Configuracion.Interfaces;
using FundacionPanorama.Application.Features.Correos.DTOs;
using FundacionPanorama.Application.Features.Correos.Interfaces;
using FundacionPanorama.Application.Features.Permisos;
using FundacionPanorama.Domain.Shared;

namespace FundacionPanorama.Application.Features.Correos;

public enum ResultadoResumen { Desactivado, NoToca, SinSmtp, SinAlertas, YaEnviado, Encolado }

/// <summary>
/// Resumen diario de alertas por correo. Una vez al día (hora Colombia configurable) encola un
/// correo por usuario activo con las alertas de los módulos que su rol puede "ver"
/// (el administrador las ve todas). La fecha del último resumen queda en la BD, así que un
/// reinicio del servidor no lo duplica.
/// </summary>
public class ResumenDiarioService(
    IColaCorreosRepository cola,
    IConfiguracionRepository cfg,
    AlertasService alertas,
    PermisosService permisos)
{
    /// <summary>Colombia no tiene horario de verano: siempre UTC-5.</summary>
    public static readonly TimeSpan DesfaseColombia = TimeSpan.FromHours(-5);
    public const int    HoraPorDefecto  = 7;
    public const string PanelPorDefecto = "https://fundacionpanoramadecolores.org/gestion/";

    public static DateTime AhoraColombia(DateTime utc) => DateTime.SpecifyKind(utc, DateTimeKind.Unspecified) + DesfaseColombia;
    public static DateOnly HoyColombia(DateTime utc) => DateOnly.FromDateTime(AhoraColombia(utc));

    /// <summary>
    /// True si en Colombia ya es la hora configurada (o más tarde) y el resumen de hoy no se ha
    /// procesado. Si el servidor estaba dormido a esa hora, sale al despertar ese mismo día.
    /// </summary>
    public static bool TocaEnviar(DateTime utcAhora, int hora, DateOnly? ultimoEnvio)
    {
        var local = AhoraColombia(utcAhora);
        var hoy   = DateOnly.FromDateTime(local);
        return local.Hour >= hora && (ultimoEnvio is null || ultimoEnvio < hoy);
    }

    public static Result ValidarConfig(GuardarResumenDiarioDto dto)
        => dto.Hora is >= 0 and <= 23
            ? Result.Success()
            : Result.Failure("La hora del resumen debe estar entre 0 y 23. Ejemplo: 7 (7:00 a. m.)");

    public Task<ResumenDiarioConfigDto> ObtenerConfigAsync(CancellationToken ct = default)
        => cola.ObtenerResumenDiarioAsync(ct);

    public async Task<Result<ResumenDiarioConfigDto>> GuardarConfigAsync(GuardarResumenDiarioDto dto, CancellationToken ct = default)
    {
        var v = ValidarConfig(dto);
        if (v.IsFailure) return Result.Failure<ResumenDiarioConfigDto>(v.Error!);
        return Result.Success(await cola.GuardarResumenDiarioAsync(dto, ct));
    }

    /// <summary>Revisa si toca el resumen y, si es así, lo encola. Devuelve qué pasó y cuántos correos encoló.</summary>
    public async Task<(ResultadoResumen Resultado, int Correos)> EjecutarSiTocaAsync(DateTime utcAhora, CancellationToken ct = default)
    {
        var conf = await cola.ObtenerResumenDiarioAsync(ct);
        if (!conf.Activo) return (ResultadoResumen.Desactivado, 0);
        if (!TocaEnviar(utcAhora, conf.Hora, conf.UltimoEnvio)) return (ResultadoResumen.NoToca, 0);
        // Sin SMTP no se encola (los correos se acumularían) ni se marca el día: se reintenta luego.
        if (await cfg.ObtenerSmtpAsync(ct) is null) return (ResultadoResumen.SinSmtp, 0);

        var hoy   = HoyColombia(utcAhora);
        var todas = await alertas.ObtenerAsync(ct);
        if (todas.Count == 0)
        {
            // Se marca el día igual, para no recalcular las alertas cada ciclo
            await cola.EncolarResumenDelDiaAsync(hoy, [], ct);
            return (ResultadoResumen.SinAlertas, 0);
        }

        var config  = await cfg.ObtenerAsync(ct);
        var enlace  = EnlacePanel(config?.SitioWeb);
        var nombre  = string.IsNullOrWhiteSpace(config?.NombreFundacion) ? "Fundación Panorama de Colores" : config!.NombreFundacion!;
        var correos = await ConstruirCorreosAsync(await cola.ObtenerUsuariosActivosAsync(ct), todas,
            (rol, modulo) => permisos.TienePermisoAsync(rol, modulo, "ver", ct), hoy, nombre, enlace);

        return await cola.EncolarResumenDelDiaAsync(hoy, correos, ct)
            ? (ResultadoResumen.Encolado, correos.Count)
            : (ResultadoResumen.YaEnviado, 0);
    }

    public static bool EsAdministrador(string rol) => rol is "administrador" or "Admin";

    /// <summary>
    /// Un correo por destinatario con solo las alertas de los módulos que su rol puede ver.
    /// Quien no puede ver ninguna, no recibe correo. El permiso se consulta una vez por rol y módulo.
    /// </summary>
    public static async Task<List<CorreoNuevo>> ConstruirCorreosAsync(
        IReadOnlyList<UsuarioDestinatario> usuarios,
        IReadOnlyList<AlertaDto> alertas,
        Func<string, string, Task<bool>> puedeVer,
        DateOnly dia, string nombreFundacion, string enlace)
    {
        var porRol  = new Dictionary<string, IReadOnlyList<AlertaDto>>();
        var correos = new List<CorreoNuevo>();
        var vistos  = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var u in usuarios)
        {
            if (string.IsNullOrWhiteSpace(u.Email) || !vistos.Add(u.Email.Trim())) continue;
            if (!porRol.TryGetValue(u.Rol, out var visibles))
                porRol[u.Rol] = visibles = EsAdministrador(u.Rol)
                    ? alertas
                    : await AlertasService.FiltrarPorModuloAsync(alertas, m => puedeVer(u.Rol, m));
            if (visibles.Count == 0) continue;

            var n = visibles.Count;
            correos.Add(new CorreoNuevo(u.Email.Trim(),
                $"Resumen diario de alertas — {Fecha(dia)} ({n} {(n == 1 ? "alerta" : "alertas")})",
                HtmlResumen(nombreFundacion, u.Nombre, dia, visibles, enlace)));
        }
        return correos;
    }

    /// <summary>
    /// Enlace al panel: el dominio del sitio web configurado + "/gestion/" (solo http/https);
    /// si no hay uno válido, el dominio oficial.
    /// </summary>
    public static string EnlacePanel(string? sitioWeb)
    {
        if (!string.IsNullOrWhiteSpace(sitioWeb))
        {
            var s = sitioWeb.Trim();
            if (!s.Contains("://")) s = "https://" + s;
            if (Uri.TryCreate(s, UriKind.Absolute, out var uri) && (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp)
                && !string.IsNullOrEmpty(uri.Host))
                return $"{uri.Scheme}://{uri.Authority}/gestion/";
        }
        return PanelPorDefecto;
    }

    static string H(string? t) => WebUtility.HtmlEncode(t ?? "");

    static string Fecha(DateOnly d) => d.ToString("dd/MM/yyyy", System.Globalization.CultureInfo.InvariantCulture);

    static string NombreModulo(string modulo) => modulo switch
    {
        "talento_humano" => "Talento humano",
        "inventario"     => "Inventario",
        "contabilidad"   => "Contabilidad",
        _                => modulo,
    };

    static (string Color, string Etiqueta) Nivel(string nivel) => nivel switch
    {
        "error"   => ("#C62828", "Urgente"),
        "warning" => ("#E65100", "Atención"),
        _         => ("#1565C0", "Informativo"),
    };

    /// <summary>HTML sencillo del resumen. Todo texto variable va codificado (HtmlEncode).</summary>
    public static string HtmlResumen(string nombreFundacion, string? nombreUsuario, DateOnly dia,
        IReadOnlyList<AlertaDto> alertas, string enlace)
    {
        var filas = new StringBuilder();
        foreach (var a in alertas)
        {
            var (color, etiqueta) = Nivel(a.Nivel);
            filas.Append("<tr>")
                 .Append($"<td style='padding:6px 8px;color:{color};font-weight:bold;white-space:nowrap'>{H(etiqueta)}</td>")
                 .Append($"<td style='padding:6px 8px;color:#555;white-space:nowrap'>{H(NombreModulo(a.Modulo))}</td>")
                 .Append($"<td style='padding:6px 8px'>{H(a.Mensaje)}</td>")
                 .Append("</tr>");
        }
        var saludo = string.IsNullOrWhiteSpace(nombreUsuario) ? "Hola," : $"Hola, {H(nombreUsuario)}:";
        return $"""
            <div style="font-family:Arial,sans-serif;font-size:14px;max-width:600px">
              <h2 style="color:#4E1B95">Resumen diario de alertas</h2>
              <p>{saludo}</p>
              <p>Estas son las alertas del {Fecha(dia)} en los módulos que puedes ver:</p>
              <table style="border-collapse:collapse;width:100%">{filas}</table>
              <p style="margin-top:20px">
                <a href="{H(enlace)}" style="background:#4E1B95;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Abrir el panel</a>
              </p>
              <p style="color:#888;font-size:12px;margin-top:24px">
                {H(nombreFundacion)} — aviso automático. Un administrador puede desactivarlo en Configuración › Correo.
              </p>
            </div>
            """;
    }
}
