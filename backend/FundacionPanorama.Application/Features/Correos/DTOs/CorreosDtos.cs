namespace FundacionPanorama.Application.Features.Correos.DTOs;

/// <summary>Correo por encolar. <paramref name="Destinatarios"/>: uno o varios correos separados por coma.</summary>
public record CorreoNuevo(string Destinatarios, string Asunto, string Html);

/// <summary>Correo tomado de la cola para enviarlo. <paramref name="Intentos"/> ya cuenta el intento en curso.</summary>
public record CorreoEnCola(Guid Id, string Destinatarios, string Asunto, string Html, int Intentos);

/// <summary>Resultado de un envío SMTP. <paramref name="TipoError"/> es solo el tipo de error (sin datos personales).</summary>
public record ResultadoEnvio(bool Ok, string? TipoError = null);

/// <summary>Usuario activo que puede recibir avisos internos.</summary>
public record UsuarioDestinatario(string Email, string Nombre, string Rol);

/// <summary>Configuración del resumen diario de alertas por correo.</summary>
/// <param name="Hora">Hora de Colombia (0–23) a partir de la cual se envía.</param>
/// <param name="UltimoEnvio">Último día (hora Colombia) en que ya se procesó el resumen.</param>
public record ResumenDiarioConfigDto(bool Activo, int Hora, DateOnly? UltimoEnvio);

public record GuardarResumenDiarioDto(bool Activo, int Hora);
