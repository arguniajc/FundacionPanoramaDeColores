using FundacionPanorama.Application.Features.Configuracion.Interfaces;
using FundacionPanorama.Application.Features.Correos.DTOs;
using FundacionPanorama.Application.Features.Correos.Interfaces;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace FundacionPanorama.API.Services;

/// <summary>
/// Servicio centralizado de correo. Todos los envíos del sistema pasan por aquí.
/// Usa EnviarAsync como núcleo; los demás métodos construyen el contenido y lo delegan.
/// Los avisos internos (a administradores, resumen diario) NO se envían en el momento: se
/// encolan en cola_correos y los envía <see cref="ColaCorreosWorker"/> con reintentos.
/// El recibo al donante y la prueba SMTP siguen siendo inmediatos (el usuario espera la respuesta).
/// </summary>
public class EmailService(IConfiguracionRepository repo, IColaCorreosRepository cola, ILogger<EmailService> logger)
    : IEnviadorCorreo
{
    /// <summary>Mensaje para el usuario cuando falla el envío; el detalle técnico solo va al log.</summary>
    public const string MensajeErrorEnvio =
        "No se pudo enviar el correo. Verifica la configuración SMTP (servidor, puerto, usuario y clave) o inténtalo más tarde.";

    /// <summary>Roles que reciben los avisos internos de cambios (p. ej. en actividades).</summary>
    public static readonly string[] RolesAvisos = ["representante_legal", "sistemas"];

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
        var (ok, detalle, _) = await EnviarConTipoAsync(destinatarios, asunto, htmlBody, ct);
        return (ok, detalle);
    }

    /// <summary>Envío inmediato que usa la cola: devuelve solo el tipo de error (sin datos personales).</summary>
    public async Task<ResultadoEnvio> EnviarAhoraAsync(
        IReadOnlyList<string> destinatarios, string asunto, string html, CancellationToken ct = default)
    {
        var (ok, _, tipo) = await EnviarConTipoAsync(destinatarios.Select(e => (e, (string?)null)), asunto, html, ct);
        return new ResultadoEnvio(ok, tipo);
    }

    /// <summary>
    /// Tipo de error SMTP apto para guardar en la BD: nombre de la excepción y, si el servidor
    /// respondió, el código SMTP. Nunca el mensaje (puede traer host, usuario o direcciones).
    /// </summary>
    public static string TipoError(Exception ex) => ex switch
    {
        SmtpCommandException s  => $"SmtpCommandException ({s.ErrorCode}, {(int)s.StatusCode})",
        SmtpProtocolException   => "SmtpProtocolException",
        AuthenticationException => "AuthenticationException",
        _                       => ex.GetType().Name,
    };

    async Task<(bool Ok, string Detalle, string? TipoError)> EnviarConTipoAsync(
        IEnumerable<(string Email, string? Nombre)> destinatarios,
        string asunto,
        string htmlBody,
        CancellationToken ct)
    {
        var smtp = await repo.ObtenerSmtpAsync(ct);
        if (smtp is null)
            return (false, "SMTP no configurado. Revisa la pestaña de correo en Configuración.", "SmtpNoConfigurado");

        var lista = destinatarios.ToList();
        if (lista.Count == 0) return (true, "Sin destinatarios.", null);

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
            return (true, "", null);
        }
        catch (Exception ex) when (ex is not OperationCanceledException || !ct.IsCancellationRequested)
        {
            // El mensaje de MailKit puede revelar host, usuario o detalles del servidor: solo al log.
            var codigo = Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
            logger.LogError(ex, "❌ Falló el envío SMTP [{Codigo}] ({Destinatarios} destinatario(s), asunto: {Asunto})",
                codigo, lista.Count, asunto);
            return (false, $"{MensajeErrorEnvio} Código: {codigo}", TipoError(ex));
        }
    }

    // ── NOTIFICAR ADMINISTRADORES (roles: representante_legal, sistemas) ─────

    /// <summary>
    /// Encola un aviso para los administradores activos (roles <see cref="RolesAvisos"/>): un correo
    /// por destinatario, así un fallo con uno no hace reenviar a los demás. Queda en la BD aunque el
    /// servidor se reinicie y la cola lo reintenta. Sin SMTP configurado no se encola (solo log).
    /// Un error de BD se propaga para que el llamador lo registre.
    /// </summary>
    public async Task NotificarAdminsAsync(string asunto, string htmlBody, CancellationToken ct = default)
    {
        if (await repo.ObtenerSmtpAsync(ct) is null)
        {
            logger.LogWarning("⚠️ Aviso a administradores no encolado ({Asunto}): SMTP no configurado.", asunto);
            return;
        }
        var admins = (await cola.ObtenerUsuariosActivosAsync(ct))
            .Where(u => RolesAvisos.Contains(u.Rol))
            .Select(u => u.Email.Trim())
            .Where(e => e.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        if (admins.Count == 0) return;
        await cola.EncolarAsync(admins.Select(e => new CorreoNuevo(e, asunto, htmlBody)), ct);
    }

    // ── TEMPLATES ESPECÍFICOS ─────────────────────────────────────────────────

    /// <summary>Envía el recibo PDF/HTML de una donación al donante (inmediato).</summary>
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

    /// <summary>Envía un email de prueba para verificar la configuración SMTP (inmediato).</summary>
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
    /// Encola el aviso a los administradores sobre un cambio de estado o fecha en una actividad.
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
}
