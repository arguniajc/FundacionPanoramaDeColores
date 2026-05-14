using FundacionPanorama.Application.Features.Actividades.DTOs;
using FundacionPanorama.Application.Features.Actividades.Interfaces;

namespace FundacionPanorama.Application.Features.Actividades;

public class ActividadesService(IActividadesRepository repo)
{
    public Task<IReadOnlyList<ActividadResumenDto>> ListarAsync(int? mes, int? anio, Guid? programaId, CancellationToken ct = default)
        => repo.ListarAsync(mes, anio, programaId, ct);

    public Task<ActividadDto?> ObtenerAsync(Guid id, CancellationToken ct = default)
        => repo.ObtenerAsync(id, ct);

    public Task<ActividadDto> CrearAsync(CrearActividadDto dto, CancellationToken ct = default)
        => repo.CrearAsync(dto, ct);

    public Task<ActividadDto?> ActualizarAsync(Guid id, ActualizarActividadDto dto, CancellationToken ct = default)
        => repo.ActualizarAsync(id, dto, ct);

    public Task<bool> EliminarAsync(Guid id, CancellationToken ct = default)
        => repo.EliminarAsync(id, ct);

    public Task<IReadOnlyList<AsistenciaItemDto>> ObtenerAsistenciaAsync(Guid actividadId, CancellationToken ct = default)
        => repo.ObtenerAsistenciaAsync(actividadId, ct);

    public Task RegistrarAsistenciaAsync(Guid actividadId, RegistrarAsistenciaDto dto, CancellationToken ct = default)
        => repo.RegistrarAsistenciaAsync(actividadId, dto, ct);
}
