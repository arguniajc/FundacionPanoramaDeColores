using FundacionPanorama.Application.Features.Inscripciones.DTOs;

namespace FundacionPanorama.Application.Features.Inscripciones.Interfaces;

public interface IInscripcionesRepository
{
    Task<IReadOnlyList<InscripcionDto>> ListarAsync(Guid? programaId, Guid? beneficiarioId, string? estado, CancellationToken ct = default);
    Task<InscripcionDto?> ObtenerAsync(Guid id, CancellationToken ct = default);

    /// <summary>Valida existencia/duplicado e inserta; los errores de validación vienen en el resultado.</summary>
    Task<CrearInscripcionResultado> CrearAsync(CrearInscripcionDto dto, CancellationToken ct = default);

    Task<InscripcionDto?> ActualizarAsync(Guid id, ActualizarInscripcionDto dto, CancellationToken ct = default);
    Task<InscripcionDto?> CambiarEstadoAsync(Guid id, string estado, CancellationToken ct = default);
    Task<bool> EliminarAsync(Guid id, CancellationToken ct = default);
}
