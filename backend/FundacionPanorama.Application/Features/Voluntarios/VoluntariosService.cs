using FundacionPanorama.Application.Features.Voluntarios.DTOs;
using FundacionPanorama.Application.Features.Voluntarios.Interfaces;

namespace FundacionPanorama.Application.Features.Voluntarios;

public class VoluntariosService(IVoluntariosRepository repo)
{
    public Task<IReadOnlyList<VoluntarioDto>> ListarAsync(string? buscar, bool soloActivos, int pagina, int porPagina, CancellationToken ct = default)
        => repo.ListarAsync(buscar, soloActivos, Math.Max(pagina, 1), Math.Clamp(porPagina, 1, 500), ct);

    public Task<StatsVoluntariosDto> StatsAsync(CancellationToken ct = default)
        => repo.StatsAsync(ct);

    public Task<VoluntarioDto?> ObtenerAsync(Guid id, CancellationToken ct = default)
        => repo.ObtenerAsync(id, ct);

    public Task<VoluntarioDto> CrearAsync(CrearVoluntarioDto dto, CancellationToken ct = default)
        => repo.CrearAsync(dto, ct);

    public Task<VoluntarioDto?> ActualizarAsync(Guid id, CrearVoluntarioDto dto, CancellationToken ct = default)
        => repo.ActualizarAsync(id, dto, ct);

    public Task<bool?> ToggleAsync(Guid id, CancellationToken ct = default)
        => repo.ToggleAsync(id, ct);

    public Task<bool> EliminarAsync(Guid id, CancellationToken ct = default)
        => repo.EliminarAsync(id, ct);

    public Task<IReadOnlyList<AsignacionVolDto>> ListarAsignacionesAsync(Guid voluntarioId, CancellationToken ct = default)
        => repo.ListarAsignacionesAsync(voluntarioId, ct);

    public Task<AsignacionVolDto> AgregarAsignacionAsync(Guid voluntarioId, CrearAsignacionVolDto dto, CancellationToken ct = default)
        => repo.AgregarAsignacionAsync(voluntarioId, dto, ct);

    public Task<AsignacionVolDto?> EditarAsignacionAsync(Guid asigId, EditarAsignacionVolDto dto, CancellationToken ct = default)
        => repo.EditarAsignacionAsync(asigId, dto, ct);

    public Task<bool> EliminarAsignacionAsync(Guid asigId, CancellationToken ct = default)
        => repo.EliminarAsignacionAsync(asigId, ct);
}
