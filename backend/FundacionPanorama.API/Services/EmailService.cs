using FundacionPanorama.Infrastructure.Persistence;
using FundacionPanorama.API.Data;
using FundacionPanorama.Application.Features.Configuracion.Interfaces;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using Npgsql;

namespace FundacionPanorama.API.Services;

/// <summary>
/// Servicio centralizado de correo. Todos los envíos del sistema pasan por aquí.
/// Usa EnviarAsync como núcleo; los demás métodos construyen el contenido y lo delegan.
/// </summary>
public class EmailService(IConfiguracionRepository repo, DbConnectionFactory db, ILogger<EmailService> logger)
{
    /// <summary>Mensaje para el usuario cuando falla el envío; el detalle técnico solo va al log.</summary>
    public const string MensajeErrorEnvio =
        "No se pudo enviar el correo. Verifica la configuración SMTP (servidor, puerto, usuario y clave) o inténtalo más tarde.";

    static string H(string? texto) => System.Net.WebUtility.HtmlEncode(texto ?? "");

    // ── NÚCLEO: único punto de envío SMTP ────────────────────────────────────

    /// <summary>
    /// Envía un correo a uno o varios destinatarios.
    /// Abre una sola conexión SMTP y envía todos los mensajes en serie.
    /// </summary>
    public async Task<(bool Ok, string Detalle)> EnviarAsync(
        IEnumerable<(string Email, string? Nombre)> destinatarios,
        string asunto,
        string htmlBody,
        CancellationToken ct = default)
    {
        var smtp = await repo.ObtenerSmtpAsync(ct);
        if (smtp is null)
            return (false, "SMTP no configurado. Revisa la pestaña de correo en Configuración.");

        var lista = destinatarios.ToList();
        if (lista.Count == 0) return (true, "Sin destinatarios.");

        try
        {
            using var client = new SmtpClient();
            var secureSocket = smtp.Ssl ? SecureSocketOptions.StartTls : SecureSocketOptions.Auto;
            await client.ConnectAsync(smtp.Host, smtp.Puerto, secureSocket, ct);
            await client.AuthenticateAsync(smtp.Usuario, smtp.Clave, ct);

            foreach (var (email, nombre) in lista)
            {
                var msg = new MimeMessage();
                msg.From.Add(new MailboxAddress(
                    string.IsNullOrWhiteSpace(smtp.DeNombre) ? "Fundación Panorama" : smtp.DeNombre,
                    string.IsNullOrWhiteSpace(smtp.DeEmail)  ? smtp.Usuario : smtp.DeEmail));
                msg.To.Add(nombre is not null
                    ? new MailboxAddress(nombre, email)
                    : MailboxAddress.Parse(email));
                msg.Subject = asunto;
                msg.Body    = new BodyBuilder { HtmlBody = htmlBody }.ToMessageBody();
                await client.SendAsync(msg, ct);
            }

            await client.DisconnectAsync(true, ct);
            return (true, "");
        }
        catch (Exception ex) when (ex is not OperationCanceledException || !ct.IsCancellationRequested)
        {
            // El mensaje de MailKit puede revelar host, usuario o detalles del servidor: solo al log.
            var codigo = Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
            logger.LogError(ex, "❌ Falló el envío SMTP [{Codigo}] ({Destinatarios} destinatario(s), asunto: {Asunto})",
                codigo, lista.Count, asunto);
            return (false, $"{MensajeErrorEnvio} Código: {codigo}");
        }
    }

    // ── NOTIFICAR ADMINISTRADORES (roles: representante_legal, sistemas) ─────

    /// <summary>
    /// Envía una notificación a todos los administradores activos del sistema.
    /// Se llama en segundo plano (ver <see cref="TrabajoEnSegundoPlano"/>): un envío fallido queda
    /// en el log, y un error inesperado (p. ej. de BD) se propaga para que el llamador lo registre.
    /// </summary>
    public async Task NotificarAdminsAsync(string asunto, string htmlBody, CancellationToken ct = default)
    {
        var admins = await ObtenerEmailsAdminsAsync(ct);
        if (admins.Count == 0) return;
        var (ok, detalle) = await EnviarAsync(admins.Select(e => (e, (string?)null)), asunto, htmlBody, ct);
        if (!ok)
            logger.LogWarning("⚠️ Aviso a administradores no enviado ({Asunto}): {Detalle}", asunto, detalle);
    }

    // ── TEMPLATES ESPECÍFICOS ─────────────────────────────────────────────────

    /// <summary>Envía el recibo PDF/HTML de una donación al donante.</summary>
    public Task<(bool Ok, string Detalle)> EnviarReciboAsync(
        string destinatarioEmail,
        string destinatarioNombre,
        string reciboNumero,
        string nombreFundacion,
        string htmlBody,
        CancellationToken ct = default)
        => EnviarAsync(
            [(destinatarioEmail, destinatarioNombre)],
            $"Recibo de donación {reciboNumero} — {nombreFundacion}",
            htmlBody,
            ct);

    /// <summary>Envía un email de prueba para verificar la configuración SMTP.</summary>
    public Task<(bool Ok, string Detalle)> EnviarPruebaAsync(
        string destinatarioEmail,
        CancellationToken ct = default)
        => EnviarAsync(
            [(destinatarioEmail, null)],
            "Prueba de configuración SMTP — Fundación Panorama de Colores",
            """
            <p style="font-family:Arial,sans-serif;font-size:14px">
              <strong>¡La configuración de correo funciona correctamente!</strong><br><br>
              Si recibiste este mensaje, el envío de correos desde el sistema está listo.
            </p>
            """,
            ct);

    /// <summary>
    /// Notifica a los administradores sobre un cambio de estado o fecha en una actividad.
    /// Obtiene los destinatarios automáticamente; el llamador solo provee los datos del cambio.
    /// </summary>
    public Task NotificarCambioActividadAsync(
        string titulo,
        string? estadoAnterior,
        string  estadoNuevo,
        string? fechaInicio,
        string? fechaFin,
        CancellationToken ct = default)
        => NotificarAdminsAsync($"[Actividad] Cambio en: {titulo}",
            HtmlCambioActividad(titulo, estadoAnterior, estadoNuevo, fechaInicio, fechaFin), ct);

    /// <summary>
    /// Cuerpo HTML del aviso de cambio en una actividad. Todo dato del usuario va codificado
    /// (HtmlEncode) para que un título con etiquetas no inyecte HTML en el correo.
    /// </summary>
    public static string HtmlCambioActividad(
        string titulo, string? estadoAnterior, string estadoNuevo, string? fechaInicio, string? fechaFin)
    {
        var cambioEstado = estadoAnterior is not null && estadoAnterior != estadoNuevo
            ? $"<tr><td style='padding:4px 8px;color:#555'>Estado</td>"
            + $"<td style='padding:4px 8px'><strong>{H(estadoAnterior)}</strong> → <strong>{H(estadoNuevo)}</strong></td></tr>"
            : string.Empty;

        var filaFecha = fechaInicio is not null
            ? $"<tr><td style='padding:4px 8px;color:#555'>Fecha / hora</td>"
            + $"<td style='padding:4px 8px'>{H(fechaInicio)}{(fechaFin != null ? " → " + H(fechaFin) : "")}</td></tr>"
            : string.Empty;

        return $"""
            <div style="font-family:Arial,sans-serif;font-size:14px;max-width:560px">
              <h2 style="color:#4E1B95">Cambio en actividad</h2>
              <p>Se modificó la actividad <strong>{H(titulo)}</strong>:</p>
              <table style="border-collapse:collapse;width:100%">
                {cambioEstado}
                {filaFecha}
              </table>
              <p style="color:#888;font-size:12px;margin-top:24px">
                Sistema Fundación Panorama de Colores
              </p>
            </div>
            """;
    }

    // ── HELPERS INTERNOS ──────────────────────────────────────────────────────

    private async Task<List<string>> ObtenerEmailsAdminsAsync(CancellationToken ct)
    {
        // Sin try/catch: un error de BD se propaga y queda en el log con código (no se traga).
        var emails = new List<string>();
        await using var conn = db.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT email FROM usuarios
            WHERE activo = true
              AND rol IN ('representante_legal','sistemas')
              AND email IS NOT NULL AND email <> ''
            """;
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct)) emails.Add(r.GetString(0));
        return emails;
    }
}
