using FundacionPanorama.Application.Features.Configuracion.DTOs;
using FundacionPanorama.Application.Features.Donaciones.DTOs;
using FundacionPanorama.Application.Features.Donaciones.Interfaces;

namespace FundacionPanorama.Application.Features.Donaciones;

public class DonacionesService(IDonacionesRepository repo)
{
    public Task<IReadOnlyList<DonacionDto>> ListarAsync(
        Guid? donanteId, string? tipo, Guid? sedeId, Guid? programaId,
        DateTime? desde, DateTime? hasta, CancellationToken ct = default)
        => repo.ListarAsync(donanteId, tipo, sedeId, programaId, desde, hasta, ct);

    public Task<DonacionDto?> ObtenerAsync(Guid id, CancellationToken ct = default)
        => repo.ObtenerAsync(id, ct);

    /// <summary>Devuelve el mensaje de error de validación, o null si el DTO es válido.</summary>
    public static string? ValidarCrear(CrearDonacionDto dto)
    {
        // Un tipo distinto saltaba todas las reglas de abajo
        if (dto.Tipo is not ("dinero" or "especie"))
            return "El tipo de donación debe ser dinero o especie.";
        if (dto.DonanteId == Guid.Empty)
            return "Selecciona el donante.";
        if (dto.Monto < 0)
            return "El monto no puede ser negativo.";
        if (dto.Cantidad < 0)
            return "La cantidad no puede ser negativa.";
        // Hoy en Colombia (UTC-5): una donación de las 9 p. m. no debe verse "en el futuro"
        if (dto.FechaDonacion?.Date > DateTime.UtcNow.AddHours(-5).Date)
            return "La fecha de la donación no puede ser futura.";
        if (dto.Tipo == "dinero" && (dto.Monto is null || dto.Monto <= 0))
            return "El monto es obligatorio para donaciones en dinero.";
        if (dto.Tipo == "especie" && (dto.Cantidad is null || dto.Cantidad <= 0))
            return "La cantidad es obligatoria para donaciones en especie.";
        if (dto.Tipo == "especie" && dto.ItemId is null && string.IsNullOrWhiteSpace(dto.NombreItem))
            return "Debe indicar el artículo o su nombre.";
        return null;
    }

    public Task<DonacionDto?> CrearAsync(CrearDonacionDto dto, string? usuarioEmail, CancellationToken ct = default)
        => repo.CrearAsync(dto, usuarioEmail, ct);

    public Task<bool> ActualizarAsync(Guid id, CrearDonacionDto dto, CancellationToken ct = default)
        => repo.ActualizarAsync(id, dto, ct);

    public Task<bool> EliminarAsync(Guid id, CancellationToken ct = default)
        => repo.EliminarAsync(id, ct);

    public Task<bool> AnularAsync(Guid id, CancellationToken ct = default)
        => repo.AnularAsync(id, ct);

    public Task<StatsDonacionesDto> ObtenerStatsAsync(CancellationToken ct = default)
        => repo.ObtenerStatsAsync(ct);

    public Task RegistrarLogEmisionAsync(
        Guid donacionId, string accion,
        string? usuarioEmail, string? destinatarioEmail, string? detalle,
        CancellationToken ct = default)
        => repo.RegistrarLogEmisionAsync(donacionId, accion, usuarioEmail, destinatarioEmail, detalle, ct);

    // ── Recibo HTML (correo) ─────────────────────────────────────────────────

    // Todo dato escrito por usuarios se escapa: el recibo se envía por correo como HTML
    private static string H(string? texto) => System.Net.WebUtility.HtmlEncode(texto ?? "");

    public static string GenerarHtmlRecibo(DonacionDto don, ConfiguracionDto? cfg)
    {
        var nombre    = cfg?.NombreFundacion ?? "Fundación Panorama de Colores";
        var nit       = cfg?.Nit != null       ? $"NIT: {cfg.Nit}"       : "";
        var telefono  = cfg?.Telefono != null  ? $"Tel: {cfg.Telefono}"  : "";
        var email     = cfg?.EmailContacto ?? "";
        var subtexto  = string.Join("  |  ", new[] { nit, cfg?.Direccion, telefono, email }.Where(s => !string.IsNullOrWhiteSpace(s)));

        var fecha = don.FechaDonacion.ToString("dd/MMM/yyyy");

        var detalle = don.Tipo == "dinero"
            ? $"<tr><td style='padding:4px 0;color:#6b7280;font-size:13px'>Valor donado</td><td style='padding:4px 0;font-weight:700;color:#059669;font-size:15px'>{FormatMoney(don.Monto)}</td></tr>"
            : $"<tr><td style='padding:4px 0;color:#6b7280;font-size:13px'>Artículo</td><td style='padding:4px 0;font-size:13px'>{don.Cantidad} {H(don.UnidadMedida)} — {H(don.NombreItem)}</td></tr>";

        var programa = !string.IsNullOrWhiteSpace(don.NombrePrograma)
            ? $"<tr><td style='padding:4px 0;color:#6b7280;font-size:13px'>Programa</td><td style='padding:4px 0;font-size:13px'>{H(don.NombrePrograma)}</td></tr>" : "";
        var sede = !string.IsNullOrWhiteSpace(don.NombreSede)
            ? $"<tr><td style='padding:4px 0;color:#6b7280;font-size:13px'>Sede</td><td style='padding:4px 0;font-size:13px'>{H(don.NombreSede)}</td></tr>" : "";

        var docRow = don.TipoDocDonante != null && don.DocumentoDonante != null
            ? $"<p style='margin:2px 0 0;font-size:12px;color:#6b7280'>{H(don.TipoDocDonante.ToUpper())}: {H(don.DocumentoDonante)}</p>" : "";

        return $"""
            <!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
            <meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
            <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
            <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 16px">
            <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.1)">
              <tr><td style="background:#4E1B95;padding:28px 32px;text-align:center">
                <p style="margin:0;color:#fff;font-size:20px;font-weight:800">{System.Net.WebUtility.HtmlEncode(nombre)}</p>
                {(subtexto.Length > 0 ? $"<p style='margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:11px'>{System.Net.WebUtility.HtmlEncode(subtexto)}</p>" : "")}
                <p style="margin:12px 0 0;color:#fff;font-size:13px;letter-spacing:2px;font-weight:600">RECIBO DE DONACIÓN</p>
              </td></tr>
              <tr><td style="background:#f5f0ff;padding:16px;text-align:center">
                <p style="margin:0;font-size:20px;font-weight:800;color:#4E1B95">{System.Net.WebUtility.HtmlEncode(don.ReciboNumero ?? "—")}</p>
                <p style="margin:4px 0 0;font-size:12px;color:#6b7280">{fecha}</p>
              </td></tr>
              <tr><td style="padding:24px 32px">
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:6px;padding:14px;margin-bottom:20px">
                  <tr><td>
                    <p style="margin:0 0 2px;font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:700">Donante</p>
                    <p style="margin:0;font-size:15px;font-weight:700">{System.Net.WebUtility.HtmlEncode(don.NombreDonante)}</p>
                    {docRow}
                  </td></tr>
                </table>
                <table width="100%" cellpadding="0" cellspacing="0">
                  {detalle}{programa}{sede}
                </table>
              </td></tr>
              <tr><td style="padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb">
                <p style="margin:0;font-size:11px;color:#9ca3af">Este recibo es prueba de la donación realizada. Gracias por su generosidad.</p>
              </td></tr>
            </table></td></tr></table></body></html>
            """;
    }

    private static string FormatMoney(decimal? m) =>
        m.HasValue ? m.Value.ToString("C0", new System.Globalization.CultureInfo("es-CO")) : "—";
}
