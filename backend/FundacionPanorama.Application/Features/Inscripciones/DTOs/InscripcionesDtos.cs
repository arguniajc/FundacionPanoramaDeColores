using System.ComponentModel.DataAnnotations;

namespace FundacionPanorama.Application.Features.Inscripciones.DTOs;

public record InscripcionDto(
    Guid     Id,
    Guid     BeneficiarioId,
    string   NombreBeneficiario,
    string?  DocumentoBeneficiario,
    Guid     ProgramaId,
    string   NombrePrograma,
    string   NombreSede,
    string   Estado,
    DateTime FechaInscripcion,
    string   Datos,
    string?  Observaciones,
    bool     Activo,
    DateTime FechaCreacion
);

public record CrearInscripcionDto(
    Guid BeneficiarioId,
    Guid ProgramaId,
    [Required] string Datos,
    [StringLength(1000)] string? Observaciones);

public record ActualizarInscripcionDto(
    [Required] string Datos,
    [StringLength(1000)] string? Observaciones);

public record CambiarEstadoDto([Required][StringLength(20)] string Estado);

/// <summary>Resultado de crear una inscripción (no se serializa: el controller lo traduce a HTTP).</summary>
public enum ErrorCrearInscripcion
{
    Ninguno,
    BeneficiarioNoEncontrado,
    ProgramaNoEncontrado,
    YaInscritoActivo,
    /// <summary>El programa tiene cupo_maximo y ya tiene esa cantidad de inscripciones activas.</summary>
    CupoLleno,
}

public record CrearInscripcionResultado(InscripcionDto? Inscripcion, ErrorCrearInscripcion Error);
