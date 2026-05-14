using FundacionPanorama.Application.Features.TalentoHumano.DTOs;
using FundacionPanorama.Application.Features.TalentoHumano.Interfaces;

namespace FundacionPanorama.Application.Features.TalentoHumano;

public class TalentoHumanoService(ITalentoHumanoRepository repo)
{
    public Task<IReadOnlyList<EmpleadoResumenDto>> ListarAsync(bool? activo, Guid? sedeId, string? area, CancellationToken ct = default)
        => repo.ListarAsync(activo, sedeId, area, ct);

    public Task<EmpleadoDto?> ObtenerAsync(Guid id, CancellationToken ct = default)
        => repo.ObtenerAsync(id, ct);

    public Task<EmpleadoDto> CrearAsync(CrearEmpleadoDto dto, CancellationToken ct = default)
        => repo.CrearAsync(dto, ct);

    public Task<EmpleadoDto?> ActualizarAsync(Guid id, ActualizarEmpleadoDto dto, CancellationToken ct = default)
        => repo.ActualizarAsync(id, dto, ct);

    public Task<bool> EliminarAsync(Guid id, CancellationToken ct = default)
        => repo.EliminarAsync(id, ct);

    public Task<IReadOnlyList<NovedadDto>> ListarNovedadesAsync(Guid empleadoId, CancellationToken ct = default)
        => repo.ListarNovedadesAsync(empleadoId, ct);

    public Task<IReadOnlyList<NovedadDto>> ListarTodasNovedadesAsync(string? estado, CancellationToken ct = default)
        => repo.ListarTodasNovedadesAsync(estado, ct);

    public Task<NovedadDto> CrearNovedadAsync(Guid empleadoId, CrearNovedadDto dto, CancellationToken ct = default)
        => repo.CrearNovedadAsync(empleadoId, dto, ct);

    public Task<NovedadDto?> ActualizarNovedadAsync(Guid id, ActualizarNovedadDto dto, CancellationToken ct = default)
        => repo.ActualizarNovedadAsync(id, dto, ct);

    public Task<bool> EliminarNovedadAsync(Guid id, CancellationToken ct = default)
        => repo.EliminarNovedadAsync(id, ct);

    public Task<TalentoHumanoStatsDto> StatsAsync(CancellationToken ct = default)
        => repo.StatsAsync(ct);
}
