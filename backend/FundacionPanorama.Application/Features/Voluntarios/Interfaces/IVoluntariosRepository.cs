using FundacionPanorama.Application.Features.Voluntarios.DTOs;

namespace FundacionPanorama.Application.Features.Voluntarios.Interfaces;

public interface IVoluntariosRepository
{
    Task<IReadOnlyList<VoluntarioDto>> ListarAsync(string? buscar, bool soloActivos, int pagina, int porPagina, CancellationToken ct = default);
    Task<StatsVoluntariosDto> StatsAsync(CancellationToken ct = default);
    Task<VoluntarioDto?> ObtenerAsync(Guid id, CancellationToken ct = default);
    Task<VoluntarioDto>  CrearAsync(CrearVoluntarioDto dto, CancellationToken ct = default);
    Task<VoluntarioDto?> ActualizarAsync(Guid id, CrearVoluntarioDto dto, CancellationToken ct = default);

    /// <summary>Invierte el estado activo. Devuelve el nuevo valor, o null si no existe.</summary>
    Task<bool?> ToggleAsync(Guid id, CancellationToken ct = default);

    /// <summary>
    /// Si tiene asignaciones, desactiva el voluntario y sus asignaciones (siempre true);
    /// si no, lo borra (false si no existía).
    /// </summary>
    Task<bool> EliminarAsync(Guid id, CancellationToken ct = default);

    Task<IReadOnlyList<AsignacionVolDto>> ListarAsignacionesAsync(Guid voluntarioId, CancellationToken ct = default);
    Task<AsignacionVolDto>  AgregarAsignacionAsync(Guid voluntarioId, CrearAsignacionVolDto dto, CancellationToken ct = default);

    /// <summary>Actualiza la asignación. Devuelve null si no existe.</summary>
    Task<AsignacionVolDto?> EditarAsignacionAsync(Guid asigId, EditarAsignacionVolDto dto, CancellationToken ct = default);

    Task<bool> EliminarAsignacionAsync(Guid asigId, CancellationToken ct = default);
}
