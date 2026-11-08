using FundacionPanorama.Application.Features.Correos.DTOs;

namespace FundacionPanorama.Application.Features.Correos.Interfaces;

/// <summary>Envío SMTP inmediato (lo implementa EmailService en la API).</summary>
public interface IEnviadorCorreo
{
    Task<ResultadoEnvio> EnviarAhoraAsync(
        IReadOnlyList<string> destinatarios, string asunto, string html, CancellationToken ct = default);
}
