using FundacionPanorama.Application.Features.TalentoHumano.DTOs;

namespace FundacionPanorama.Application.Features.TalentoHumano.Interfaces;

public interface ITalentoHumanoRepository
{
    Task<IReadOnlyList<EmpleadoResumenDto>> ListarAsync(bool? activo, Guid? sedeId, string? area, CancellationToken ct);
    Task<EmpleadoDto?>                     ObtenerAsync(Guid id, CancellationToken ct);
    Task<EmpleadoDto>                      CrearAsync(CrearEmpleadoDto dto, CancellationToken ct);
    Task<EmpleadoDto?>                     ActualizarAsync(Guid id, ActualizarEmpleadoDto dto, CancellationToken ct);
    Task<bool>                             EliminarAsync(Guid id, CancellationToken ct);

    Task<IReadOnlyList<NovedadDto>>        ListarNovedadesAsync(Guid empleadoId, CancellationToken ct);
    Task<IReadOnlyList<NovedadDto>>        ListarTodasNovedadesAsync(string? estado, CancellationToken ct);
    Task<NovedadDto>                       CrearNovedadAsync(Guid empleadoId, CrearNovedadDto dto, CancellationToken ct);
    Task<NovedadDto?>                      ActualizarNovedadAsync(Guid id, ActualizarNovedadDto dto, CancellationToken ct);
    Task<bool>                             EliminarNovedadAsync(Guid id, CancellationToken ct);

    Task<TalentoHumanoStatsDto>            StatsAsync(CancellationToken ct);
}
