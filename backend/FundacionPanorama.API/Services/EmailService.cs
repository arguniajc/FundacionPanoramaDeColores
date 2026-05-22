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
