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

/// <summary>Filtros del listado de inscripciones. Buscar compara nombre/documento del beneficiario y nombre del programa.</summary>
public record FiltroInscripciones(Guid? ProgramaId, Guid? BeneficiarioId, string? Estado, string? Buscar);

/// <summary>Resultado de cambiar el estado (no se serializa: el controller lo traduce a HTTP).</summary>
public enum ErrorCambiarEstadoInscripcion
{
    Ninguno,
    NoEncontrada,
    /// <summary>Al reactivar: el beneficiario ya tiene otra inscripción activa en el mismo programa.</summary>
    YaInscritoActivo,
    /// <summary>Al reactivar: el programa ya tiene cupo_maximo inscripciones activas.</summary>
    CupoLleno,
}

public record CambiarEstadoInscripcionResultado(InscripcionDto? Inscripcion, ErrorCambiarEstadoInscripcion Error);
