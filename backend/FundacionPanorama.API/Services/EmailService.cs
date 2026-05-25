using FundacionPanorama.Application.Features.Configuracion.Interfaces;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace FundacionPanorama.API.Services;

public class EmailService(IConfiguracionRepository repo)
{
    // Envía el recibo de una donación al email del donante.
    // Devuelve (true, "") si tuvo éxito, (false, mensaje) si falló.
    public async Task<(bool Ok, string Detalle)> EnviarReciboAsync(
        string destinatarioEmail, string destinatarioNombre,
        string reciboNumero, string nombreFundacion,
        string htmlBody,
        CancellationToken ct = default)
    {
        var smtp = await repo.ObtenerSmtpAsync(ct);
        if (smtp is null)
            return (false, "SMTP no configurado. Revisa la pestaña de correo en Configuración.");

        try
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(
                string.IsNullOrWhiteSpace(smtp.DeNombre) ? nombreFundacion : smtp.DeNombre,
                string.IsNullOrWhiteSpace(smtp.DeEmail)  ? smtp.Usuario    : smtp.DeEmail));
            message.To.Add(new MailboxAddress(destinatarioNombre, destinatarioEmail));
            message.Subject = $"Recibo de donación {reciboNumero} — {nombreFundacion}";

            var builder = new BodyBuilder { HtmlBody = htmlBody };
            message.Body = builder.ToMessageBody();

            using var client = new SmtpClient();
            var secureSocket = smtp.Ssl ? SecureSocketOptions.StartTls : SecureSocketOptions.Auto;
            await client.ConnectAsync(smtp.Host, smtp.Puerto, secureSocket, ct);
            await client.AuthenticateAsync(smtp.Usuario, smtp.Clave, ct);
            await client.SendAsync(message, ct);
            await client.DisconnectAsync(true, ct);
            return (true, "");
        }
        catch (Exception ex)
        {
            return (false, $"Error al enviar: {ex.Message}");
        }
    }

        // Notifica a los administradores sobre cambios en una actividad (fecha o estado).
    public async Task NotificarCambioActividadAsync(
        IEnumerable<string> adminEmails,
        string tituloActividad,
        string? estadoAnterior,
        string estadoNuevo,
        string? fechaInicio,
        string? fechaFin,
        CancellationToken ct = default)
    {
        var smtp = await repo.ObtenerSmtpAsync(ct);
        if (smtp is null) return; // Sin configuración SMTP: silencioso

        var cambioEstado = estadoAnterior != null && estadoAnterior != estadoNuevo
            ? $"<tr><td style='padding:4px 8px;color:#555'>Estado</td><td style='padding:4px 8px'><strong>{estadoAnterior}</strong> → <strong>{estadoNuevo}</strong></td></tr>"
            : "";
        var filaFecha = fechaInicio is not null
            ? $"<tr><td style='padding:4px 8px;color:#555'>Fecha / hora</td><td style='padding:4px 8px'>{fechaInicio}{(fechaFin != null ? " → " + fechaFin : "")}</td></tr>"
            : "";

        var html = $"""
            <div style="font-family:Arial,sans-serif;font-size:14px;max-width:560px">
              <h2 style="color:#4E1B95">Cambio en actividad</h2>
              <p>Se modificó la actividad <strong>{tituloActividad}</strong>:</p>
              <table style="border-collapse:collapse;width:100%">
                {cambioEstado}
                {filaFecha}
              </table>
              <p style="color:#888;font-size:12px;margin-top:24px">Sistema Fundación Panorama de Colores</p>
            </div>
            """;

        foreach (var email in adminEmails)
        {
            try
            {
                var message = new MimeMessage();
                message.From.Add(new MailboxAddress(
                    string.IsNullOrWhiteSpace(smtp.DeNombre) ? "Fundación Panorama" : smtp.DeNombre,
                    string.IsNullOrWhiteSpace(smtp.DeEmail)  ? smtp.Usuario : smtp.DeEmail));
                message.To.Add(MailboxAddress.Parse(email));
                message.Subject = $"[Actividad] Cambio en: {tituloActividad}";
                message.Body    = new BodyBuilder { HtmlBody = html }.ToMessageBody();

                using var client = new SmtpClient();
                var secureSocket = smtp.Ssl ? SecureSocketOptions.StartTls : SecureSocketOptions.Auto;
                await client.ConnectAsync(smtp.Host, smtp.Puerto, secureSocket, ct);
                await client.AuthenticateAsync(smtp.Usuario, smtp.Clave, ct);
                await client.SendAsync(message, ct);
                await client.DisconnectAsync(true, ct);
            }
            catch { /* No interrumpir el flujo principal por fallo de email */ }
        }
    }

    // Envía un email de prueba al usuario autenticado para verificar la configuración SMTP.
    public async Task<(bool Ok, string Detalle)> EnviarPruebaAsync(
        string destinatarioEmail, CancellationToken ct = default)
    {
        var smtp = await repo.ObtenerSmtpAsync(ct);
        if (smtp is null)
            return (false, "SMTP no configurado. Ingresa el servidor, usuario y contraseña en la pestaña de correo.");

        try
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(
                string.IsNullOrWhiteSpace(smtp.DeNombre) ? "Fundación Panorama" : smtp.DeNombre,
                string.IsNullOrWhiteSpace(smtp.DeEmail)  ? smtp.Usuario : smtp.DeEmail));
            message.To.Add(MailboxAddress.Parse(destinatarioEmail));
            message.Subject = "Prueba de configuración SMTP — Fundación Panorama de Colores";

            var builder = new BodyBuilder
            {
                HtmlBody = """
                    <p style="font-family:Arial,sans-serif;font-size:14px">
                      <strong>¡La configuración de correo funciona correctamente!</strong><br><br>
                      Si recibiste este mensaje, el envío de recibos de donación por email está listo.
                    </p>
                    """
            };
            message.Body = builder.ToMessageBody();

            using var client = new SmtpClient();
            var secureSocket = smtp.Ssl ? SecureSocketOptions.StartTls : SecureSocketOptions.Auto;
            await client.ConnectAsync(smtp.Host, smtp.Puerto, secureSocket, ct);
            await client.AuthenticateAsync(smtp.Usuario, smtp.Clave, ct);
            await client.SendAsync(message, ct);
            await client.DisconnectAsync(true, ct);
            return (true, "");
        }
        catch (Exception ex)
        {
            return (false, $"Error al conectar con el servidor SMTP: {ex.Message}");
        }
    }
}
